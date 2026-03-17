import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import Player from '../models/Player.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import { hashPassword } from '../services/auth.service.js';

dotenv.config();

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('Missing MONGO_URI in environment (..env)');
    process.exit(1);
  }

  const playersCount = Number(process.argv[2] ?? 8); // default 8 players
  const matchesPerPlayer = Number(process.argv[3] ?? 5); // default 5

  await mongoose.connect(process.env.MONGO_URI);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');

  const demoUser = await User.create({
    name: 'Demo Admin',
    email: `demo-${stamp}@example.com`,
    passwordHash: await hashPassword('DemoPass123!'),
    role: 'admin'
  });

  const tournament = await Tournament.create({
    name: `DEMO Tournament ${stamp}`,
    ownerId: demoUser._id,
    status: 'draft'
  });

  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'DEMO Category',
    groupStageMatchesPerPlayer: matchesPerPlayer,
    format: 'group+playoff'
  });

  const players = [];
  for (let i = 1; i <= playersCount; i++) {
    players.push(
      await Player.create({
        tournamentId: tournament._id,
        name: `Player ${i}`,
        club: i % 2 === 0 ? 'Club B' : 'Club A'
      })
    );
  }

  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'Group A',
    players: players.map((p) => p._id)
  });

  console.log('Seed created:');
  console.log({
    tournamentId: String(tournament._id),
    categoryId: String(category._id),
    groupId: String(group._id),
    players: players.map((p) => ({ id: String(p._id), name: p.name }))
  });

  console.log('\nNext steps:');
  console.log(`1) Generate matches: POST /api/matches/group/${group._id}  (optional body: {"matchesPerPlayer": ${matchesPerPlayer}})`);
  console.log(`2) Schedule: POST /api/matches/group/${group._id}/schedule`);
  console.log(`3) Standings: GET /api/groups/${group._id}/standings`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
