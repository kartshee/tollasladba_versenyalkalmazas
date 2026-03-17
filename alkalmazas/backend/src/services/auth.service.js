import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const DEFAULT_JWT_EXPIRES_IN = '7d';
const DEFAULT_JWT_SECRET = 'dev_jwt_secret_change_me';

export function getJwtSecret() {
    return process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

export function getJwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN;
}

export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

export function signAuthToken(user) {
    return jwt.sign(
        {
            sub: String(user._id),
            email: user.email,
            role: user.role ?? 'admin'
        },
        getJwtSecret(),
        { expiresIn: getJwtExpiresIn() }
    );
}

export function verifyAuthToken(token) {
    return jwt.verify(token, getJwtSecret());
}

export function sanitizeUser(user) {
    if (!user) return null;
    return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
    };
}
