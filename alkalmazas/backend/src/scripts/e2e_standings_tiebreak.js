import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:5001';

async function j(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
    return data;
}

async function setupCategory({ tournamentId, name, playerNames, matchesPerPlayer }) {
    const category = await j('POST', '/api/categories', {
        tournamentId,
        name,
        groupStageMatchesPerPlayer: matchesPerPlayer,
        groupSizeTarget: playerNames.length,
        groupsCount: 1,
        format: 'group'
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

async function runThreeWayTieScenario(tournamentId) {
    const names = ['A', 'B', 'C', 'D'];
    const { group, matches } = await setupCategory({
        tournamentId,
        name: `TB-3WAY ${new Date().toISOString()}`,
        playerNames: names,
        matchesPerPlayer: 3
    });

    const pick = makeMatchLookup(matches);

    await playWinner(pick('A', 'B'), 'A', [21, 21], [10, 10]);
    await playWinner(pick('B', 'C'), 'B', [21, 21], [19, 19]);
    await playWinner(pick('C', 'A'), 'C', [21, 21], [19, 19]);
    await playWinner(pick('A', 'D'), 'A', [21, 21], [5, 5]);
    await playWinner(pick('B', 'D'), 'B', [21, 21], [6, 6]);
    await playWinner(pick('C', 'D'), 'C', [21, 21], [7, 7]);

    const standings = await j('GET', `/api/groups/${group._id}/standings`);
    const order = standings.map((s) => s.player.name);

    assert.deepEqual(order, ['A', 'C', 'B', 'D']);

    return { order };
}

async function runHeadToHeadScenario(tournamentId) {
    const names = ['E', 'F', 'G', 'H'];
    const { group, matches } = await setupCategory({
        tournamentId,
        name: `TB-H2H ${new Date().toISOString()}`,
        playerNames: names,
        matchesPerPlayer: 3
    });

    const pick = makeMatchLookup(matches);

    await playWinner(pick('E', 'F'), 'E', [21, 21], [18, 18]);
    await playWinner(pick('E', 'G'), 'E', [21, 21], [11, 11]);
    await playWinner(pick('H', 'E'), 'H', [21, 21], [19, 19]);
    await playWinner(pick('F', 'G'), 'F', [21, 21], [17, 17]);
    await playWinner(pick('F', 'H'), 'F', [21, 21], [17, 17]);
    await playWinner(pick('G', 'H'), 'G', [21, 21], [19, 19]);

    const standings = await j('GET', `/api/groups/${group._id}/standings`);
    const order = standings.map((s) => s.player.name);

    assert.deepEqual(order.slice(0, 2), ['E', 'F']);
    assert.equal(standings[0].wins, standings[1].wins);

    return { order };
}

async function main() {
    const tournament = await j('POST', '/api/tournaments', {
        name: `STANDINGS ${new Date().toISOString()}`
    });
    assert(tournament?._id);

    const threeWay = await runThreeWayTieScenario(tournament._id);
    const headToHead = await runHeadToHeadScenario(tournament._id);

    console.log('OK: standings tie-break smoke passed');
    console.log({
        tournamentId: tournament._id,
        threeWayOrder: threeWay.order,
        headToHeadOrder: headToHead.order
    });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
