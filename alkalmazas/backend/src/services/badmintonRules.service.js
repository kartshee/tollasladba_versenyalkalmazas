export const DEFAULT_MATCH_RULES = Object.freeze({
    bestOf: 3,
    pointsToWin: 21,
    winBy: 2,
    cap: 30
});

export function normalizeMatchRules(raw = {}) {
    const bestOf = [1, 3, 5].includes(Number(raw?.bestOf)) ? Number(raw.bestOf) : DEFAULT_MATCH_RULES.bestOf;
    const pointsToWin = Number.isInteger(Number(raw?.pointsToWin)) && Number(raw.pointsToWin) >= 1
        ? Number(raw.pointsToWin)
        : DEFAULT_MATCH_RULES.pointsToWin;
    const winBy = Number.isInteger(Number(raw?.winBy)) && Number(raw.winBy) >= 1
        ? Number(raw.winBy)
        : DEFAULT_MATCH_RULES.winBy;
    const cap = Number.isInteger(Number(raw?.cap)) && Number(raw.cap) >= pointsToWin
        ? Number(raw.cap)
        : DEFAULT_MATCH_RULES.cap;

    return { bestOf, pointsToWin, winBy, cap };
}

export function assertValidMatchRulesConfig(raw = {}) {
    const source = raw ?? {};

    if (source.bestOf !== undefined && ![1, 3, 5].includes(Number(source.bestOf))) {
        throw new Error('config.matchRules.bestOf must be one of: 1, 3, 5');
    }
    if (source.pointsToWin !== undefined && (!Number.isInteger(Number(source.pointsToWin)) || Number(source.pointsToWin) < 1)) {
        throw new Error('config.matchRules.pointsToWin must be an integer >= 1');
    }
    if (source.winBy !== undefined && (!Number.isInteger(Number(source.winBy)) || Number(source.winBy) < 1)) {
        throw new Error('config.matchRules.winBy must be an integer >= 1');
    }
    if (source.cap !== undefined && (!Number.isInteger(Number(source.cap)) || Number(source.cap) < 1)) {
        throw new Error('config.matchRules.cap must be an integer >= 1');
    }

    const bestOf = source.bestOf !== undefined ? Number(source.bestOf) : DEFAULT_MATCH_RULES.bestOf;
    const pointsToWin = source.pointsToWin !== undefined ? Number(source.pointsToWin) : DEFAULT_MATCH_RULES.pointsToWin;
    const winBy = source.winBy !== undefined ? Number(source.winBy) : DEFAULT_MATCH_RULES.winBy;
    const cap = source.cap !== undefined ? Number(source.cap) : DEFAULT_MATCH_RULES.cap;

    if (cap < pointsToWin) {
        throw new Error('config.matchRules.cap must be greater than or equal to pointsToWin');
    }

    return normalizeMatchRules({ bestOf, pointsToWin, winBy, cap });
}

export function setsToWin(matchRules = DEFAULT_MATCH_RULES) {
    const rules = normalizeMatchRules(matchRules);
    return Math.floor(rules.bestOf / 2) + 1;
}

export function isValidSet(p1, p2, matchRules = DEFAULT_MATCH_RULES) {
    const rules = normalizeMatchRules(matchRules);

    if (!Number.isInteger(p1) || !Number.isInteger(p2)) return false;
    if (p1 < 0 || p2 < 0) return false;
    if (p1 == p2) return false;

    const max = Math.max(p1, p2);
    const min = Math.min(p1, p2);

    if (max < rules.pointsToWin) return false;
    if (max > rules.cap) return false;

    if (max === rules.cap) {
        const minAllowedAtCap = Math.max(rules.pointsToWin - 1, rules.cap - rules.winBy);
        return min >= minAllowedAtCap && min < rules.cap;
    }

    return (max - min) >= rules.winBy;
}

export function determineMatchWinner(sets, player1, player2, matchRules = DEFAULT_MATCH_RULES) {
    const rules = normalizeMatchRules(matchRules);
    const needed = setsToWin(rules);

    let p1Sets = 0;
    let p2Sets = 0;

    for (const s of sets) {
        if (s.p1 > s.p2) p1Sets++;
        else if (s.p2 > s.p1) p2Sets++;

        if (p1Sets == needed) return player1;
        if (p2Sets == needed) return player2;
    }

    return null;
}

export function validateMatchResult(sets, matchRules = DEFAULT_MATCH_RULES) {
    const rules = normalizeMatchRules(matchRules);
    const needed = setsToWin(rules);

    if (!Array.isArray(sets)) {
        return { ok: false, error: 'sets must be an array' };
    }

    if (sets.length < needed || sets.length > rules.bestOf) {
        return {
            ok: false,
            error: `Match must have between ${needed} and ${rules.bestOf} sets for bestOf=${rules.bestOf}`
        };
    }

    let p1Sets = 0;
    let p2Sets = 0;

    for (let i = 0; i < sets.length; i++) {
        const s = sets[i];
        if (typeof s?.p1 !== 'number' || typeof s?.p2 !== 'number') {
            return { ok: false, error: 'Set points must be numbers', set: s, setIndex: i };
        }
        if (!isValidSet(s.p1, s.p2, rules)) {
            return { ok: false, error: 'Invalid set score', set: s, setIndex: i, rules };
        }

        if (s.p1 > s.p2) p1Sets++;
        else p2Sets++;

        const someoneAlreadyWon = p1Sets == needed || p2Sets == needed;
        if (someoneAlreadyWon && i < sets.length - 1) {
            return {
                ok: false,
                error: 'Too many sets provided after match winner was already decided',
                setIndex: i,
                rules
            };
        }
    }

    if (p1Sets != needed && p2Sets != needed) {
        return {
            ok: false,
            error: `No winner determined (need ${needed} won set${needed > 1 ? 's' : ''})`,
            rules
        };
    }

    return { ok: true, rules, p1Sets, p2Sets };
}
