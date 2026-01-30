import { Router } from 'express';
import Tournament from '../models/Tournament.js';

const router = Router();

/**
 * Create tournament
 */
router.post('/', async (req, res) => {
    try {
        const created = await Tournament.create(req.body);
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * List tournaments
 */
router.get('/', async (req, res) => {
    const items = await Tournament.find().sort({ createdAt: -1 });
    res.json(items);
});

/**
 * Get tournament by id
 */
router.get('/:id', async (req, res) => {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
    res.json(t);
});

/**
 * Patch tournament (only if draft)
 */
router.patch('/:id', async (req, res) => {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'draft') {
        return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
    }

    // allow partial updates
    Object.assign(t, req.body);

    try {
        await t.save();
        res.json(t);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * Start tournament (locks config conceptually)
 */
router.post('/:id/start', async (req, res) => {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'draft') {
        return res.status(409).json({ error: 'Only draft tournament can be started' });
    }

    t.status = 'running';
    await t.save();
    res.json(t);
});

/**
 * Finish tournament
 */
router.post('/:id/finish', async (req, res) => {
    const t = await Tournament.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'running') {
        return res.status(409).json({ error: 'Only running tournament can be finished' });
    }

    t.status = 'finished';
    await t.save();
    res.json(t);
});

export default router;
