export function createEmptyStat(player) {
    return {
        player,
        wins: 0,
        played: 0,
        setDiff: 0,
        pointDiff: 0
    };
}

export function buildStatsMap(groupPlayers, finishedMatches) {
    const stats = {};

    groupPlayers.forEach((p) => {
        stats[String(p._id)] = createEmptyStat(p);
    });

    for (const m of finishedMatches) {
        const p1 = String(m.player1);
        const p2 = String(m.player2);
        if (!stats[p1] || !stats[p2]) continue;

        stats[p1].played++;
        stats[p2].played++;

        const w = m.winner ? String(m.winner) : null;
        if (w && stats[w]) stats[w].wins++;

        const type = m.resultType ?? 'played';
        const sets = Array.isArray(m.sets) ? m.sets : [];

        if (type === 'played' && sets.length >= 2) {
            let p1Set = 0;
            let p2Set = 0;
            let p1Pts = 0;
            let p2Pts = 0;

            for (const s of sets) {
                p1Pts += s.p1;
                p2Pts += s.p2;
                if (s.p1 > s.p2) p1Set++;
                else p2Set++;
            }

            stats[p1].setDiff += (p1Set - p2Set);
            stats[p2].setDiff += (p2Set - p1Set);

            stats[p1].pointDiff += (p1Pts - p2Pts);
            stats[p2].pointDiff += (p2Pts - p1Pts);
        }
    }

    return stats;
}

export function winRate(stat) {
    return stat.played > 0 ? stat.wins / stat.played : 0;
}

export function compareByPrimaryStats(a, b) {
    const winRateDiff = winRate(b) - winRate(a);
    if (winRateDiff !== 0) return winRateDiff;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return 0;
}

export function compareBySetPointAndName(a, b) {
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;

    const nameA = String(a.player?.name ?? '');
    const nameB = String(b.player?.name ?? '');
    const byName = nameA.localeCompare(nameB, 'hu');
    if (byName !== 0) return byName;

    return String(a.player?._id).localeCompare(String(b.player?._id));
}

export function groupByComparator(sortedItems, comparator) {
    const groups = [];

    for (const item of sortedItems) {
        const last = groups[groups.length - 1];
        if (!last || comparator(last[0], item) !== 0) groups.push([item]);
        else last.push(item);
    }

    return groups;
}

export function findHeadToHeadWinner(playerAId, playerBId, finishedMatches) {
    const match = finishedMatches.find((m) => {
        const x = String(m.player1);
        const y = String(m.player2);
        return (
            (x === String(playerAId) && y === String(playerBId)) ||
            (x === String(playerBId) && y === String(playerAId))
        );
    });

    return match?.winner ? String(match.winner) : null;
}

export function resolveTieBlock(entries, finishedMatches) {
    if (entries.length <= 1) return [...entries];

    if (entries.length === 2) {
        const [a, b] = entries;
        const winner = findHeadToHeadWinner(a.player._id, b.player._id, finishedMatches);
        if (winner === String(a.player._id)) return [a, b];
        if (winner === String(b.player._id)) return [b, a];
        return [...entries].sort(compareBySetPointAndName);
    }

    const tiedPlayers = entries.map((entry) => entry.player);
    const tiedIds = new Set(tiedPlayers.map((p) => String(p._id)));
    const directMatches = finishedMatches.filter((m) => (
        tiedIds.has(String(m.player1)) && tiedIds.has(String(m.player2))
    ));

    const miniStatsMap = buildStatsMap(tiedPlayers, directMatches);
    const decorated = entries.map((entry) => ({
        entry,
        mini: miniStatsMap[String(entry.player._id)] ?? createEmptyStat(entry.player)
    }));

    decorated.sort((x, y) => {
        const primary = compareByPrimaryStats(x.mini, y.mini);
        if (primary !== 0) return primary;
        if (y.mini.setDiff !== x.mini.setDiff) return y.mini.setDiff - x.mini.setDiff;
        if (y.mini.pointDiff !== x.mini.pointDiff) return y.mini.pointDiff - x.mini.pointDiff;
        return 0;
    });

    const grouped = groupByComparator(decorated, (x, y) => {
        const primary = compareByPrimaryStats(x.mini, y.mini);
        if (primary !== 0) return primary;
        if (x.mini.setDiff !== y.mini.setDiff) return x.mini.setDiff - y.mini.setDiff;
        if (x.mini.pointDiff !== y.mini.pointDiff) return x.mini.pointDiff - y.mini.pointDiff;
        return 0;
    });

    const resolved = [];
    for (const block of grouped) {
        if (block.length === 1) {
            resolved.push(block[0].entry);
            continue;
        }

        if (block.length === 2) {
            const pairResolved = resolveTieBlock(block.map((x) => x.entry), directMatches);
            resolved.push(...pairResolved);
            continue;
        }

        resolved.push(...block.map((x) => x.entry).sort(compareBySetPointAndName));
    }

    return resolved;
}

export function computeStandings(groupPlayers, finishedMatches) {
    const statsMap = buildStatsMap(groupPlayers, finishedMatches);
    const list = Object.values(statsMap);

    list.sort(compareByPrimaryStats);

    const grouped = groupByComparator(list, compareByPrimaryStats);
    const resolved = [];

    for (const block of grouped) {
        if (block.length === 1) resolved.push(block[0]);
        else resolved.push(...resolveTieBlock(block, finishedMatches));
    }

    return resolved;
}
