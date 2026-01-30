/**
 * Greedy scheduler (MVP):
 * - courtAvailableAt: mikortól szabad a pálya
 * - playerAvailableAt: mikortól szabad a játékos (pihenővel együtt)
 *
 * Egy meccshez kiválasztjuk azt a courtot, ahol a lehető legkorábbi kezdés adódik:
 * candidateStart = max(baseStart, courtAvailableAt[c], playerAvail[p1], playerAvail[p2])
 */
export function buildSchedule(matches, options) {
    const { startAt, courtsCount, matchMinutes, playerRestMinutes, courtTurnoverMinutes = 0 } = options;

    const baseStart = startAt.getTime();
    const matchMs = matchMinutes * 60 * 1000;
    const restMs = playerRestMinutes * 60 * 1000;
    const courtMs = courtTurnoverMinutes * 60 * 1000;

    const courtAvailableAt = Array.from({ length: courtsCount }, () => baseStart);
    const courtUseCount = Array.from({ length: courtsCount }, () => 0); // <-- új
    const playerAvailableAt = new Map();
    const getPAvail = (pid) => playerAvailableAt.get(pid) ?? baseStart;

    const scheduled = [];

    for (const m of matches) {
        const p1 = String(m.player1);
        const p2 = String(m.player2);

        let bestCourtIdx = 0;
        let bestStart = Number.POSITIVE_INFINITY;
        let bestUse = Number.POSITIVE_INFINITY;

        for (let c = 0; c < courtsCount; c++) {
            const candidateStart = Math.max(baseStart, courtAvailableAt[c], getPAvail(p1), getPAvail(p2));

            // 1) kisebb kezdés jobb
            // 2) ha azonos kezdés, kevesebbet használt pálya jobb
            if (
                candidateStart < bestStart ||
                (candidateStart === bestStart && courtUseCount[c] < bestUse)
            ) {
                bestStart = candidateStart;
                bestCourtIdx = c;
                bestUse = courtUseCount[c];
            }
        }

        const start = bestStart;
        const end = bestStart + matchMs;

        courtAvailableAt[bestCourtIdx] = end + courtMs;
        courtUseCount[bestCourtIdx] += 1; // <-- új
        playerAvailableAt.set(p1, end + restMs);
        playerAvailableAt.set(p2, end + restMs);

        scheduled.push({
            matchId: m._id,
            startAt: new Date(start),
            endAt: new Date(end),
            courtNumber: bestCourtIdx + 1
        });
    }

    return scheduled;
}
