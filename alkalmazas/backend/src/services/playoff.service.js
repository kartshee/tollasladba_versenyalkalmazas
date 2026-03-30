export const SUPPORTED_PLAYOFF_SIZES = [2, 4, 8, 16, 32];

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
    return SIZE_BY_ROUND.has(round);
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
    return (getPlayoffRoundSize(roundB) ?? 0) - (getPlayoffRoundSize(roundA) ?? 0);
}

export function findLatestGeneratedPlayoffRound(matches = []) {
    const rounds = [...new Set(matches.map((m) => m.round).filter((round) => isPlayoffRound(round)))].sort(sortPlayoffRounds);
    return rounds[rounds.length - 1] ?? null;
}
