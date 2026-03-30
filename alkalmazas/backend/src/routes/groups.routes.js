import { Router } from 'express';
import mongoose from 'mongoose';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import Player from '../models/Player.js';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import { assertTournamentOwned, getOwnedTournamentIds } from '../services/ownership.service.js';
import { AUDIT_SNAPSHOT_FIELDS, pickAuditFields, safeRecordAuditEvent } from '../services/audit.service.js';
import { computeStandings, findCutoffTieBlock } from '../services/standings.service.js';
import { PLAYOFF_BRONZE_ROUND, buildSeededBracketPairs, getInitialPlayoffRoundName, getNextPlayoffRoundName, getPlayoffRoundSize, isPlayoffRound, sortPlayoffRounds } from '../services/playoff.service.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const makePairKey = (a, b) => {
    const x = String(a);
    const y = String(b);
    return x < y ? `${x}_${y}` : `${y}_${x}`;
};


async function loadOwnedGroup(groupId, userId, { populatePlayers = false } = {}) {
    let query = Group.findById(groupId);
    if (populatePlayers) query = query.populate('players');
    const group = await query;
    if (!group) return { group: null, tournament: null };
    const tournament = await assertTournamentOwned(group.tournamentId, userId);
    if (!tournament) return { group: null, tournament: null };
    return { group, tournament };
}


function getCategoryStandingOptions(category) {
    return {
        multiTiePolicy: category?.multiTiePolicy ?? 'direct_then_overall',
        unresolvedTiePolicy: category?.unresolvedTiePolicy ?? 'shared_place'
    };
}

function buildQualifiedList(standings, qualifiersPerGroup, overrideQualifiedPlayerIds = []) {
    const cutoffTie = findCutoffTieBlock(standings, qualifiersPerGroup);
    if (!cutoffTie) {
        return {
            qualified: standings.slice(0, qualifiersPerGroup),
            cutoffTie: null
        };
    }

    const tiedIds = new Set(cutoffTie.map((entry) => String(entry.player._id)));
    const locked = standings.slice(0, qualifiersPerGroup).filter((entry) => !tiedIds.has(String(entry.player._id)));
    const seatsNeeded = qualifiersPerGroup - locked.length;
    const overrides = [...new Set((overrideQualifiedPlayerIds ?? []).map(String))];

    if (overrides.length !== seatsNeeded) {
        return { qualified: null, cutoffTie, seatsNeeded, locked };
    }

    const allowedOverrides = cutoffTie.filter((entry) => overrides.includes(String(entry.player._id)));
    if (allowedOverrides.length !== seatsNeeded) {
        return { qualified: null, cutoffTie, seatsNeeded, locked };
    }

    const byOrder = new Map(standings.map((entry, index) => [String(entry.player._id), index]));
    const qualified = [...locked, ...allowedOverrides].sort((a, b) => (byOrder.get(String(a.player._id)) ?? 0) - (byOrder.get(String(b.player._id)) ?? 0));
    return { qualified, cutoffTie, seatsNeeded, locked };
}

function createPlayoffDocsFromStandings({ group, category, qualified }) {
    const size = qualified.length;
    const round = getInitialPlayoffRoundName(size);
    const pairs = buildSeededBracketPairs(qualified);

    return pairs.map((pair) => ({
        groupId: group._id,
        tournamentId: group.tournamentId,
        categoryId: group.categoryId,
        player1: pair.player1.player._id,
        player2: pair.player2.player._id,
        pairKey: makePairKey(pair.player1.player._id, pair.player2.player._id),
        round,
        status: 'pending',
        roundNumber: pair.bracketSlot,
        drawVersion: Number(category.drawVersion ?? 1),
        resultType: 'played',
        sets: [],
        winner: null,
        courtNumber: null,
        startAt: null,
        endAt: null,
        umpireName: ''
    }));
}

