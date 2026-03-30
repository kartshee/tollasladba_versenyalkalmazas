import assert from 'node:assert/strict';
import { baseUrl, createAuthContext } from './_auth.js';

async function fetchText(path, token) {
    const res = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    if (!res.ok) {
        throw new Error(`GET ${path} -> ${res.status}: ${text}`);
    }
    return {
        text,
        contentType: res.headers.get('content-type') ?? '',
        disposition: res.headers.get('content-disposition') ?? ''
    };
}

async function main() {
    const auth = await createAuthContext('CSV');
    const j = (method, path, body, opts = {}) => auth.j(method, path, body, opts);

    const tournament = await j('POST', '/api/tournaments', {
        name: `CSV ${new Date().toISOString()}`,
        config: { courtsCount: 2, estimatedMatchMinutes: 30, minRestPlayerMinutes: 15 }
    });
    assert(tournament?._id);

    const category = await j('POST', '/api/categories', {
        tournamentId: tournament._id,
        name: 'U17 MS B',
        groupStageMatchesPerPlayer: 3,
        groupSizeTarget: 4,
        groupsCount: 1,
        qualifiersPerGroup: 2,
        format: 'group+playoff'
    });
    assert(category?._id);

    const bulk = await j('POST', `/api/categories/${category._id}/players/bulk`, {
        text: ['CSV P1', 'CSV P2', 'CSV P3', 'CSV P4'].join('\n')
    });
    assert.equal(bulk.created, 4);

    const players = await j('GET', `/api/players?categoryId=${category._id}`);
    assert.equal(players.length, 4);

    for (const player of players) {
        const checked = await j('PATCH', `/api/players/${player._id}/checkin`, { checkedIn: true });
        assert(checked.checkedInAt);
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

    const matchesCsv = await fetchText(`/api/exports/tournaments/${tournament._id}/matches.csv`, auth.token);
    assert(matchesCsv.contentType.includes('text/csv'));
    assert(matchesCsv.disposition.includes('matches.csv'));
    assert(matchesCsv.text.includes('matchId,tournamentName,categoryName,groupName'));
    assert(matchesCsv.text.includes('CSV P1') || matchesCsv.text.includes('CSV P2'));
    assert(matchesCsv.text.includes('21-10 | 21-12'));

    const playersCsv = await fetchText(`/api/exports/tournaments/${tournament._id}/players.csv`, auth.token);
    assert(playersCsv.contentType.includes('text/csv'));
    assert(playersCsv.disposition.includes('players.csv'));
    assert(playersCsv.text.includes('playerId,tournamentName,categoryName,playerName'));
    assert(playersCsv.text.includes('CSV P1'));
    assert(playersCsv.text.includes('true'));

    const standingsCsv = await fetchText(`/api/exports/groups/${groupId}/standings.csv`, auth.token);
    assert(standingsCsv.contentType.includes('text/csv'));
    assert(standingsCsv.disposition.includes('standings.csv'));
    assert(standingsCsv.text.includes('position,tieResolved,tournamentName,categoryName,groupName'))
    assert(standingsCsv.text.includes('CSV P1') || standingsCsv.text.includes('CSV P2'));

    console.log('OK: csv export smoke passed');
    console.log({
        tournamentId: tournament._id,
        categoryId: category._id,
        groupId,
        matchesCsvBytes: matchesCsv.text.length,
        playersCsvBytes: playersCsv.text.length,
        standingsCsvBytes: standingsCsv.text.length
    });
}

main().catch((err) => {
    console.error(err.message);
    process.exit(1);
});
