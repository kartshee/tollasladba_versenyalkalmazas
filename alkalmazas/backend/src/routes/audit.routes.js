import { Router } from 'express';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import { assertTournamentOwned, getOwnedTournamentIds } from '../services/ownership.service.js';

const router = Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

router.get('/', async (req, res) => {
    const { tournamentId, categoryId, entityType, entityId, action } = req.query ?? {};
    const limit = Math.min(Math.max(Number(req.query?.limit ?? 50), 1), 200);

    const filter = {};
    if (tournamentId) {
        if (!isValidId(tournamentId)) {
            return res.status(400).json({ error: 'Invalid tournamentId' });
        }
        const owned = await assertTournamentOwned(tournamentId, req.user._id, { lean: true });
        if (!owned) return res.json([]);
        filter.tournamentId = tournamentId;
    } else {
        filter.tournamentId = { $in: await getOwnedTournamentIds(req.user._id) };
    }

    if (categoryId) {
        if (!isValidId(categoryId)) {
            return res.status(400).json({ error: 'Invalid categoryId' });
        }
        filter.categoryId = categoryId;
    }
    if (entityType) filter.entityType = String(entityType);
    if (entityId) filter.entityId = String(entityId);
    if (action) filter.action = String(action);

    const items = await AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('userId', 'name email')
        .lean();

    res.json(items);
});

export default router;
