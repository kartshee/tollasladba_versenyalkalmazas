import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

let j;


async function setupMatch({ tournamentName, matchRules, players }) {
    const t = await j('POST', '/api/tournaments', {
        name: tournamentName,
        config: { matchRules }
    });

    const c = await j('POST', '/api/categories', {
        tournamentId: t._id,
        name: `${tournamentName}-CAT`,
        groupStageMatchesPerPlayer: 1,
        groupSizeTarget: 8,
        groupsCount: 1
    });

    await j('POST', `/api/categories/${c._id}/players/bulk`, {
        text: players.join('\n')
    });

    const dbPlayers = await j('GET', `/api/players?categoryId=${c._id}`);
    for (const p of dbPlayers) {
        await j('PATCH', `/api/players/${p._id}/checkin`, { checkedIn: true });
    }

    await j('POST', `/api/categories/${c._id}/finalize-draw`);

    const groups = await j('GET', `/api/groups?categoryId=${c._id}`);
    assert.equal(groups.length, 1);
    const groupId = groups[0]._id;

    const matches = await j('GET', `/api/matches?groupId=${groupId}&round=group`);
    assert.equal(matches.length, 1);

    return { tournament: t, category: c, groupId, match: matches[0] };
}

async function main() {
    const auth = await createAuthContext('RULES');
    j = (method, path, body, expectedStatus = null) => auth.j(method, path, body, expectedStatus === null ? {} : { expectedStatus });
    const bestOf1 = await setupMatch({
        tournamentName: `RULES-BO1-${new Date().toISOString()}`,
        matchRules: { bestOf: 1, pointsToWin: 11, winBy: 2, cap: 15 },
        players: ['A', 'B']
    });

    const bo1TooManySets = await j('PATCH', `/api/matches/${bestOf1.match._id}/result`, {
        sets: [{ p1: 11, p2: 7 }, { p1: 11, p2: 8 }]
    }, 400);
    assert.match(bo1TooManySets.error, /between 1 and 1 sets/i);

    const bo1InvalidMargin = await j('PATCH', `/api/matches/${bestOf1.match._id}/result`, {
        sets: [{ p1: 11, p2: 10 }]
    }, 400);
    assert.match(bo1InvalidMargin.error, /invalid set score/i);

    const bo1Finished = await j('PATCH', `/api/matches/${bestOf1.match._id}/result`, {
        sets: [{ p1: 15, p2: 14 }]
    });
    assert.equal(bo1Finished.status, 'finished');
    assert.equal(bo1Finished.sets.length, 1);
    assert.equal(bo1Finished.appliedMatchRules.bestOf, 1);
    assert.equal(bo1Finished.appliedMatchRules.pointsToWin, 11);
    assert.equal(bo1Finished.appliedMatchRules.cap, 15);

    const bestOf5 = await setupMatch({
        tournamentName: `RULES-BO5-${new Date().toISOString()}`,
        matchRules: { bestOf: 5, pointsToWin: 11, winBy: 2, cap: 15 },
        players: ['C', 'D']
    });

    const bo5TooFewSets = await j('PATCH', `/api/matches/${bestOf5.match._id}/result`, {
        sets: [{ p1: 11, p2: 8 }, { p1: 11, p2: 9 }]
    }, 400);
    assert.match(bo5TooFewSets.error, /between 3 and 5 sets/i);

    const bo5Finished = await j('PATCH', `/api/matches/${bestOf5.match._id}/result`, {
        sets: [{ p1: 11, p2: 8 }, { p1: 11, p2: 9 }, { p1: 15, p2: 14 }]
    });
    assert.equal(bo5Finished.status, 'finished');
    assert.equal(bo5Finished.sets.length, 3);
    assert.equal(bo5Finished.appliedMatchRules.bestOf, 5);
    assert.equal(bo5Finished.appliedMatchRules.pointsToWin, 11);
    assert.equal(bo5Finished.appliedMatchRules.cap, 15);

    console.log('OK: configurable matchRules smoke passed');
    console.log({
        bestOf1: {
            tournamentId: bestOf1.tournament._id,
            groupId: bestOf1.groupId,
            acceptedScore: '15-14',
            rules: bestOf1.tournament.config.matchRules
        },
        bestOf5: {
            tournamentId: bestOf5.tournament._id,
            groupId: bestOf5.groupId,
            acceptedSets: ['11-8', '11-9', '15-14'],
            rules: bestOf5.tournament.config.matchRules
        }
    });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
