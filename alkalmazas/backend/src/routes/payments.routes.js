import { Router } from 'express';
import mongoose from 'mongoose';
import PaymentGroup from '../models/PaymentGroup.js';
import Entry from '../models/Entry.js';
import { assertTournamentOwned, getOwnedTournamentIds, isValidObjectId } from '../services/ownership.service.js';
import { AUDIT_SNAPSHOT_FIELDS, pickAuditFields, safeRecordAuditEvent } from '../services/audit.service.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const PAYMENT_METHODS = ['unknown', 'cash', 'bank_transfer', 'card', 'other'];

function normalizePaymentMethod(value) {
    if (value === undefined || value === null || value === '') return 'unknown';
    if (!PAYMENT_METHODS.includes(value)) {
        throw new Error(`A fizetési mód csak ezek egyike lehet: ${PAYMENT_METHODS.join(', ')}`);
    }
    return value;
}


/**
 * A fizetési csoport tagságát és a kapcsolt nevezések befizetett állapotát szinkronban tartja.
 */
async function syncPaymentGroupEntries(group, entryIds = []) {
    const uniqueIds = [...new Set(entryIds.map(String))];
    const entries = uniqueIds.length > 0
        ? await Entry.find({ _id: { $in: uniqueIds }, tournamentId: group.tournamentId }).select('_id tournamentId')
        : [];

    if (entries.length !== uniqueIds.length) {
        throw new Error('A megadott nevezések között van érvénytelen ehhez a versenyhez.');
    }

    await Entry.updateMany(
        { paymentGroupId: group._id, _id: { $nin: uniqueIds } },
        { $set: { paymentGroupId: null } }
    );

    if (uniqueIds.length > 0) {
        await Entry.updateMany(
            { _id: { $in: uniqueIds } },
            { $set: { paymentGroupId: group._id, paid: Boolean(group.paid), paymentMethod: group.paymentMethod ?? 'unknown' } }
        );
    }
}

/** A fizetési csoportokhoz tartozó nevezések darabszámát és összegét számolja ki. */
async function getPaymentGroupStats(groupIds = []) {
    if (groupIds.length === 0) return new Map();

    const stats = await Entry.aggregate([
        { $match: { paymentGroupId: { $in: groupIds } } },
        {
            $group: {
                _id: '$paymentGroupId',
                entriesCount: { $sum: 1 },
                paidEntriesCount: {
                    $sum: {
                        $cond: [{ $eq: ['$paid', true] }, 1, 0]
                    }
                },
                totalAmount: { $sum: { $ifNull: ['$feeAmount', 0] } }
            }
        }
    ]);

    return new Map(stats.map((row) => [String(row._id), row]));
}

async function loadOwnedPaymentGroup(groupId, userId) {
    if (!isValidObjectId(groupId)) return { group: null, tournament: null };
    const group = await PaymentGroup.findById(groupId);
    if (!group) return { group: null, tournament: null };
    const tournament = await assertTournamentOwned(group.tournamentId, userId);
    if (!tournament) return { group: null, tournament: null };
    return { group, tournament };
}

router.get('/', async (req, res) => {
    const filter = {};

    if (req.query.tournamentId) {
        if (!isValidId(req.query.tournamentId)) return res.status(400).json({ error: 'Érvénytelen versenyazonosító.' });
        const t = await assertTournamentOwned(req.query.tournamentId, req.user._id, { lean: true });
        if (!t) return res.json([]);
        filter.tournamentId = req.query.tournamentId;
    } else {
        filter.tournamentId = { $in: await getOwnedTournamentIds(req.user._id) };
    }

    if (req.query.paid === 'true') filter.paid = true;
    if (req.query.paid === 'false') filter.paid = false;

    const groups = await PaymentGroup.find(filter).sort({ createdAt: -1, _id: -1 }).lean();
    const ids = groups.map((g) => g._id);
    const statsMap = await getPaymentGroupStats(ids);

    res.json(groups.map((g) => {
        const stats = statsMap.get(String(g._id));
        return {
            ...g,
            entriesCount: stats?.entriesCount ?? 0,
            paidEntriesCount: stats?.paidEntriesCount ?? 0,
            totalAmount: stats?.totalAmount ?? 0
        };
    }));
});

