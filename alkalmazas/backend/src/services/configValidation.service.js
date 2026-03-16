import { assertValidMatchRulesConfig } from './badmintonRules.service.js';

function parseIntField(value, fieldName, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
        throw new Error(`${fieldName} must be an integer between ${min} and ${max}`);
    }
    return n;
}

function parseNonNegativeIntOrNull(value, fieldName, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
    if (value === null) return null;
    return parseIntField(value, fieldName, { min, max });
}

function parseBooleanField(value, fieldName) {
    if (typeof value !== 'boolean') {
        throw new Error(`${fieldName} must be a boolean`);
    }
    return value;
}

function parseEnumField(value, fieldName, allowed) {
    if (!allowed.includes(value)) {
        throw new Error(`${fieldName} must be one of: ${allowed.join(', ')}`);
    }
    return value;
}

export function normalizeTournamentConfig(raw = {}, { partial = false } = {}) {
    const source = raw ?? {};
    const out = partial ? {} : {
        matchRules: assertValidMatchRulesConfig({}),
        estimatedMatchMinutes: 35,
        minRestPlayerMinutes: 20,
        minRestRefereeMinutes: 10,
        courtTurnoverMinutes: 0,
        courtsCount: 1,
        checkInGraceMinutesDefault: 40,
        lateNoShowPolicy: 'void',
        avoidSameClubEarly: false
    };

    if (!partial || Object.prototype.hasOwnProperty.call(source, 'matchRules')) {
        out.matchRules = assertValidMatchRulesConfig(source.matchRules ?? {});
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'estimatedMatchMinutes')) {
        out.estimatedMatchMinutes = parseIntField(source.estimatedMatchMinutes ?? 35, 'config.estimatedMatchMinutes', { min: 1, max: 240 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'minRestPlayerMinutes')) {
        out.minRestPlayerMinutes = parseIntField(source.minRestPlayerMinutes ?? 20, 'config.minRestPlayerMinutes', { min: 0, max: 240 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'minRestRefereeMinutes')) {
        out.minRestRefereeMinutes = parseIntField(source.minRestRefereeMinutes ?? 10, 'config.minRestRefereeMinutes', { min: 0, max: 240 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'courtTurnoverMinutes')) {
        out.courtTurnoverMinutes = parseIntField(source.courtTurnoverMinutes ?? 0, 'config.courtTurnoverMinutes', { min: 0, max: 120 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'courtsCount')) {
        out.courtsCount = parseIntField(source.courtsCount ?? 1, 'config.courtsCount', { min: 1, max: 50 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'checkInGraceMinutesDefault')) {
        out.checkInGraceMinutesDefault = parseIntField(source.checkInGraceMinutesDefault ?? 40, 'config.checkInGraceMinutesDefault', { min: 0, max: 240 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'lateNoShowPolicy')) {
        out.lateNoShowPolicy = parseEnumField(source.lateNoShowPolicy ?? 'void', 'config.lateNoShowPolicy', ['void']);
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'avoidSameClubEarly')) {
        out.avoidSameClubEarly = parseBooleanField(source.avoidSameClubEarly ?? false, 'config.avoidSameClubEarly');
    }

    return out;
}

export function normalizeTournamentPayload(raw = {}, { partial = false } = {}) {
    const source = raw ?? {};
    const out = partial ? {} : {};

    if (!partial || Object.prototype.hasOwnProperty.call(source, 'name')) {
        const name = typeof source.name === 'string' ? source.name.trim() : '';
        if (!name) throw new Error('name is required');
        out.name = name;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'date')) {
        if (source.date === null || source.date === '') out.date = null;
        else {
            const parsed = new Date(source.date);
            if (Number.isNaN(parsed.getTime())) throw new Error('date must be a valid date');
            out.date = parsed;
        }
    }
    if (Object.prototype.hasOwnProperty.call(source, 'location')) {
        out.location = source.location ?? '';
    }
    if (Object.prototype.hasOwnProperty.call(source, 'status')) {
        out.status = parseEnumField(source.status, 'status', ['draft', 'running', 'finished']);
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'config')) {
        out.config = normalizeTournamentConfig(source.config ?? {}, { partial: false });
    }
    if (Object.prototype.hasOwnProperty.call(source, 'referees')) {
        if (!Array.isArray(source.referees)) throw new Error('referees must be an array');
        out.referees = source.referees.map((r, idx) => {
            const name = typeof r?.name === 'string' ? r.name.trim() : '';
            if (!name) throw new Error(`referees[${idx}].name is required`);
            return { name };
        });
    }

    return out;
}

export function normalizeCategoryPayload(raw = {}, { partial = false } = {}) {
    const source = raw ?? {};
    const out = partial ? {} : {};

    if (!partial || Object.prototype.hasOwnProperty.call(source, 'name')) {
        const name = typeof source.name === 'string' ? source.name.trim() : '';
        if (!name) throw new Error('category.name is required');
        out.name = name;
    }

    if (Object.prototype.hasOwnProperty.call(source, 'groupStageMatchesPerPlayer')) {
        out.groupStageMatchesPerPlayer = parseNonNegativeIntOrNull(source.groupStageMatchesPerPlayer, 'groupStageMatchesPerPlayer', { min: 1, max: 100 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'groupSizeTarget')) {
        out.groupSizeTarget = parseIntField(source.groupSizeTarget ?? 8, 'groupSizeTarget', { min: 2, max: 64 });
    }
    if (Object.prototype.hasOwnProperty.call(source, 'walkoverPolicy')) {
        out.walkoverPolicy = parseEnumField(source.walkoverPolicy, 'walkoverPolicy', ['count_win_exclude_tiebreak', 'count_win_include_tiebreak']);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'incompletePolicy')) {
        out.incompletePolicy = parseEnumField(source.incompletePolicy, 'incompletePolicy', ['delete_results', 'keep_results']);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'gender')) {
        out.gender = parseEnumField(source.gender, 'gender', ['male', 'female', 'mixed', 'other']);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'ageGroup')) {
        out.ageGroup = source.ageGroup ?? '';
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'format')) {
        out.format = parseEnumField(source.format ?? 'group+playoff', 'format', ['group', 'group+playoff']);
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'groupsCount')) {
        out.groupsCount = parseIntField(source.groupsCount ?? 1, 'groupsCount', { min: 1, max: 64 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'qualifiersPerGroup')) {
        out.qualifiersPerGroup = parseIntField(source.qualifiersPerGroup ?? 4, 'qualifiersPerGroup', { min: 1, max: 64 });
    }

    const format = out.format ?? source.format;
    const qualifiersPerGroup = out.qualifiersPerGroup ?? source.qualifiersPerGroup;
    const groupSizeTarget = out.groupSizeTarget ?? source.groupSizeTarget;

    if (format === 'group+playoff' && qualifiersPerGroup !== undefined && ![2, 4].includes(Number(qualifiersPerGroup))) {
        throw new Error('qualifiersPerGroup must be 2 or 4 when format=group+playoff');
    }

    if (format === 'group+playoff' && qualifiersPerGroup !== undefined && groupSizeTarget !== undefined && Number(qualifiersPerGroup) > Number(groupSizeTarget)) {
        throw new Error('qualifiersPerGroup cannot be greater than groupSizeTarget');
    }

    return out;
}