function buildBronzeMatchDoc({ group, category, semifinalMatches }) {
    if (!Array.isArray(semifinalMatches) || semifinalMatches.length !== 2) return null;
    const losers = semifinalMatches.map((match) => {
        const p1 = String(match.player1);
        const p2 = String(match.player2);
        const winner = String(match.winner);
        return winner === p1 ? match.player2 : match.player1;
    });
    if (losers.some((id) => !id)) return null;
    return {
        groupId: group._id,
        tournamentId: group.tournamentId,
        categoryId: group.categoryId,
        player1: losers[0],
        player2: losers[1],
        pairKey: makePairKey(losers[0], losers[1]),
        round: PLAYOFF_BRONZE_ROUND,
        status: 'pending',
        roundNumber: 1,
        drawVersion: Number(category.drawVersion ?? 1),
        resultType: 'played',
        sets: [],
        winner: null,
        courtNumber: null,
        startAt: null,
        endAt: null,
        umpireName: ''
    };
}

function findAdvancableRound(matches) {
    const rounds = [...new Set(matches.map((m) => m.round).filter((round) => isPlayoffRound(round)))].sort(sortPlayoffRounds);
    const sizes = new Set(rounds.map((round) => getPlayoffRoundSize(round)).filter(Boolean));
    const candidates = [...sizes].sort((a, b) => a - b);
    for (const size of candidates) {
        if (size <= 2) continue;
        if (sizes.has(size) && !sizes.has(size / 2)) {
            const currentRound = rounds.find((round) => getPlayoffRoundSize(round) === size);
            return { currentRound, nextRound: getNextPlayoffRoundName(currentRound) };
        }
    }
    return null;
}

async function advanceGroupPlayoff({ group, category }) {
    const playoffMatches = await Match.find({ groupId: group._id, voided: { $ne: true }, round: /^playoff_/ }).sort({ roundNumber: 1, createdAt: 1 }).lean();
    if (playoffMatches.length === 0) throw new Error('No playoff matches generated yet');
    if (playoffMatches.some((m) => m.round === 'playoff_final')) throw new Error('Playoff final already exists');

    const adv = findAdvancableRound(playoffMatches);
    if (!adv) throw new Error('No playoff round can be advanced right now');

    const currentMatches = playoffMatches.filter((m) => m.round === adv.currentRound).sort((a, b) => (a.roundNumber ?? 0) - (b.roundNumber ?? 0));
    const notFinished = currentMatches.filter((m) => !m.winner);
    if (notFinished.length > 0) throw new Error('Current playoff round is not finished');

    const docs = currentMatches.reduce((acc, match, idx, arr) => {
        if (idx % 2 === 1) return acc;
        const other = arr[idx + 1];
        if (!other) return acc;
        acc.push({
            groupId: group._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,
            player1: match.winner,
            player2: other.winner,
            pairKey: makePairKey(match.winner, other.winner),
            round: adv.nextRound,
            status: 'pending',
            roundNumber: Math.floor(idx / 2) + 1,
            drawVersion: Number(category.drawVersion ?? 1),
            resultType: 'played',
            sets: [],
            winner: null,
            courtNumber: null,
            startAt: null,
            endAt: null,
            umpireName: ''
        });
        return acc;
    }, []);

    if (adv.currentRound === 'playoff_semi' && !playoffMatches.some((m) => m.round === PLAYOFF_BRONZE_ROUND)) {
        const bronzeDoc = buildBronzeMatchDoc({ group, category, semifinalMatches: currentMatches });
        if (bronzeDoc) docs.push(bronzeDoc);
    }

    return Match.insertMany(docs);
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

        const t = await assertTournamentOwned(tournamentId, req.user._id);
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

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId,
            categoryId,
            groupId: group._id,
            entityType: 'group',
            entityId: group._id,
            action: 'group.created',
            summary: `Group created: ${group.name}`,
            after: pickAuditFields(group, AUDIT_SNAPSHOT_FIELDS.group)
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
        const t = await assertTournamentOwned(req.query.tournamentId, req.user._id, { lean: true });
        if (!t) return res.json([]);
        filter.tournamentId = req.query.tournamentId;
    } else {
        filter.tournamentId = { $in: await getOwnedTournamentIds(req.user._id) };
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
 * Standings
 */
router.get('/:groupId/standings', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const { group } = await loadOwnedGroup(req.params.groupId, req.user._id, { populatePlayers: true });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const category = await Category.findById(group.categoryId).select('multiTiePolicy unresolvedTiePolicy').lean();
    const matches = await Match.find({
        groupId: group._id,
        round: 'group',
        status: 'finished',
        winner: { $ne: null },
        voided: { $ne: true }
    }).lean();

    const standings = computeStandings(group.players, matches, getCategoryStandingOptions(category));
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

        const { group } = await loadOwnedGroup(groupId, req.user._id);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // játékos tényleg a groupban van?
        const inGroup = group.players.some(p => String(p) === String(playerId));
        if (!inGroup) return res.status(400).json({ error: 'Player not in this group' });

        // policy: ha nem küldik, default mapping
        const effectivePolicy =
            (policy === 'delete_results' || policy === 'keep_results')
                ? policy
                : (reason === 'injury' ? 'keep_results' : 'delete_results');

        const before = pickAuditFields(group, AUDIT_SNAPSHOT_FIELDS.group);

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

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,
            groupId: group._id,
            playerId,
            entityType: 'group',
            entityId: group._id,
            action: 'group.player_withdrawn',
            summary: `Player withdrawn from group ${group.name}`,
            before,
            after: pickAuditFields(group, AUDIT_SNAPSHOT_FIELDS.group),
            metadata: { playerId: String(playerId), reason, policy: effectivePolicy, note: String(note ?? ''), autoFinishedAsWO: ops.length }
        });

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

    const { group: ownedPlayoffGroup } = await loadOwnedGroup(req.params.groupId, req.user._id);
    if (!ownedPlayoffGroup) return res.status(404).json({ error: 'Group not found' });

    const matches = await Match.find({
        groupId: req.params.groupId,
        round: /^playoff_/,
        voided: { $ne: true }
    })
        .sort({ roundNumber: 1, createdAt: 1 })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    const rounds = [...new Set(matches.map((m) => m.round))].sort(sortPlayoffRounds);
    const grouped = Object.fromEntries(rounds.map((round) => [round, matches.filter((m) => m.round === round)]));

    res.json({
        matches,
        rounds: grouped,
        semis: grouped.playoff_semi ?? [],
        bronze: (grouped[PLAYOFF_BRONZE_ROUND] ?? [])[0] ?? null,
        final: (grouped.playoff_final ?? [])[0] ?? null
    });
});

