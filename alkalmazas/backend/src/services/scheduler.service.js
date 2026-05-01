/**
 * Greedy scheduler (MVP):
 * - courtAvailableAt: mikortól szabad a pálya
 * - playerAvailableAt: mikortól szabad a játékos (pihenővel együtt)
 *
 * Egy meccshez kiválasztjuk azt a courtot, ahol a lehető legkorábbi kezdés adódik:
 * candidateStart = max(baseStart, courtAvailableAt[c], playerAvail[p1], playerAvail[p2])
 */
function toMs(value, fallback = null) {
    const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(ms) ? ms : fallback;
}

function createScheduleState(options) {
    const { startAt, courtsCount, matchMinutes, playerRestMinutes, courtTurnoverMinutes = 0 } = options;

    const baseStart = startAt.getTime();
    const matchMs = matchMinutes * 60 * 1000;
    const restMs = playerRestMinutes * 60 * 1000;
    const courtMs = courtTurnoverMinutes * 60 * 1000;

    return {
        baseStart,
        matchMs,
        restMs,
        courtMs,
        courtAvailableAt: Array.from({ length: courtsCount }, () => baseStart),
        courtUseCount: Array.from({ length: courtsCount }, () => 0),
        playerAvailableAt: new Map(),
        categoryScheduledCount: new Map(),
        lastCategoryOrder: new Map(),
        sequence: 0
    };
}

function getPlayerAvailableAt(state, playerId) {
    return state.playerAvailableAt.get(String(playerId)) ?? state.baseStart;
}

function bumpCategoryCount(state, categoryId) {
    const key = String(categoryId);
    state.categoryScheduledCount.set(key, (state.categoryScheduledCount.get(key) ?? 0) + 1);
    state.lastCategoryOrder.set(key, state.sequence++);
}

function seedScheduleState(state, existingMatches = []) {
    for (const m of existingMatches) {
        const p1 = String(m.player1);
        const p2 = String(m.player2);
        const endMs = toMs(m.endAt);
        const courtNumber = Number(m.courtNumber);

        if (Number.isFinite(endMs)) {
            const p1Avail = Math.max(getPlayerAvailableAt(state, p1), endMs + state.restMs);
            const p2Avail = Math.max(getPlayerAvailableAt(state, p2), endMs + state.restMs);
            state.playerAvailableAt.set(p1, p1Avail);
            state.playerAvailableAt.set(p2, p2Avail);
        }

        if (Number.isInteger(courtNumber) && courtNumber >= 1 && courtNumber <= state.courtAvailableAt.length && Number.isFinite(endMs)) {
            const idx = courtNumber - 1;
            state.courtAvailableAt[idx] = Math.max(state.courtAvailableAt[idx], endMs + state.courtMs);
            state.courtUseCount[idx] += 1;
        }

        if (m.categoryId && (!m.round || m.round === 'group')) {
            bumpCategoryCount(state, m.categoryId);
        }
    }
}

function findBestPlacement(state, match) {
    const p1 = String(match.player1);
    const p2 = String(match.player2);

    let bestCourtIdx = 0;
    let bestStart = Number.POSITIVE_INFINITY;
    let bestUse = Number.POSITIVE_INFINITY;

    for (let c = 0; c < state.courtAvailableAt.length; c++) {
        const candidateStart = Math.max(
            state.baseStart,
            state.courtAvailableAt[c],
            getPlayerAvailableAt(state, p1),
            getPlayerAvailableAt(state, p2)
        );

        if (
            candidateStart < bestStart ||
            (candidateStart === bestStart && state.courtUseCount[c] < bestUse)
        ) {
            bestStart = candidateStart;
            bestCourtIdx = c;
            bestUse = state.courtUseCount[c];
        }
    }

    return {
        matchId: match._id,
        categoryId: match.categoryId,
        player1: match.player1,
        player2: match.player2,
        startAtMs: bestStart,
        endAtMs: bestStart + state.matchMs,
        courtIdx: bestCourtIdx,
        courtNumber: bestCourtIdx + 1,
        roundNumber: match.roundNumber ?? Number.MAX_SAFE_INTEGER,
        createdAtMs: toMs(match.createdAt, 0) ?? 0
    };
}

function applyPlacement(state, placement) {
    const end = placement.endAtMs;
    const p1 = String(placement.player1);
    const p2 = String(placement.player2);

    state.courtAvailableAt[placement.courtIdx] = end + state.courtMs;
    state.courtUseCount[placement.courtIdx] += 1;
    state.playerAvailableAt.set(p1, end + state.restMs);
    state.playerAvailableAt.set(p2, end + state.restMs);
    bumpCategoryCount(state, placement.categoryId);
}


function normalizeRefereeNames(referees = []) {
    return referees
        .map((referee) => (typeof referee === 'string' ? referee : referee?.name))
        .filter((name) => typeof name === 'string' && name.trim())
        .map((name) => name.trim());
}

