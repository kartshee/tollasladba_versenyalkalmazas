import { Router } from 'express';
import Match from '../models/Match.js';
import Group from '../models/Group.js';
import { generateRoundRobinPairs } from '../services/roundRobin.service.js';
import { isValidSet, determineMatchWinner } from '../services/badmintonRules.service.js';

const router = Router();
/**
 * Meccsek listázása group szerint (teljes lista)
 */
router.get('/group/:groupId', async (req, res) => {
    const matches = await Match.find({ groupId: req.params.groupId })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(matches);
});


/**
 * Meccsek generálása egy groupból
 */
router.post('/group/:groupId', async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        const rawMatches = generateRoundRobinPairs(group.players);

        const matches = await Match.insertMany(
            rawMatches.map(m => ({
                ...m,
                groupId: group._id,
                tournamentId: group.tournamentId
            }))
        );

        res.status(201).json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Meccsek lekérése group szerint
 */
router.get('/group/:groupId/status', async (req, res) => {
    const matches = await Match.find({ groupId: req.params.groupId });

    const unfinished = matches.filter(m => !m.winner || !m.sets || m.sets.length < 2);

    res.json({
        total: matches.length,
        finished: matches.length - unfinished.length,
        unfinishedCount: unfinished.length,
        unfinishedIds: unfinished.map(m => m._id)
    });
});



/**
 * Teljes meccs eredmény rögzítése (szettekkel)
 */
router.patch('/:matchId/result', async (req, res) => {
    const { sets } = req.body;

    if (!Array.isArray(sets) || sets.length < 2 || sets.length > 3) {
        return res.status(400).json({ error: 'Match must have 2 or 3 sets' });
    }

    for (const s of sets) {
        if (!isValidSet(s.p1, s.p2)) {
            return res.status(400).json({
                error: 'Invalid set score',
                set: s
            });
        }
    }

    const match = await Match.findById(req.params.matchId);
    if (!match) {
        return res.status(404).json({ error: 'Match not found' });
    }

    const winner = determineMatchWinner(sets, match.player1, match.player2);
    if (!winner) {
        return res.status(400).json({
            error: 'No winner determined (need 2 won sets)'
        });
    }

    match.sets = sets;
    match.winner = winner;

    await match.save();

    res.json(match);
});

export default router;