/**
 * Playoff generálása a csoportból
 */
router.post('/:groupId/playoff', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const { group } = await loadOwnedGroup(req.params.groupId, req.user._id, { populatePlayers: true });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const category = await Category.findById(group.categoryId)
        .select('format qualifiersPerGroup playoffSize multiTiePolicy unresolvedTiePolicy drawVersion');
    if (!category) return res.status(404).json({ error: 'Category not found' });

    if (category.format !== 'group+playoff') {
        return res.status(400).json({ error: 'Category format does not allow playoff generation' });
    }

    const qualifiersPerGroup = Number(category.playoffSize ?? category.qualifiersPerGroup ?? 4);
    if (![2, 4, 8, 16, 32].includes(qualifiersPerGroup)) {
        return res.status(400).json({
            error: 'Unsupported qualifiersPerGroup. Supported values: 2, 4, 8, 16, 32',
            qualifiersPerGroup
        });
    }

    const groupMatches = await Match.find({
        groupId: group._id,
        round: 'group',
        voided: { $ne: true }
    }).lean();

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

    const existingPlayoff = await Match.findOne({
        groupId: group._id,
        round: /^playoff_/,
        voided: { $ne: true }
    });
    if (existingPlayoff) {
        return res.status(409).json({ error: 'Playoff already generated for this group' });
    }

    const finishedForStandings = groupMatches.filter((m) => !!m.winner);
    const standings = computeStandings(group.players, finishedForStandings, getCategoryStandingOptions(category));

    const deleteSet = new Set(
        (group.withdrawals ?? [])
            .filter((w) => w.policy === 'delete_results')
            .map((w) => String(w.playerId))
    );

    const eligible = standings.filter((x) => !deleteSet.has(String(x.player._id)));
    if (eligible.length < qualifiersPerGroup) {
        return res.status(400).json({
            error: `Need at least ${qualifiersPerGroup} eligible players for playoff`,
            qualifiersPerGroup,
            eligiblePlayers: eligible.length
        });
    }

    const selection = buildQualifiedList(eligible, qualifiersPerGroup, req.body?.overrideQualifiedPlayerIds);
    if (!selection.qualified) {
        return res.status(409).json({
            error: 'Unresolved tie at playoff cutoff. Provide overrideQualifiedPlayerIds or resolve manually.',
            qualifiersPerGroup,
            cutoffTie: selection.cutoffTie?.map((entry) => ({ id: entry.player._id, name: entry.player.name, place: entry.place })),
            seatsNeeded: selection.seatsNeeded ?? 0
        });
    }

    const created = await Match.insertMany(createPlayoffDocsFromStandings({ group, category, qualified: selection.qualified }));
    const populated = await Match.find({ _id: { $in: created.map((m) => m._id) } })
        .sort({ roundNumber: 1, createdAt: 1 })
        .populate('player1', 'name')
        .populate('player2', 'name')
        .populate('winner', 'name');

    await safeRecordAuditEvent({
        userId: req.user._id,
        tournamentId: group.tournamentId,
        categoryId: group.categoryId,
        groupId: group._id,
        entityType: 'group',
        entityId: group._id,
        action: 'group.playoff_generated',
        summary: `Playoff generated for group ${group.name}`,
        metadata: { qualifiersPerGroup, qualifiedPlayerIds: selection.qualified.map((s) => String(s.player._id)), createdMatchIds: created.map((m) => String(m._id)) }
    });

    res.status(201).json({
        groupId: group._id,
        qualifiersPerGroup,
        qualified: selection.qualified.map((s) => ({
            id: s.player._id,
            name: s.player.name,
            wins: s.wins,
            setDiff: s.setDiff,
            pointDiff: s.pointDiff,
            place: s.place
        })),
        playoff: { round: getInitialPlayoffRoundName(qualifiersPerGroup), matches: populated }
    });
});

