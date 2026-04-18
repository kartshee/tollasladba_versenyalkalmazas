import { Router } from 'express';
import Tournament from '../models/Tournament.js';
import { assertTournamentOwned } from '../services/ownership.service.js';
import { normalizeTournamentPayload } from '../services/configValidation.service.js';
import { AUDIT_SNAPSHOT_FIELDS, pickAuditFields, safeRecordAuditEvent } from '../services/audit.service.js';

const router = Router();

router.post('/', async (req, res) => {
    try {
        const payload = normalizeTournamentPayload(req.body ?? {}, { partial: false });
        const created = await Tournament.create({ ...payload, ownerId: req.user._id });

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: created._id,
            entityType: 'tournament',
            entityId: created._id,
            action: 'tournament.created',
            summary: `Tournament created: ${created.name}`,
            after: pickAuditFields(created, AUDIT_SNAPSHOT_FIELDS.tournament)
        });

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
    const t = await assertTournamentOwned(req.params.id, req.user._id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });
    res.json(t);
});

router.patch('/:id', async (req, res) => {
    const t = await assertTournamentOwned(req.params.id, req.user._id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'draft') {
        return res.status(409).json({ error: 'Tournament is not editable unless status=draft' });
    }

    try {
        const before = pickAuditFields(t, AUDIT_SNAPSHOT_FIELDS.tournament);
        const payload = normalizeTournamentPayload(req.body ?? {}, { partial: true });
        Object.assign(t, payload);
        await t.save();

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: t._id,
            entityType: 'tournament',
            entityId: t._id,
            action: 'tournament.updated',
            summary: `Tournament updated: ${t.name}`,
            before,
            after: pickAuditFields(t, AUDIT_SNAPSHOT_FIELDS.tournament)
        });

        res.json(t);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/:id/start', async (req, res) => {
    const t = await assertTournamentOwned(req.params.id, req.user._id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'draft') {
        return res.status(409).json({ error: 'Only draft tournament can be started' });
    }

    const before = pickAuditFields(t, AUDIT_SNAPSHOT_FIELDS.tournament);
    t.status = 'running';
    await t.save();

    await safeRecordAuditEvent({
        userId: req.user._id,
        tournamentId: t._id,
        entityType: 'tournament',
        entityId: t._id,
        action: 'tournament.started',
        summary: `Tournament started: ${t.name}`,
        before,
        after: pickAuditFields(t, AUDIT_SNAPSHOT_FIELDS.tournament)
    });

    res.json(t);
});

router.post('/:id/finish', async (req, res) => {
    const t = await assertTournamentOwned(req.params.id, req.user._id);
    if (!t) return res.status(404).json({ error: 'Tournament not found' });

    if (t.status !== 'running') {
        return res.status(409).json({ error: 'Only running tournament can be finished' });
    }

    const before = pickAuditFields(t, AUDIT_SNAPSHOT_FIELDS.tournament);
    t.status = 'finished';
    await t.save();

    await safeRecordAuditEvent({
        userId: req.user._id,
        tournamentId: t._id,
        entityType: 'tournament',
        entityId: t._id,
        action: 'tournament.finished',
        summary: `Tournament finished: ${t.name}`,
        before,
        after: pickAuditFields(t, AUDIT_SNAPSHOT_FIELDS.tournament)
    });

    res.json(t);
});

export default router;
