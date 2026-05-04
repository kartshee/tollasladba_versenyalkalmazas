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

export function compareBySetPoint(a, b) {
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    return 0;
}

function compareStable(a, b) {
    return String(a.player?._id ?? '').localeCompare(String(b.player?._id ?? ''));
}

function defaultStandingOptions(options = {}) {
    return {
        multiTiePolicy: options.multiTiePolicy ?? 'direct_then_overall',
        unresolvedTiePolicy: options.unresolvedTiePolicy ?? 'shared_place'
    };
}

function makeResult(entry, { unresolved = false, tieBlockId = null, reason = null } = {}) {
    return { entry, unresolved, tieBlockId, reason };
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

function resolveUnresolved(entries, nextTieBlockId, reason) {
    const tieBlockId = `tie_${nextTieBlockId()}`;
    return [...entries]
        .sort(compareStable)
        .map((entry) => makeResult(entry, { unresolved: true, tieBlockId, reason }));
}

function resolvePair(entries, directMatches, { allowOverallFallback, nextTieBlockId }) {
    const [a, b] = entries;
    const winner = findHeadToHeadWinner(a.player._id, b.player._id, directMatches);
    if (winner === String(a.player._id)) return [makeResult(a), makeResult(b)];
    if (winner === String(b.player._id)) return [makeResult(b), makeResult(a)];

    if (allowOverallFallback) {
        const overallDiff = compareBySetPoint(a, b);
        if (overallDiff !== 0) {
            return overallDiff < 0 ? [makeResult(a), makeResult(b)] : [makeResult(b), makeResult(a)];
        }
    }

    return resolveUnresolved(entries, nextTieBlockId, 'pair_unresolved');
}

function compareMiniDecorated(a, b, { useOverallFallback = false } = {}) {
    const primary = compareByPrimaryStats(a.mini, b.mini);
    if (primary !== 0) return primary;

    const miniSetPoint = compareBySetPoint(a.mini, b.mini);
    if (miniSetPoint !== 0) return miniSetPoint;

    if (useOverallFallback) {
        const overall = compareBySetPoint(a.entry, b.entry);
        if (overall !== 0) return overall;
    }

    return 0;
}

function resolveMulti(entries, finishedMatches, options, nextTieBlockId) {
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

    const useOverallFallback = options.multiTiePolicy === 'direct_then_overall';
    const miniComparator = (x, y) => compareMiniDecorated(x, y, { useOverallFallback });

    decorated.sort(miniComparator);
    const grouped = groupByComparator(decorated, miniComparator);

    const resolved = [];
    for (const block of grouped) {
        const blockEntries = block.map((x) => x.entry);

        if (blockEntries.length === 1) {
            resolved.push(makeResult(blockEntries[0]));
            continue;
        }

        if (blockEntries.length === 2) {
            resolved.push(...resolvePair(blockEntries, directMatches, {
                allowOverallFallback: options.multiTiePolicy === 'direct_then_overall',
                nextTieBlockId
            }));
            continue;
        }

        if (options.multiTiePolicy === 'direct_then_overall') {
            const byOverall = [...blockEntries].sort((a, b) => {
                const diff = compareBySetPoint(a, b);
                if (diff !== 0) return diff;
                return compareStable(a, b);
            });
            const overallBlocks = groupByComparator(byOverall, (a, b) => compareBySetPoint(a, b));
            for (const overallBlock of overallBlocks) {
                if (overallBlock.length === 1) resolved.push(makeResult(overallBlock[0]));
                else if (overallBlock.length === 2) resolved.push(...resolvePair(overallBlock, directMatches, { allowOverallFallback: true, nextTieBlockId }));
                else resolved.push(...resolveUnresolved(overallBlock, nextTieBlockId, 'multi_unresolved_after_overall'));
            }
            continue;
        }

        resolved.push(...resolveUnresolved(blockEntries, nextTieBlockId, 'multi_unresolved_direct_only'));
    }

    return resolved;
}

export function computeStandings(groupPlayers, finishedMatches, options = {}) {
    const opts = defaultStandingOptions(options);
    const statsMap = buildStatsMap(groupPlayers, finishedMatches);
    const list = Object.values(statsMap);

    list.sort(compareByPrimaryStats);

    const grouped = groupByComparator(list, compareByPrimaryStats);
    const resolved = [];
    let tieBlockSeq = 1;
    const nextTieBlockId = () => tieBlockSeq++;

    for (const block of grouped) {
        if (block.length === 1) {
            resolved.push(makeResult(block[0]));
            continue;
        }

        if (block.length === 2) {
            resolved.push(...resolvePair(block, finishedMatches, {
                allowOverallFallback: true,
                nextTieBlockId
            }));
            continue;
        }

        resolved.push(...resolveMulti(block, finishedMatches, opts, nextTieBlockId));
    }

    const standings = [];
    let cursor = 1;
    let idx = 0;

    while (idx < resolved.length) {
        const current = resolved[idx];
        if (!current.unresolved || !current.tieBlockId) {
            standings.push({
                ...current.entry,
                place: cursor,
                tieResolved: true,
                sharedPlace: false,
                tieBlockId: null,
                requiresManualResolution: false,
                tieReason: null
            });
            cursor += 1;
            idx += 1;
            continue;
        }

        const blockId = current.tieBlockId;
        const block = [];
        while (idx < resolved.length && resolved[idx].tieBlockId === blockId) {
            block.push(resolved[idx]);
            idx += 1;
        }

        for (const item of block) {
            standings.push({
                ...item.entry,
                place: cursor,
                tieResolved: false,
                sharedPlace: opts.unresolvedTiePolicy === 'shared_place',
                tieBlockId: blockId,
                requiresManualResolution: opts.unresolvedTiePolicy === 'manual_override',
                tieReason: item.reason ?? null
            });
        }
        cursor += block.length;
    }

    const blockSizes = standings.reduce((acc, entry) => {
        if (!entry.tieBlockId) return acc;
        acc[entry.tieBlockId] = (acc[entry.tieBlockId] ?? 0) + 1;
        return acc;
    }, {});

    return standings.map((entry) => ({
        ...entry,
        tieBlockSize: entry.tieBlockId ? (blockSizes[entry.tieBlockId] ?? 1) : 1
    }));
}

export function findCutoffTieBlock(standings, cutoffCount) {
    if (!Array.isArray(standings) || cutoffCount < 1 || standings.length < cutoffCount) return null;
    const cutoffEntry = standings[cutoffCount - 1];
    if (!cutoffEntry?.tieBlockId) return null;

    const tieBlock = standings.filter((entry) => entry.tieBlockId === cutoffEntry.tieBlockId);
    if (tieBlock.length === 0) return null;

    const startIndex = standings.findIndex((entry) => entry.tieBlockId === cutoffEntry.tieBlockId);
    const endIndex = standings.length - 1 - [...standings].reverse().findIndex((entry) => entry.tieBlockId === cutoffEntry.tieBlockId);

    if (startIndex < cutoffCount && endIndex >= cutoffCount) {
        return tieBlock;
    }

    return null;
}
