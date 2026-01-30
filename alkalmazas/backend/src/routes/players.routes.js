import { Router } from 'express';
import mongoose from 'mongoose';
import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';

const router = Router();

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/**
 * ÚJ PLAYER LÉTREHOZÁSA (tournament-scoped)
 * body: { tournamentId, name, club? }
 */
router.post('/', async (req, res) => {
    try {
        const { tournamentId, name, club } = req.body;

        if (!tournamentId || !isValidId(tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const t = await Tournament.findById(tournamentId);
        if (!t) return res.status(404).json({ error: 'Tournament not found' });

        // Draft lock – konzisztens a tournament routes-szal
        if (t.status !== 'draft') {
            return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
        }

        const player = await Player.create({
            tournamentId,
            name: name.trim(),
            club: typeof club === 'string' ? club.trim() : ''
        });

        res.status(201).json(player);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * PLAYER LISTÁZÁS
 * opcionális: ?tournamentId=...
 */
router.get('/', async (req, res) => {
    const filter = {};
    if (req.query.tournamentId) {
        if (!isValidId(req.query.tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }
        filter.tournamentId = req.query.tournamentId;
    }

    const players = await Player.find(filter).sort({ createdAt: -1 });
    res.json(players);
});

export default router;
