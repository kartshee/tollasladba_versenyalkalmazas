import { Router } from 'express';
import Category from '../models/Category.js';
import Tournament from '../models/Tournament.js';

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

        const created = await Category.create(req.body);
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

    Object.assign(c, req.body);
    try {
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

    await c.deleteOne();
    res.json({ ok: true });
});

export default router;