/**
 * Játékvezetői rotáció:
 * - csak akkor oszt be automatikusan, ha van megadott játékvezetőlista;
 * - a kevesebbet használt, az adott időpontra már elérhető játékvezetőt preferálja;
 * - ha mindenki pihenőidőn belül lenne, akkor a legkorábban felszabadulót választja.
 */
export function assignUmpiresToPlan(plan = [], referees = [], options = {}) {
    const names = normalizeRefereeNames(referees);
    if (names.length === 0) return plan;

    const minRestMs = Number(options.minRestRefereeMinutes ?? 10) * 60 * 1000;
    const refereeAvailableAt = new Map(names.map((name) => [name, 0]));
    const refereeUseCount = new Map(names.map((name) => [name, 0]));

    return [...plan]
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
        .map((item) => {
            const startMs = new Date(item.startAt).getTime();
            const endMs = new Date(item.endAt).getTime();

            const candidates = names.map((name) => ({
                name,
                availableAt: refereeAvailableAt.get(name) ?? 0,
                useCount: refereeUseCount.get(name) ?? 0
            }));

            candidates.sort((a, b) => {
                const aReady = a.availableAt <= startMs;
                const bReady = b.availableAt <= startMs;
                if (aReady !== bReady) return aReady ? -1 : 1;
                if (a.useCount !== b.useCount) return a.useCount - b.useCount;
                if (a.availableAt !== b.availableAt) return a.availableAt - b.availableAt;
                return a.name.localeCompare(b.name, 'hu');
            });

            const chosen = candidates[0];
            refereeAvailableAt.set(chosen.name, endMs + minRestMs);
            refereeUseCount.set(chosen.name, chosen.useCount + 1);

            return {
                ...item,
                umpireName: chosen.name
            };
        });
}


export function buildSchedule(matches, options) {
    const state = createScheduleState(options);
    const scheduled = [];

    for (const m of matches) {
        const placement = findBestPlacement(state, m);
        applyPlacement(state, placement);

        scheduled.push({
            matchId: m._id,
            startAt: new Date(placement.startAtMs),
            endAt: new Date(placement.endAtMs),
            courtNumber: placement.courtNumber
        });
    }

    return scheduled;
}

export function buildGlobalSchedule(matches, options) {
    const { fairnessGap = 1, existingMatches = [] } = options;
    const state = createScheduleState(options);
    seedScheduleState(state, existingMatches);

    const queues = new Map();
    for (const match of matches) {
        const key = String(match.categoryId);
        if (!queues.has(key)) queues.set(key, []);
        queues.get(key).push(match);
        if (!state.categoryScheduledCount.has(key)) state.categoryScheduledCount.set(key, 0);
    }

    for (const queue of queues.values()) {
        queue.sort((a, b) => {
            const roundDiff = (a.roundNumber ?? Number.MAX_SAFE_INTEGER) - (b.roundNumber ?? Number.MAX_SAFE_INTEGER);
            if (roundDiff !== 0) return roundDiff;
            return (toMs(a.createdAt, 0) ?? 0) - (toMs(b.createdAt, 0) ?? 0);
        });
    }

    const scheduled = [];

    while (true) {
        const activeCategories = [...queues.entries()].filter(([, queue]) => queue.length > 0);
        if (activeCategories.length === 0) break;

        const candidates = activeCategories.map(([categoryId, queue]) => {
            const head = queue[0];
            const placement = findBestPlacement(state, head);
            return {
                categoryId,
                assignedCount: state.categoryScheduledCount.get(categoryId) ?? 0,
                lastCategoryOrder: state.lastCategoryOrder.get(categoryId) ?? -1,
                queue,
                match: head,
                placement
            };
        });

        const minAssigned = Math.min(...candidates.map((c) => c.assignedCount));
        const eligible = candidates.filter((c) => c.assignedCount <= minAssigned + fairnessGap);
        const pool = eligible.length > 0 ? eligible : candidates;

        pool.sort((a, b) => {
            if (a.placement.startAtMs !== b.placement.startAtMs) return a.placement.startAtMs - b.placement.startAtMs;
            if (a.assignedCount !== b.assignedCount) return a.assignedCount - b.assignedCount;
            if (a.lastCategoryOrder !== b.lastCategoryOrder) return a.lastCategoryOrder - b.lastCategoryOrder;
            if (a.placement.roundNumber !== b.placement.roundNumber) return a.placement.roundNumber - b.placement.roundNumber;
            if (a.placement.createdAtMs !== b.placement.createdAtMs) return a.placement.createdAtMs - b.placement.createdAtMs;
            return String(a.categoryId).localeCompare(String(b.categoryId));
        });

        const chosen = pool[0];
        applyPlacement(state, chosen.placement);
        chosen.queue.shift();

        scheduled.push({
            matchId: chosen.match._id,
            categoryId: chosen.categoryId,
            startAt: new Date(chosen.placement.startAtMs),
            endAt: new Date(chosen.placement.endAtMs),
            courtNumber: chosen.placement.courtNumber
        });
    }

    return scheduled;
}
