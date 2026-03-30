import { Router } from 'express';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Match from '../models/Match.js';

const router = Router();

router.get('/tournaments/:tournamentId/board', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.tournamentId)) {
        return res.status(400).json({ error: 'Invalid tournamentId' });
    }

    const tournament = await Tournament.findById(req.params.tournamentId).select('name status').lean();
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const limitUpcoming = Math.max(1, Math.min(50, Number(req.query.limitUpcoming ?? 12)));
    const now = new Date();

    const [runningMatches, upcomingMatches] = await Promise.all([
        Match.find({ tournamentId: req.params.tournamentId, status: 'running', voided: { $ne: true } })
            .sort({ courtNumber: 1, startAt: 1, createdAt: 1 })
            .populate('categoryId', 'name')
            .populate('player1', 'name')
            .populate('player2', 'name')
            .lean(),
        Match.find({
            tournamentId: req.params.tournamentId,
            status: 'pending',
            voided: { $ne: true },
            startAt: { $ne: null, $gte: now }
        })
            .sort({ startAt: 1, courtNumber: 1, createdAt: 1 })
            .limit(limitUpcoming)
            .populate('categoryId', 'name')
            .populate('player1', 'name')
            .populate('player2', 'name')
            .lean()
    ]);

    res.json({
        tournament: { id: tournament._id, name: tournament.name, status: tournament.status },
        now,
        runningMatches,
        upcomingMatches
    });
});

export default router;
