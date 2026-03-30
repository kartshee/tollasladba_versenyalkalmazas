import AuditLog from '../models/AuditLog.js';

export const AUDIT_SNAPSHOT_FIELDS = {
    tournament: ['_id', 'name', 'ownerId', 'date', 'location', 'status', 'config', 'referees', 'createdAt', 'updatedAt'],
    category: [
        '_id', 'tournamentId', 'name', 'status', 'drawLockedAt', 'drawVersion', 'checkIn',
        'groupStageMatchesPerPlayer', 'groupSizeTarget', 'walkoverPolicy', 'incompletePolicy',
        'multiTiePolicy', 'unresolvedTiePolicy',
        'gender', 'ageGroup', 'format', 'groupsCount', 'qualifiersPerGroup', 'playoffSize', 'createdAt', 'updatedAt'
    ],
    player: ['_id', 'tournamentId', 'categoryId', 'name', 'club', 'note', 'checkedInAt', 'mainEligibility', 'createdAt', 'updatedAt'],
    group: ['_id', 'tournamentId', 'categoryId', 'name', 'players', 'withdrawals'],
    match: [
        '_id', 'tournamentId', 'categoryId', 'groupId', 'player1', 'player2', 'pairKey', 'round', 'status',
        'roundNumber', 'drawVersion', 'resultType', 'voided', 'voidReason', 'voidedAt', 'courtNumber',
        'startAt', 'endAt', 'actualStartAt', 'actualEndAt', 'resultUpdatedAt', 'umpireName', 'sets', 'winner', 'createdAt', 'updatedAt'
    ],
    entry: ['_id', 'tournamentId', 'categoryId', 'playerId', 'feeAmount', 'paid', 'billingName', 'billingAddress', 'paymentGroupId', 'createdAt', 'updatedAt'],
    paymentGroup: ['_id', 'tournamentId', 'payerName', 'billingName', 'billingAddress', 'paid', 'note', 'createdAt', 'updatedAt']
};

function normalizeAuditData(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((item) => normalizeAuditData(item));

    if (typeof value === 'object') {
        if (value?._bsontype === 'ObjectId') return String(value);
        if (typeof value.toObject === 'function') {
            return normalizeAuditData(value.toObject({ depopulate: true, flattenMaps: true }));
        }
        if (typeof value.toJSON === 'function' && value.constructor?.name !== 'Object') {
            return normalizeAuditData(value.toJSON());
        }

        const out = {};
        for (const [key, val] of Object.entries(value)) {
            const normalized = normalizeAuditData(val);
            if (normalized !== undefined) out[key] = normalized;
        }
        return out;
    }

    return value;
}

export function pickAuditFields(source, fields = []) {
    const plain = normalizeAuditData(source);
    if (!plain || typeof plain !== 'object' || Array.isArray(plain)) return plain;

    const out = {};
    for (const field of fields) {
        if (Object.prototype.hasOwnProperty.call(plain, field)) {
            out[field] = plain[field];
        }
    }
    return out;
}

export function makeAuditMetadata(metadata = {}) {
    return normalizeAuditData(metadata) ?? {};
}

function normalizeId(value) {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
}

export async function recordAuditEvent({
    userId,
    tournamentId = null,
    categoryId = null,
    groupId = null,
    matchId = null,
    playerId = null,
    entityType,
    entityId = null,
    action,
    summary = '',
    before = null,
    after = null,
    metadata = {}
}) {
    if (!userId) throw new Error('recordAuditEvent requires userId');
    if (!entityType) throw new Error('recordAuditEvent requires entityType');
    if (!action) throw new Error('recordAuditEvent requires action');

    return AuditLog.create({
        userId,
        tournamentId,
        categoryId,
        groupId,
        matchId,
        playerId,
        entityType: String(entityType),
        entityId: normalizeId(entityId),
        action: String(action),
        summary: String(summary ?? ''),
        before: before === undefined ? null : normalizeAuditData(before),
        after: after === undefined ? null : normalizeAuditData(after),
        metadata: makeAuditMetadata(metadata)
    });
}

export async function safeRecordAuditEvent(payload) {
    try {
        return await recordAuditEvent(payload);
    } catch (err) {
        console.error('[audit] failed to write audit log:', err?.message || err);
        return null;
    }
}
