import User from '../models/User.js';
import { sanitizeUser, verifyAuthToken } from '../services/auth.service.js';

function extractBearerToken(header = '') {
    if (typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token;
}

export async function requireAuth(req, res, next) {
    try {
        const token = extractBearerToken(req.headers.authorization);
        if (!token) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        const payload = verifyAuthToken(token);
        const user = await User.findById(payload.sub).lean();
        if (!user) {
            return res.status(401).json({ error: 'User not found for token' });
        }

        req.user = sanitizeUser(user);
        req.auth = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
