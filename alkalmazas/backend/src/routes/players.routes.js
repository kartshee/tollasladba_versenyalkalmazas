import { Router } from 'express';
import mongoose from 'mongoose';
import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import { assertTournamentOwned, getOwnedTournamentIds } from '../services/ownership.service.js';
import { AUDIT_SNAPSHOT_FIELDS, pickAuditFields, safeRecordAuditEvent } from '../services/audit.service.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

router.post('/', async (req, res) => {
    try {
        const { tournamentId, categoryId, name, club, note } = req.body;

        if (!tournamentId || !isValidId(tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const t = await assertTournamentOwned(tournamentId, req.user._id);
        if (!t) return res.status(404).json({ error: 'Tournament not found' });

        if (t.status !== 'draft') {
            return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
        }

        let normalizedCategoryId = null;
        if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
            if (!isValidId(categoryId)) {
                return res.status(400).json({ error: 'Invalid categoryId' });
            }

            const category = await Category.findById(categoryId).select('_id tournamentId');
            if (!category) return res.status(404).json({ error: 'Category not found' });

            if (String(category.tournamentId) !== String(tournamentId)) {
                return res.status(400).json({ error: 'Category does not belong to tournament' });
            }

            normalizedCategoryId = category._id;
        }

        const player = await Player.create({
            tournamentId,
            categoryId: normalizedCategoryId,
            name: name.trim(),
            club: typeof club === 'string' ? club.trim() : '',
            note: typeof note === 'string' ? note.trim() : '',
            checkedInAt: null,
            mainEligibility: 'main'
        });

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: player.tournamentId,
            categoryId: player.categoryId,
            playerId: player._id,
            entityType: 'player',
            entityId: player._id,
            action: 'player.created',
            summary: `Player created: ${player.name}`,
            after: pickAuditFields(player, AUDIT_SNAPSHOT_FIELDS.player)
        });

        res.status(201).json(player);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const filter = {};

    if (req.query.tournamentId) {
        if (!isValidId(req.query.tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }
        const t = await assertTournamentOwned(req.query.tournamentId, req.user._id, { lean: true });
        if (!t) return res.json([]);
        filter.tournamentId = req.query.tournamentId;
    } else {
        filter.tournamentId = { $in: await getOwnedTournamentIds(req.user._id) };
    }

    if (req.query.categoryId) {
        if (!isValidId(req.query.categoryId)) {
            return res.status(400).json({ error: 'Invalid categoryId' });
        }
        filter.categoryId = req.query.categoryId;
    }

    const players = await Player.find(filter).sort({ createdAt: -1 });
    res.json(players);
});

router.patch('/:playerId/checkin', async (req, res) => {
    const { playerId } = req.params;
    if (!isValidId(playerId)) return res.status(400).json({ error: 'Invalid playerId' });

    const { checkedIn } = req.body ?? {};
    if (checkedIn !== true && checkedIn !== false) {
        return res.status(400).json({ error: 'checkedIn must be true or false' });
    }

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const t = await Tournament.findOne({ _id: player.tournamentId, ownerId: req.user._id }).lean();
    if (!t) return res.status(404).json({ error: 'Player not found' });

    const before = pickAuditFields(player, AUDIT_SNAPSHOT_FIELDS.player);
    player.checkedInAt = checkedIn ? new Date() : null;
    await player.save();

    await safeRecordAuditEvent({
        userId: req.user._id,
        tournamentId: player.tournamentId,
        categoryId: player.categoryId,
        playerId: player._id,
        entityType: 'player',
        entityId: player._id,
        action: checkedIn ? 'player.checked_in' : 'player.checked_out',
        summary: `${checkedIn ? 'Checked in' : 'Checked out'} player: ${player.name}`,
        before,
        after: pickAuditFields(player, AUDIT_SNAPSHOT_FIELDS.player)
    });

    res.json(player);
});

export default router;
