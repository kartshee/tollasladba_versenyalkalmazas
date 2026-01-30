import { Router } from 'express';
import Match from '../models/Match.js';
import Group from '../models/Group.js';
import { generateRoundRobinPairs } from '../services/roundRobin.service.js';
import { isValidSet, determineMatchWinner } from '../services/badmintonRules.service.js';
import { buildSchedule } from '../services/scheduler.service.js';

const router = Router();

/**
 * Meccsek listázása (query paraméterekkel)
 * Példák:
 *  - /api/matches?tournamentId=...&status=running
 *  - /api/matches?tournamentId=...&status=pending&round=group
 */
router.get('/', async (req, res) => {
    const { tournamentId, groupId, categoryId, status, round } = req.query;

    const filter = {};
    if (tournamentId) filter.tournamentId = tournamentId;
    if (groupId) filter.groupId = groupId;
    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.status = status;
    if (round) filter.round = round;

    const matches = await Match.find(filter)
        .sort({ startAt: 1, createdAt: 1 })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(matches);
});

/**
 * Meccsek listázása group szerint (teljes lista)
 */
router.get('/group/:groupId', async (req, res) => {
    const matches = await Match.find({ groupId: req.params.groupId })
        .sort({ startAt: 1, createdAt: 1 })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(matches);
});

/**
 * Meccsek generálása egy groupból (round robin)
 * - feltölti: tournamentId, categoryId, groupId
 * - status: pending
 */
