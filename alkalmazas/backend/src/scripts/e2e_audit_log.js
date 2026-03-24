import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

async function main() {
    const auth = await createAuthContext('AUDIT');
    const j = (method, path, body, opts = {}) => auth.j(method, path, body, opts);

    const tournament = await j('POST', '/api/tournaments', {
        name: `AUDIT ${new Date().toISOString()}`,
        config: { courtsCount: 2, estimatedMatchMinutes: 30, minRestPlayerMinutes: 15 }
    });
    assert(tournament?._id);

    const category = await j('POST', '/api/categories', {
        tournamentId: tournament._id,
        name: 'U15 MS B',
        groupStageMatchesPerPlayer: 3,
        groupSizeTarget: 4,
        groupsCount: 1,
        qualifiersPerGroup: 2,
        format: 'group+playoff'
    });
    assert(category?._id);

    const bulk = await j('POST', `/api/categories/${category._id}/players/bulk`, {
        text: ['P1', 'P2', 'P3', 'P4'].join('\n')
    });
    assert.equal(bulk.created, 4);

    const players = await j('GET', `/api/players?categoryId=${category._id}`);
    assert.equal(players.length, 4);

    for (const player of players) {
        const checked = await j('PATCH', `/api/players/${player._id}/checkin`, { checkedIn: true });
        assert(checked.checkedInAt, 'checkedInAt should be set');
    }

    const finalized = await j('POST', `/api/categories/${category._id}/finalize-draw`);
    assert(finalized.generatedMatches > 0);

    const groups = await j('GET', `/api/groups?categoryId=${category._id}`);
    assert(groups.length >= 1);
    const groupId = groups[0]._id;

    const schedule = await j('POST', `/api/matches/group/${groupId}/schedule`, {
        startAt: new Date().toISOString(),
        courtsCount: 2,
        matchMinutes: 30,
        playerRestMinutes: 15,
        courtTurnoverMinutes: 0,
        force: true
    });
    assert(schedule.scheduled > 0);

    const matches = await j('GET', `/api/matches/group/${groupId}`);
    assert(matches.length > 0);

    const firstMatch = matches[0];
    const result = await j('PATCH', `/api/matches/${firstMatch._id}/result`, {
        sets: [
            { p1: 21, p2: 10 },
            { p1: 21, p2: 12 }
        ]
    });
    assert.equal(result.status, 'finished');
    assert(result.winner, 'winner should be set');

    const logs = await j('GET', `/api/audit-logs?tournamentId=${tournament._id}&limit=100`);
    assert(Array.isArray(logs));
    assert(logs.length > 0, 'audit log list should not be empty');

    const actions = new Set(logs.map((x) => x.action));
    for (const expected of [
        'tournament.created',
        'category.created',
        'category.players_bulk_imported',
        'player.checked_in',
        'category.draw_finalized',
        'group.schedule_generated',
        'match.result_recorded'
    ]) {
        assert(actions.has(expected), `Missing audit action: ${expected}`);
    }

    const resultLog = logs.find((x) => x.action === 'match.result_recorded' && String(x.entityId) === String(firstMatch._id));
    assert(resultLog, 'Result audit log should exist for the finished match');
    assert(resultLog.before, 'Result audit should contain before snapshot');
    assert(resultLog.after, 'Result audit should contain after snapshot');

    console.log('OK: audit log smoke passed');
    console.log({
        tournamentId: tournament._id,
        categoryId: category._id,
        groupId,
        logs: logs.length,
        actions: [...actions].sort()
    });
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
