import { assertValidMatchRulesConfig } from './badmintonRules.service.js';
import { SUPPORTED_PLAYOFF_SIZES } from './playoff.service.js';

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

function parsePlayoffSizeOrNull(value, fieldName) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = parseIntField(value, fieldName, { min: 2, max: 64 });
    if (!SUPPORTED_PLAYOFF_SIZES.includes(parsed)) {
        throw new Error(`${fieldName} must be one of: ${SUPPORTED_PLAYOFF_SIZES.join(', ')}`);
    }
    return parsed;
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
        avoidSameClubEarly: false,
        entryFeeEnabled: false,
        entryFeeAmount: 0
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
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'entryFeeEnabled')) {
        out.entryFeeEnabled = parseBooleanField(source.entryFeeEnabled ?? false, 'config.entryFeeEnabled');
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'entryFeeAmount')) {
        const amount = Number(source.entryFeeAmount ?? 0);
        if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
            throw new Error('config.entryFeeAmount must be a number between 0 and 1000000');
        }
        out.entryFeeAmount = amount;
    }

    const enabled = out.entryFeeEnabled ?? source.entryFeeEnabled ?? false;
    const amount = out.entryFeeAmount ?? source.entryFeeAmount ?? 0;
    if (enabled && Number(amount) <= 0) {
        throw new Error('config.entryFeeAmount must be greater than 0 when entryFeeEnabled=true');
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
    if (Object.prototype.hasOwnProperty.call(source, 'multiTiePolicy')) {
        out.multiTiePolicy = parseEnumField(source.multiTiePolicy, 'multiTiePolicy', ['direct_only', 'direct_then_overall']);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'unresolvedTiePolicy')) {
        out.unresolvedTiePolicy = parseEnumField(source.unresolvedTiePolicy, 'unresolvedTiePolicy', ['shared_place', 'manual_override']);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'gender')) {
        out.gender = parseEnumField(source.gender, 'gender', ['male', 'female', 'mixed', 'other']);
    }
    if (Object.prototype.hasOwnProperty.call(source, 'ageGroup')) {
        out.ageGroup = typeof source.ageGroup === 'string' ? source.ageGroup.trim() : source.ageGroup;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'format')) {
        out.format = parseEnumField(source.format ?? 'group+playoff', 'format', ['group', 'group+playoff', 'playoff']);
    } else if (!partial) {
        out.format = 'group+playoff';
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'groupsCount')) {
        out.groupsCount = parseIntField(source.groupsCount ?? 1, 'groupsCount', { min: 1, max: 32 });
    }
    if (!partial || Object.prototype.hasOwnProperty.call(source, 'qualifiersPerGroup')) {
        out.qualifiersPerGroup = parseIntField(source.qualifiersPerGroup ?? 4, 'qualifiersPerGroup', { min: 1, max: 64 });
    }
    if (Object.prototype.hasOwnProperty.call(source, 'playoffSize') || !partial) {
        out.playoffSize = parsePlayoffSizeOrNull(source.playoffSize ?? null, 'playoffSize');
    }

    const format = out.format ?? source.format ?? 'group+playoff';
    const qualifiersPerGroup = out.qualifiersPerGroup ?? source.qualifiersPerGroup;
    const groupSizeTarget = out.groupSizeTarget ?? source.groupSizeTarget ?? 8;
    const playoffSize = out.playoffSize ?? source.playoffSize ?? null;

    if (format === 'group+playoff') {
        if (qualifiersPerGroup !== undefined && !SUPPORTED_PLAYOFF_SIZES.includes(Number(qualifiersPerGroup))) {
            throw new Error(`qualifiersPerGroup must be one of ${SUPPORTED_PLAYOFF_SIZES.join(', ')} when format=group+playoff`);
        }
        if (qualifiersPerGroup !== undefined && groupSizeTarget !== undefined && Number(qualifiersPerGroup) > Number(groupSizeTarget)) {
            throw new Error('qualifiersPerGroup cannot be greater than groupSizeTarget');
        }
        if (playoffSize !== null && Number(playoffSize) !== Number(qualifiersPerGroup)) {
            throw new Error('playoffSize must equal qualifiersPerGroup when format=group+playoff');
        }
        out.playoffSize = Number(qualifiersPerGroup);
    }

    if (format === 'playoff') {
        const effectivePlayoffSize = Number(playoffSize ?? qualifiersPerGroup ?? 0);
        if (!SUPPORTED_PLAYOFF_SIZES.includes(effectivePlayoffSize)) {
            throw new Error(`playoffSize must be one of ${SUPPORTED_PLAYOFF_SIZES.join(', ')} when format=playoff`);
        }
        out.playoffSize = effectivePlayoffSize;
        if (!partial || Object.prototype.hasOwnProperty.call(source, 'groupStageMatchesPerPlayer')) {
            out.groupStageMatchesPerPlayer = null;
        }
        if (!partial || Object.prototype.hasOwnProperty.call(source, 'groupsCount')) {
            out.groupsCount = 1;
        }
    }

    if (format === 'group' && playoffSize !== null && !SUPPORTED_PLAYOFF_SIZES.includes(Number(playoffSize))) {
        throw new Error(`playoffSize must be one of ${SUPPORTED_PLAYOFF_SIZES.join(', ')}`);
    }

    return out;
}
