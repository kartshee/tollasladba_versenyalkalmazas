export const SUPPORTED_PLAYOFF_SIZES = [2, 4, 8, 16, 32];
export const PLAYOFF_BRONZE_ROUND = 'playoff_bronze';

const ROUND_BY_SIZE = new Map([
    [32, 'playoff_round_of_32'],
    [16, 'playoff_round_of_16'],
    [8, 'playoff_quarter'],
    [4, 'playoff_semi'],
    [2, 'playoff_final']
]);

const SIZE_BY_ROUND = new Map([...ROUND_BY_SIZE.entries()].map(([size, round]) => [round, size]));

export function isSupportedPlayoffSize(value) {
    return SUPPORTED_PLAYOFF_SIZES.includes(Number(value));
}

export function getInitialPlayoffRoundName(size) {
    return ROUND_BY_SIZE.get(Number(size)) ?? null;
}

export function getPlayoffRoundSize(round) {
    return SIZE_BY_ROUND.get(round) ?? null;
}

export function getNextPlayoffRoundName(round) {
    const size = getPlayoffRoundSize(round);
    if (!size || size <= 2) return null;
    return ROUND_BY_SIZE.get(size / 2) ?? null;
}

export function isPlayoffRound(round) {
    return SIZE_BY_ROUND.has(round) || round === PLAYOFF_BRONZE_ROUND;
}

export function buildSeededBracketPairs(entries) {
    const items = [...entries];
    const size = items.length;
    if (!isSupportedPlayoffSize(size)) {
        throw new Error(`Unsupported playoff size: ${size}`);
    }

    const pairs = [];
    for (let i = 0; i < size / 2; i++) {
        pairs.push({
            player1: items[i],
            player2: items[size - 1 - i],
            bracketSlot: i + 1
        });
    }
    return pairs;
}

export function sortPlayoffRounds(roundA, roundB) {
    if (roundA === PLAYOFF_BRONZE_ROUND && roundB === PLAYOFF_BRONZE_ROUND) return 0;
    if (roundA === PLAYOFF_BRONZE_ROUND) return 1;
    if (roundB === PLAYOFF_BRONZE_ROUND) return -1;
    return (getPlayoffRoundSize(roundB) ?? 0) - (getPlayoffRoundSize(roundA) ?? 0);
}

export function findLatestGeneratedPlayoffRound(matches = []) {
    const rounds = [...new Set(matches.map((m) => m.round).filter((round) => isPlayoffRound(round)))].sort(sortPlayoffRounds);
    return rounds[rounds.length - 1] ?? null;
}

/** Két játékos azonosítójából sorrend-független, egyedi párkulcsot képez. */
export const makePairKey = (a, b) => {
    const x = String(a);
    const y = String(b);
    return x < y ? `${x}_${y}` : `${y}_${x}`;
};

/**
 * Bronzmeccs dokumentumot épít az elődöntők vesztesei alapján.
 * @param {{ tournamentId, categoryId, groupId, drawVersion, semifinalMatches }} params
 */
export function buildBronzeMatchDoc({ tournamentId, categoryId, groupId = null, drawVersion, semifinalMatches }) {
    if (!Array.isArray(semifinalMatches) || semifinalMatches.length !== 2) return null;

    const losers = semifinalMatches.map((match) => {
        const winner = String(match.winner);
        return winner === String(match.player1) ? match.player2 : match.player1;
    });

    if (losers.some((id) => !id)) return null;

    return {
        tournamentId,
        categoryId,
        groupId,
        player1: losers[0],
        player2: losers[1],
        pairKey: makePairKey(losers[0], losers[1]),
        round: PLAYOFF_BRONZE_ROUND,
        status: 'pending',
        roundNumber: 1,
        drawVersion: Number(drawVersion ?? 1),
        resultType: 'played',
        voided: false,
        voidReason: '',
        voidedAt: null,
        courtNumber: null,
        startAt: null,
        endAt: null,
        actualStartAt: null,
        actualEndAt: null,
        resultUpdatedAt: null,
        umpireName: '',
        sets: [],
        winner: null
    };
}

/**
 * Megkeresi azt a rájátszás-kört, amelyből a következő kör generálható.
 * Visszaad null-t, ha nincs ilyen (pl. a finálé már létezik, vagy a kör még nincs kész).
 */
export function findAdvancableRound(matches) {
    const rounds = [...new Set(matches.map((m) => m.round).filter((round) => isPlayoffRound(round)))].sort(sortPlayoffRounds);
    const sizes = new Set(rounds.map((round) => getPlayoffRoundSize(round)).filter(Boolean));
    const candidates = [...sizes].sort((a, b) => a - b);

    for (const size of candidates) {
        if (size <= 2) continue;
        if (sizes.has(size) && !sizes.has(size / 2)) {
            const currentRound = rounds.find((round) => getPlayoffRoundSize(round) === size);
            return { currentRound, nextRound: getNextPlayoffRoundName(currentRound) };
        }
    }

    return null;
}
