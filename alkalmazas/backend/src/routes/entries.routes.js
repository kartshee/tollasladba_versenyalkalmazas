import { Router } from 'express';
import mongoose from 'mongoose';
import Entry from '../models/Entry.js';
import Player from '../models/Player.js';
import Category from '../models/Category.js';
import PaymentGroup from '../models/PaymentGroup.js';
import { assertTournamentOwned, getOwnedTournamentIds, isValidObjectId } from '../services/ownership.service.js';
import { AUDIT_SNAPSHOT_FIELDS, pickAuditFields, safeRecordAuditEvent } from '../services/audit.service.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const PAYMENT_METHODS = ['unknown', 'cash', 'bank_transfer', 'card', 'other'];

function normalizePaymentMethod(value) {
    if (value === undefined || value === null || value === '') return 'unknown';
    if (!PAYMENT_METHODS.includes(value)) {
        throw new Error(`paymentMethod must be one of: ${PAYMENT_METHODS.join(', ')}`);
    }
    return value;
}


async function loadOwnedEntry(entryId, userId) {
    if (!isValidObjectId(entryId)) return { entry: null, tournament: null };
    const entry = await Entry.findById(entryId);
    if (!entry) return { entry: null, tournament: null };
    const tournament = await assertTournamentOwned(entry.tournamentId, userId);
    if (!tournament) return { entry: null, tournament: null };
    return { entry, tournament };
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

    if (req.query.categoryId) {
        if (!isValidId(req.query.categoryId)) return res.status(400).json({ error: 'Invalid categoryId' });
        filter.categoryId = req.query.categoryId;
    }
    if (req.query.playerId) {
        if (!isValidId(req.query.playerId)) return res.status(400).json({ error: 'Invalid playerId' });
        filter.playerId = req.query.playerId;
    }
    if (req.query.paymentGroupId) {
        if (!isValidId(req.query.paymentGroupId)) return res.status(400).json({ error: 'Invalid paymentGroupId' });
        filter.paymentGroupId = req.query.paymentGroupId;
    }
    if (req.query.paid === 'true') filter.paid = true;
    if (req.query.paid === 'false') filter.paid = false;
    if (req.query.paymentMethod) {
        try {
            filter.paymentMethod = normalizePaymentMethod(req.query.paymentMethod);
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    const entries = await Entry.find(filter)
        .populate('playerId', 'name club')
        .populate('categoryId', 'name')
        .populate('paymentGroupId', 'payerName paid paymentMethod')
        .sort({ createdAt: -1, _id: -1 });

    res.json(entries);
});

router.patch('/:id', async (req, res) => {
    const { entry, tournament } = await loadOwnedEntry(req.params.id, req.user._id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (tournament.status === 'finished') return res.status(409).json({ error: 'Tournament finished' });

    try {
        const before = pickAuditFields(entry, AUDIT_SNAPSHOT_FIELDS.entry);
        const { feeAmount, paid, paymentMethod, billingName, billingAddress, paymentGroupId } = req.body ?? {};

        if (feeAmount !== undefined) {
            const amount = Number(feeAmount);
            if (!Number.isFinite(amount) || amount < 0 || amount > 1000000) {
                return res.status(400).json({ error: 'feeAmount must be between 0 and 1000000' });
            }
            entry.feeAmount = amount;
        }
        if (paid !== undefined) {
            if (typeof paid !== 'boolean') return res.status(400).json({ error: 'paid must be a boolean' });
            entry.paid = paid;
        }
        if (paymentMethod !== undefined) entry.paymentMethod = normalizePaymentMethod(paymentMethod);
        if (billingName !== undefined) entry.billingName = typeof billingName === 'string' ? billingName.trim() : '';
        if (billingAddress !== undefined) entry.billingAddress = typeof billingAddress === 'string' ? billingAddress.trim() : '';
        if (paymentGroupId !== undefined) {
            if (paymentGroupId === null || paymentGroupId === '') {
                entry.paymentGroupId = null;
            } else {
                if (!isValidId(paymentGroupId)) return res.status(400).json({ error: 'Invalid paymentGroupId' });
                const pg = await PaymentGroup.findById(paymentGroupId).select('_id tournamentId');
                if (!pg || String(pg.tournamentId) !== String(entry.tournamentId)) {
                    return res.status(400).json({ error: 'Payment group not found in this tournament' });
                }
                entry.paymentGroupId = pg._id;
            }
        }

        await entry.save();

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: entry.tournamentId,
            categoryId: entry.categoryId,
            playerId: entry.playerId,
            entityType: 'entry',
            entityId: entry._id,
            action: 'entry.updated',
            summary: 'Entry payment data updated',
            before,
            after: pickAuditFields(entry, AUDIT_SNAPSHOT_FIELDS.entry)
        });

        const populated = await Entry.findById(entry._id)
            .populate('playerId', 'name club')
            .populate('categoryId', 'name')
            .populate('paymentGroupId', 'payerName paid paymentMethod');

        return res.json(populated);
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.post('/sync-missing', async (req, res) => {
    const { tournamentId } = req.body ?? {};
    if (!tournamentId || !isValidId(tournamentId)) return res.status(400).json({ error: 'Invalid tournamentId' });

    const tournament = await assertTournamentOwned(tournamentId, req.user._id);
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const players = await Player.find({ tournamentId, categoryId: { $ne: null } }).select('_id tournamentId categoryId');
    const categories = await Category.find({ tournamentId }).select('_id').lean();
    const validCategories = new Set(categories.map((c) => String(c._id)));

    let created = 0;
    for (const player of players) {
        if (!player.categoryId || !validCategories.has(String(player.categoryId))) continue;
        const existing = await Entry.findOne({ categoryId: player.categoryId, playerId: player._id }).select('_id').lean();
        if (existing) continue;
        await Entry.create({
            tournamentId,
            categoryId: player.categoryId,
            playerId: player._id,
            feeAmount: tournament.config?.entryFeeEnabled ? Number(tournament.config?.entryFeeAmount ?? 0) : 0,
            paid: false,
            paymentMethod: 'unknown',
            billingName: '',
            billingAddress: '',
            paymentGroupId: null
        });
        created += 1;
    }

    res.json({ ok: true, created });
});

export default router;
