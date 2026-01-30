import { Router } from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

function computeStandings(groupPlayers, finishedGroupMatches) {
    const stats = {};
    groupPlayers.forEach((p) => {
        stats[p._id.toString()] = { player: p, wins: 0, played: 0 };
    });

    finishedGroupMatches.forEach((m) => {
        const p1 = m.player1.toString();
        const p2 = m.player2.toString();

        if (stats[p1]) stats[p1].played++;
        if (stats[p2]) stats[p2].played++;

        const w = m.winner?.toString();
        if (w && stats[w]) stats[w].wins++;
    });

    return Object.values(stats).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;

        // 2 fős tie-break: head-to-head
        const headToHead = finishedGroupMatches.find(
            (m) =>
                (m.player1.toString() === a.player._id.toString() &&
                    m.player2.toString() === b.player._id.toString()) ||
                (m.player1.toString() === b.player._id.toString() &&
                    m.player2.toString() === a.player._id.toString())
        );

        if (headToHead?.winner) {
            if (headToHead.winner.toString() === a.player._id.toString()) return -1;
            if (headToHead.winner.toString() === b.player._id.toString()) return 1;
        }

        return 0;
    });
}

/**
 * Group létrehozása
 * body: { tournamentId, categoryId, name, players: [playerId, ...] }
 */
router.post('/', async (req, res) => {
    try {
        const { tournamentId, categoryId, name, players } = req.body;

        if (!tournamentId || !isValidId(tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }
        if (!categoryId || !isValidId(categoryId)) {
            return res.status(400).json({ error: 'Invalid categoryId' });
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Group name is required' });
        }
        if (!Array.isArray(players)) {
            return res.status(400).json({ error: 'players must be an array' });
        }

        // Duplikátumok tiltása
        const unique = new Set(players.map(String));
        if (unique.size !== players.length) {
            return res.status(400).json({ error: 'Duplicate playerId in group' });
        }

        const t = await Tournament.findById(tournamentId);
        if (!t) return res.status(404).json({ error: 'Tournament not found' });

        if (t.status !== 'draft') {
            return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
        }

        const c = await Category.findById(categoryId);
        if (!c) return res.status(404).json({ error: 'Category not found' });

        // Category ugyanahhoz a tournamenthez tartozzon
        if (c.tournamentId.toString() !== tournamentId.toString()) {
            return res.status(400).json({ error: 'Category does not belong to tournament' });
        }

        // Player validáció: létezzenek és ugyanahhoz a tournamenthez tartozzanak
        if (players.length > 0) {
            const dbPlayers = await Player.find({ _id: { $in: players } }, { tournamentId: 1 });
            if (dbPlayers.length !== players.length) {
                return res.status(400).json({ error: 'One or more players not found' });
            }
            const wrong = dbPlayers.find(
                (p) => p.tournamentId.toString() !== tournamentId.toString()
            );
            if (wrong) {
                return res.status(400).json({ error: 'One or more players belong to another tournament' });
            }
        }

        const group = await Group.create({
            tournamentId,
            categoryId,
            name: name.trim(),
            players
        });

        res.status(201).json(group);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Groupok listázása player adatokkal
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

    const groups = await Group.find(filter)
        .populate('players', 'name club')
        .sort({ createdAt: -1 });

    res.json(groups);
});

/**
 * Standings (wins + head-to-head tie-break)
 */
router.get('/:groupId/standings', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const group = await Group.findById(req.params.groupId).populate('players');
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const matches = await Match.find({
        groupId: group._id,
        round: 'group',
        winner: { $ne: null },
        'sets.1': { $exists: true } // legalább 2 szett
    });

    const standings = computeStandings(group.players, matches);
    res.json(standings);
});

/**
 * Playoff meccsek lekérése a groupból
 */
router.get('/:groupId/playoff', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const semis = await Match.find({ groupId: req.params.groupId, round: 'playoff_semi' })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    const final = await Match.findOne({ groupId: req.params.groupId, round: 'playoff_final' })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json({ semis, final });
});

/**
 * Playoff generálása (top4 -> 2 elődöntő)
 */
router.post('/:groupId/playoff', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const group = await Group.findById(req.params.groupId).populate('players');
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Csoportkör kész?
    const groupMatches = await Match.find({ groupId: group._id, round: 'group' });
    const unfinished = groupMatches.filter((m) => !m.winner || !m.sets || m.sets.length < 2);
    if (unfinished.length > 0) {
        return res.status(400).json({
            error: 'Group stage not finished',
            unfinishedCount: unfinished.length,
            unfinishedIds: unfinished.map((m) => m._id)
        });
    }

    // Nincs-e már playoff?
    const existingPlayoff = await Match.findOne({
        groupId: group._id,
        round: { $in: ['playoff_semi', 'playoff_final'] }
    });
    if (existingPlayoff) {
        return res.status(409).json({ error: 'Playoff already generated for this group' });
    }

    // Standings
    const standings = computeStandings(group.players, groupMatches);
    const top4 = standings.slice(0, 4).map((x) => x.player._id);
    if (top4.length < 4) return res.status(400).json({ error: 'Need at least 4 players for playoff' });

    const created = await Match.insertMany([
        {
            groupId: group._id,
            tournamentId: group.tournamentId,
            player1: top4[0],
            player2: top4[3],
            round: 'playoff_semi',
            sets: [],
            winner: null
        },
        {
            groupId: group._id,
            tournamentId: group.tournamentId,
            player1: top4[1],
            player2: top4[2],
            round: 'playoff_semi',
            sets: [],
            winner: null
        }
    ]);

    const semiFinals = await Match.find({ _id: { $in: created.map((m) => m._id) } })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.status(201).json({
        groupId: group._id,
        top4: standings.slice(0, 4).map((s) => ({
            id: s.player._id,
            name: s.player.name,
            wins: s.wins
        })),
        playoff: { semis: semiFinals }
    });
});

/**
 * Döntő generálása a két elődöntő winneréből
 */
router.post('/:groupId/playoff/final', async (req, res) => {
    const groupId = req.params.groupId;
    if (!isValidId(groupId)) return res.status(400).json({ error: 'Invalid groupId' });

    const semis = await Match.find({ groupId, round: 'playoff_semi' });
    if (semis.length !== 2) {
        return res.status(400).json({ error: 'Need exactly 2 semifinals to create final' });
    }

    const notFinished = semis.filter((m) => !m.winner);
    if (notFinished.length > 0) {
        return res.status(400).json({
            error: 'Semifinals not finished',
            missingWinnerIds: notFinished.map((m) => m._id)
        });
    }

    const existingFinal = await Match.findOne({ groupId, round: 'playoff_final' });
    if (existingFinal) return res.status(409).json({ error: 'Final already exists', finalId: existingFinal._id });

    const final = await Match.create({
        groupId,
        tournamentId: semis[0].tournamentId,
        player1: semis[0].winner,
        player2: semis[1].winner,
        round: 'playoff_final',
        sets: [],
        winner: null
    });

    res.status(201).json(final);
});

router.get('/:groupId/winner', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const final = await Match.findOne({
        groupId: req.params.groupId,
        round: 'playoff_final',
        winner: { $ne: null }
    })
        .populate('winner', 'name')
        .populate('player1', 'name')
        .populate('player2', 'name');

    if (!final) return res.status(404).json({ error: 'Final not finished or not found' });

    res.json({ champion: final.winner, finalMatch: final });
});

export default router;
