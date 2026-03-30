import { Router } from 'express';
import mongoose from 'mongoose';
import PaymentGroup from '../models/PaymentGroup.js';
import Entry from '../models/Entry.js';
import { assertTournamentOwned, getOwnedTournamentIds } from '../services/ownership.service.js';
import { AUDIT_SNAPSHOT_FIELDS, pickAuditFields, safeRecordAuditEvent } from '../services/audit.service.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function syncPaymentGroupEntries(group, entryIds = []) {
    const uniqueIds = [...new Set(entryIds.map(String))];
    const entries = uniqueIds.length > 0
        ? await Entry.find({ _id: { $in: uniqueIds }, tournamentId: group.tournamentId }).select('_id tournamentId')
        : [];

    if (entries.length !== uniqueIds.length) {
        throw new Error('One or more entryIds are invalid for this tournament');
    }

    await Entry.updateMany({ paymentGroupId: group._id, _id: { $nin: uniqueIds } }, { $set: { paymentGroupId: null } });
    if (uniqueIds.length > 0) {
        await Entry.updateMany({ _id: { $in: uniqueIds } }, { $set: { paymentGroupId: group._id } });
    }
}

async function loadOwnedPaymentGroup(groupId, userId) {
    const group = await PaymentGroup.findById(groupId);
    if (!group) return { group: null, tournament: null };
    const tournament = await assertTournamentOwned(group.tournamentId, userId);
    if (!tournament) return { group: null, tournament: null };
    return { group, tournament };
}

router.get('/', async (req, res) => {
    const filter = {};

    if (req.query.tournamentId) {
        if (!isValidId(req.query.tournamentId)) return res.status(400).json({ error: 'Invalid tournamentId' });
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
    const counts = ids.length > 0
        ? await Entry.aggregate([
            { $match: { paymentGroupId: { $in: ids } } },
            { $group: { _id: '$paymentGroupId', count: { $sum: 1 } } }
        ])
        : [];
    const countMap = new Map(counts.map((row) => [String(row._id), row.count]));

    res.json(groups.map((g) => ({ ...g, entriesCount: countMap.get(String(g._id)) ?? 0 })));
});

router.post('/', async (req, res) => {
    try {
        const { tournamentId, payerName, billingName = '', billingAddress = '', paid = false, note = '', entryIds = [] } = req.body ?? {};
        if (!tournamentId || !isValidId(tournamentId)) return res.status(400).json({ error: 'Invalid tournamentId' });
        if (!payerName || typeof payerName !== 'string' || !payerName.trim()) return res.status(400).json({ error: 'payerName is required' });
        if (typeof paid !== 'boolean') return res.status(400).json({ error: 'paid must be a boolean' });

        const tournament = await assertTournamentOwned(tournamentId, req.user._id);
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
        if (tournament.status === 'finished') return res.status(409).json({ error: 'Tournament finished' });

        const group = await PaymentGroup.create({
            tournamentId,
            payerName: payerName.trim(),
            billingName: typeof billingName === 'string' ? billingName.trim() : '',
            billingAddress: typeof billingAddress === 'string' ? billingAddress.trim() : '',
            paid,
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
    if (!group) return res.status(404).json({ error: 'Payment group not found' });
    if (tournament.status === 'finished') return res.status(409).json({ error: 'Tournament finished' });

    try {
        const before = pickAuditFields(group, AUDIT_SNAPSHOT_FIELDS.paymentGroup);
        const { payerName, billingName, billingAddress, paid, note, entryIds } = req.body ?? {};

        if (payerName !== undefined) {
            if (typeof payerName !== 'string' || !payerName.trim()) return res.status(400).json({ error: 'payerName is required' });
            group.payerName = payerName.trim();
        }
        if (billingName !== undefined) group.billingName = typeof billingName === 'string' ? billingName.trim() : '';
        if (billingAddress !== undefined) group.billingAddress = typeof billingAddress === 'string' ? billingAddress.trim() : '';
        if (paid !== undefined) {
            if (typeof paid !== 'boolean') return res.status(400).json({ error: 'paid must be a boolean' });
            group.paid = paid;
        }
        if (note !== undefined) group.note = typeof note === 'string' ? note.trim() : '';

        await group.save();
        if (entryIds !== undefined) await syncPaymentGroupEntries(group, Array.isArray(entryIds) ? entryIds : []);

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: group.tournamentId,
            entityType: 'paymentGroup',
            entityId: group._id,
            action: 'payment_group.updated',
            summary: `Payment group updated: ${group.payerName}`,
            before,
            after: pickAuditFields(group, AUDIT_SNAPSHOT_FIELDS.paymentGroup),
            metadata: { entryIds: Array.isArray(entryIds) ? entryIds : undefined }
        });

        const populated = await PaymentGroup.findById(group._id).lean();
        res.json(populated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
