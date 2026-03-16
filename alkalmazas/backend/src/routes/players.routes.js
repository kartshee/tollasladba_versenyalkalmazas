import { Router } from 'express';
import mongoose from 'mongoose';
import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * ÚJ PLAYER LÉTREHOZÁSA (tournament-scoped)
 * body: { tournamentId, categoryId?, name, club?, note? }
 */
router.post('/', async (req, res) => {
    try {
        const { tournamentId, categoryId, name, club, note } = req.body;

        if (!tournamentId || !isValidId(tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const t = await Tournament.findById(tournamentId);
        if (!t) return res.status(404).json({ error: 'Tournament not found' });

        // Draft lock
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

        res.status(201).json(player);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * PLAYER LISTÁZÁS
 * opcionális: ?tournamentId=...  ?categoryId=...
 */
router.get('/', async (req, res) => {
    const filter = {};

    if (req.query.tournamentId) {
        if (!isValidId(req.query.tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }
        filter.tournamentId = req.query.tournamentId;
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

/**
 * CHECK-IN toggle
 * PATCH /api/players/:playerId/checkin
 * body: { checkedIn: true|false }
 */
router.patch('/:playerId/checkin', async (req, res) => {
    const { playerId } = req.params;
    if (!isValidId(playerId)) return res.status(400).json({ error: 'Invalid playerId' });

    const { checkedIn } = req.body ?? {};
    if (checkedIn !== true && checkedIn !== false) {
        return res.status(400).json({ error: 'checkedIn must be true or false' });
    }

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    player.checkedInAt = checkedIn ? new Date() : null;
    await player.save();

    res.json(player);
});

export default router;