import { Router } from 'express';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import { assertTournamentOwned } from '../services/ownership.service.js';
import { sendCsv, formatIso, formatSets, sanitizeFilePart } from '../services/csv.service.js';
import { computeStandings } from '../services/standings.service.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function loadOwnedGroup(groupId, userId, { populatePlayers = false } = {}) {
    let query = Group.findById(groupId);
    if (populatePlayers) query = query.populate('players');
    const group = await query;
    if (!group) return { group: null, tournament: null };
    const tournament = await assertTournamentOwned(group.tournamentId, userId);
    if (!tournament) return { group: null, tournament: null };
    return { group, tournament };
}

router.get('/tournaments/:tournamentId/matches.csv', async (req, res) => {
    const { tournamentId } = req.params;
    if (!isValidId(tournamentId)) return res.status(400).json({ error: 'Invalid tournamentId' });

    const tournament = await assertTournamentOwned(tournamentId, req.user._id, { lean: true });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const filter = { tournamentId };

    if (req.query.categoryId) {
        if (!isValidId(req.query.categoryId)) return res.status(400).json({ error: 'Invalid categoryId' });
        const category = await Category.findOne({ _id: req.query.categoryId, tournamentId }).select('_id').lean();
        if (!category) return res.status(404).json({ error: 'Category not found' });
        filter.categoryId = category._id;
    }

    if (req.query.groupId) {
        if (!isValidId(req.query.groupId)) return res.status(400).json({ error: 'Invalid groupId' });
        const group = await Group.findOne({ _id: req.query.groupId, tournamentId }).select('_id').lean();
        if (!group) return res.status(404).json({ error: 'Group not found' });
        filter.groupId = group._id;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.round) filter.round = req.query.round;

    const matches = await Match.find(filter)
        .sort({ startAt: 1, createdAt: 1 })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name')
        .lean();

    const [categories, groups] = await Promise.all([
        Category.find({ tournamentId }).select('_id name').lean(),
        Group.find({ tournamentId }).select('_id name').lean()
    ]);

    const categoryNames = new Map(categories.map((c) => [String(c._id), c.name]));
    const groupNames = new Map(groups.map((g) => [String(g._id), g.name]));

    const rows = [[
        'matchId',
        'tournamentName',
        'categoryName',
        'groupName',
        'round',
        'roundNumber',
        'status',
        'resultType',
        'voided',
        'player1',
        'player2',
        'winner',
        'sets',
        'courtNumber',
        'scheduledStartAt',
        'scheduledEndAt',
        'actualStartAt',
        'actualEndAt',
        'resultUpdatedAt'
    ]];

    for (const match of matches) {
        rows.push([
            String(match._id),
            tournament.name,
            categoryNames.get(String(match.categoryId)) ?? '',
            match.groupId ? (groupNames.get(String(match.groupId)) ?? '') : '',
            match.round ?? '',
            match.roundNumber ?? '',
            match.status ?? '',
            match.resultType ?? '',
            match.voided === true ? 'true' : 'false',
            match.player1?.name ?? '',
            match.player2?.name ?? '',
            match.winner?.name ?? '',
            formatSets(match.sets),
            match.courtNumber ?? '',
            formatIso(match.startAt),
            formatIso(match.endAt),
            formatIso(match.actualStartAt),
            formatIso(match.actualEndAt),
            formatIso(match.resultUpdatedAt)
        ]);
    }

    const filename = `${sanitizeFilePart(tournament.name, 'tournament')}_matches.csv`;
    return sendCsv(res, filename, rows);
});

router.get('/tournaments/:tournamentId/players.csv', async (req, res) => {
    const { tournamentId } = req.params;
    if (!isValidId(tournamentId)) return res.status(400).json({ error: 'Invalid tournamentId' });

    const tournament = await assertTournamentOwned(tournamentId, req.user._id, { lean: true });
    if (!tournament) return res.status(404).json({ error: 'Tournament not found' });

    const filter = { tournamentId };
    if (req.query.categoryId) {
        if (!isValidId(req.query.categoryId)) return res.status(400).json({ error: 'Invalid categoryId' });
        const category = await Category.findOne({ _id: req.query.categoryId, tournamentId }).select('_id').lean();
        if (!category) return res.status(404).json({ error: 'Category not found' });
        filter.categoryId = category._id;
    }

    const [players, categories] = await Promise.all([
        Player.find(filter).sort({ createdAt: 1, name: 1 }).lean(),
        Category.find({ tournamentId }).select('_id name').lean()
    ]);

    const categoryNames = new Map(categories.map((c) => [String(c._id), c.name]));

    const rows = [[
        'playerId',
        'tournamentName',
        'categoryName',
        'playerName',
        'club',
        'note',
        'checkedIn',
        'checkedInAt',
        'mainEligibility',
        'createdAt'
    ]];

    for (const player of players) {
        rows.push([
            String(player._id),
            tournament.name,
            player.categoryId ? (categoryNames.get(String(player.categoryId)) ?? '') : '',
            player.name ?? '',
            player.club ?? '',
            player.note ?? '',
            player.checkedInAt ? 'true' : 'false',
            formatIso(player.checkedInAt),
            player.mainEligibility ?? '',
            formatIso(player.createdAt)
        ]);
    }

    const filename = `${sanitizeFilePart(tournament.name, 'tournament')}_players.csv`;
    return sendCsv(res, filename, rows);
});

router.get('/groups/:groupId/standings.csv', async (req, res) => {
    const { groupId } = req.params;
    if (!isValidId(groupId)) return res.status(400).json({ error: 'Invalid groupId' });

    const { group, tournament } = await loadOwnedGroup(groupId, req.user._id, { populatePlayers: true });
    if (!group || !tournament) return res.status(404).json({ error: 'Group not found' });

    const category = await Category.findById(group.categoryId).select('name').lean();

    const matches = await Match.find({
        groupId: group._id,
        round: 'group',
        status: 'finished',
        winner: { $ne: null },
        voided: { $ne: true }
    }).lean();

    const standings = computeStandings(group.players, matches);

    const rows = [[
        'position',
        'tournamentName',
        'categoryName',
        'groupName',
        'playerId',
        'playerName',
        'wins',
        'played',
        'winRate',
        'setDiff',
        'pointDiff'
    ]];

    standings.forEach((entry, index) => {
        rows.push([
            index + 1,
            tournament.name,
            category?.name ?? '',
            group.name ?? '',
            String(entry.player?._id ?? ''),
            entry.player?.name ?? '',
            entry.wins ?? 0,
            entry.played ?? 0,
            entry.played > 0 ? (entry.wins / entry.played).toFixed(3) : '0.000',
            entry.setDiff ?? 0,
            entry.pointDiff ?? 0
        ]);
    });

    const filename = `${sanitizeFilePart(tournament.name, 'tournament')}_${sanitizeFilePart(group.name, 'group')}_standings.csv`;
    return sendCsv(res, filename, rows);
});

export default router;
