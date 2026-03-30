import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

let j;

async function setPlayed(matchId, sets) {
    const result = await j('PATCH', `/api/matches/${matchId}/result`, { sets });
    assert.equal(result.status, 'finished');
    assert(result.winner);
    return result;
}

async function main() {
    const auth = await createAuthContext('POONLY');
    j = (method, path, body) => auth.j(method, path, body);

    const tournament = await j('POST', '/api/tournaments', { name: `POONLY ${new Date().toISOString()}` });
    assert(tournament?._id);

    const category = await j('POST', '/api/categories', {
        tournamentId: tournament._id,
        name: 'Knockout only',
        format: 'playoff',
        playoffSize: 4
    });
    assert(category?._id);

    for (const name of ['A', 'B', 'C', 'D']) {
        const player = await j('POST', `/api/categories/${category._id}/players`, { name });
        assert(player?._id);
        const checked = await j('PATCH', `/api/players/${player._id}/checkin`, { checkedIn: true });
        assert(checked.checkedInAt);
    }

    const finalized = await j('POST', `/api/categories/${category._id}/finalize-draw`);
    assert.equal(finalized.playoffSize, 4);
    assert.equal(finalized.generatedMatches, 2);

    const semis = await j('GET', `/api/matches?categoryId=${category._id}&round=playoff_semi`);
    assert.equal(semis.length, 2);

    for (const semi of semis) {
        await setPlayed(semi._id, [{ p1: 21, p2: 10 }, { p1: 21, p2: 11 }]);
    }

    const advanced = await j('POST', `/api/categories/${category._id}/playoff/advance`);
    assert.equal(advanced.created, 2);
    const finalMatch = advanced.matches.find((m) => m.round === 'playoff_final');
    const bronzeMatch = advanced.matches.find((m) => m.round === 'playoff_bronze');
    assert(finalMatch?._id);
    assert(bronzeMatch?._id);

    console.log('OK: playoff-only smoke passed');
    console.log({
        tournamentId: tournament._id,
        categoryId: category._id,
        roundsCreated: advanced.matches.map((m) => m.round).sort()
    });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
