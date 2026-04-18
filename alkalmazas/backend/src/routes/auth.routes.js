import { Router } from 'express';
import User from '../models/User.js';
import { hashPassword, sanitizeUser, signAuthToken, verifyPassword } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

function normalizeEmail(email) {
    return String(email ?? '').trim().toLowerCase();
}

router.post('/register', async (req, res) => {
    try {
        const name = String(req.body?.name ?? '').trim();
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password ?? '');

        if (!name) return res.status(400).json({ error: 'name is required' });
        if (!email || !email.includes('@')) return res.status(400).json({ error: 'valid email is required' });
        if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });

        const existing = await User.findOne({ email }).lean();
        if (existing) return res.status(409).json({ error: 'Email already registered' });

        const passwordHash = await hashPassword(password);
        const created = await User.create({ name, email, passwordHash, role: 'admin' });
        const token = signAuthToken(created);

        res.status(201).json({ token, user: sanitizeUser(created) });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAuthToken(user);
    res.json({ token, user: sanitizeUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
    res.json({ user: req.user });
});

router.patch('/password', requireAuth, async (req, res) => {
    try {
        const currentPassword = String(req.body?.currentPassword ?? '');
        const newPassword = String(req.body?.newPassword ?? '');

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'currentPassword and newPassword are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'password must be at least 6 characters' });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'Az új jelszó nem egyezhet meg a jelenlegivel.' });
        }

        const user = await User.findById(req.user._id).select('+passwordHash');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const ok = await verifyPassword(currentPassword, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: 'A jelenlegi jelszó hibás.' });
        }

        user.passwordHash = await hashPassword(newPassword);
        await user.save();

        res.json({
            message: 'Password updated successfully',
            user: sanitizeUser(user)
        });
    } catch (err) {
        res.status(400).json({ error: err.message || 'Could not update password' });
    }
});

export default router;
