import { Router } from 'express';
import Category from '../models/Category.js';
import Tournament from '../models/Tournament.js';
import Player from '../models/Player.js';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import { normalizeCategoryPayload } from '../services/configValidation.service.js';

const router = Router();

// create category
router.post('/', async (req, res) => {
    try {
        const { tournamentId } = req.body;
        const t = await Tournament.findById(tournamentId);
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

// list categories (optionally by tournamentId)
router.get('/', async (req, res) => {
    const filter = {};
    if (req.query.tournamentId) filter.tournamentId = req.query.tournamentId;

    const items = await Category.find(filter).sort({ createdAt: -1 });
    res.json(items);
});

// get by id
router.get('/:id', async (req, res) => {
    const c = await Category.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Category not found' });
    res.json(c);
});

// patch (only if tournament draft)
router.patch('/:id', async (req, res) => {
    const c = await Category.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Category not found' });

    const t = await Tournament.findById(c.tournamentId);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
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

// delete (only if tournament draft)
router.delete('/:id', async (req, res) => {
    const c = await Category.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Category not found' });

    const t = await Tournament.findById(c.tournamentId);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
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
            related: {
                players: playersCount,
                groups: groupsCount,
                matches: matchesCount
            }
        });
    }

    await c.deleteOne();
    res.json({ ok: true });
});

export default router;
