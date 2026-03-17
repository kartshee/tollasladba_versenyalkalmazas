import { Router } from 'express';
import Category from '../models/Category.js';
import Tournament from '../models/Tournament.js';
import Player from '../models/Player.js';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import { normalizeCategoryPayload } from '../services/configValidation.service.js';
import { assertTournamentOwned, getOwnedTournamentIds } from '../services/ownership.service.js';

const router = Router();

async function loadOwnedCategory(categoryId, userId) {
    const c = await Category.findById(categoryId);
    if (!c) return { category: null, tournament: null };
    const t = await assertTournamentOwned(c.tournamentId, userId);
    if (!t) return { category: null, tournament: null };
    return { category: c, tournament: t };
}

router.post('/', async (req, res) => {
    try {
        const { tournamentId } = req.body;
        const t = await assertTournamentOwned(tournamentId, req.user._id);
        if (!t) return res.status(404).json({ error: 'Tournament not found' });

        if (t.status !== 'draft') {
            return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
        }

        const payload = {
            ...normalizeCategoryPayload(req.body ?? {}, { partial: false }),
            tournamentId
        };

        const created = await Category.create(payload);
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const filter = {};
    if (req.query.tournamentId) {
        const t = await assertTournamentOwned(req.query.tournamentId, req.user._id, { lean: true });
        if (!t) return res.json([]);
        filter.tournamentId = req.query.tournamentId;
    } else {
        filter.tournamentId = { $in: await getOwnedTournamentIds(req.user._id) };
    }

    const items = await Category.find(filter).sort({ createdAt: -1 });
    res.json(items);
});

router.get('/:id', async (req, res) => {
    const { category: c } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!c) return res.status(404).json({ error: 'Category not found' });
    res.json(c);
});

router.patch('/:id', async (req, res) => {
    const { category: c, tournament: t } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!c) return res.status(404).json({ error: 'Category not found' });
    if (t.status !== 'draft') {
        return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
    }

    try {
        const payload = normalizeCategoryPayload(req.body ?? {}, { partial: true });
        Object.assign(c, payload);
        await c.save();
        res.json(c);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { category: c, tournament: t } = await loadOwnedCategory(req.params.id, req.user._id);
    if (!c) return res.status(404).json({ error: 'Category not found' });
    if (t.status !== 'draft') {
        return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
    }

    const [playersCount, groupsCount, matchesCount] = await Promise.all([
        Player.countDocuments({ categoryId: c._id }),
        Group.countDocuments({ categoryId: c._id }),
        Match.countDocuments({ categoryId: c._id })
    ]);

    if (playersCount > 0 || groupsCount > 0 || matchesCount > 0) {
        return res.status(409).json({
            error: 'Category cannot be deleted while related players, groups or matches exist',
            related: { players: playersCount, groups: groupsCount, matches: matchesCount }
        });
    }

    await c.deleteOne();
    res.json({ ok: true });
});

export default router;
