import { Router } from 'express';
import Match from '../models/Match.js';
import Group from '../models/Group.js';
import Category from '../models/Category.js';
import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';
import { generatePartialRoundRobin, recommendMatchesPerPlayer } from '../services/roundRobin.service.js';
import { determineMatchWinner, normalizeMatchRules, validateMatchResult } from '../services/badmintonRules.service.js';
import { assignUmpiresToPlan, buildGlobalSchedule, buildSchedule } from '../services/scheduler.service.js';
import { assertTournamentOwned, getOwnedTournamentIds, isValidObjectId } from '../services/ownership.service.js';
import { AUDIT_SNAPSHOT_FIELDS, pickAuditFields, safeRecordAuditEvent } from '../services/audit.service.js';

const router = Router();

async function loadOwnedGroup(groupId, userId) {
    if (!isValidObjectId(groupId)) return { group: null, tournament: null };
    const group = await Group.findById(groupId);
    if (!group) return { group: null, tournament: null };
    const tournament = await assertTournamentOwned(group.tournamentId, userId);
    if (!tournament) return { group: null, tournament: null };
    return { group, tournament };
}

async function loadOwnedMatch(matchId, userId) {
    if (!isValidObjectId(matchId)) return { match: null, tournament: null };
    const match = await Match.findById(matchId);
    if (!match) return { match: null, tournament: null };
    const tournament = await assertTournamentOwned(match.tournamentId, userId);
    if (!tournament) return { match: null, tournament: null };
    return { match, tournament };
}

async function loadOwnedTournamentMatchRules(tournamentId, userId) {
    if (!isValidObjectId(tournamentId)) {
        return { tournament: null, rules: normalizeMatchRules() };
    }
    const tournament = await Tournament.findOne({ _id: tournamentId, ownerId: userId }).select('config.matchRules').lean();
    if (!tournament) {
        return { tournament: null, rules: normalizeMatchRules() };
    }
    return {
        tournament,
        rules: normalizeMatchRules(tournament?.config?.matchRules ?? {})
    };
}

function ensureMatchResultEditable(match, tournament, res) {
    if (match.voided) {
        res.status(409).json({ error: 'Érvénytelenített meccs nem módosítható.' });
        return false;
    }
    if (tournament?.status === 'finished' && tournament?.finishedResultEditUnlocked !== true) {
        res.status(409).json({ error: 'A lezárt verseny eredményei jelenleg zároltak. Előbb oldd fel az eredményjavítást.' });
        return false;
    }
    return true;
}

function ensureTournamentAllowsMatchChanges(tournament, res) {
    if (tournament?.status === 'finished' && tournament?.finishedResultEditUnlocked !== true) {
        res.status(409).json({ error: 'A lezárt verseny jelenleg zárolt, ezért a meccs nem módosítható.' });
        return false;
    }
    return true;
}

function finalizeMatchResult(match, now = new Date()) {
    if (!match.actualStartAt) match.actualStartAt = now;
    if (!match.actualEndAt) match.actualEndAt = now;
    match.resultUpdatedAt = now;
    match.status = 'finished';
}

function summarizeScheduledMatches(matches) {
    const scheduledMatches = matches.filter((m) => m?.startAt && m?.endAt && m?.courtNumber && m?.voided !== true);
    const roundNumbers = [...new Set(scheduledMatches.map((m) => Number(m.roundNumber)).filter(Number.isFinite))].sort((a, b) => a - b);
    const starts = scheduledMatches.map((m) => new Date(m.startAt).getTime()).filter(Number.isFinite);
    const ends = scheduledMatches.map((m) => new Date(m.endAt).getTime()).filter(Number.isFinite);

    const courtDistribution = scheduledMatches.reduce((acc, m) => {
        const key = String(m.courtNumber ?? 'unknown');
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});

    const categoryDistribution = scheduledMatches.reduce((acc, m) => {
        const key = String(m.categoryId?._id ?? m.categoryId ?? 'unknown');
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});

    return {
        scheduled: scheduledMatches.length,
        rounds: roundNumbers,
        firstStartAt: starts.length ? new Date(Math.min(...starts)).toISOString() : null,
        lastEndAt: ends.length ? new Date(Math.max(...ends)).toISOString() : null,
        courtDistribution,
        categoryDistribution
    };
}


