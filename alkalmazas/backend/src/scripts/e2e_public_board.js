import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

async function main() {
    const auth = await createAuthContext('BOARD');
    const j = (method, path, body) => auth.j(method, path, body);

    const tournament = await j('POST', '/api/tournaments', { name: `BOARD ${new Date().toISOString()}` });
    const category = await j('POST', '/api/categories', {
        tournamentId: tournament._id,
        name: 'Board test',
        format: 'group',
        groupsCount: 1,
        groupStageMatchesPerPlayer: 1
    });

    const players = [];
    for (const name of ['A', 'B', 'C', 'D']) {
        const p = await j('POST', '/api/players', { tournamentId: tournament._id, categoryId: category._id, name });
        players.push(p);
        await j('PATCH', `/api/players/${p._id}/checkin`, { checkedIn: true });
    }

    const locked = await j('POST', `/api/categories/${category._id}/finalize-draw`);
    assert.equal(locked.groupsCreated, 1);
    const groups = await j('GET', `/api/groups?categoryId=${category._id}`);
    const groupId = groups[0]._id;

    const schedule = await j('POST', `/api/matches/group/${groupId}/schedule`, {
        startAt: new Date(Date.now() + 60_000).toISOString(),
        courtsCount: 1,
        matchMinutes: 30,
        playerRestMinutes: 0
    });
    assert(schedule.scheduled > 0);

    const allMatches = await j('GET', `/api/matches?groupId=${groupId}`);
    const firstMatch = allMatches.find((m) => m.status === 'pending');
    assert(firstMatch?._id);
    await j('PATCH', `/api/matches/${firstMatch._id}/status`, { status: 'running' });

    const board = await auth.j('GET', `/public/tournaments/${tournament._id}/board`);
    assert.equal(String(board.tournament.id), String(tournament._id));
    assert(board.runningMatches.length >= 1);
    assert(board.upcomingMatches.length >= 1);

    console.log('OK: public board smoke passed');
    console.log({ tournamentId: tournament._id, running: board.runningMatches.length, upcoming: board.upcomingMatches.length });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
