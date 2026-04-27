import { Router } from 'express';
import User from '../models/User.js';
import { hashPassword, sanitizeUser, signAuthToken, verifyPassword } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

/** A bejövő e-mail-címet egységes, összehasonlítható formára alakítja. */
function normalizeEmail(email) {
    return String(email ?? '').trim().toLowerCase();
}

router.post('/register', async (req, res) => {
    try {
        const name = String(req.body?.name ?? '').trim();
        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password ?? '');

        if (!name) return res.status(400).json({ error: 'A név megadása kötelező.' });
        if (!email || !email.includes('@')) return res.status(400).json({ error: 'Érvényes e-mail-cím megadása kötelező.' });
        if (password.length < 6) return res.status(400).json({ error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie.' });

        const existing = await User.findOne({ email }).lean();
        if (existing) return res.status(409).json({ error: 'Ez az e-mail-cím már regisztrálva van.' });

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
        return res.status(400).json({ error: 'Az e-mail-cím és a jelszó megadása kötelező.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return res.status(401).json({ error: 'Hibás e-mail-cím vagy jelszó.' });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Hibás e-mail-cím vagy jelszó.' });

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
            return res.status(400).json({ error: 'A jelenlegi és az új jelszó megadása kötelező.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie.' });
        }
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: 'Az új jelszó nem egyezhet meg a jelenlegivel.' });
        }

        const user = await User.findById(req.user._id).select('+passwordHash');
        if (!user) {
            return res.status(404).json({ error: 'A felhasználó nem található.' });
        }

        const ok = await verifyPassword(currentPassword, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: 'A jelenlegi jelszó hibás.' });
        }

        user.passwordHash = await hashPassword(newPassword);
        await user.save();

        res.json({
            message: 'A jelszó sikeresen frissítve lett.',
            user: sanitizeUser(user)
        });
    } catch (err) {
        res.status(400).json({ error: err.message || 'A jelszó frissítése nem sikerült.' });
    }
});

export default router;