router.post('/', async (req, res) => {
    try {
        const { tournamentId, payerName, billingName = '', billingAddress = '', paid = false, paymentMethod = 'unknown', note = '', entryIds = [] } = req.body ?? {};
        if (!tournamentId || !isValidId(tournamentId)) return res.status(400).json({ error: 'Érvénytelen versenyazonosító.' });
        if (!payerName || typeof payerName !== 'string' || !payerName.trim()) return res.status(400).json({ error: 'A fizető neve kötelező.' });
        if (typeof paid !== 'boolean') return res.status(400).json({ error: 'A befizetett állapot csak igaz vagy hamis érték lehet.' });

        const tournament = await assertTournamentOwned(tournamentId, req.user._id);
        if (!tournament) return res.status(404).json({ error: 'A verseny nem található.' });
        if (tournament.status === 'finished') return res.status(409).json({ error: 'A verseny már lezárt.' });

        const group = await PaymentGroup.create({
            tournamentId,
            payerName: payerName.trim(),
            billingName: typeof billingName === 'string' ? billingName.trim() : '',
            billingAddress: typeof billingAddress === 'string' ? billingAddress.trim() : '',
            paid,
            paymentMethod: normalizePaymentMethod(paymentMethod),
            note: typeof note === 'string' ? note.trim() : ''
        });

        await syncPaymentGroupEntries(group, Array.isArray(entryIds) ? entryIds : []);

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId,
            entityType: 'paymentGroup',
            entityId: group._id,
            action: 'payment_group.created',
            summary: `Payment group created: ${group.payerName}`,
            after: pickAuditFields(group, AUDIT_SNAPSHOT_FIELDS.paymentGroup),
            metadata: { entryIds }
        });

        const populated = await PaymentGroup.findById(group._id).lean();
        res.status(201).json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.patch('/:id', async (req, res) => {
    const { group, tournament } = await loadOwnedPaymentGroup(req.params.id, req.user._id);
    if (!group) return res.status(404).json({ error: 'A fizetési csoport nem található.' });
    if (tournament.status === 'finished') return res.status(409).json({ error: 'A verseny már lezárt.' });

    try {
        const before = pickAuditFields(group, AUDIT_SNAPSHOT_FIELDS.paymentGroup);
        const { payerName, billingName, billingAddress, paid, paymentMethod, note, entryIds } = req.body ?? {};

        if (payerName !== undefined) {
            if (typeof payerName !== 'string' || !payerName.trim()) return res.status(400).json({ error: 'A fizető neve kötelező.' });
            group.payerName = payerName.trim();
        }
        if (billingName !== undefined) group.billingName = typeof billingName === 'string' ? billingName.trim() : '';
        if (billingAddress !== undefined) group.billingAddress = typeof billingAddress === 'string' ? billingAddress.trim() : '';
        if (paid !== undefined) {
            if (typeof paid !== 'boolean') return res.status(400).json({ error: 'A befizetett állapot csak igaz vagy hamis érték lehet.' });
            group.paid = paid;
        }
        if (paymentMethod !== undefined) group.paymentMethod = normalizePaymentMethod(paymentMethod);
        if (note !== undefined) group.note = typeof note === 'string' ? note.trim() : '';

        await group.save();

        if (entryIds !== undefined) {
            await syncPaymentGroupEntries(group, Array.isArray(entryIds) ? entryIds : []);
        } else {
            await Entry.updateMany({ paymentGroupId: group._id }, { $set: { paid: Boolean(group.paid), paymentMethod: group.paymentMethod ?? 'unknown' } });
        }

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: group.tournamentId,
            entityType: 'paymentGroup',
            entityId: group._id,
            action: 'payment_group.updated',
            summary: `Payment group updated: ${group.payerName}`,
            before,
            after: pickAuditFields(group, AUDIT_SNAPSHOT_FIELDS.paymentGroup),
            metadata: { entryIds: Array.isArray(entryIds) ? entryIds : undefined, syncPaidToEntries: true }
        });

        const populated = await PaymentGroup.findById(group._id).lean();
        res.json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
