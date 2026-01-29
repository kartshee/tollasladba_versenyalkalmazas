import express from 'express';
import tournamentRoutes from './routes/tournaments.routes.js';
import groupRoutes from './routes/groups.routes.js';
import matchRoutes from './routes/matches.routes.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import playerRoutes from './routes/players.routes.js';



dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error(err));

const app = express();

app.use(express.json());
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/matches', matchRoutes);

app.get('/health', (req, res) => {
    res.send('OK');
});


export default app;
