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

async function main() {
    // tournament + category + players
    const t = await j('POST', '/api/tournaments', { name: `LIFE ${new Date().toISOString()}` });
    const c = await j('POST', '/api/categories', {
        tournamentId: t._id, name: 'LifeCat', groupStageMatchesPerPlayer: 3, groupSizeTarget: 8
    });

    const bulk = await j('POST', `/api/categories/${c._id}/players/bulk`, { text: 'A\nB\nC\nD' });
    assert.equal(bulk.created, 4);

    const players = await j('GET', `/api/players?categoryId=${c._id}`);
    for (const p of players) await j('PATCH', `/api/players/${p._id}/checkin`, { checkedIn: true });

    // lock -> group+matches
    await j('POST', `/api/categories/${c._id}/finalize-draw`);
    const groups = await j('GET', `/api/groups?categoryId=${c._id}`);
    const groupId = groups[0]._id;

    // schedule
    const sch = await j('POST', `/api/matches/group/${groupId}/schedule`, {
        startAt: new Date().toISOString(),
        courtsCount: 1,
        matchMinutes: 10,
        playerRestMinutes: 0,
        courtTurnoverMinutes: 0,
        force: true
    });
    assert(sch.matches?.length >= 1);

    // pick one match
    const match = sch.matches.find(m => m.round === 'group' && m.status === 'pending');
    assert(match?._id);

    // status -> running
    const running = await j('PATCH', `/api/matches/${match._id}/status`, { status: 'running' });
    assert.equal(running.status, 'running');

    // result -> finished (played)
    const finished = await j('PATCH', `/api/matches/${match._id}/result`, {
        sets: [{ p1: 21, p2: 10 }, { p1: 21, p2: 18 }]
    });
    assert.equal(finished.status, 'finished');
    assert(finished.winner);

    // create another match and close via outcome (wo)
    const list = await j('GET', `/api/matches?groupId=${groupId}&round=group&status=pending`);
    const m2 = list.find(x => x._id !== match._id);
    assert(m2?._id);

    const wo = await j('PATCH', `/api/matches/${m2._id}/outcome`, { type: 'wo', winnerSide: 'player1' });
    assert.equal(wo.status, 'finished');
    assert.equal(wo.resultType, 'wo');

    console.log('OK: match lifecycle passed');
}

main().catch(e => { console.error(e.message); process.exit(1); });