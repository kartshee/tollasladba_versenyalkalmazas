import { Router } from 'express';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import { normalizeTournamentPayload, normalizeCategoryPayload } from '../services/configValidation.service.js';
import { AUDIT_SNAPSHOT_FIELDS, pickAuditFields, safeRecordAuditEvent } from '../services/audit.service.js';

const router = Router();

router.post('/configure', async (req, res) => {
    const { tournament, categories } = req.body ?? {};

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const tournamentPayload = normalizeTournamentPayload(tournament ?? {}, { partial: false });
        const cats = Array.isArray(categories) ? categories : [];

        const createdTournament = await Tournament.create([{ ...tournamentPayload, ownerId: req.user._id }], { session });
        const t = createdTournament[0];

        const createdCategories = [];
        for (const c of cats) {
            const payload = {
                ...normalizeCategoryPayload(c ?? {}, { partial: false }),
                tournamentId: t._id
            };
            const created = await Category.create([payload], { session });
            createdCategories.push(created[0]);
        }

        await session.commitTransaction();
        session.endSession();

        await safeRecordAuditEvent({
            userId: req.user._id,
            tournamentId: t._id,
            entityType: 'tournament',
            entityId: t._id,
            action: 'tournament.configured',
            summary: `Tournament configured with ${createdCategories.length} categories: ${t.name}`,
            after: {
                tournament: pickAuditFields(t, AUDIT_SNAPSHOT_FIELDS.tournament),
                categories: createdCategories.map((c) => pickAuditFields(c, AUDIT_SNAPSHOT_FIELDS.category))
            },
            metadata: { categoriesCreated: createdCategories.length }
        });

        return res.status(201).json({
            tournament: t,
            categories: createdCategories
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ error: err.message });
    }
});

export default router;
