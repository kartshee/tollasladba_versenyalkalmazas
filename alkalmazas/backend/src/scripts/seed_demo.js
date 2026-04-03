import 'dotenv/config';
import mongoose from 'mongoose';

import User from '../models/User.js';
import Tournament from '../models/Tournament.js';
import Category from '../models/Category.js';
import Player from '../models/Player.js';
import Group from '../models/Group.js';
import Match from '../models/Match.js';
import Entry from '../models/Entry.js';
import PaymentGroup from '../models/PaymentGroup.js';
import AuditLog from '../models/AuditLog.js';

import { generatePartialRoundRobin } from '../services/roundRobin.service.js';
import { buildSchedule } from '../services/scheduler.service.js';
import { computeStandings } from '../services/standings.service.js';
import { buildSeededBracketPairs, getInitialPlayoffRoundName, PLAYOFF_BRONZE_ROUND } from '../services/playoff.service.js';

function getArgValue(name, def = null) {
  const pfx = `${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pfx));
  return hit ? hit.slice(pfx.length) : def;
}

function makePairKey(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}_${y}` : `${y}_${x}`;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function daysAgo(days, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function minutesFrom(base, minutes) {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function resultSetsForRankGap(gap = 1) {
  if (gap <= 1) return [{ p1: 21, p2: 18 }, { p1: 21, p2: 19 }];
  if (gap <= 3) return [{ p1: 21, p2: 15 }, { p1: 21, p2: 14 }];
  return [{ p1: 21, p2: 10 }, { p1: 21, p2: 12 }];
}

function swapSets(sets) {
  return sets.map((s) => ({ p1: s.p2, p2: s.p1 }));
}

function createFinishedMatchPatch(match, winnerId, loserId, strengthRank) {
  const winnerIsP1 = String(match.player1) === String(winnerId);
  const gap = Math.max(1, Math.abs((strengthRank.get(String(loserId)) ?? 99) - (strengthRank.get(String(winnerId)) ?? 1)));
  const sets = winnerIsP1 ? resultSetsForRankGap(gap) : swapSets(resultSetsForRankGap(gap));

  return {
    ...match,
    status: 'finished',
    resultType: 'played',
    sets,
    winner: winnerId,
    actualStartAt: match.startAt,
    actualEndAt: match.endAt,
    resultUpdatedAt: match.endAt
  };
}

async function cascadeDeleteTournaments(tournamentIds) {
  if (!tournamentIds.length) return;
  await Match.deleteMany({ tournamentId: { $in: tournamentIds } });
  await Group.deleteMany({ tournamentId: { $in: tournamentIds } });
  await Entry.deleteMany({ tournamentId: { $in: tournamentIds } });
  await PaymentGroup.deleteMany({ tournamentId: { $in: tournamentIds } });
  await AuditLog.deleteMany({ tournamentId: { $in: tournamentIds } });
  await Player.deleteMany({ tournamentId: { $in: tournamentIds } });
  await Category.deleteMany({ tournamentId: { $in: tournamentIds } });
  await Tournament.deleteMany({ _id: { $in: tournamentIds } });
}

async function resolveOwner() {
  const emailArg = getArgValue('--email', null);
  if (emailArg) {
    const owner = await User.findOne({ email: emailArg.trim().toLowerCase() }).lean();
    if (!owner) throw new Error(`User not found for email: ${emailArg}`);
    return owner;
  }

  const latest = await User.findOne({ role: 'admin' }).sort({ createdAt: -1 }).lean();
  if (!latest) throw new Error('No admin user found. Pass --email=<user@example.com>.');
  return latest;
}

async function createEntriesForPlayers({ tournament, category, players, paymentGroup = null, paidPlayerIds = new Set(), billingPrefix = '' }) {
  const docs = players.map((player, idx) => ({
    tournamentId: tournament._id,
    categoryId: category._id,
    playerId: player._id,
    feeAmount: tournament.config?.entryFeeEnabled ? Number(tournament.config?.entryFeeAmount ?? 0) : 0,
    paid: paidPlayerIds.has(String(player._id)),
    billingName: paidPlayerIds.has(String(player._id)) ? `${billingPrefix || player.name} számlázás` : '',
    billingAddress: paidPlayerIds.has(String(player._id)) ? `6000 Kecskemét, Demo utca ${idx + 1}.` : '',
    paymentGroupId: paymentGroup?._id ?? null
  }));
  return Entry.insertMany(docs);
}

async function createPlayers({ tournament, category, names, checkedInCount = names.length, clubA = 'Kecskeméti Tollas SE', clubB = 'Szegedi Tollas Klub', noteForUnchecked = 'Nem jelent meg a check-inen' }) {
  const now = new Date();
  const docs = names.map((name, idx) => ({
    tournamentId: tournament._id,
    categoryId: category._id,
    name,
    club: idx % 2 === 0 ? clubA : clubB,
    note: idx >= checkedInCount ? noteForUnchecked : '',
    checkedInAt: idx < checkedInCount ? now : null,
    mainEligibility: 'main'
  }));
  return Player.insertMany(docs);
}

async function seedGroupPlayoffCategory({ tournament, category, refereeNames }) {
  const names = [
    'Kiss Márk',
    'Nagy Bence',
    'Tóth Dániel',
    'Varga Levente',
    'Molnár Ádám',
    'Kovács Noel',
    'Szabó Máté',
    'Horváth Balázs'
  ];

  const players = await createPlayers({ tournament, category, names });
  const paymentGroup = await PaymentGroup.create({
    tournamentId: tournament._id,
    payerName: 'Kecskeméti Tollas SE',
    billingName: 'Kecskeméti Tollas SE',
    billingAddress: '6000 Kecskemét, Sport utca 12.',
    paid: true,
    note: 'Klubos közös befizetés'
  });

  const paidIds = new Set(players.slice(0, 4).map((p) => String(p._id)));
  await createEntriesForPlayers({
    tournament,
    category,
    players: players.slice(0, 4),
    paymentGroup,
    paidPlayerIds: paidIds,
    billingPrefix: 'Kecskeméti Tollas SE'
  });
  await createEntriesForPlayers({
    tournament,
    category,
    players: players.slice(4),
    paymentGroup: null,
    paidPlayerIds: new Set(players.slice(4, 6).map((p) => String(p._id)))
  });

  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'A csoport',
    players: players.map((p) => p._id)
  });

  const rank = new Map(players.map((player, idx) => [String(player._id), idx + 1]));
  const rawMatches = generatePartialRoundRobin(players.map((p) => p._id), Number(category.groupStageMatchesPerPlayer ?? 5));
  const groupBaseStart = daysAgo(2, 9, 0);

  const matchDocs = rawMatches.map((mm) => ({
    groupId: group._id,
    tournamentId: tournament._id,
    categoryId: category._id,
    player1: mm.player1,
    player2: mm.player2,
    pairKey: makePairKey(mm.player1, mm.player2),
    round: 'group',
    status: 'pending',
    roundNumber: mm.roundNumber ?? null,
    drawVersion: Number(category.drawVersion ?? 1),
    resultType: 'played',
    voided: false,
    courtNumber: null,
    startAt: null,
    endAt: null,
    actualStartAt: null,
    actualEndAt: null,
    resultUpdatedAt: null,
    umpireName: '',
    sets: [],
    winner: null
  }));

  const inserted = await Match.insertMany(matchDocs);
  const placements = buildSchedule(inserted, {
    startAt: groupBaseStart,
    courtsCount: Math.min(Number(tournament.config?.courtsCount ?? 4), 4),
    matchMinutes: Number(tournament.config?.estimatedMatchMinutes ?? 35),
    playerRestMinutes: Number(tournament.config?.minRestPlayerMinutes ?? 20),
    courtTurnoverMinutes: Number(tournament.config?.courtTurnoverMinutes ?? 0)
  });
  const placementById = new Map(placements.map((p) => [String(p.matchId), p]));

  const finishedGroupMatches = inserted.map((match) => {
    const placement = placementById.get(String(match._id));
    match.startAt = placement.startAt;
    match.endAt = placement.endAt;
    const p1Rank = rank.get(String(match.player1));
    const p2Rank = rank.get(String(match.player2));
    const winner = p1Rank < p2Rank ? match.player1 : match.player2;
    const loser = p1Rank < p2Rank ? match.player2 : match.player1;
    const patched = createFinishedMatchPatch(match.toObject(), winner, loser, rank);
    patched.courtNumber = placement.courtNumber;
    patched.umpireName = refereeNames[placement.courtNumber % refereeNames.length] ?? refereeNames[0] ?? '';
    return patched;
  });

  await Promise.all(finishedGroupMatches.map((doc) => Match.updateOne({ _id: doc._id }, { $set: doc })));

  const standings = computeStandings(players, finishedGroupMatches, {
    multiTiePolicy: category.multiTiePolicy,
    unresolvedTiePolicy: category.unresolvedTiePolicy
  });

  const qualified = standings.slice(0, Number(category.qualifiersPerGroup ?? 4));
  const initialRound = getInitialPlayoffRoundName(qualified.length);
  const playoffPairs = buildSeededBracketPairs(qualified);

  const semiBase = daysAgo(1, 17, 0);
  const semiDocs = playoffPairs.map((pair, idx) => {
    const startAt = minutesFrom(semiBase, idx * 50);
    const endAt = minutesFrom(startAt, 35);
    const winner = idx === 0 ? pair.player1.player._id : pair.player2.player._id;
    const loser = idx === 0 ? pair.player2.player._id : pair.player1.player._id;
    const baseDoc = {
      groupId: group._id,
      tournamentId: tournament._id,
      categoryId: category._id,
      player1: pair.player1.player._id,
      player2: pair.player2.player._id,
      pairKey: makePairKey(pair.player1.player._id, pair.player2.player._id),
      round: initialRound,
      status: 'finished',
      roundNumber: idx + 1,
      drawVersion: Number(category.drawVersion ?? 1),
      resultType: 'played',
      voided: false,
      courtNumber: idx + 1,
      startAt,
      endAt,
      actualStartAt: startAt,
      actualEndAt: endAt,
      resultUpdatedAt: endAt,
      umpireName: refereeNames[idx % refereeNames.length] ?? '',
      sets: [],
      winner: null
    };
    return createFinishedMatchPatch(baseDoc, winner, loser, new Map([
      [String(pair.player1.player._id), idx === 0 ? 1 : 2],
      [String(pair.player2.player._id), idx === 0 ? 4 : 3]
    ]));
  });

  const insertedSemis = await Match.insertMany(semiDocs);

  const finalNowStart = minutesFrom(new Date(), -8);
  const finalNowEnd = minutesFrom(new Date(), 22);
  const bronzeStart = minutesFrom(new Date(), 25);
  const bronzeEnd = minutesFrom(bronzeStart, 35);

  const finalDoc = {
    groupId: group._id,
    tournamentId: tournament._id,
    categoryId: category._id,
    player1: insertedSemis[0].winner,
    player2: insertedSemis[1].winner,
    pairKey: makePairKey(insertedSemis[0].winner, insertedSemis[1].winner),
    round: 'playoff_final',
    status: 'running',
    roundNumber: 1,
    drawVersion: Number(category.drawVersion ?? 1),
    resultType: 'played',
    voided: false,
    courtNumber: 1,
    startAt: finalNowStart,
    endAt: finalNowEnd,
    actualStartAt: finalNowStart,
    actualEndAt: null,
    resultUpdatedAt: null,
    umpireName: refereeNames[0] ?? '',
    sets: [],
    winner: null
  };

  const semiLosers = insertedSemis.map((m) => String(m.winner) === String(m.player1) ? m.player2 : m.player1);
  const bronzeDoc = {
    groupId: group._id,
    tournamentId: tournament._id,
    categoryId: category._id,
    player1: semiLosers[0],
    player2: semiLosers[1],
    pairKey: makePairKey(semiLosers[0], semiLosers[1]),
    round: PLAYOFF_BRONZE_ROUND,
    status: 'pending',
    roundNumber: 1,
    drawVersion: Number(category.drawVersion ?? 1),
    resultType: 'played',
    voided: false,
    courtNumber: 2,
    startAt: bronzeStart,
    endAt: bronzeEnd,
    actualStartAt: null,
    actualEndAt: null,
    resultUpdatedAt: null,
    umpireName: refereeNames[1] ?? '',
    sets: [],
    winner: null
  };

  await Match.insertMany([finalDoc, bronzeDoc]);

  await Category.updateOne({ _id: category._id }, {
    $set: {
      status: 'in_progress',
      drawLockedAt: daysAgo(2, 8, 30)
    }
  });

  return { group, players, standings, paymentGroupId: paymentGroup._id };
}

async function seedGroupCategory({ tournament, category, refereeNames }) {
  const names = [
    'Fekete Anna',
    'Lakatos Dóra',
    'Papp Petra',
    'Gál Zsófia',
    'Sipos Lilla',
    'Bíró Réka',
    'Hiányzó Játékos'
  ];

  const allPlayers = await createPlayers({
    tournament,
    category,
    names,
    checkedInCount: 6,
    clubA: 'Kecskeméti Lányok SE',
    clubB: 'Budai Tollas Kör'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players: allPlayers,
    paymentGroup: null,
    paidPlayerIds: new Set(allPlayers.slice(0, 3).map((p) => String(p._id)))
  });

  const checkedInPlayers = allPlayers.slice(0, 6);
  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'B csoport',
    players: checkedInPlayers.map((p) => p._id)
  });

  const rawMatches = generatePartialRoundRobin(checkedInPlayers.map((p) => p._id), Number(category.groupStageMatchesPerPlayer ?? 4));
  const docs = rawMatches.map((mm) => ({
    groupId: group._id,
    tournamentId: tournament._id,
    categoryId: category._id,
    player1: mm.player1,
    player2: mm.player2,
    pairKey: makePairKey(mm.player1, mm.player2),
    round: 'group',
    status: 'pending',
    roundNumber: mm.roundNumber ?? null,
    drawVersion: Number(category.drawVersion ?? 1),
    resultType: 'played',
    voided: false,
    courtNumber: null,
    startAt: null,
    endAt: null,
    actualStartAt: null,
    actualEndAt: null,
    resultUpdatedAt: null,
    umpireName: '',
    sets: [],
    winner: null
  }));

  const inserted = await Match.insertMany(docs);
  const base = minutesFrom(new Date(), -90);
  const placements = buildSchedule(inserted, {
    startAt: base,
    courtsCount: 3,
    matchMinutes: 35,
    playerRestMinutes: 15,
    courtTurnoverMinutes: 0
  });
  const placementById = new Map(placements.map((p) => [String(p.matchId), p]));

  const rankOrder = new Map(checkedInPlayers.map((p, idx) => [String(p._id), idx + 1]));
  for (let i = 0; i < inserted.length; i++) {
    const match = inserted[i];
    const placement = placementById.get(String(match._id));
    const basePatch = {
      courtNumber: placement.courtNumber,
      startAt: placement.startAt,
      endAt: placement.endAt,
      umpireName: refereeNames[(i + 1) % refereeNames.length] ?? ''
    };

    if (i < 4) {
      const p1Rank = rankOrder.get(String(match.player1));
      const p2Rank = rankOrder.get(String(match.player2));
      const winner = p1Rank < p2Rank ? match.player1 : match.player2;
      const loser = p1Rank < p2Rank ? match.player2 : match.player1;
      const finished = createFinishedMatchPatch({ ...match.toObject(), ...basePatch }, winner, loser, rankOrder);
      await Match.updateOne({ _id: match._id }, { $set: finished });
    } else if (i === 4) {
      await Match.updateOne({ _id: match._id }, {
        $set: {
          ...basePatch,
          status: 'running',
          actualStartAt: placement.startAt
        }
      });
    } else if (i <= 7) {
      await Match.updateOne({ _id: match._id }, { $set: { ...basePatch, status: 'pending' } });
    } else {
      await Match.updateOne({ _id: match._id }, { $set: { status: 'pending' } });
    }
  }

  await Category.updateOne({ _id: category._id }, {
    $set: {
      status: 'in_progress',
      drawLockedAt: minutesFrom(new Date(), -120)
    }
  });

  return { group, players: allPlayers };
}

