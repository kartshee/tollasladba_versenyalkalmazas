import { Router } from 'express';
import Tournament from '../models/Tournament.js';
import { normalizeTournamentPayload } from '../services/configValidation.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const payload = normalizeTournamentPayload(req.body ?? {}, { partial: false });
        const created = await Tournament.create({ ...payload, ownerId: req.user._id });
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    const items = await Tournament.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    res.json(items);
});

router.get('/:id', async (req, res) => {
    const t = await Tournament.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
    res.json(t);
});

router.patch('/:id', async (req, res) => {
    const t = await Tournament.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'draft') {
        return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
    }

    try {
        const payload = normalizeTournamentPayload(req.body ?? {}, { partial: true });
        Object.assign(t, payload);
        await t.save();
        res.json(t);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/start', async (req, res) => {
    const t = await Tournament.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'draft') {
        return res.status(409).json({ error: 'Only draft tournament can be started' });
    }

    t.status = 'running';
    await t.save();
    res.json(t);
});

router.post('/:id/finish', async (req, res) => {
    const t = await Tournament.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'running') {
        return res.status(409).json({ error: 'Only running tournament can be finished' });
    }

    t.status = 'finished';
    await t.save();
    res.json(t);
});

export default router;
