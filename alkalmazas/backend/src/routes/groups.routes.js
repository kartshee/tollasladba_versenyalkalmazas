import { Router } from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const makePairKey = (a, b) => {
    const x = String(a);
    const y = String(b);
    return x < y ? `${x}_${y}` : `${y}_${x}`;
};

function computeStandings(groupPlayers, finishedMatches) {
    const stats = {};
    groupPlayers.forEach((p) => {
        stats[p._id.toString()] = {
            player: p,
            wins: 0,
            played: 0,
            setDiff: 0,
            pointDiff: 0
        };
    });

    for (const m of finishedMatches) {
        const p1 = String(m.player1);
        const p2 = String(m.player2);
        if (!stats[p1] || !stats[p2]) continue;

        stats[p1].played++;
        stats[p2].played++;

        const w = m.winner ? String(m.winner) : null;
        if (w && stats[w]) stats[w].wins++;

        const type = m.resultType ?? 'played';
        const sets = Array.isArray(m.sets) ? m.sets : [];

        // tie-break only for played with real sets
        if (type === 'played' && sets.length >= 2) {
            let p1Set = 0, p2Set = 0;
            let p1Pts = 0, p2Pts = 0;

            for (const s of sets) {
                p1Pts += s.p1;
                p2Pts += s.p2;
                if (s.p1 > s.p2) p1Set++;
                else p2Set++;
            }

            stats[p1].setDiff += (p1Set - p2Set);
            stats[p2].setDiff += (p2Set - p1Set);

            stats[p1].pointDiff += (p1Pts - p2Pts);
            stats[p2].pointDiff += (p2Pts - p1Pts);
        }
    }

    const list = Object.values(stats);

    return list.sort((a, b) => {
        const winRateA = a.played > 0 ? a.wins / a.played : 0;
        const winRateB = b.played > 0 ? b.wins / b.played : 0;
        if (winRateB !== winRateA) return winRateB - winRateA;
        if (b.wins !== a.wins) return b.wins - a.wins;

        // 2 fős tie: head-to-head
        const h2h = finishedMatches.find((m) => {
            const x = String(m.player1), y = String(m.player2);
            return (
                (x === String(a.player._id) && y === String(b.player._id)) ||
                (x === String(b.player._id) && y === String(a.player._id))
            );
        });
        if (h2h?.winner) {
            if (String(h2h.winner) === String(a.player._id)) return -1;
            if (String(h2h.winner) === String(b.player._id)) return 1;
        }

        if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;

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
        status: 'finished',
        winner: { $ne: null },
        voided: { $ne: true }
    }).lean();

    const standings = computeStandings(group.players, matches);
    res.json(standings);
});


