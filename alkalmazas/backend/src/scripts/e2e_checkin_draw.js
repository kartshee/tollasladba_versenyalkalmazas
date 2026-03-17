import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

let j;

const n = Number(process.argv[2] ?? 8);
const m = Number(process.argv[3] ?? 5);

async function main() {
    const auth = await createAuthContext('CHECKIN');
    j = (method, path, body) => auth.j(method, path, body);
    // 1) Tournament
    const t = await j('POST', '/api/tournaments', {
        name: `CHECKIN ${new Date().toISOString()}`,
        config: { courtsCount: 2, checkInGraceMinutesDefault: 40 }
    });
    assert(t?._id);

    // 2) Category
    const c = await j('POST', '/api/categories', {
        tournamentId: t._id,
        name: 'U17 MS',
        groupStageMatchesPerPlayer: m,
        groupSizeTarget: 8,
        groupsCount: 1,
        qualifiersPerGroup: 2,
        format: 'group+playoff'
    });
    assert(c?._id);

    // 3) Bulk players (nevezettek)
    const lines = Array.from({ length: n }, (_, i) => `P${i + 1}`).join('\n');
    const bulk = await j('POST', `/api/categories/${c._id}/players/bulk`, { text: lines });
    assert.equal(bulk.created, n);

    // 4) List players by category
    const players = await j('GET', `/api/players?categoryId=${c._id}`);
    assert.equal(players.length, n);

    // 5) Check-in (n-1 játékost, 1 marad absent)
    for (let i = 0; i < n - 1; i++) {
        const upd = await j('PATCH', `/api/players/${players[i]._id}/checkin`, { checkedIn: true });
        assert(upd.checkedInAt);
    }

    // 6) Grace override teszt (pl. telefonáltak)
    const ov = await j('PATCH', `/api/categories/${c._id}/checkin/grace`, {
        graceMinutesOverride: 40,
        reason: 'phone call, wait'
    });
    assert.equal(ov.checkIn.graceMinutesOverride, 40);

    // 7) Finalize/Lock draw -> groups + MAIN matches
    const fin = await j('POST', `/api/categories/${c._id}/finalize-draw`);
    assert(fin.groupsCreated >= 1);
    assert(fin.generatedMatches > 0);

    // 8) Late entrant a lock után -> friendly_only kell legyen
    const late = await j('POST', `/api/categories/${c._id}/players`, { name: 'LATE GUY' });
    assert.equal(late.mainEligibility, 'friendly_only');

    // 9) Groupok lekérése -> 1. group schedule
    const groups = await j('GET', `/api/groups?categoryId=${c._id}`);
    assert(groups.length >= 1);
    const groupId = groups[0]._id;

    // 10) Close grace (force) -> absent játékos meccsei void + ő friendly_only
    const close = await j('POST', `/api/categories/${c._id}/close-grace`, { force: true });
    assert(typeof close.absentPlayers === 'number');
    assert(typeof close.voidedMatches === 'number');

    // 11) Scheduler: csak checked-in + MAIN eligible meccsek ütemeződhetnek
    const sch = await j('POST', `/api/matches/group/${groupId}/schedule`, {
        startAt: new Date().toISOString(),
        courtsCount: 2,
        matchMinutes: 35,
        playerRestMinutes: 20,
        courtTurnoverMinutes: 0,
        force: true
    });
    assert(typeof sch.scheduled === 'number');

    // 12) Friendly match manuálisan (két külön játékos kell)
    const afterPlayers = await j('GET', `/api/players?categoryId=${c._id}`);

// keressünk két külön embert, akinek checkedInAt == null (absent + late vagy absente(k))
    const nullCheckin = afterPlayers.filter(p => p.checkedInAt === null);
    assert(nullCheckin.length >= 2, 'Need at least 2 not-checked-in players to create friendly match');

    const pA = nullCheckin[0];
    const pB = nullCheckin[1];
    assert.notEqual(pA._id, pB._id, 'picked same player for friendly');

    const fm = await j('POST', `/api/categories/${c._id}/friendly-match`, {
        player1Id: pA._id,
        player2Id: pB._id
    });
    assert.equal(fm.round, 'friendly');
    console.log('OK: check-in + finalize-draw + close-grace + schedule filter + friendly passed');
    console.log({ tournamentId: t._id, categoryId: c._id, groupId, scheduled: sch.scheduled });
}

main().catch(e => {
    console.error(e.message);
    process.exit(1);
});