function validateScheduleNumbers({ courtsCount, matchMinutes, playerRestMinutes, courtTurnoverMinutes, minRestRefereeMinutes = 10, fairnessGap = 1 }) {
    if (!Number.isInteger(courtsCount) || courtsCount < 1 || courtsCount > 50) return 'courtsCount must be an integer between 1 and 50';
    if (!Number.isFinite(matchMinutes) || matchMinutes <= 0 || matchMinutes > 240) return 'matchMinutes must be between 1 and 240';
    if (!Number.isFinite(playerRestMinutes) || playerRestMinutes < 0 || playerRestMinutes > 240) return 'playerRestMinutes must be between 0 and 240';
    if (!Number.isFinite(courtTurnoverMinutes) || courtTurnoverMinutes < 0 || courtTurnoverMinutes > 120) return 'courtTurnoverMinutes must be between 0 and 120';
    if (!Number.isFinite(minRestRefereeMinutes) || minRestRefereeMinutes < 0 || minRestRefereeMinutes > 240) return 'minRestRefereeMinutes must be between 0 and 240';
    if (!Number.isInteger(fairnessGap) || fairnessGap < 0 || fairnessGap > 5) return 'fairnessGap must be an integer between 0 and 5';
    return null;
}

function normalizeScheduleInputs(tournament, body = {}) {
    const cfg = tournament.config ?? {};
    const courtsCount = Number(body.courtsCount ?? cfg.courtsCount ?? 1);
    const matchMinutes = Number(body.matchMinutes ?? cfg.estimatedMatchMinutes ?? 35);
    const playerRestMinutes = Number(body.playerRestMinutes ?? body.breakMinutes ?? cfg.minRestPlayerMinutes ?? 20);
    const courtTurnoverMinutes = Number(body.courtTurnoverMinutes ?? cfg.courtTurnoverMinutes ?? 0);
    const minRestRefereeMinutes = Number(body.minRestRefereeMinutes ?? cfg.minRestRefereeMinutes ?? 10);
    const fairnessGap = Number(body.fairnessGap ?? 1);

    return { courtsCount, matchMinutes, playerRestMinutes, courtTurnoverMinutes, minRestRefereeMinutes, fairnessGap };
}

async function filterSchedulableMatchesByCheckedIn(matches = []) {
    const playerIds = new Set();
    matches.forEach((m) => { playerIds.add(String(m.player1)); playerIds.add(String(m.player2)); });
    const players = await Player.find({ _id: { $in: Array.from(playerIds) } }).select('_id checkedInAt mainEligibility').lean();
    const okPlayers = new Set(players.filter((p) => p.checkedInAt && p.mainEligibility === 'main').map((p) => String(p._id)));
    return matches.filter((m) => okPlayers.has(String(m.player1)) && okPlayers.has(String(m.player2)));
}

function endForTimeline(match, { now, matchMinutes }) {
    const nowMs = now.getTime();
    const matchMs = matchMinutes * 60 * 1000;

    const actualEndMs = match.actualEndAt ? new Date(match.actualEndAt).getTime() : Number.NaN;
    if (Number.isFinite(actualEndMs)) return new Date(actualEndMs);

    if (match.status === 'running') {
        const actualStartMs = match.actualStartAt ? new Date(match.actualStartAt).getTime() : Number.NaN;
        const plannedEndMs = match.endAt ? new Date(match.endAt).getTime() : Number.NaN;
        const estimatedEndMs = Number.isFinite(actualStartMs)
            ? actualStartMs + matchMs
            : (Number.isFinite(plannedEndMs) ? plannedEndMs : nowMs);
        return new Date(Math.max(nowMs, estimatedEndMs));
    }

    const plannedEndMs = match.endAt ? new Date(match.endAt).getTime() : Number.NaN;
    return new Date(Number.isFinite(plannedEndMs) ? plannedEndMs : nowMs);
}