async function seedPlayoffOnlyCategory({ tournament, category, refereeNames }) {
  const names = ['Tóth Márton', 'Kelemen Patrik', 'Juhász Bálint', 'Balla Richárd'];
  const players = await createPlayers({
    tournament,
    category,
    names,
    checkedInCount: 4,
    clubA: 'Demo Meghívásos Klub',
    clubB: 'Vendég Játékosok'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players,
    paymentGroup: null,
    paidPlayerIds: new Set(players.map((p) => String(p._id)))
  });

  const semiBase = minutesFrom(new Date(), -180);
  const semiPairs = [
    [players[0], players[3]],
    [players[1], players[2]]
  ];

  const semis = semiPairs.map((pair, idx) => {
    const startAt = minutesFrom(semiBase, idx * 45);
    const endAt = minutesFrom(startAt, 35);
    const winner = idx === 0 ? pair[0]._id : pair[1]._id;
    const loser = idx === 0 ? pair[1]._id : pair[0]._id;
    const baseDoc = {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: null,
      player1: pair[0]._id,
      player2: pair[1]._id,
      pairKey: makePairKey(pair[0]._id, pair[1]._id),
      round: 'playoff_semi',
      status: 'finished',
      roundNumber: idx + 1,
      drawVersion: Number(category.drawVersion ?? 1),
      resultType: 'played',
      voided: false,
      courtNumber: idx + 1,
      startAt,
      endAt,
      actualStartAt: startAt,
      actualEndAt: endAt,
      resultUpdatedAt: endAt,
      umpireName: refereeNames[idx % refereeNames.length] ?? '',
      sets: [],
      winner: null
    };
    return createFinishedMatchPatch(baseDoc, winner, loser, new Map([
      [String(pair[0]._id), 1],
      [String(pair[1]._id), 4]
    ]));
  });

  const insertedSemis = await Match.insertMany(semis);
  const finalStart = minutesFrom(new Date(), 55);
  const bronzeStart = minutesFrom(new Date(), 60);

  await Match.insertMany([
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: null,
      player1: insertedSemis[0].winner,
      player2: insertedSemis[1].winner,
      pairKey: makePairKey(insertedSemis[0].winner, insertedSemis[1].winner),
      round: 'playoff_final',
      status: 'pending',
      roundNumber: 1,
      drawVersion: Number(category.drawVersion ?? 1),
      resultType: 'played',
      voided: false,
      courtNumber: 3,
      startAt: finalStart,
      endAt: minutesFrom(finalStart, 35),
      actualStartAt: null,
      actualEndAt: null,
      resultUpdatedAt: null,
      umpireName: refereeNames[0] ?? '',
      sets: [],
      winner: null
    },
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: null,
      player1: String(insertedSemis[0].winner) === String(insertedSemis[0].player1) ? insertedSemis[0].player2 : insertedSemis[0].player1,
      player2: String(insertedSemis[1].winner) === String(insertedSemis[1].player1) ? insertedSemis[1].player2 : insertedSemis[1].player1,
      pairKey: makePairKey(
          String(insertedSemis[0].winner) === String(insertedSemis[0].player1) ? insertedSemis[0].player2 : insertedSemis[0].player1,
          String(insertedSemis[1].winner) === String(insertedSemis[1].player1) ? insertedSemis[1].player2 : insertedSemis[1].player1
      ),
      round: PLAYOFF_BRONZE_ROUND,
      status: 'pending',
      roundNumber: 1,
      drawVersion: Number(category.drawVersion ?? 1),
      resultType: 'played',
      voided: false,
      courtNumber: 4,
      startAt: bronzeStart,
      endAt: minutesFrom(bronzeStart, 35),
      actualStartAt: null,
      actualEndAt: null,
      resultUpdatedAt: null,
      umpireName: refereeNames[1] ?? '',
      sets: [],
      winner: null
    }
  ]);

  await Category.updateOne({ _id: category._id }, {
    $set: {
      status: 'in_progress',
      drawLockedAt: minutesFrom(new Date(), -200)
    }
  });

  return { players };
}

