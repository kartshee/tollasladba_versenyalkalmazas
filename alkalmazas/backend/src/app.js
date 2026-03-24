import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import tournamentRoutes from './routes/tournaments.routes.js';
import tournamentConfigureRoutes from './routes/tournaments.configure.routes.js';
import groupRoutes from './routes/groups.routes.js';
import matchRoutes from './routes/matches.routes.js';
import playerRoutes from './routes/players.routes.js';
import categoryRoutes from './routes/categories.routes.js';
import categoryOpsRoutes from './routes/categories.ops.routes.js';
import auditRoutes from './routes/audit.routes.js';
import exportRoutes from './routes/exports.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';

dotenv.config();

export async function connectDb() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('Missing MONGO_URI in environment');
    }

    mongoose.set('bufferCommands', false);
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api', requireAuth);

app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentConfigureRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/categories', categoryOpsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/exports', exportRoutes);

app.get('/health', (req, res) => {
    res.json({ ok: true, dbReadyState: mongoose.connection.readyState });
});

export default app;
