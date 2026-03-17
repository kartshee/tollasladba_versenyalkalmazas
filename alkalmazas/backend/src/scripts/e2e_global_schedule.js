import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:5001';
const categoriesCount = Number(process.argv[2] ?? 5);
const playersPerCategory = Number(process.argv[3] ?? 4);
const courtsCount = Number(process.argv[4] ?? 9);

async function j(method, path, body) {
    const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
        throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
    }
    return data;
}

function idOf(x) {
    if (x && typeof x === 'object') return String(x._id ?? x.id ?? x);
    return String(x);
}

function assertNoCourtOverlap(matches, turnoverMinutes = 0) {
    const turnMs = turnoverMinutes * 60 * 1000;
    const byCourt = new Map();

    for (const mm of matches) {
        const court = Number(mm.courtNumber);
        byCourt.set(court, [...(byCourt.get(court) ?? []), mm]);
    }

    for (const [court, items] of byCourt.entries()) {
        items.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        for (let i = 1; i < items.length; i++) {
            const prevEnd = new Date(items[i - 1].endAt).getTime();
            const currStart = new Date(items[i].startAt).getTime();
            assert(currStart >= prevEnd + turnMs, `court ${court} overlap/turnover violated`);
        }
    }
}

function assertPlayerRest(matches, restMinutes = 0) {
    const restMs = restMinutes * 60 * 1000;
    const byPlayer = new Map();

    for (const mm of matches) {
        const p1 = idOf(mm.player1);
        const p2 = idOf(mm.player2);
        byPlayer.set(p1, [...(byPlayer.get(p1) ?? []), mm]);
        byPlayer.set(p2, [...(byPlayer.get(p2) ?? []), mm]);
    }

    for (const [pid, items] of byPlayer.entries()) {
        items.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        for (let i = 1; i < items.length; i++) {
            const prevEnd = new Date(items[i - 1].endAt).getTime();
            const currStart = new Date(items[i].startAt).getTime();
            assert(currStart >= prevEnd + restMs, `player ${pid} rest violated`);
        }
    }
}

async function createCategoryFlow(tournamentId, idx) {
    const c = await j('POST', '/api/categories', {
        tournamentId,
        name: `GLOBAL Cat ${idx + 1}`,
        groupStageMatchesPerPlayer: playersPerCategory - 1,
        groupSizeTarget: playersPerCategory,
        groupsCount: 1,
        qualifiersPerGroup: 2,
        format: 'group'
    });

    const bulkText = Array.from({ length: playersPerCategory }, (_, pIdx) => `C${idx + 1}-P${pIdx + 1}`).join('\n');
    const bulk = await j('POST', `/api/categories/${c._id}/players/bulk`, { text: bulkText });
    assert.equal(bulk.created, playersPerCategory);

    const players = await j('GET', `/api/players?categoryId=${c._id}`);
    assert.equal(players.length, playersPerCategory);

    for (const p of players) {
        const checked = await j('PATCH', `/api/players/${p._id}/checkin`, { checkedIn: true });
        assert(checked.checkedInAt);
    }

    const finalized = await j('POST', `/api/categories/${c._id}/finalize-draw`);
    assert.equal(finalized.groupsCreated, 1);
    assert.equal(finalized.generatedMatches, (playersPerCategory * (playersPerCategory - 1)) / 2);

    return c;
}

async function main() {
    const t = await j('POST', '/api/tournaments', {
        name: `GLOBAL ${new Date().toISOString()}`,
        config: {
            courtsCount,
            estimatedMatchMinutes: 35,
            minRestPlayerMinutes: 20,
            courtTurnoverMinutes: 0
        }
    });
    assert(t?._id);

    const categories = [];
    for (let i = 0; i < categoriesCount; i++) {
        categories.push(await createCategoryFlow(t._id, i));
    }

    const scheduled = await j('POST', `/api/matches/tournament/${t._id}/schedule/global`, {
        startAt: new Date().toISOString(),
        force: true,
        courtsCount,
        matchMinutes: 35,
        playerRestMinutes: 20,
        courtTurnoverMinutes: 0,
        fairnessGap: 1
    });

    assert.equal(typeof scheduled.scheduled, 'number');
    const allMatches = await j('GET', `/api/matches?tournamentId=${t._id}&round=group`);
    const scheduledMatches = allMatches.filter((m) => m.startAt && m.endAt && m.courtNumber);
    assert.equal(scheduledMatches.length, categoriesCount * ((playersPerCategory * (playersPerCategory - 1)) / 2));

    assertNoCourtOverlap(scheduledMatches, 0);
    assertPlayerRest(scheduledMatches, 20);

    const byCategoryTotal = scheduledMatches.reduce((acc, m) => {
        const key = String(m.categoryId);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});
    assert.equal(Object.keys(byCategoryTotal).length, categoriesCount);
    for (const category of categories) {
        assert.equal(byCategoryTotal[String(category._id)], (playersPerCategory * (playersPerCategory - 1)) / 2);
    }

    const firstStartAt = new Date(Math.min(...scheduledMatches.map((m) => new Date(m.startAt).getTime()))).toISOString();
    const firstWave = scheduledMatches.filter((m) => new Date(m.startAt).toISOString() === firstStartAt);
    const firstWaveByCategory = firstWave.reduce((acc, m) => {
        const key = String(m.categoryId);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});
    const firstWaveCounts = Object.values(firstWaveByCategory);
    const maxFirstWave = Math.max(...firstWaveCounts);
    const minFirstWave = Math.min(...firstWaveCounts);

    assert.equal(Object.keys(firstWaveByCategory).length, categoriesCount, 'every category should appear in first wave');
    assert(maxFirstWave - minFirstWave <= 1, 'first wave category distribution should stay within fairness gap 1');

    console.log('OK: global scheduler smoke passed');
    console.log({
        tournamentId: t._id,
        categories: categoriesCount,
        courtsCount,
        scheduled: scheduled.scheduled,
        firstWaveStartAt: firstStartAt,
        firstWaveCategoryDistribution: firstWaveByCategory,
        summary: scheduled.summary
    });
}

main().catch((e) => {
    console.error(e.message);
    process.exit(1);
});
