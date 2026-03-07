import { Router } from 'express';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';

const router = Router();

/**
 * POST /api/tournaments/configure
 * body:
 * {
 *   "tournament": { ... Tournament fields ... },
 *   "categories": [ { ... Category fields without tournamentId ... }, ... ]
 * }
 */
router.post('/configure', async (req, res) => {
    const { tournament, categories } = req.body ?? {};

    if (!tournament?.name || typeof tournament.name !== 'string' || !tournament.name.trim()) {
        return res.status(400).json({ error: 'tournament.name is required' });
    }

    const cats = Array.isArray(categories) ? categories : [];

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const createdTournament = await Tournament.create([tournament], { session });
        const t = createdTournament[0];

        const createdCategories = [];
        for (const c of cats) {
            const payload = {
                ...c,
                tournamentId: t._id
            };
            const created = await Category.create([payload], { session });
            createdCategories.push(created[0]);
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            tournament: t,
            categories: createdCategories
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: err.message });
    }
});

export default router;