import { Router } from 'express';
import Player from '../models/Player.js';

const router = Router();

/**
 * ÚJ PLAYER LÉTREHOZÁSA
 */
router.post('/', async (req, res) => {
    try {
        const player = await Player.create(req.body);
        res.status(201).json(player);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

/**
 * PLAYER LISTÁZÁS
 */
router.get('/', async (req, res) => {
    const players = await Player.find();
    res.json(players);
});

export default router;
