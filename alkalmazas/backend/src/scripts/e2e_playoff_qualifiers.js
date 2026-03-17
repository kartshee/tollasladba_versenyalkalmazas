import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

let j;


async function setupCategory({ tournamentId, name, qualifiersPerGroup, playerNames }) {
    const category = await j('POST', '/api/categories', {
        tournamentId,
        name,
        groupStageMatchesPerPlayer: playerNames.length - 1,
        groupSizeTarget: playerNames.length,
        groupsCount: 1,
        qualifiersPerGroup,
        format: 'group+playoff'
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

async function seedRankingMatches(matches) {
    const pick = makeMatchLookup(matches);

    await playWinner(pick('A', 'B'), 'A', [21, 21], [17, 17]);
    await playWinner(pick('A', 'C'), 'A', [21, 21], [14, 14]);
    await playWinner(pick('A', 'D'), 'A', [21, 21], [12, 12]);
    await playWinner(pick('B', 'C'), 'B', [21, 21], [18, 18]);
    await playWinner(pick('B', 'D'), 'B', [21, 21], [15, 15]);
    await playWinner(pick('C', 'D'), 'C', [21, 21], [19, 19]);
}

async function runQualifiersTwoScenario(tournamentId) {
    const { group, matches } = await setupCategory({
        tournamentId,
        name: `PLAYOFF-Q2 ${new Date().toISOString()}`,
        qualifiersPerGroup: 2,
        playerNames: ['A', 'B', 'C', 'D']
    });

    await seedRankingMatches(matches);

    const created = await j('POST', `/api/groups/${group._id}/playoff`);
    assert.equal(created.qualifiersPerGroup, 2);
    assert.equal(created.playoff.semis.length, 0);
    assert(created.playoff.final?._id);

    const final = created.playoff.final;
    const finalNames = [final.player1.name, final.player2.name].sort();
    assert.deepEqual(finalNames, ['A', 'B']);

    return {
        groupId: group._id,
        qualified: created.qualified.map((x) => x.name),
        finalNames
    };
}

async function runQualifiersFourScenario(tournamentId) {
    const { group, matches } = await setupCategory({
        tournamentId,
        name: `PLAYOFF-Q4 ${new Date().toISOString()}`,
        qualifiersPerGroup: 4,
        playerNames: ['A', 'B', 'C', 'D']
    });

    await seedRankingMatches(matches);

    const created = await j('POST', `/api/groups/${group._id}/playoff`);
    assert.equal(created.qualifiersPerGroup, 4);
    assert.equal(created.playoff.semis.length, 2);
    assert.equal(created.playoff.final, null);

    const semiPairs = created.playoff.semis
        .map((m) => [m.player1.name, m.player2.name].sort().join('-'))
        .sort();
    assert.deepEqual(semiPairs, ['A-D', 'B-C']);

    const semiOne = created.playoff.semis.find((m) => [m.player1.name, m.player2.name].includes('A'));
    const semiTwo = created.playoff.semis.find((m) => [m.player1.name, m.player2.name].includes('B'));
    assert(semiOne?._id && semiTwo?._id);

    await setPlayed(semiOne._id, [{ p1: 21, p2: 13 }, { p1: 21, p2: 13 }]);
    await setPlayed(semiTwo._id, [{ p1: 21, p2: 16 }, { p1: 21, p2: 16 }]);

    const finalCreated = await j('POST', `/api/groups/${group._id}/playoff/final`);
    assert.equal(finalCreated.round, 'playoff_final');
    const finalNames = [finalCreated.player1.name, finalCreated.player2.name].sort();
    assert.deepEqual(finalNames, ['A', 'B']);

    return {
        groupId: group._id,
        qualified: created.qualified.map((x) => x.name),
        semiPairs,
        finalNames
    };
}

async function main() {
    const auth = await createAuthContext('PLAYOFF');
    j = (method, path, body) => auth.j(method, path, body);
    const tournament = await j('POST', '/api/tournaments', {
        name: `PLAYOFF ${new Date().toISOString()}`
    });
    assert(tournament?._id);

    const q2 = await runQualifiersTwoScenario(tournament._id);
    const q4 = await runQualifiersFourScenario(tournament._id);

    console.log('OK: qualifiersPerGroup playoff smoke passed');
    console.log({
        tournamentId: tournament._id,
        q2,
        q4
    });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
