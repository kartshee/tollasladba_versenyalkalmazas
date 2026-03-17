import { Router } from 'express';
import Category from '../models/Category.js';
import Tournament from '../models/Tournament.js';
import Player from '../models/Player.js';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import { generatePartialRoundRobin, recommendMatchesPerPlayer } from '../services/roundRobin.service.js';
import { assertTournamentOwned } from '../services/ownership.service.js';

const router = Router();

const makePairKey = (a, b) => {
    const x = String(a);
    const y = String(b);
    return x < y ? `${x}_${y}` : `${y}_${x}`;
};

async function loadOwnedCategory(categoryId, userId) {
    const category = await Category.findById(categoryId);
    if (!category) return { category: null, tournament: null };
    const tournament = await assertTournamentOwned(category.tournamentId, userId);
    if (!tournament) return { category: null, tournament: null };
    return { category, tournament };
}

function getGraceMinutes(category, tournament) {
    const ov = category?.checkIn?.graceMinutesOverride;
    if (ov !== null && ov !== undefined) return Number(ov);
    const def = tournament?.config?.checkInGraceMinutesDefault;
    return Number.isFinite(def) ? Number(def) : 40;
}

function parseBulk(text) {
    const lines = String(text ?? '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    return lines
        .map((line) => {
            const parts = line.split(';').map((p) => p.trim());
            return { name: parts[0] ?? '', club: parts[1] ?? '', note: parts[2] ?? '' };
        })
        .filter((x) => x.name);
}

router.post('/:id/players', async (req, res) => {
    const { category, tournament: t } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (t.status === 'finished') return res.status(409).json({ error: 'Tournament finished' });

    const { name, club = '', note = '' } = req.body ?? {};
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

    const locked = ['draw_locked', 'in_progress', 'completed'].includes(category.status);

    const player = await Player.create({
        tournamentId: category.tournamentId,
        categoryId: category._id,
        name: name.trim(),
        club: String(club ?? '').trim(),
        note: String(note ?? '').trim(),
        checkedInAt: null,
        mainEligibility: locked ? 'friendly_only' : 'main'
    });

    res.status(201).json(player);
});

router.post('/:id/players/bulk', async (req, res) => {
    const { category, tournament: t } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (t.status === 'finished') return res.status(409).json({ error: 'Tournament finished' });

    const { text } = req.body ?? {};
    if (!text) return res.status(400).json({ error: 'text is required' });

    const items = parseBulk(text);
    if (items.length === 0) return res.status(400).json({ error: 'No valid lines found' });

    const locked = ['draw_locked', 'in_progress', 'completed'].includes(category.status);

    const docs = items.map((it) => ({
        tournamentId: category.tournamentId,
        categoryId: category._id,
        name: it.name,
        club: it.club,
        note: it.note,
        checkedInAt: null,
        mainEligibility: locked ? 'friendly_only' : 'main'
    }));

    const created = await Player.insertMany(docs, { ordered: true });
    res.status(201).json({ created: created.length, players: created });
});

router.patch('/:id/checkin/grace', async (req, res) => {
    const { category, tournament: t } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    if (t.status === 'finished') return res.status(409).json({ error: 'Tournament finished' });

    const { graceMinutesOverride, reason = '' } = req.body ?? {};
    if (graceMinutesOverride !== null && graceMinutesOverride !== undefined) {
        const v = Number(graceMinutesOverride);
        if (!Number.isFinite(v) || v < 0 || v > 240) {
            return res.status(400).json({ error: 'Invalid graceMinutesOverride (0..240)' });
        }
    }

    category.checkIn = category.checkIn ?? {};
    category.checkIn.graceMinutesOverride = graceMinutesOverride ?? null;
    category.checkIn.graceOverrideReason = String(reason ?? '');

    await category.save();
    res.json(category);
});

router.post('/:id/finalize-draw', async (req, res) => {
    const { category, tournament: t } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    if (['draw_locked', 'in_progress', 'completed'].includes(category.status)) {
        return res.status(409).json({ error: `Category already locked/in progress (${category.status})` });
    }

    if (t.status === 'finished') return res.status(409).json({ error: 'Tournament finished' });

    const players = await Player.find({
        tournamentId: category.tournamentId,
        categoryId: category._id,
        mainEligibility: 'main'
    }).sort({ createdAt: 1 });

    if (players.length < 2) {
        return res.status(400).json({ error: 'Not enough players', players: players.length });
    }

    const groupSizeTarget = Number(category.groupSizeTarget ?? 8);
    let groupsCount = Number(category.groupsCount ?? 1);
    if (groupsCount <= 1) {
        groupsCount = Math.ceil(players.length / Math.max(2, groupSizeTarget));
        if (groupsCount < 1) groupsCount = 1;
    }

    const buckets = Array.from({ length: groupsCount }, () => []);
    players.forEach((p, idx) => buckets[idx % groupsCount].push(p._id));

    const groups = [];
    for (let i = 0; i < groupsCount; i++) {
        const name = `Group ${String.fromCharCode(65 + i)}`;
        groups.push(
            await Group.create({
                tournamentId: category.tournamentId,
                categoryId: category._id,
                name,
                players: buckets[i],
                withdrawals: []
            })
        );
    }

    const warnings = [];
    let totalGenerated = 0;
    const drawVersion = Number(category.drawVersion ?? 1);

    for (const g of groups) {
        const ids = g.players.map(String);
        const n = ids.length;
        if (n < 2) continue;

        const cfg = Number(category.groupStageMatchesPerPlayer);
        let m = Number.isFinite(cfg) && cfg > 0 ? cfg : recommendMatchesPerPlayer(n);
        m = Math.min(m, n - 1);

        if (n % 2 === 1 && m < n - 1 && m % 2 === 1) {
            if (m - 1 >= 2) {
                warnings.push({
                    groupId: String(g._id),
                    note: `Adjusted matchesPerPlayer ${m} -> ${m - 1} (odd group needs even m)`
                });
                m = m - 1;
            } else {
                return res.status(400).json({
                    error: 'Odd group size with partial RR requires even matchesPerPlayer (or full RR m=n-1).',
                    groupId: String(g._id),
                    playersInGroup: n,
                    matchesPerPlayer: m
                });
            }
        }

        const raw = generatePartialRoundRobin(ids, m);

        const docs = raw.map((mm) => ({
            tournamentId: category.tournamentId,
            categoryId: category._id,
            groupId: g._id,
            player1: mm.player1,
            player2: mm.player2,
            pairKey: makePairKey(mm.player1, mm.player2),
            round: 'group',
            status: 'pending',
            roundNumber: mm.roundNumber ?? null,
            drawVersion,
            resultType: 'played',
            voided: false,
            voidReason: '',
            voidedAt: null,
            courtNumber: null,
            startAt: null,
            endAt: null,
            actualStartAt: null,
            actualEndAt: null,
            resultUpdatedAt: null,
            sets: [],
            winner: null
        }));

        try {
            const inserted = await Match.insertMany(docs, { ordered: false });
            totalGenerated += inserted.length;
        } catch (e) {
            if (!String(e?.message ?? '').includes('E11000')) throw e;
        }
    }

    category.status = 'draw_locked';
    category.drawLockedAt = new Date();
    await category.save();

    res.json({
        categoryId: String(category._id),
        groupsCreated: groups.length,
        generatedMatches: totalGenerated,
        drawVersion,
        warnings
    });
});

router.post('/:id/close-grace', async (req, res) => {
    const { category, tournament: t } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    if (!category.drawLockedAt) return res.status(400).json({ error: 'Category is not draw_locked yet' });
    if (t.status === 'finished') return res.status(409).json({ error: 'Tournament finished' });

    const now = new Date();
    const graceMin = getGraceMinutes(category, t);
    const deadline = new Date(new Date(category.drawLockedAt).getTime() + graceMin * 60 * 1000);

    const force = req.body?.force === true;
    if (!force && now < deadline) {
        return res.status(409).json({ error: 'Grace not ended yet', deadline });
    }

    const absent = await Player.find({
        tournamentId: category.tournamentId,
        categoryId: category._id,
        checkedInAt: null,
        mainEligibility: 'main'
    }).select('_id');

    const absentIds = absent.map((p) => p._id);
    if (absentIds.length === 0) {
        return res.json({ absentPlayers: 0, voidedMatches: 0, deadline });
    }

    await Player.updateMany({ _id: { $in: absentIds } }, { $set: { mainEligibility: 'friendly_only' } });

    const drawVersion = Number(category.drawVersion ?? 1);
    const voidRes = await Match.updateMany(
        {
            tournamentId: category.tournamentId,
            categoryId: category._id,
            round: 'group',
            drawVersion,
            status: { $ne: 'finished' },
            voided: { $ne: true },
            $or: [{ player1: { $in: absentIds } }, { player2: { $in: absentIds } }]
        },
        {
            $set: {
                voided: true,
                voidedAt: now,
                voidReason: 'late_no_show',
                startAt: null,
                endAt: null,
                courtNumber: null
            }
        }
    );

    const groups = await Group.find({ categoryId: category._id }).select('_id players').lean();
    for (const g of groups) {
        const inGroup = new Set(g.players.map(String));
        const affected = absentIds.filter((pid) => inGroup.has(String(pid)));
        if (affected.length === 0) continue;

        await Group.updateOne(
            { _id: g._id },
            {
                $push: {
                    withdrawals: {
                        $each: affected.map((pid) => ({
                            playerId: pid,
                            reason: 'no_show',
                            policy: 'delete_results',
                            note: 'auto close grace',
                            at: now
                        }))
                    }
                }
            }
        );
    }

    res.json({
        absentPlayers: absentIds.length,
        voidedMatches: voidRes.modifiedCount ?? voidRes.nModified ?? 0,
        deadline
    });
});

router.post('/:id/friendly-match', async (req, res) => {
    const { category } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const { player1Id, player2Id } = req.body ?? {};
    if (!player1Id || !player2Id) return res.status(400).json({ error: 'player1Id and player2Id required' });
    if (String(player1Id) === String(player2Id)) return res.status(400).json({ error: 'Players must differ' });

    const [p1, p2] = await Promise.all([Player.findById(player1Id), Player.findById(player2Id)]);
    if (!p1 || !p2) return res.status(404).json({ error: 'Player not found' });

    if (String(p1.tournamentId) !== String(category.tournamentId) || String(p2.tournamentId) !== String(category.tournamentId)) {
        return res.status(404).json({ error: 'Player not found' });
    }

    if (String(p1.categoryId) !== String(category._id) || String(p2.categoryId) !== String(category._id)) {
        return res.status(400).json({ error: 'Players must belong to this category (MVP)' });
    }

    const rand = Math.random().toString(16).slice(2);
    const pairKey = `friendly_${Date.now()}_${rand}`;

    const m = await Match.create({
        tournamentId: category.tournamentId,
        categoryId: category._id,
        groupId: null,
        player1: p1._id,
        player2: p2._id,
        pairKey,
        round: 'friendly',
        status: 'pending',
        roundNumber: null,
        drawVersion: 0,
        resultType: 'played',
        voided: false,
        voidReason: '',
        voidedAt: null,
        courtNumber: null,
        startAt: null,
        endAt: null,
        actualStartAt: null,
        actualEndAt: null,
        resultUpdatedAt: null,
        sets: [],
        winner: null
    });

    res.status(201).json(m);
});

export default router;
