import { Router } from 'express';
import Group from '../models/Group.js';
import Match from '../models/Match.js';

const router = Router();

function computeStandings(groupPlayers, finishedGroupMatches) {
    const stats = {};
    groupPlayers.forEach(p => {
        stats[p._id.toString()] = { player: p, wins: 0, played: 0 };
    });

    finishedGroupMatches.forEach(m => {
        const p1 = m.player1.toString();
        const p2 = m.player2.toString();

        stats[p1].played++;
        stats[p2].played++;
        stats[m.winner.toString()].wins++;
    });

    return Object.values(stats).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;

        const headToHead = finishedGroupMatches.find(m =>
            (m.player1.toString() === a.player._id.toString() && m.player2.toString() === b.player._id.toString()) ||
            (m.player1.toString() === b.player._id.toString() && m.player2.toString() === a.player._id.toString())
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
 * body: { name, players: [playerId, ...], tournamentId? }
 */
router.post('/', async (req, res) => {
    try {
        const group = await Group.create(req.body);
        res.status(201).json(group);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Groupok listázása player adatokkal
 */
router.get('/', async (req, res) => {
    const groups = await Group.find().populate('players', 'name');
    res.json(groups);
});

/**
 * Standings (wins + head-to-head tie-break)
 */
router.get('/:groupId/standings', async (req, res) => {
    const group = await Group.findById(req.params.groupId).populate('players');
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const matches = await Match.find({
        groupId: group._id,
        round: 'group',
        winner: { $ne: null },
        'sets.1': { $exists: true } // legalább 2 set legyen
    });

    const standings = computeStandings(group.players, matches);
    res.json(standings);
});


/**
 * Playoff meccsek lekérése a groupból
 */
router.get('/:groupId/playoff', async (req, res) => {
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
    const group = await Group.findById(req.params.groupId).populate('players');
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // 1) Csoportkör kész?
    const groupMatches = await Match.find({ groupId: group._id, round: 'group' });
    const unfinished = groupMatches.filter(m => !m.winner || !m.sets || m.sets.length < 2);
    if (unfinished.length > 0) {
        return res.status(400).json({
            error: 'Group stage not finished',
            unfinishedCount: unfinished.length,
            unfinishedIds: unfinished.map(m => m._id)
        });
    }

    // 2) Nincs-e már playoff?
    const existingPlayoff = await Match.findOne({
        groupId: group._id,
        round: { $in: ['playoff_semi', 'playoff_final'] }
    });
    if (existingPlayoff) {
        return res.status(409).json({ error: 'Playoff already generated for this group' });
    }

    // 3) Standings (helperrel)
    const finishedGroupMatches = groupMatches; // itt már mind finished
    const standings = computeStandings(group.players, finishedGroupMatches);

    const top4 = standings.slice(0, 4).map(x => x.player._id);
    if (top4.length < 4) {
        return res.status(400).json({ error: 'Need at least 4 players for playoff' });
    }

    // 4) Elődöntők: #1 vs #4, #2 vs #3 (seed info-val)
    const created = await Match.insertMany([
        {
            groupId: group._id,
            tournamentId: group.tournamentId,
            player1: top4[0],
            player2: top4[3],
            round: 'playoff_semi',
            sets: [],
            winner: null,
        },
        {
            groupId: group._id,
            tournamentId: group.tournamentId,
            player1: top4[1],
            player2: top4[2],
            round: 'playoff_semi',
            sets: [],
            winner: null,
        }
    ]);

    // 5) Populáljuk vissza névvel (frontendnek hasznos)
    const semiFinals = await Match.find({ _id: { $in: created.map(m => m._id) } })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    // 6) Strukturált response
    res.status(201).json({
        groupId: group._id,
        top4: standings.slice(0, 4).map(s => ({
            id: s.player._id,
            name: s.player.name,
            wins: s.wins
        })),
        playoff: {
            semis: semiFinals
        }
    });
});


/**
 * Döntő generálása a két elődöntő winneréből
 * Feltétel: 2 db playoff_semi van és mindkettőnek van winner-e
 */
router.post('/:groupId/playoff/final', async (req, res) => {
    const groupId = req.params.groupId;

    const semis = await Match.find({ groupId, round: 'playoff_semi' });
    if (semis.length !== 2) {
        return res.status(400).json({ error: 'Need exactly 2 semifinals to create final' });
    }

    const notFinished = semis.filter(m => !m.winner);
    if (notFinished.length > 0) {
        return res.status(400).json({
            error: 'Semifinals not finished',
            missingWinnerIds: notFinished.map(m => m._id)
        });
    }

    const existingFinal = await Match.findOne({ groupId, round: 'playoff_final' });
    if (existingFinal) {
        return res.status(409).json({ error: 'Final already exists', finalId: existingFinal._id });
    }

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
    const final = await Match.findOne({
        groupId: req.params.groupId,
        round: 'playoff_final',
        winner: { $ne: null }
    })
        .populate('winner', 'name')
        .populate('player1', 'name')
        .populate('player2', 'name');

    if (!final) {
        return res.status(404).json({ error: 'Final not finished or not found' });
    }

    res.json({
        champion: final.winner,
        finalMatch: final
    });
});

export default router;