router.get('/', async (req, res) => {
    const { tournamentId, groupId, categoryId, status, round } = req.query;

    const filter = {};
    if (tournamentId) {
        const t = await assertTournamentOwned(tournamentId, req.user._id, { lean: true });
        if (!t) return res.json([]);
        filter.tournamentId = tournamentId;
    } else {
        filter.tournamentId = { $in: await getOwnedTournamentIds(req.user._id) };
    }
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

router.get('/group/:groupId', async (req, res) => {
    const { group } = await loadOwnedGroup(req.params.groupId, req.user._id);
    if (!group) return res.status(404).json({ error: 'A csoport nem található.' });

    const matches = await Match.find({ groupId: req.params.groupId })
        .sort({ startAt: 1, createdAt: 1 })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(matches);
});

router.post('/group/:groupId', async (req, res) => {
    try {
        const { group } = await loadOwnedGroup(req.params.groupId, req.user._id);
        if (!group) return res.status(404).json({ error: 'A csoport nem található.' });

        const existing = await Match.findOne({ groupId: group._id, round: 'group' });
        if (existing) return res.status(409).json({ error: 'Group matches already generated for this group' });

        const category = await Category.findById(group.categoryId).lean();
        if (!category) return res.status(404).json({ error: 'A kategória nem található.' });

        const n = group.players.length;
        if (n < 2) return res.status(400).json({ error: 'Egy csoportban legalább 2 játékos szükséges.' });

        const requested = Number(req.body?.matchesPerPlayer);
        const cfg = Number(category.groupStageMatchesPerPlayer);
        const m = Number.isFinite(requested) && requested > 0
            ? requested
            : (Number.isFinite(cfg) && cfg > 0 ? cfg : recommendMatchesPerPlayer(n));

        if (n % 2 === 1 && m < (n - 1) && (m % 2 === 1)) {
            return res.status(400).json({
                error: 'Odd player count with partial round robin requires even matchesPerPlayer (or use full RR with matchesPerPlayer=n-1).',
                playersCount: n,
                matchesPerPlayer: m
            });
        }

        const rawMatches = generatePartialRoundRobin(group.players, m);

        const matches = await Match.insertMany(
            rawMatches.map((mm) => {
                const a = String(mm.player1);
                const b = String(mm.player2);
                const pairKey = a < b ? `${a}_${b}` : `${b}_${a}`;

                return {
                    ...mm,
                    pairKey,
                    groupId: group._id,
                    tournamentId: group.tournamentId,
                    categoryId: group.categoryId,
                    round: 'group',
                    status: 'pending',
                    roundNumber: mm.roundNumber ?? null,
                    drawVersion: 1,
                    resultType: 'played',
                    voided: false,
                    courtNumber: null,
                    startAt: null,
                    endAt: null,
                    sets: [],
                    winner: null
                };
            })
        );

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,
            groupId: group._id,
            entityType: 'group',
            entityId: group._id,
            action: 'group.matches_generated',
            summary: `Generated ${matches.length} group matches`,
            metadata: { generated: matches.length, matchesPerPlayer: m, playersCount: n }
        });

        res.status(201).json({ generated: matches.length, matches });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.patch('/:matchId/umpire', async (req, res) => {
    const { match, tournament } = await loadOwnedMatch(req.params.matchId, req.user._id);
    if (!match) return res.status(404).json({ error: 'A meccs nem található.' });
    if (!ensureTournamentAllowsMatchChanges(tournament, res)) return;
    if (match.voided) return res.status(409).json({ error: 'Érvénytelenített meccshez nem rendelhető játékvezető.' });

    const { umpireName = '' } = req.body ?? {};
    if (typeof umpireName !== 'string') {
        return res.status(400).json({ error: 'A játékvezető neve csak szöveg lehet.' });
    }

    const before = pickAuditFields(match, AUDIT_SNAPSHOT_FIELDS.match);
    match.umpireName = umpireName.trim();
    await match.save();

    await safeRecordAuditEvent({
        userId: req.user._id,
        tournamentId: match.tournamentId,
        categoryId: match.categoryId,
        groupId: match.groupId,
        matchId: match._id,
        entityType: 'match',
        entityId: match._id,
        action: 'match.umpire_updated',
        summary: match.umpireName ? `Umpire assigned: ${match.umpireName}` : 'Umpire cleared',
        before,
        after: pickAuditFields(match, AUDIT_SNAPSHOT_FIELDS.match)
    });

    const populated = await Match.findById(match._id)
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(populated);
});

router.patch('/:matchId/status', async (req, res) => {
    if (!req.is('application/json')) {
        return res.status(400).json({ error: 'A kérés Content-Type értékének application/json-nak kell lennie.' });
    }
    const { status } = req.body ?? {};
    if (!status) return res.status(400).json({ error: 'Hiányzik a státusz a kérés törzséből.' });

    if (!['pending', 'running'].includes(status)) {
        return res.status(400).json({ error: 'A státusz csak várakozó vagy futó lehet.' });
    }

    const { match, tournament } = await loadOwnedMatch(req.params.matchId, req.user._id);
    if (!match) return res.status(404).json({ error: 'A meccs nem található.' });
    if (tournament?.status === 'finished') {
        return res.status(409).json({ error: 'Lezárt versenynél a meccs státusza már nem módosítható.' });
    }

    if (match.voided) return res.status(409).json({ error: 'Érvénytelenített meccs státusza nem módosítható.' });
    if (match.status === 'finished') return res.status(409).json({ error: 'Befejezett meccs státusza nem módosítható.' });

    if (status === 'running') {
        if (match.status !== 'pending') return res.status(409).json({ error: 'Csak várakozó meccs indítható el.' });
        if (!match.courtNumber || !match.startAt || !match.endAt) {
            return res.status(409).json({ error: 'Csak beütemezett meccs indítható el: szükséges pálya és időpont.' });
        }

        const runningOnSameCourt = await Match.findOne({
            _id: { $ne: match._id },
            tournamentId: match.tournamentId,
            status: 'running',
            voided: { $ne: true },
            courtNumber: match.courtNumber
        }).lean();
        if (runningOnSameCourt) {
            return res.status(409).json({ error: `A(z) ${match.courtNumber}. pályán már fut egy másik meccs.` });
        }

        const runningWithSamePlayer = await Match.findOne({
            _id: { $ne: match._id },
            tournamentId: match.tournamentId,
            status: 'running',
            voided: { $ne: true },
            $or: [
                { player1: { $in: [match.player1, match.player2] } },
                { player2: { $in: [match.player1, match.player2] } }
            ]
        }).lean();
        if (runningWithSamePlayer) {
            return res.status(409).json({ error: 'Az egyik játékos már egy másik futó meccsben szerepel.' });
        }

        if (!match.actualStartAt) match.actualStartAt = new Date();
    }

    if (status === 'pending') {
        if ((match.sets?.length ?? 0) > 0 || match.winner) {
            return res.status(409).json({ error: 'Rögzített eredmény mellett a meccs nem tehető vissza várakozó állapotba.' });
        }
        match.actualStartAt = null;
        match.actualEndAt = null;
        match.resultUpdatedAt = null;
    }

    const before = pickAuditFields(match, AUDIT_SNAPSHOT_FIELDS.match);
    match.status = status;
    await match.save();

    await safeRecordAuditEvent({
        userId: req.user._id,
        tournamentId: match.tournamentId,
        categoryId: match.categoryId,
        groupId: match.groupId,
        matchId: match._id,
        entityType: 'match',
        entityId: match._id,
        action: 'match.status_updated',
        summary: `Match status updated to ${status}`,
        before,
        after: pickAuditFields(match, AUDIT_SNAPSHOT_FIELDS.match)
    });

    const populated = await Match.findById(match._id)
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(populated);
});

router.patch('/:matchId/result', async (req, res) => {
    const { sets } = req.body ?? {};

    const { match, tournament: ownedTournament } = await loadOwnedMatch(req.params.matchId, req.user._id);
    if (!match) return res.status(404).json({ error: 'A meccs nem található.' });

    const { tournament, rules } = await loadOwnedTournamentMatchRules(match.tournamentId, req.user._id);
    if (!tournament) return res.status(404).json({ error: 'A meccshez tartozó verseny nem található.' });
    if (!ensureMatchResultEditable(match, ownedTournament, res)) return;

    const validation = validateMatchResult(sets, rules);
    if (!validation.ok) {
        return res.status(400).json({ error: validation.error, set: validation.set, setIndex: validation.setIndex, rules });
    }

    const winner = determineMatchWinner(sets, match.player1, match.player2, rules);
    if (!winner) {
        return res.status(400).json({
            error: `Nem állapítható meg győztes (legalább ${Math.floor(rules.bestOf / 2) + 1} megnyert szett szükséges).`,
            rules
        });
    }

    const before = pickAuditFields(match, AUDIT_SNAPSHOT_FIELDS.match);
    match.sets = sets;
    match.winner = winner;
    match.resultType = 'played';
    finalizeMatchResult(match);
    await match.save();

    await safeRecordAuditEvent({
        userId: req.user._id,
        tournamentId: match.tournamentId,
        categoryId: match.categoryId,
        groupId: match.groupId,
        matchId: match._id,
        entityType: 'match',
        entityId: match._id,
        action: 'match.result_recorded',
        summary: 'Match result recorded',
        before,
        after: pickAuditFields(match, AUDIT_SNAPSHOT_FIELDS.match),
        metadata: { appliedMatchRules: rules }
    });

    const populated = await Match.findById(match._id)
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json({ ...populated.toObject(), appliedMatchRules: rules });
});

router.patch('/:matchId/outcome', async (req, res) => {
    const { type, winnerSide } = req.body ?? {};
    if (!['wo', 'ff', 'ret'].includes(type)) {
        return res.status(400).json({ error: 'Az eredménytípus csak wo, ff vagy ret lehet.' });
    }
    if (!['player1', 'player2'].includes(winnerSide)) {
        return res.status(400).json({ error: 'A győztes oldala csak player1 vagy player2 lehet.' });
    }

    const { match, tournament } = await loadOwnedMatch(req.params.matchId, req.user._id);
    if (!match) return res.status(404).json({ error: 'A meccs nem található.' });
    if (!ensureMatchResultEditable(match, tournament, res)) return;

    const winner = winnerSide === 'player1' ? match.player1 : match.player2;
    const before = pickAuditFields(match, AUDIT_SNAPSHOT_FIELDS.match);
    match.sets = [];
    match.winner = winner;
    match.resultType = type;
    finalizeMatchResult(match);
    await match.save();

    await safeRecordAuditEvent({
        userId: req.user._id,
        tournamentId: match.tournamentId,
        categoryId: match.categoryId,
        groupId: match.groupId,
        matchId: match._id,
        entityType: 'match',
        entityId: match._id,
        action: 'match.special_outcome_recorded',
        summary: `Special match outcome recorded: ${type}`,
        before,
        after: pickAuditFields(match, AUDIT_SNAPSHOT_FIELDS.match),
        metadata: { type, winnerSide }
    });

    const populated = await Match.findById(match._id)
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    res.json(populated);
});

router.post('/group/:groupId/schedule', async (req, res) => {
    try {
        if (!req.is('application/json')) return res.status(400).json({ error: 'A kérés Content-Type értékének application/json-nak kell lennie.' });
        if (!req.body) return res.status(400).json({ error: 'Missing JSON body. Send Content-Type: application/json and a JSON payload.' });

        const { startAt, courtsCount, matchMinutes, playerRestMinutes, courtTurnoverMinutes, breakMinutes, force } = req.body;
        const parsedStart = startAt ? new Date(startAt) : new Date();
        if (Number.isNaN(parsedStart.getTime())) return res.status(400).json({ error: 'Érvénytelen kezdési időpont.' });

        const cCount = Number(courtsCount ?? 1);
        const mMin = Number(matchMinutes ?? 35);
        const restMin = Number(playerRestMinutes ?? breakMinutes ?? 20);
        const turnoverMin = Number(courtTurnoverMinutes ?? 0);

        if (!Number.isInteger(cCount) || cCount < 1 || cCount > 50) return res.status(400).json({ error: 'courtsCount must be an integer between 1 and 50' });
        if (!Number.isFinite(mMin) || mMin <= 0 || mMin > 240) return res.status(400).json({ error: 'matchMinutes must be between 1 and 240' });
        if (!Number.isFinite(restMin) || restMin < 0 || restMin > 240) return res.status(400).json({ error: 'playerRestMinutes must be between 0 and 240' });
        if (!Number.isFinite(turnoverMin) || turnoverMin < 0 || turnoverMin > 120) return res.status(400).json({ error: 'courtTurnoverMinutes must be between 0 and 120' });

        const { group } = await loadOwnedGroup(req.params.groupId, req.user._id);
        if (!group) return res.status(404).json({ error: 'A csoport nem található.' });

        const filter = { groupId: req.params.groupId, round: { $ne: 'friendly' }, status: 'pending', voided: { $ne: true } };
        if (!force) filter.startAt = null;

        const toSchedule = await Match.find(filter).select('_id player1 player2 round roundNumber createdAt').sort({ roundNumber: 1, createdAt: 1 }).lean();
        if (toSchedule.length === 0) return res.json({ scheduled: 0, message: 'Nincs beütemezhető meccs az aktuális szűrőkkel.' });

        const ids = new Set();
        toSchedule.forEach((m) => { ids.add(String(m.player1)); ids.add(String(m.player2)); });
        const players = await Player.find({ _id: { $in: Array.from(ids) } }).select('_id checkedInAt mainEligibility').lean();
        const ok = new Set(players.filter((p) => p.checkedInAt && p.mainEligibility === 'main').map((p) => String(p._id)));
        const filtered = toSchedule.filter((m) => ok.has(String(m.player1)) && ok.has(String(m.player2)));
        if (filtered.length === 0) {
            return res.json({ scheduled: 0, message: 'Nincs ütemezhető meccs: mindkét játékosnak check-inelve és main jogosultsággal kell rendelkeznie.' });
        }

        const plan = buildSchedule(filtered, {
            startAt: parsedStart,
            courtsCount: cCount,
            matchMinutes: mMin,
            playerRestMinutes: restMin,
            courtTurnoverMinutes: turnoverMin
        });

        const ops = plan.map((pp) => ({ updateOne: { filter: { _id: pp.matchId, status: 'pending' }, update: { $set: { startAt: pp.startAt, endAt: pp.endAt, courtNumber: pp.courtNumber } } } }));
        await Match.bulkWrite(ops);

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,
            groupId: group._id,
            entityType: 'group',
            entityId: group._id,
            action: 'group.schedule_generated',
            summary: `Group schedule generated for ${plan.length} matches`,
            metadata: { scheduled: plan.length, startAt: parsedStart, courtsCount: cCount, matchMinutes: mMin, playerRestMinutes: restMin, courtTurnoverMinutes: turnoverMin, force: force === true }
        });

        const updated = await Match.find({ groupId: req.params.groupId, round: { $ne: 'friendly' } })
            .sort({ startAt: 1, createdAt: 1 })
            .populate('player1', 'name')
            .populate('player2', 'name')
            .populate('winner', 'name');

        res.json({ scheduled: plan.length, matches: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/tournament/:tournamentId/schedule/global', async (req, res) => {
    try {
        const tournament = await Tournament.findOne({ _id: req.params.tournamentId, ownerId: req.user._id }).select('config status referees').lean();
        if (!tournament) return res.status(404).json({ error: 'A verseny nem található.' });
        if (tournament.status === 'finished') return res.status(409).json({ error: 'A verseny már lezárt.' });

        const { startAt, courtsCount, matchMinutes, playerRestMinutes, breakMinutes, courtTurnoverMinutes, force = false, fairnessGap = 1, assignUmpires = true } = req.body ?? {};
        const parsedStart = startAt ? new Date(startAt) : new Date();
        if (Number.isNaN(parsedStart.getTime())) return res.status(400).json({ error: 'Érvénytelen kezdési időpont.' });

        const cfg = tournament.config ?? {};
        const cCount = Number(courtsCount ?? cfg.courtsCount ?? 1);
        const mMin = Number(matchMinutes ?? cfg.estimatedMatchMinutes ?? 35);
        const restMin = Number(playerRestMinutes ?? breakMinutes ?? cfg.minRestPlayerMinutes ?? 20);
        const turnoverMin = Number(courtTurnoverMinutes ?? cfg.courtTurnoverMinutes ?? 0);
        const fairGap = Number(fairnessGap ?? 1);

        if (!Number.isInteger(cCount) || cCount < 1 || cCount > 50) return res.status(400).json({ error: 'courtsCount must be an integer between 1 and 50' });
        if (!Number.isFinite(mMin) || mMin <= 0 || mMin > 240) return res.status(400).json({ error: 'matchMinutes must be between 1 and 240' });
        if (!Number.isFinite(restMin) || restMin < 0 || restMin > 240) return res.status(400).json({ error: 'playerRestMinutes must be between 0 and 240' });
        if (!Number.isFinite(turnoverMin) || turnoverMin < 0 || turnoverMin > 120) return res.status(400).json({ error: 'courtTurnoverMinutes must be between 0 and 120' });
        if (!Number.isInteger(fairGap) || fairGap < 0 || fairGap > 5) return res.status(400).json({ error: 'fairnessGap must be an integer between 0 and 5' });

        const filter = { tournamentId: req.params.tournamentId, round: { $ne: 'friendly' }, status: 'pending', voided: { $ne: true } };
        if (!force) filter.startAt = null;

        const toSchedule = await Match.find(filter)
            .select('_id tournamentId categoryId groupId player1 player2 roundNumber createdAt')
            .sort({ categoryId: 1, roundNumber: 1, createdAt: 1 })
            .lean();

        if (toSchedule.length === 0) return res.json({ scheduled: 0, message: 'Nincs beütemezhető meccs az aktuális szűrőkkel.' });

        const playerIds = new Set();
        toSchedule.forEach((m) => { playerIds.add(String(m.player1)); playerIds.add(String(m.player2)); });
        const players = await Player.find({ _id: { $in: Array.from(playerIds) } }).select('_id checkedInAt mainEligibility').lean();
        const okPlayers = new Set(players.filter((p) => p.checkedInAt && p.mainEligibility === 'main').map((p) => String(p._id)));
        const filtered = toSchedule.filter((m) => okPlayers.has(String(m.player1)) && okPlayers.has(String(m.player2)));
        if (filtered.length === 0) {
            return res.json({ scheduled: 0, message: 'Nincs ütemezhető meccs: mindkét játékosnak check-inelve és main jogosultsággal kell rendelkeznie.' });
        }

        const scheduledIds = filtered.map((m) => m._id);
        const existing = await Match.find({
            tournamentId: req.params.tournamentId,
            voided: { $ne: true },
            courtNumber: { $ne: null },
            startAt: { $ne: null },
            endAt: { $ne: null },
            _id: { $nin: scheduledIds }
        }).select('_id categoryId round player1 player2 courtNumber startAt endAt').lean();

        let plan = buildGlobalSchedule(filtered, {
            startAt: parsedStart,
            courtsCount: cCount,
            matchMinutes: mMin,
            playerRestMinutes: restMin,
            courtTurnoverMinutes: turnoverMin,
            fairnessGap: fairGap,
            existingMatches: existing
        });

        if (assignUmpires !== false) {
            plan = assignUmpiresToPlan(plan, tournament.referees ?? [], {
                minRestRefereeMinutes: tournament.config?.minRestRefereeMinutes ?? 10
            });
        }

        const ops = plan.map((pp) => ({
            updateOne: {
                filter: { _id: pp.matchId, status: 'pending' },
                update: { $set: { startAt: pp.startAt, endAt: pp.endAt, courtNumber: pp.courtNumber, umpireName: pp.umpireName ?? '' } }
            }
        }));
        if (ops.length > 0) await Match.bulkWrite(ops);

        const updated = await Match.find({ tournamentId: req.params.tournamentId, round: { $ne: 'friendly' } })
            .sort({ startAt: 1, createdAt: 1 })
            .populate('categoryId', 'name')
            .populate('player1', 'name')
            .populate('player2', 'name')
            .populate('winner', 'name');

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: req.params.tournamentId,
            entityType: 'tournament',
            entityId: req.params.tournamentId,
            action: 'tournament.global_schedule_generated',
            summary: `Global schedule generated for ${plan.length} matches`,
            metadata: {
                scheduled: plan.length,
                startAt: parsedStart,
                courtsCount: cCount,
                matchMinutes: mMin,
                playerRestMinutes: restMin,
                courtTurnoverMinutes: turnoverMin,
                fairnessGap: fairGap,
                assignUmpires: assignUmpires !== false,
                force,
                summary: summarizeScheduledMatches(updated)
            }
        });

        res.json({ scheduled: plan.length, fairnessGap: fairGap, summary: summarizeScheduledMatches(updated), matches: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.post('/tournament/:tournamentId/schedule/reestimate', async (req, res) => {
    try {
        const tournament = await Tournament.findOne({ _id: req.params.tournamentId, ownerId: req.user._id }).select('config status referees').lean();
        if (!tournament) return res.status(404).json({ error: 'A verseny nem található.' });
        if (tournament.status === 'finished') return res.status(409).json({ error: 'A verseny már lezárt.' });

        const { force = true, assignUmpires = true } = req.body ?? {};
        const options = normalizeScheduleInputs(tournament, req.body ?? {});
        const validationError = validateScheduleNumbers(options);
        if (validationError) return res.status(400).json({ error: validationError });

        const now = new Date();

        const pending = await Match.find({
            tournamentId: req.params.tournamentId,
            round: { $ne: 'friendly' },
            status: 'pending',
            voided: { $ne: true },
            ...(force ? {} : { startAt: null })
        })
            .select('_id tournamentId categoryId groupId player1 player2 roundNumber createdAt startAt endAt courtNumber')
            .sort({ startAt: 1, courtNumber: 1, roundNumber: 1, createdAt: 1 })
            .lean();

        if (pending.length === 0) return res.json({ rescheduled: 0, message: 'Nincs újrabecsülhető várakozó meccs.' });

        const filtered = await filterSchedulableMatchesByCheckedIn(pending);
        if (filtered.length === 0) {
            return res.json({ rescheduled: 0, message: 'Nincs újrabecsülhető meccs: mindkét játékosnak check-inelve és main jogosultsággal kell rendelkeznie.' });
        }

        const scheduledIds = filtered.map((m) => m._id);
        const timelineMatches = await Match.find({
            tournamentId: req.params.tournamentId,
            voided: { $ne: true },
            courtNumber: { $ne: null },
            _id: { $nin: scheduledIds },
            status: { $in: ['running', 'finished'] }
        })
            .select('_id categoryId round player1 player2 courtNumber startAt endAt actualStartAt actualEndAt status')
            .lean();

        const existingMatches = timelineMatches.map((match) => ({
            ...match,
            endAt: endForTimeline(match, { now, matchMinutes: options.matchMinutes })
        }));

        let plan = buildGlobalSchedule(filtered, {
            startAt: now,
            courtsCount: options.courtsCount,
            matchMinutes: options.matchMinutes,
            playerRestMinutes: options.playerRestMinutes,
            courtTurnoverMinutes: options.courtTurnoverMinutes,
            fairnessGap: options.fairnessGap,
            existingMatches
        });

        if (assignUmpires !== false) {
            plan = assignUmpiresToPlan(plan, tournament.referees ?? [], {
                minRestRefereeMinutes: options.minRestRefereeMinutes
            });
        }

        const ops = plan.map((pp) => ({
            updateOne: {
                filter: { _id: pp.matchId, status: 'pending' },
                update: { $set: { startAt: pp.startAt, endAt: pp.endAt, courtNumber: pp.courtNumber, umpireName: pp.umpireName ?? '' } }
            }
        }));
        if (ops.length > 0) await Match.bulkWrite(ops);

        const updated = await Match.find({ tournamentId: req.params.tournamentId, round: { $ne: 'friendly' } })
            .sort({ startAt: 1, createdAt: 1 })
            .populate('categoryId', 'name')
            .populate('player1', 'name')
            .populate('player2', 'name')
            .populate('winner', 'name');

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: req.params.tournamentId,
            entityType: 'tournament',
            entityId: req.params.tournamentId,
            action: 'tournament.schedule_reestimated',
            summary: `Dynamic schedule estimate recalculated for ${plan.length} matches`,
            metadata: {
                rescheduled: plan.length,
                recalculatedAt: now,
                courtsCount: options.courtsCount,
                matchMinutes: options.matchMinutes,
                playerRestMinutes: options.playerRestMinutes,
                courtTurnoverMinutes: options.courtTurnoverMinutes,
                minRestRefereeMinutes: options.minRestRefereeMinutes,
                assignUmpires: assignUmpires !== false,
                summary: summarizeScheduledMatches(updated)
            }
        });

        res.json({ rescheduled: plan.length, summary: summarizeScheduledMatches(updated), matches: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.patch('/group/:groupId/schedule/reset', async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const { group } = await loadOwnedGroup(groupId, req.user._id);
        if (!group) return res.status(404).json({ error: 'A csoport nem található.' });

        const filter = { groupId, round: 'group', status: 'pending', voided: { $ne: true } };
        const result = await Match.updateMany(filter, { $set: { startAt: null, endAt: null, courtNumber: null } });

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,
            groupId: group._id,
            entityType: 'group',
            entityId: group._id,
            action: 'group.schedule_reset',
            summary: 'Pending group schedule reset',
            metadata: {
                reset: result.modifiedCount ?? result.nModified ?? 0,
                matched: result.matchedCount ?? result.n ?? 0
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
