import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

let j;

async function setupCategory({ tournamentId, name, playerNames, matchesPerPlayer = 3, multiTiePolicy = 'direct_then_overall', unresolvedTiePolicy = 'shared_place' }) {
    const category = await j('POST', '/api/categories', {
        tournamentId,
        name,
        groupStageMatchesPerPlayer: matchesPerPlayer,
        groupSizeTarget: playerNames.length,
        groupsCount: 1,
        format: 'group',
        multiTiePolicy,
        unresolvedTiePolicy
    });
    assert(category?._id);

    for (const playerName of playerNames) {
        const player = await j('POST', '/api/players', {
            tournamentId,
            categoryId: category._id,
            name: playerName
        });
        assert(player?._id);
        const checkedIn = await j('PATCH', `/api/players/${player._id}/checkin`, { checkedIn: true });
        assert(checkedIn.checkedInAt);
    }

    const locked = await j('POST', `/api/categories/${category._id}/finalize-draw`);
    assert.equal(locked.groupsCreated, 1);

    const groups = await j('GET', `/api/groups?categoryId=${category._id}`);
    assert.equal(groups.length, 1);

    const matches = await j('GET', `/api/matches?groupId=${groups[0]._id}&round=group`);
    assert(matches.length > 0);

    return { category, group: groups[0], matches };
}

function makeMatchLookup(matches) {
    const map = new Map();
    for (const match of matches) {
        const a = match.player1?.name;
        const b = match.player2?.name;
        if (!a || !b) continue;
        map.set([a, b].sort().join('__'), match);
    }
    return (nameA, nameB) => {
        const match = map.get([nameA, nameB].sort().join('__'));
        assert(match, `Missing match for ${nameA} vs ${nameB}`);
        return match;
    };
}

async function setPlayed(matchId, sets) {
    const result = await j('PATCH', `/api/matches/${matchId}/result`, { sets });
    assert.equal(result.status, 'finished');
    assert(result.winner);
    return result;
}

async function playWinner(match, winnerName, winnerScores = [21, 21], loserScores = [10, 10]) {
    const isPlayer1Winner = match.player1?.name === winnerName;
    assert.notEqual(isPlayer1Winner, undefined);
    assert(
        isPlayer1Winner || match.player2?.name === winnerName,
        `Winner ${winnerName} is not part of match ${match.player1?.name} vs ${match.player2?.name}`
    );

    const sets = winnerScores.map((winnerPts, idx) => {
        const loserPts = loserScores[idx] ?? loserScores[loserScores.length - 1] ?? 10;
        return isPlayer1Winner
            ? { p1: winnerPts, p2: loserPts }
            : { p1: loserPts, p2: winnerPts };
    });

    return setPlayed(match._id, sets);
}

async function runThreeWayPolicyScenario(tournamentId) {
    const names = ['A', 'B', 'C', 'D'];
    const { group, matches } = await setupCategory({
        tournamentId,
        name: `TB-3WAY ${new Date().toISOString()}`,
        playerNames: names,
        matchesPerPlayer: 3,
        multiTiePolicy: 'direct_then_overall',
        unresolvedTiePolicy: 'shared_place'
    });

    const pick = makeMatchLookup(matches);

    await playWinner(pick('A', 'B'), 'A', [21, 21], [18, 18]);
    await playWinner(pick('B', 'C'), 'B', [21, 21], [18, 18]);
    await playWinner(pick('C', 'A'), 'C', [21, 21], [18, 18]);
    await playWinner(pick('A', 'D'), 'A', [21, 21], [5, 5]);
    await playWinner(pick('B', 'D'), 'B', [21, 21], [10, 10]);
    await playWinner(pick('C', 'D'), 'C', [21, 21], [15, 15]);

    const standings = await j('GET', `/api/groups/${group._id}/standings`);
    const order = standings.map((s) => s.player.name);

    assert.deepEqual(order, ['A', 'B', 'C', 'D']);
    assert.equal(standings[0].tieResolved, true);

    return { order };
}

async function runSharedPlaceScenario(tournamentId) {
    const names = ['E', 'F', 'G'];
    const { group, matches } = await setupCategory({
        tournamentId,
        name: `TB-SHARED ${new Date().toISOString()}`,
        playerNames: names,
        matchesPerPlayer: 2,
        multiTiePolicy: 'direct_only',
        unresolvedTiePolicy: 'shared_place'
    });

    const pick = makeMatchLookup(matches);
    await playWinner(pick('E', 'F'), 'E', [21, 21], [19, 19]);
    await playWinner(pick('F', 'G'), 'F', [21, 21], [19, 19]);
    await playWinner(pick('E', 'G'), 'G', [21, 21], [19, 19]);

    const standings = await j('GET', `/api/groups/${group._id}/standings`);
    assert.equal(standings[0].place, 1);
    assert.equal(standings[1].place, 1);
    assert.equal(standings[2].place, 1);
    assert.equal(standings[0].tieResolved, false);

    return { order: standings.map((s) => s.player.name), place: standings[0].place };
}

async function main() {
    const auth = await createAuthContext('STANDINGS');
    j = (method, path, body) => auth.j(method, path, body);
    const tournament = await j('POST', '/api/tournaments', {
        name: `STANDINGS ${new Date().toISOString()}`
    });
    assert(tournament?._id);

    const threeWay = await runThreeWayPolicyScenario(tournament._id);
    const shared = await runSharedPlaceScenario(tournament._id);

    console.log('OK: standings tie-break smoke passed');
    console.log({
        tournamentId: tournament._id,
        threeWayOrder: threeWay.order,
        shared
    });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
