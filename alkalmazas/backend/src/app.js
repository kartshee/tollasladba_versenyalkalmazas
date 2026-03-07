import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import tournamentRoutes from './routes/tournaments.routes.js';
import tournamentConfigureRoutes from './routes/tournaments.configure.routes.js';

import groupRoutes from './routes/groups.routes.js';
import matchRoutes from './routes/matches.routes.js';
import playerRoutes from './routes/players.routes.js';

import categoryRoutes from './routes/categories.routes.js';
import categoryOpsRoutes from './routes/categories.ops.routes.js';

dotenv.config();

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error(err));

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/players', playerRoutes);

// tournaments
app.use('/api/tournaments', tournamentConfigureRoutes); // POST /configure
app.use('/api/tournaments', tournamentRoutes);

// groups + matches
app.use('/api/groups', groupRoutes);
app.use('/api/matches', matchRoutes);

// categories
app.use('/api/categories', categoryRoutes);      // CRUD
app.use('/api/categories', categoryOpsRoutes);   // ops (players bulk, grace, finalize, close-grace, friendly)

app.get('/health', (req, res) => {
    res.send('OK');
});

export default app;