/**
 * Következő playoff kör generálása
 */
router.post('/:groupId/playoff/advance', async (req, res) => {
    const groupId = req.params.groupId;
    if (!isValidId(groupId)) return res.status(400).json({ error: 'Invalid groupId' });

    const { group } = await loadOwnedGroup(groupId, req.user._id);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    const category = await Category.findById(group.categoryId).select('drawVersion');
    if (!category) return res.status(404).json({ error: 'Category not found' });

    try {
        const created = await advanceGroupPlayoff({ group, category });
        const populated = await Match.find({ _id: { $in: created.map((m) => m._id) } })
            .sort({ roundNumber: 1, createdAt: 1 })
            .populate('player1', 'name')
            .populate('player2', 'name')
            .populate('winner', 'name');

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,
            groupId: group._id,
            entityType: 'group',
            entityId: group._id,
            action: 'group.playoff_advanced',
            summary: `Playoff advanced for group ${group.name}`,
            metadata: { createdMatchIds: created.map((m) => String(m._id)) }
        });

        res.status(201).json({ created: populated.length, matches: populated });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Visszafelé kompatibilis final generálás endpoint
 */
router.post('/:groupId/playoff/final', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const { group } = await loadOwnedGroup(req.params.groupId, req.user._id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const category = await Category.findById(group.categoryId).select('drawVersion');
    if (!category) return res.status(404).json({ error: 'Category not found' });

    try {
        const created = await advanceGroupPlayoff({ group, category });
        const populated = await Match.find({ _id: { $in: created.map((m) => m._id) } })
            .sort({ roundNumber: 1, createdAt: 1 })
            .populate('player1', 'name')
            .populate('player2', 'name')
            .populate('winner', 'name');

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: group.tournamentId,
            categoryId: group.categoryId,
            groupId: group._id,
            entityType: 'group',
            entityId: group._id,
            action: 'group.playoff_final_generated',
            summary: `Legacy playoff final endpoint used for ${group.name}`,
            metadata: { createdMatchIds: created.map((m) => String(m._id)) }
        });

        return res.status(201).json({ created: populated.length, matches: populated });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
});

router.get('/:groupId/winner', async (req, res) => {
    if (!isValidId(req.params.groupId)) {
        return res.status(400).json({ error: 'Invalid groupId' });
    }

    const { group: ownedWinnerGroup } = await loadOwnedGroup(req.params.groupId, req.user._id);
    if (!ownedWinnerGroup) return res.status(404).json({ error: 'Group not found' });

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