router.patch('/:groupId/withdraw', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { playerId, reason, policy, note } = req.body ?? {};

        if (!isValidId(groupId)) return res.status(400).json({ error: 'Invalid groupId' });
        if (!playerId || !isValidId(playerId)) return res.status(400).json({ error: 'Invalid playerId' });
        if (!['injury', 'voluntary', 'disqualified', 'no_show', 'other'].includes(reason)) {
            return res.status(400).json({ error: 'Invalid reason' });
        }

        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // játékos tényleg a groupban van?
        const inGroup = group.players.some(p => String(p) === String(playerId));
        if (!inGroup) return res.status(400).json({ error: 'Player not in this group' });

        // policy: ha nem küldik, default mapping
        const effectivePolicy =
            (policy === 'delete_results' || policy === 'keep_results')
                ? policy
                : (reason === 'injury' ? 'keep_results' : 'delete_results');

        // upsert withdrawal record (ne duplikáljon)
        group.withdrawals = group.withdrawals ?? [];
        const existingIdx = group.withdrawals.findIndex(w => String(w.playerId) === String(playerId));
        const record = {
            playerId,
            reason,
            policy: effectivePolicy,
            note: typeof note === 'string' ? note : '',
            at: new Date()
        };

        if (existingIdx >= 0) group.withdrawals[existingIdx] = record;
        else group.withdrawals.push(record);

        await group.save();

        const now = new Date();

        if (effectivePolicy === 'delete_results') {
            // BWF-szerű: minden érintett meccs VOIDED -> standings/scheduler ignorálja
            const result = await Match.updateMany(
                {
                    groupId: group._id,
                    round: 'group',
                    $or: [{ player1: playerId }, { player2: playerId }]
                },
                {
                    $set: { voided: true, voidedAt: now, voidReason: reason }
                }
            );

            // opcionális: pending schedule nullázás a voided meccseknél
            await Match.updateMany(
                {
                    groupId: group._id,
                    round: 'group',
                    status: 'pending',
                    voided: true
                },
                { $set: { startAt: null, endAt: null, courtNumber: null } }
            );

            return res.json({
                ok: true,
                policy: effectivePolicy,
                voidedMatches: result.modifiedCount ?? result.nModified ?? 0,
                withdrawals: group.withdrawals
            });
        }

        // keep_results: a LE NEM JÁTSZOTT meccseket WO-ként lezárjuk (tie-break torzítás nélkül)
        const pending = await Match.find({
            groupId: group._id,
            round: 'group',
            status: { $in: ['pending', 'running'] },
            voided: { $ne: true },
            $or: [{ player1: playerId }, { player2: playerId }]
        }).select('_id player1 player2 status').lean();

        const ops = pending.map(m => {
            const p1 = String(m.player1);
            const winner = (p1 === String(playerId)) ? m.player2 : m.player1;

            return {
                updateOne: {
                    filter: { _id: m._id },
                    update: {
                        $set: {
                            status: 'finished',
                            winner,
                            sets: [],
                            resultType: 'wo',
                            actualStartAt: now,
                            actualEndAt: now,
                            resultUpdatedAt: now,
                            startAt: null,
                            endAt: null,
                            courtNumber: null
                        }
                    }
                }
            };
        });

        if (ops.length > 0) await Match.bulkWrite(ops);

        return res.json({
            ok: true,
            policy: effectivePolicy,
            autoFinishedAsWO: ops.length,
            withdrawals: group.withdrawals
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Playoff meccsek lekérése a groupból
 */
router.get('/:groupId/playoff', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const semis = await Match.find({
        groupId: req.params.groupId,
        round: 'playoff_semi',
        voided: { $ne: true }
    })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    const final = await Match.findOne({
        groupId: req.params.groupId,
        round: 'playoff_final',
        voided: { $ne: true }
    })
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

    // Csoportkör meccsek (voided meccseket nem vesszük figyelembe)
    const groupMatches = await Match.find({
        groupId: group._id,
        round: 'group',
        voided: { $ne: true }
    }).lean();

    // Csoportkör kész? (WO/FF/RET esetén nem kell 2 szett; played esetén kell)
    const unfinished = groupMatches.filter((m) => {
        if (!m.winner) return true;

        const type = m.resultType ?? 'played';
        return type === 'played' && (!Array.isArray(m.sets) || m.sets.length < 2);


    });

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
        round: { $in: ['playoff_semi', 'playoff_final'] },
        voided: { $ne: true }
    });
    if (existingPlayoff) {
        return res.status(409).json({ error: 'Playoff already generated for this group' });
    }

    // Standingshez csak "valóban lezárt" meccsek kellenek (winner != null, voided != true)
    const finishedForStandings = groupMatches.filter((m) => !!m.winner);

    const standings = computeStandings(group.players, finishedForStandings);

    // Ha bevezeted a withdrawals-t a Group modellbe: delete_results játékosokat kizárjuk
    const deleteSet = new Set(
        (group.withdrawals ?? [])
            .filter((w) => w.policy === 'delete_results')
            .map((w) => String(w.playerId))
    );

    const top4 = standings
        .filter((x) => !deleteSet.has(String(x.player._id)))
        .slice(0, 4)
        .map((x) => x.player._id);

    if (top4.length < 4) {
        return res.status(400).json({ error: 'Need at least 4 eligible players for playoff' });
    }

    const created = await Match.insertMany([
        {
            groupId: group._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,          // <-- KÖTELEZŐ
            player1: top4[0],
            player2: top4[3],
            pairKey: makePairKey(top4[0], top4[3]),   // <-- EZ

            round: 'playoff_semi',
            status: 'pending',
            resultType: 'played',
            sets: [],
            winner: null,
            courtNumber: null,
            startAt: null,
            endAt: null
        },
        {
            groupId: group._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,          // <-- KÖTELEZŐ
            player1: top4[1],
            player2: top4[2],
            pairKey: makePairKey(top4[1], top4[2]),

            round: 'playoff_semi',
            status: 'pending',
            resultType: 'played',
            sets: [],
            winner: null,
            courtNumber: null,
            startAt: null,
            endAt: null
        }
    ]);

    const semiFinals = await Match.find({ _id: { $in: created.map((m) => m._id) } })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.status(201).json({
        groupId: group._id,
        top4: standings
            .filter((s) => !deleteSet.has(String(s.player._id)))
            .slice(0, 4)
            .map((s) => ({
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

    const group = await Group.findById(groupId).lean();
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const semis = await Match.find({
        groupId,
        round: 'playoff_semi',
        voided: { $ne: true }
    }).lean();

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

    const existingFinal = await Match.findOne({
        groupId,
        round: 'playoff_final',
        voided: { $ne: true }
    });
    if (existingFinal) {
        return res.status(409).json({ error: 'Final already exists', finalId: existingFinal._id });
    }

    const final = await Match.create({
        groupId,
        tournamentId: group.tournamentId,
        categoryId: group.categoryId,

        player1: semis[0].winner,
        player2: semis[1].winner,
        pairKey: makePairKey(semis[0].winner, semis[1].winner),  // <-- EZ

        round: 'playoff_final',
        status: 'pending',
        resultType: 'played',
        sets: [],
        winner: null,
        courtNumber: null,
        startAt: null,
        endAt: null
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