router.post('/group/:groupId', async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // védelem: ne generáljon duplikáltan
        const existing = await Match.findOne({ groupId: group._id, round: 'group' });
        if (existing) {
            return res.status(409).json({ error: 'Group matches already generated for this group' });
        }

        const rawMatches = generateRoundRobinPairs(group.players);

        const matches = await Match.insertMany(
            rawMatches.map(m => ({
                ...m,
                groupId: group._id,
                tournamentId: group.tournamentId,
                categoryId: group.categoryId,
                round: 'group',
                status: 'pending',
                courtNumber: null,
                startAt: null,
                endAt: null,
                sets: [],
                winner: null
            }))
        );

        res.status(201).json(matches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Match státusz állítás (MVP)
 * PATCH /api/matches/:matchId/status
 * body: { "status": "running" | "pending" }
 */
router.patch('/:matchId/status', async (req, res) => {
    if (!req.is('application/json')) {
        return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
    const { status } = req.body ?? {};
    if (!status) return res.status(400).json({ error: 'Missing status in request body' });

    if (!['pending', 'running'].includes(status)) {
        return res.status(400).json({ error: 'status must be pending or running' });
    }

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    if (match.status === 'finished') {
        return res.status(409).json({ error: 'Cannot change status of a finished match' });
    }

    if (status === 'running') {
        if (match.status !== 'pending') {
            return res.status(409).json({ error: 'Only pending can be started' });
        }
        if (!match.actualStartAt) match.actualStartAt = new Date();
    }

    if (status === 'pending') {
        if ((match.sets?.length ?? 0) > 0 || match.winner) {
            return res.status(409).json({ error: 'Cannot revert to pending when result exists' });
        }
    }

    match.status = status;
    await match.save();

    const populated = await Match.findById(match._id)
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(populated);
});

/**
 * Teljes meccs eredmény rögzítése (szettekkel)
 * - validál
 * - winner meghatároz
 * - státusz: finished
 */
router.patch('/:matchId/result', async (req, res) => {
    const { sets } = req.body ?? {};
    if (!Array.isArray(sets) || sets.length < 2 || sets.length > 3) {
        return res.status(400).json({ error: 'Match must have 2 or 3 sets' });
    }

    for (const s of sets) {
        if (typeof s.p1 !== 'number' || typeof s.p2 !== 'number') {
            return res.status(400).json({ error: 'Set points must be numbers', set: s });
        }
        if (!isValidSet(s.p1, s.p2)) {
            return res.status(400).json({ error: 'Invalid set score', set: s });
        }
    }

    const match = await Match.findById(req.params.matchId);
    if (!match) return res.status(404).json({ error: 'Match not found' });

    // opcionális: csak akkor engedjük, ha legalább running/finished
    // (ha te akarod, hogy pendingből is lehessen direkt eredményt rögzíteni, ezt vedd ki)
    // if (match.status === 'pending' && !match.actualStartAt) {
    //   return res.status(409).json({ error: 'Match is pending; start it first or allow direct result entry' });
    // }

    const winner = determineMatchWinner(sets, match.player1, match.player2);
    if (!winner) {
        return res.status(400).json({ error: 'No winner determined (need 2 won sets)' });
    }

    match.sets = sets;
    match.winner = winner;

    // ha még nem indult ténylegesen, most tekintjük indulásnak
    if (!match.actualStartAt) match.actualStartAt = new Date();

    // ha még nem volt "befejezés", most zárjuk le; ha már volt, ne írjuk felül az eredeti befejezést
    if (!match.actualEndAt) match.actualEndAt = new Date();

    // audit: mikor írták át utoljára a pontszámot
    match.resultUpdatedAt = new Date();

    match.status = 'finished';

    await match.save();

    const populated = await Match.findById(match._id)
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(populated);
});



/**
 * Scheduler (MVP) - group meccsek ütemezése
 * POST /api/matches/group/:groupId/schedule
 * body:
 *  {
 *    "startAt": "2026-02-01T09:00:00.000Z",
 *    "courtsCount": 5,
 *    "matchMinutes": 35,
 *    "playerRestMinutes": 20,
 *    "courtTurnoverMinutes": 0,
 *    "force": true
 *  }
 */
router.post('/group/:groupId/schedule', async (req, res) => {
    try {
        if (!req.is('application/json')) {
            return res.status(400).json({ error: 'Content-Type must be application/json' });
        }

        if (!req.body) {
            return res.status(400).json({
                error: 'Missing JSON body. Send Content-Type: application/json and a JSON payload.'
            });
        }
        const {
            startAt,
            courtsCount,
            matchMinutes,
            playerRestMinutes,
            courtTurnoverMinutes,
            breakMinutes, // legacy alias
            force
        } = req.body;

        const parsedStart = startAt ? new Date(startAt) : new Date();
        if (Number.isNaN(parsedStart.getTime())) {
            return res.status(400).json({ error: 'Invalid startAt' });
        }

        const cCount = Number(courtsCount ?? 1);
        const mMin = Number(matchMinutes ?? 35);

        // fallback: ha playerRestMinutes nincs, akkor breakMinutes-t használjuk
        const restMin = Number(playerRestMinutes ?? breakMinutes ?? 20);
        const turnoverMin = Number(courtTurnoverMinutes ?? 0);

        if (!Number.isInteger(cCount) || cCount < 1 || cCount > 50) {
            return res.status(400).json({ error: 'courtsCount must be an integer between 1 and 50' });
        }
        if (!Number.isFinite(mMin) || mMin <= 0 || mMin > 240) {
            return res.status(400).json({ error: 'matchMinutes must be between 1 and 240' });
        }
        if (!Number.isFinite(restMin) || restMin < 0 || restMin > 240) {
            return res.status(400).json({ error: 'playerRestMinutes must be between 0 and 240' });
        }
        if (!Number.isFinite(turnoverMin) || turnoverMin < 0 || turnoverMin > 120) {
            return res.status(400).json({ error: 'courtTurnoverMinutes must be between 0 and 120' });
        }

        const filter = { groupId: req.params.groupId, round: 'group', status: 'pending' };
        if (!force) filter.startAt = null;

        const toSchedule = await Match.find(filter)
            .select('_id player1 player2 createdAt')
            .sort({ createdAt: 1 })
            .lean();

        if (toSchedule.length === 0) {
            return res.json({ scheduled: 0, message: 'No matches to schedule with current filter' });
        }

        const plan = buildSchedule(toSchedule, {
            startAt: parsedStart,
            courtsCount: cCount,
            matchMinutes: mMin,
            playerRestMinutes: restMin,
            courtTurnoverMinutes: turnoverMin
        });

        const ops = plan.map(p => ({
            updateOne: {
                filter: { _id: p.matchId, status: 'pending' },
                update: { $set: { startAt: p.startAt, endAt: p.endAt, courtNumber: p.courtNumber } }
            }
        }));

        await Match.bulkWrite(ops);

        const updated = await Match.find({ groupId: req.params.groupId, round: 'group' })
            .sort({ startAt: 1, createdAt: 1 })
            .populate('player1', 'name')
            .populate('player2', 'name')
            .populate('winner', 'name');

        res.json({ scheduled: plan.length, matches: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



/**
 * Ütemezés reset (MVP)
 * PATCH /api/matches/group/:groupId/schedule/reset
 * - alapból csak a PENDING group meccsek schedule mezőit nullázza
 * - nem nyúl running/finished meccsekhez
 */
router.patch('/group/:groupId/schedule/reset', async (req, res) => {
    try {
        const groupId = req.params.groupId;

        // Csak group stage meccsek
        const filter = { groupId, round: 'group', status: 'pending' };

        const result = await Match.updateMany(filter, {
            $set: {
                startAt: null,
                endAt: null,
                courtNumber: null
            }
        });

        res.json({
            reset: result.modifiedCount ?? result.nModified ?? 0,
            matched: result.matchedCount ?? result.n ?? 0,
            message: 'Pending group matches schedule reset'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


export default router;