async function createAuditTrail({ owner, tournament, categories }) {
  const logs = [
    {
      userId: owner._id,
      tournamentId: tournament._id,
      entityType: 'tournament',
      entityId: String(tournament._id),
      action: 'tournament.created',
      summary: `Demo tournament created: ${tournament.name}`,
      metadata: { source: 'seed_demo' }
    },
    ...categories.map((category) => ({
      userId: owner._id,
      tournamentId: tournament._id,
      categoryId: category._id,
      entityType: 'category',
      entityId: String(category._id),
      action: 'category.created',
      summary: `Category created: ${category.name}`,
      metadata: { source: 'seed_demo', format: category.format }
    })),
    {
      userId: owner._id,
      tournamentId: tournament._id,
      entityType: 'scheduler',
      entityId: String(tournament._id),
      action: 'group.schedule_generated',
      summary: 'Demo schedules generated for seeded matches',
      metadata: { source: 'seed_demo' }
    }
  ];

  await AuditLog.insertMany(logs);
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI in environment');
  }

  const replace = process.argv.includes('--replace');

  await mongoose.connect(process.env.MONGO_URI);

  const owner = await resolveOwner();

  if (!owner || !isValidObjectId(owner._id)) {
    throw new Error('Could not resolve owner user');
  }

  if (replace) {
    const existingDemoTournaments = await Tournament.find({ ownerId: owner._id, name: /^DEMO FRONTEND/i }).select('_id').lean();
    await cascadeDeleteTournaments(existingDemoTournaments.map((t) => t._id));
  }

  const tournament = await Tournament.create({
    ownerId: owner._id,
    name: 'DEMO FRONTEND – Tavaszi Tollas Verseny',
    date: new Date(),
    location: 'Kecskemét Városi Sportcsarnok',
    status: 'running',
    config: {
      courtsCount: 4,
      estimatedMatchMinutes: 35,
      minRestPlayerMinutes: 20,
      minRestRefereeMinutes: 10,
      courtTurnoverMinutes: 5,
      checkInGraceMinutesDefault: 30,
      entryFeeEnabled: true,
      entryFeeAmount: 3500,
      matchRules: { bestOf: 3, pointsToWin: 21, winBy: 2, cap: 30 }
    },
    referees: [
      { name: 'Szabó Gergely' },
      { name: 'Kiss András' },
      { name: 'Németh Péter' }
    ]
  });

  const refereeNames = tournament.referees.map((r) => r.name);

  const categoryA = await Category.create({
    tournamentId: tournament._id,
    name: 'Férfi egyéni amatőr',
    gender: 'male',
    ageGroup: 'Nyílt',
    format: 'group+playoff',
    groupsCount: 1,
    qualifiersPerGroup: 4,
    playoffSize: 4,
    groupSizeTarget: 8,
    groupStageMatchesPerPlayer: 5,
    multiTiePolicy: 'direct_then_overall',
    unresolvedTiePolicy: 'shared_place',
    status: 'setup'
  });

  const categoryB = await Category.create({
    tournamentId: tournament._id,
    name: 'Női egyéni amatőr',
    gender: 'female',
    ageGroup: 'Nyílt',
    format: 'group',
    groupsCount: 1,
    qualifiersPerGroup: 2,
    playoffSize: null,
    groupSizeTarget: 6,
    groupStageMatchesPerPlayer: 4,
    multiTiePolicy: 'direct_only',
    unresolvedTiePolicy: 'shared_place',
    status: 'setup'
  });

  const categoryC = await Category.create({
    tournamentId: tournament._id,
    name: 'Meghívásos playoff',
    gender: 'mixed',
    ageGroup: 'Open',
    format: 'playoff',
    groupsCount: 1,
    qualifiersPerGroup: 4,
    playoffSize: 4,
    multiTiePolicy: 'direct_then_overall',
    unresolvedTiePolicy: 'manual_override',
    status: 'setup'
  });

  const seededA = await seedGroupPlayoffCategory({ tournament, category: categoryA, refereeNames });
  const seededB = await seedGroupCategory({ tournament, category: categoryB, refereeNames });
  const seededC = await seedPlayoffOnlyCategory({ tournament, category: categoryC, refereeNames });

  await createAuditTrail({ owner, tournament, categories: [categoryA, categoryB, categoryC] });

  const totals = await Promise.all([
    Category.countDocuments({ tournamentId: tournament._id }),
    Player.countDocuments({ tournamentId: tournament._id }),
    Entry.countDocuments({ tournamentId: tournament._id }),
    Group.countDocuments({ tournamentId: tournament._id }),
    Match.countDocuments({ tournamentId: tournament._id }),
    PaymentGroup.countDocuments({ tournamentId: tournament._id }),
    AuditLog.countDocuments({ tournamentId: tournament._id })
  ]);

  console.log('Demo seed created successfully.');
  console.log({
    ownerEmail: owner.email,
    tournamentId: String(tournament._id),
    categoryIds: {
      groupPlayoff: String(categoryA._id),
      groupOnly: String(categoryB._id),
      playoffOnly: String(categoryC._id)
    },
    groupIds: {
      groupPlayoff: String(seededA.group._id),
      groupOnly: String(seededB.group._id)
    },
    counts: {
      categories: totals[0],
      players: totals[1],
      entries: totals[2],
      groups: totals[3],
      matches: totals[4],
      paymentGroups: totals[5],
      auditLogs: totals[6]
    },
    notes: [
      'A group+playoff kategóriában a csoportkör kész, az elődöntők lejátszva, a döntő fut, a bronzmeccs hamarosan kezdődik.',
      'A group kategóriában vegyes állapotú meccsek vannak: finished, running és pending.',
      'A playoff-only kategóriában az elődöntők kész, a döntő és a bronzmeccs pending.',
      'Van nevezési díj, payment group, check-in adat, umpire név és boardhoz futó/következő meccs is.'
    ]
  });

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});