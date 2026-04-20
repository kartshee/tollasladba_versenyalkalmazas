import { Router } from 'express';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import { computeStandings } from '../services/standings.service.js';

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

router.get('/tournaments/:tournamentId/results', async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.tournamentId)) {
        return res.status(400).json({ error: 'Invalid tournamentId' });
    }

    const tournament = await Tournament.findById(req.params.tournamentId).select('name status').lean();
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const [categories, groups, matches] = await Promise.all([
        Category.find({ tournamentId: req.params.tournamentId }).sort({ createdAt: 1 }).lean(),
        Group.find({ tournamentId: req.params.tournamentId }).populate('players', 'name club').sort({ createdAt: 1 }).lean(),
        Match.find({ tournamentId: req.params.tournamentId, voided: { $ne: true } })
            .sort({ createdAt: 1 })
            .populate('player1', 'name')
            .populate('player2', 'name')
            .populate('winner', 'name')
            .lean()
    ]);

    const groupsByCategory = groups.reduce((acc, group) => {
        const key = String(group.categoryId);
        acc[key] = acc[key] ?? [];
        acc[key].push(group);
        return acc;
    }, {});

    const matchesByCategory = matches.reduce((acc, match) => {
        const key = String(match.categoryId);
        acc[key] = acc[key] ?? [];
        acc[key].push(match);
        return acc;
    }, {});

    const results = categories.map((category) => {
        const categoryGroups = groupsByCategory[String(category._id)] ?? [];
        const categoryMatches = matchesByCategory[String(category._id)] ?? [];
        const playoffMatches = categoryMatches.filter((match) => String(match.round ?? '').startsWith('playoff_'));
        const finalMatch = playoffMatches.find((match) => match.round === 'playoff_final' && match.winner);
        const bronzeMatch = playoffMatches.find((match) => match.round === 'playoff_bronze' && match.winner);

        const standings = categoryGroups.map((group) => {
            const finished = categoryMatches.filter((match) => String(match.groupId ?? '') === String(group._id) && match.round === 'group' && match.winner);
            return {
                groupId: group._id,
                groupName: group.name,
                standings: computeStandings(group.players ?? [], finished, {
                    multiTiePolicy: category.multiTiePolicy ?? 'direct_then_overall',
                    unresolvedTiePolicy: category.unresolvedTiePolicy ?? 'shared_place'
                })
            };
        });

        return {
            categoryId: category._id,
            categoryName: category.name,
            format: category.format,
            status: category.status,
            finalMatch,
            bronzeMatch,
            standings
        };
    });

    res.json({ tournament, results });
});

export default router;
