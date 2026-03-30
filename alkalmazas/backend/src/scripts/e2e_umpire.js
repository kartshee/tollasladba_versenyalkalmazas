import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

async function main() {
    const auth = await createAuthContext('UMPIRE');
    const j = (method, path, body) => auth.j(method, path, body);

    const tournament = await j('POST', '/api/tournaments', { name: `UMPIRE ${new Date().toISOString()}` });
    const category = await j('POST', '/api/categories', {
        tournamentId: tournament._id,
        name: 'Umpire test',
        format: 'group',
        groupsCount: 1,
        groupStageMatchesPerPlayer: 1
    });

    const players = [];
    for (const name of ['A', 'B']) {
        const p = await j('POST', '/api/players', { tournamentId: tournament._id, categoryId: category._id, name });
        players.push(p);
    }

    const group = await j('POST', '/api/groups', {
        tournamentId: tournament._id,
        categoryId: category._id,
        name: 'Group A',
        players: players.map((p) => p._id)
    });
    const generated = await j('POST', `/api/matches/group/${group._id}`, { matchesPerPlayer: 1 });
    assert.equal(generated.generated, 1);
    const matches = await j('GET', `/api/matches?groupId=${group._id}`);
    assert.equal(matches.length, 1);

    const assigned = await j('PATCH', `/api/matches/${matches[0]._id}/umpire`, { umpireName: 'Kovács Péter' });
    assert.equal(assigned.umpireName, 'Kovács Péter');

    const cleared = await j('PATCH', `/api/matches/${matches[0]._id}/umpire`, { umpireName: '' });
    assert.equal(cleared.umpireName, '');

    console.log('OK: umpire smoke passed');
    console.log({ tournamentId: tournament._id, matchId: matches[0]._id });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
