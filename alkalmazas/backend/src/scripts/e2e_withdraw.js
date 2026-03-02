import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:5001';

const playersCount = Number(process.argv[2] ?? 8);
const matchesPerPlayer = Number(process.argv[3] ?? 5);
const policy = String(process.argv[4] ?? 'delete_results'); // delete_results | keep_results

function idOf(x) {
    if (x && typeof x === 'object') return String(x._id ?? x.id ?? x);
    return String(x);
}

async function j(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
    return data;
}

function involves(mm, playerId) {
    return idOf(mm.player1) === String(playerId) || idOf(mm.player2) === String(playerId);
}

async function main() {
    const stamp = new Date().toISOString();

    const t = await j('POST', '/api/tournaments', { name: `WITHDRAW ${stamp}` });
    const c = await j('POST', '/api/categories', {
        tournamentId: t._id,
        name: 'WITHDRAW Cat',
        groupStageMatchesPerPlayer: matchesPerPlayer,
        format: 'group+playoff'
    });

    const pIds = [];
    for (let i = 1; i <= playersCount; i++) {
        const p = await j('POST', '/api/players', {
            tournamentId: t._id,
            name: `P${i}`,
            club: i % 2 === 0 ? 'B' : 'A'
        });
        pIds.push(p._id);
    }

    const g = await j('POST', '/api/groups', {
        tournamentId: t._id,
        categoryId: c._id,
        name: 'Group A',
        players: pIds
    });

    // generate
    const gen = await j('POST', `/api/matches/group/${g._id}`, { matchesPerPlayer });
    assert(Array.isArray(gen.matches));

    const withdrawPlayerId = pIds[0];

    // withdraw
    const reasonCandidates = [
        'injury',
        'no_show',
        'ret',
        'ff',
        'wo',
        'other'
    ];

    let wd = null;
    let lastErr = null;

    for (const reason of reasonCandidates) {
        try {
            wd = await j('PATCH', `/api/groups/${g._id}/withdraw`, {
                playerId: withdrawPlayerId,
                reason,              // <- próbálgatjuk
                policy,
                note: 'e2e_withdraw.js'
            });
            break; // sikerült
        } catch (e) {
            const msg = String(e.message);
            lastErr = e;
            if (msg.includes('"Invalid reason"') || msg.includes('Invalid reason')) {
                continue; // próbáljuk a következőt
            }
            throw e; // más hiba: álljunk meg
        }
    }

    if (!wd) {
        throw lastErr ?? new Error('Withdraw failed with all reason candidates');
    }

    // standings legyen lekérdezhető és tartalmazza az összes játékost
    const standings = await j('GET', `/api/groups/${g._id}/standings`);
    assert(Array.isArray(standings), 'standings must be an array');
    assert.equal(standings.length, playersCount, 'standings must include all players');

    // schedule: csak a még ütemezhető meccseket kezelje, voided-et/finished-et ignorálja
    const sch = await j('POST', `/api/matches/group/${g._id}/schedule`, {
        startAt: new Date().toISOString(),
        courtsCount: 2,
        matchMinutes: 35,
        playerRestMinutes: 20,
        courtTurnoverMinutes: 0,
        force: true
    });
    assert(sch);

    console.log('OK: withdraw e2e passed');
    console.log({ tournamentId: t._id, categoryId: c._id, groupId: g._id, policy });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});