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
import {
  buildSeededBracketPairs,
  getInitialPlayoffRoundName,
  PLAYOFF_BRONZE_ROUND
} from '../services/playoff.service.js';
import { hashPassword } from '../services/auth.service.js';

const DEMO_EMAIL = 'demo@tollas.local';
const DEMO_PASSWORD = 'Demo123!';
const DEMO_NAME = 'Demo Admin';

function makePairKey(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}_${y}` : `${y}_${x}`;
}

function minutesFrom(base, minutes) {
  return new Date(base.getTime() + minutes * 60 * 1000);
}

function daysFromNow(days, hour = 9, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function daysAgo(days, hour = 9, minute = 0) {
  return daysFromNow(-days, hour, minute);
}

function resultSetsForGap(gap = 1) {
  if (gap <= 1) return [{ p1: 21, p2: 18 }, { p1: 21, p2: 19 }];
  if (gap <= 3) return [{ p1: 21, p2: 15 }, { p1: 21, p2: 14 }];
  return [{ p1: 21, p2: 11 }, { p1: 21, p2: 12 }];
}

function reverseSets(sets) {
  return sets.map((set) => ({ p1: set.p2, p2: set.p1 }));
}

function createPlayedFinish(baseMatch, winnerId, loserId, rankingMap, overrides = {}) {
  const winnerIsP1 = String(baseMatch.player1) === String(winnerId);
  const gap = Math.max(
      1,
      Math.abs((rankingMap.get(String(loserId)) ?? 99) - (rankingMap.get(String(winnerId)) ?? 1))
  );
  const sets = winnerIsP1 ? resultSetsForGap(gap) : reverseSets(resultSetsForGap(gap));

  return {
    ...baseMatch,
    status: 'finished',
    resultType: 'played',
    sets,
    winner: winnerId,
    actualStartAt: baseMatch.startAt,
    actualEndAt: baseMatch.endAt,
    resultUpdatedAt: baseMatch.endAt,
    ...overrides
  };
}

function createWoFinish(baseMatch, winnerId, reason = 'Az ellenfél nem jelent meg.') {
  return {
    ...baseMatch,
    status: 'finished',
    resultType: 'wo',
    sets: [],
    winner: winnerId,
    actualStartAt: baseMatch.startAt,
    actualEndAt: minutesFrom(baseMatch.startAt ?? new Date(), 5),
    resultUpdatedAt: minutesFrom(baseMatch.startAt ?? new Date(), 5),
    voided: false,
    voidReason: reason
  };
}

function createRetFinish(baseMatch, winnerId, winnerIsP1 = true, reason = 'Sérülés miatt feladás.') {
  return {
    ...baseMatch,
    status: 'finished',
    resultType: 'ret',
    sets: winnerIsP1
        ? [{ p1: 21, p2: 16 }, { p1: 8, p2: 3 }]
        : [{ p1: 16, p2: 21 }, { p1: 3, p2: 8 }],
    winner: winnerId,
    actualStartAt: baseMatch.startAt,
    actualEndAt: minutesFrom(baseMatch.startAt ?? new Date(), 22),
    resultUpdatedAt: minutesFrom(baseMatch.startAt ?? new Date(), 22),
    voidReason: reason
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

async function ensureDemoUser({ replace = false }) {
  let user = await User.findOne({ email: DEMO_EMAIL }).select('+passwordHash');

  if (replace && user) {
    const tournaments = await Tournament.find({ ownerId: user._id }).select('_id').lean();
    await cascadeDeleteTournaments(tournaments.map((tournament) => tournament._id));
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  if (!user) {
    user = await User.create({
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      passwordHash,
      role: 'admin'
    });
  } else {
    user.name = DEMO_NAME;
    user.passwordHash = passwordHash;
    user.role = 'admin';
    await user.save();
  }

  return user;
}

async function createTournament({
                                  owner,
                                  name,
                                  location,
                                  date,
                                  status,
                                  courtsCount = 4,
                                  entryFeeAmount = 3500,
                                  referees = [],
                                  extra = {}
                                }) {
  return Tournament.create({
    ownerId: owner._id,
    name,
    location,
    date,
    status,
    config: {
      matchRules: { bestOf: 3, pointsToWin: 21, winBy: 2, cap: 30 },
      estimatedMatchMinutes: 35,
      minRestPlayerMinutes: 20,
      minRestRefereeMinutes: 10,
      courtTurnoverMinutes: 5,
      courtsCount,
      checkInGraceMinutesDefault: 40,
      lateNoShowPolicy: 'void',
      avoidSameClubEarly: false,
      entryFeeEnabled: true,
      entryFeeAmount
    },
    referees: referees.map((name) => ({ name })),
    ...extra
  });
}

async function createPlayers({
                               tournament,
                               category,
                               names,
                               checkedInCount = names.length,
                               clubA = 'Demo Tollas SE',
                               clubB = 'Alföld Tollas Klub',
                               checkedInOffsetMinutes = -35,
                               noteForUnchecked = 'A játékos még nem jelentkezett be.'
                             }) {
  const checkedInAt = minutesFrom(new Date(), checkedInOffsetMinutes);

  return Player.insertMany(
      names.map((name, index) => ({
        tournamentId: tournament._id,
        categoryId: category._id,
        name,
        club: index % 2 === 0 ? clubA : clubB,
        note: index < checkedInCount ? '' : noteForUnchecked,
        checkedInAt: index < checkedInCount ? checkedInAt : null,
        mainEligibility: 'main'
      }))
  );
}

async function createEntriesForPlayers({
                                         tournament,
                                         category,
                                         players,
                                         paidIds = new Set(),
                                         paymentGroup = null,
                                         billingPrefix = ''
                                       }) {
  return Entry.insertMany(
      players.map((player, index) => ({
        tournamentId: tournament._id,
        categoryId: category._id,
        playerId: player._id,
        feeAmount: Number(tournament.config?.entryFeeAmount ?? 0),
        paid: paymentGroup?.paid ? true : paidIds.has(String(player._id)),
        billingName: paymentGroup?.paid || paidIds.has(String(player._id))
            ? `${billingPrefix || player.name} számlázás`
            : '',
        billingAddress: paymentGroup?.paid || paidIds.has(String(player._id))
            ? `6720 Szeged, Demo utca ${index + 1}.`
            : '',
        paymentGroupId: paymentGroup?._id ?? null
      }))
  );
}

async function createAuditLogs({ owner, tournament, items }) {
  if (!items.length) return;

  await AuditLog.insertMany(
      items.map((item) => ({
        userId: owner._id,
        tournamentId: tournament._id,
        categoryId: item.categoryId ?? null,
        groupId: item.groupId ?? null,
        matchId: item.matchId ?? null,
        playerId: item.playerId ?? null,
        entityType: item.entityType,
        entityId: item.entityId,
        action: item.action,
        summary: item.summary,
        metadata: item.metadata ?? { source: 'seed_demo' }
      }))
  );
}

async function seedSetupCategory({ tournament }) {
  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'Férfi egyéni – előkészítés alatt',
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

  const players = await createPlayers({
    tournament,
    category,
    names: ['Kiss Márk', 'Tóth Norbert', 'Papp Dániel', 'Fodor Levente'],
    checkedInCount: 0,
    noteForUnchecked: 'A nevezés rögzítve van, de a check-in még nincs megnyitva.'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players,
    paidIds: new Set(players.slice(0, 2).map((player) => String(player._id)))
  });

  return category;
}

async function seedCheckinOpenCategory({ tournament }) {
  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'Női egyéni – check-in nyitva',
    gender: 'female',
    ageGroup: 'Nyílt',
    format: 'group',
    groupsCount: 1,
    qualifiersPerGroup: 2,
    groupSizeTarget: 6,
    groupStageMatchesPerPlayer: 4,
    multiTiePolicy: 'direct_only',
    unresolvedTiePolicy: 'shared_place',
    status: 'checkin_open',
    checkIn: {
      closeAt: minutesFrom(new Date(), 30),
      graceMinutesOverride: 20,
      graceOverrideReason: 'Bemutató seed – rövidített check-in ablak'
    }
  });

  const players = await createPlayers({
    tournament,
    category,
    names: ['Lakatos Petra', 'Sipos Anna', 'Gál Zsófia', 'Oláh Dóra', 'Bíró Réka', 'Nemes Luca'],
    checkedInCount: 4,
    clubA: 'Szegedi Női Tollas Kör',
    clubB: 'Tisza Tollas Klub',
    noteForUnchecked: 'Nevezve van, de még nincs bejelentkezve.'
  });

  const paymentGroup = await PaymentGroup.create({
    tournamentId: tournament._id,
    payerName: 'Szegedi Női Tollas Kör',
    billingName: 'Szegedi Női Tollas Kör',
    billingAddress: '6723 Szeged, Sport tér 4.',
    paid: false,
    note: 'Bemutatóhoz szándékosan nyitott csoportos befizetés'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players: players.slice(0, 3),
    paidIds: new Set(),
    paymentGroup,
    billingPrefix: 'Szegedi Női Tollas Kör'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players: players.slice(3),
    paidIds: new Set([String(players[3]._id)])
  });

  return category;
}

async function seedDrawLockedCategory({ tournament }) {
  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'Vegyes páros – sorsolás lezárva',
    gender: 'mixed',
    ageGroup: 'Nyílt',
    format: 'group+playoff',
    groupsCount: 1,
    qualifiersPerGroup: 2,
    playoffSize: 4,
    groupSizeTarget: 4,
    groupStageMatchesPerPlayer: 3,
    multiTiePolicy: 'direct_then_overall',
    unresolvedTiePolicy: 'shared_place',
    status: 'draw_locked',
    drawLockedAt: minutesFrom(new Date(), -15)
  });

  const players = await createPlayers({
    tournament,
    category,
    names: ['Csorba Áron', 'Péterfi Dávid', 'Bodnár Máté', 'Benkő Balázs'],
    checkedInCount: 4
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players,
    paidIds: new Set(players.map((player) => String(player._id)))
  });

  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'Csoport A',
    players: players.map((player) => player._id)
  });

  const rawMatches = generatePartialRoundRobin(players.map((player) => player._id), 3);

  await Match.insertMany(
      rawMatches.map((roundMatch) => ({
        tournamentId: tournament._id,
        categoryId: category._id,
        groupId: group._id,
        player1: roundMatch.player1,
        player2: roundMatch.player2,
        pairKey: makePairKey(roundMatch.player1, roundMatch.player2),
        round: 'group',
        status: 'pending',
        roundNumber: roundMatch.roundNumber ?? null,
        drawVersion: 1,
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
      }))
  );

  return category;
}

async function seedRunningGroupPlayoffCategory({ tournament, refereeNames }) {
  const category = await Category.create({
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
    status: 'in_progress',
    drawLockedAt: daysAgo(1, 8, 30)
  });

  const players = await createPlayers({
    tournament,
    category,
    names: [
      'Kiss Márk',
      'Nagy Bence',
      'Tóth Dániel',
      'Varga Levente',
      'Molnár Ádám',
      'Kovács Noel',
      'Szabó Máté',
      'Horváth Balázs'
    ],
    checkedInCount: 8,
    clubA: 'Kecskeméti Tollas SE',
    clubB: 'Szegedi Tollas Klub'
  });

  const paymentGroup = await PaymentGroup.create({
    tournamentId: tournament._id,
    payerName: 'Kecskeméti Tollas SE',
    billingName: 'Kecskeméti Tollas SE',
    billingAddress: '6000 Kecskemét, Sport utca 12.',
    paid: false,
    note: 'Ezen a csoporton lehet tesztelni a csoportos befizetés egyben rendezését.'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players: players.slice(0, 4),
    paidIds: new Set(),
    paymentGroup,
    billingPrefix: 'Kecskeméti Tollas SE'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players: players.slice(4),
    paidIds: new Set(players.slice(4, 6).map((player) => String(player._id)))
  });

  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'Csoport A',
    players: players.map((player) => player._id)
  });

  const ranking = new Map(players.map((player, index) => [String(player._id), index + 1]));
  const rawMatches = generatePartialRoundRobin(players.map((player) => player._id), 5);

  const inserted = await Match.insertMany(
      rawMatches.map((roundMatch) => ({
        tournamentId: tournament._id,
        categoryId: category._id,
        groupId: group._id,
        player1: roundMatch.player1,
        player2: roundMatch.player2,
        pairKey: makePairKey(roundMatch.player1, roundMatch.player2),
        round: 'group',
        status: 'pending',
        roundNumber: roundMatch.roundNumber ?? null,
        drawVersion: 1,
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
      }))
  );

  const placements = buildSchedule(inserted, {
    startAt: daysAgo(1, 9, 0),
    courtsCount: Math.min(Number(tournament.config?.courtsCount ?? 4), 4),
    matchMinutes: Number(tournament.config?.estimatedMatchMinutes ?? 35),
    playerRestMinutes: Number(tournament.config?.minRestPlayerMinutes ?? 20),
    courtTurnoverMinutes: Number(tournament.config?.courtTurnoverMinutes ?? 5)
  });

  const placementById = new Map(placements.map((placement) => [String(placement.matchId), placement]));
  const finishedGroupMatches = [];

  for (let index = 0; index < inserted.length; index += 1) {
    const match = inserted[index].toObject();
    const placement = placementById.get(String(match._id));
    const p1Rank = ranking.get(String(match.player1));
    const p2Rank = ranking.get(String(match.player2));
    const winner = p1Rank < p2Rank ? match.player1 : match.player2;
    const loser = p1Rank < p2Rank ? match.player2 : match.player1;

    const base = {
      ...match,
      courtNumber: placement.courtNumber,
      startAt: placement.startAt,
      endAt: placement.endAt,
      umpireName: refereeNames[index % refereeNames.length] ?? ''
    };

    const finalDoc = createPlayedFinish(base, winner, loser, ranking);
    finishedGroupMatches.push(finalDoc);
    await Match.updateOne({ _id: match._id }, { $set: finalDoc });
  }

  const standings = computeStandings(players, finishedGroupMatches, {
    multiTiePolicy: category.multiTiePolicy,
    unresolvedTiePolicy: category.unresolvedTiePolicy
  });

  const qualified = standings.slice(0, 4);
  const playoffPairs = buildSeededBracketPairs(qualified);
  const initialRound = getInitialPlayoffRoundName(qualified.length);
  const semiBase = minutesFrom(new Date(), -110);

  const semiDocs = playoffPairs.map((pair, index) => {
    const startAt = minutesFrom(semiBase, index * 50);
    const endAt = minutesFrom(startAt, 35);
    const winner = index === 0 ? pair.player1.player._id : pair.player2.player._id;
    const loser = index === 0 ? pair.player2.player._id : pair.player1.player._id;

    const base = {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: pair.player1.player._id,
      player2: pair.player2.player._id,
      pairKey: makePairKey(pair.player1.player._id, pair.player2.player._id),
      round: initialRound,
      status: 'finished',
      roundNumber: index + 1,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: index + 1,
      startAt,
      endAt,
      actualStartAt: startAt,
      actualEndAt: endAt,
      resultUpdatedAt: endAt,
      umpireName: refereeNames[index % refereeNames.length] ?? '',
      sets: [],
      winner: null
    };

    return createPlayedFinish(
        base,
        winner,
        loser,
        new Map([
          [String(pair.player1.player._id), index === 0 ? 1 : 2],
          [String(pair.player2.player._id), index === 0 ? 4 : 3]
        ])
    );
  });

  const insertedSemis = await Match.insertMany(semiDocs);
  const semiLosers = insertedSemis.map((match) => (
      String(match.winner) === String(match.player1) ? match.player2 : match.player1
  ));

  const finalStart = minutesFrom(new Date(), -8);
  const bronzeStart = minutesFrom(new Date(), 25);

  await Match.insertMany([
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: insertedSemis[0].winner,
      player2: insertedSemis[1].winner,
      pairKey: makePairKey(insertedSemis[0].winner, insertedSemis[1].winner),
      round: 'playoff_final',
      status: 'running',
      roundNumber: 1,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: 1,
      startAt: finalStart,
      endAt: minutesFrom(finalStart, 35),
      actualStartAt: finalStart,
      actualEndAt: null,
      resultUpdatedAt: null,
      umpireName: refereeNames[0] ?? '',
      sets: [],
      winner: null
    },
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: semiLosers[0],
      player2: semiLosers[1],
      pairKey: makePairKey(semiLosers[0], semiLosers[1]),
      round: PLAYOFF_BRONZE_ROUND,
      status: 'pending',
      roundNumber: 1,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: 2,
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

  return category;
}

async function seedRunningGroupCategory({ tournament, refereeNames }) {
  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'Női egyéni amatőr',
    gender: 'female',
    ageGroup: 'Nyílt',
    format: 'group',
    groupsCount: 1,
    qualifiersPerGroup: 2,
    groupSizeTarget: 6,
    groupStageMatchesPerPlayer: 4,
    multiTiePolicy: 'direct_only',
    unresolvedTiePolicy: 'shared_place',
    status: 'in_progress',
    drawLockedAt: minutesFrom(new Date(), -150)
  });

  const players = await createPlayers({
    tournament,
    category,
    names: ['Fekete Anna', 'Lakatos Dóra', 'Papp Petra', 'Gál Zsófia', 'Sipos Lilla', 'Bíró Réka'],
    checkedInCount: 6,
    clubA: 'Kecskeméti Lányok SE',
    clubB: 'Budai Tollas Kör'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players,
    paidIds: new Set(players.slice(0, 4).map((player) => String(player._id)))
  });

  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'Csoport B',
    players: players.map((player) => player._id)
  });

  const rawMatches = generatePartialRoundRobin(players.map((player) => player._id), 4);
  const matches = await Match.insertMany(
      rawMatches.map((roundMatch) => ({
        tournamentId: tournament._id,
        categoryId: category._id,
        groupId: group._id,
        player1: roundMatch.player1,
        player2: roundMatch.player2,
        pairKey: makePairKey(roundMatch.player1, roundMatch.player2),
        round: 'group',
        status: 'pending',
        roundNumber: roundMatch.roundNumber ?? null,
        drawVersion: 1,
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
      }))
  );

  const placements = buildSchedule(matches, {
    startAt: minutesFrom(new Date(), -95),
    courtsCount: 3,
    matchMinutes: 35,
    playerRestMinutes: 15,
    courtTurnoverMinutes: 5
  });

  const placementById = new Map(placements.map((placement) => [String(placement.matchId), placement]));
  const ranking = new Map(players.map((player, index) => [String(player._id), index + 1]));

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index].toObject();
    const placement = placementById.get(String(match._id));
    const base = {
      ...match,
      courtNumber: placement?.courtNumber ?? null,
      startAt: placement?.startAt ?? null,
      endAt: placement?.endAt ?? null,
      umpireName: refereeNames[index % refereeNames.length] ?? ''
    };

    if (index < 3) {
      const p1Rank = ranking.get(String(match.player1));
      const p2Rank = ranking.get(String(match.player2));
      const winner = p1Rank < p2Rank ? match.player1 : match.player2;
      const loser = p1Rank < p2Rank ? match.player2 : match.player1;
      await Match.updateOne({ _id: match._id }, { $set: createPlayedFinish(base, winner, loser, ranking) });
      continue;
    }

    if (index === 3) {
      await Match.updateOne({ _id: match._id }, { $set: createRetFinish(base, match.player1, true) });
      continue;
    }

    if (index === 4) {
      await Match.updateOne({ _id: match._id }, {
        $set: {
          ...base,
          status: 'running',
          actualStartAt: base.startAt
        }
      });
      continue;
    }

    await Match.updateOne({ _id: match._id }, { $set: { ...base, status: 'pending' } });
  }

  return category;
}

async function seedConflictTestCategory({ tournament, refereeNames }) {
  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'Hibavédelmi tesztkategória',
    gender: 'mixed',
    ageGroup: 'Nyílt',
    format: 'group',
    groupsCount: 1,
    qualifiersPerGroup: 2,
    groupSizeTarget: 4,
    groupStageMatchesPerPlayer: 3,
    multiTiePolicy: 'direct_only',
    unresolvedTiePolicy: 'manual_override',
    status: 'in_progress',
    drawLockedAt: minutesFrom(new Date(), -60)
  });

  const players = await createPlayers({
    tournament,
    category,
    names: ['Teszt Áron', 'Teszt Bence', 'Teszt Csaba', 'Teszt Dávid'],
    checkedInCount: 4,
    clubA: 'Teszt Klub A',
    clubB: 'Teszt Klub B'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players,
    paidIds: new Set(players.map((player) => String(player._id)))
  });

  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'Csoport C',
    players: players.map((player) => player._id)
  });

  const now = new Date();
  const runningStart = minutesFrom(now, -10);
  const runningEnd = minutesFrom(now, 25);

  await Match.insertMany([
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: players[0]._id,
      player2: players[1]._id,
      pairKey: makePairKey(players[0]._id, players[1]._id),
      round: 'group',
      status: 'running',
      roundNumber: 1,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: 2,
      startAt: runningStart,
      endAt: runningEnd,
      actualStartAt: runningStart,
      actualEndAt: null,
      resultUpdatedAt: null,
      umpireName: refereeNames[0] ?? '',
      sets: [],
      winner: null
    },
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: players[2]._id,
      player2: players[3]._id,
      pairKey: makePairKey(players[2]._id, players[3]._id),
      round: 'group',
      status: 'pending',
      roundNumber: 2,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: 2,
      startAt: minutesFrom(now, 5),
      endAt: minutesFrom(now, 40),
      actualStartAt: null,
      actualEndAt: null,
      resultUpdatedAt: null,
      umpireName: refereeNames[1] ?? '',
      sets: [],
      winner: null
    },
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: players[0]._id,
      player2: players[2]._id,
      pairKey: makePairKey(players[0]._id, players[2]._id),
      round: 'group',
      status: 'pending',
      roundNumber: 3,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: 3,
      startAt: minutesFrom(now, 8),
      endAt: minutesFrom(now, 43),
      actualStartAt: null,
      actualEndAt: null,
      resultUpdatedAt: null,
      umpireName: refereeNames[2] ?? '',
      sets: [],
      winner: null
    },
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: players[1]._id,
      player2: players[3]._id,
      pairKey: makePairKey(players[1]._id, players[3]._id),
      round: 'group',
      status: 'pending',
      roundNumber: 4,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: 4,
      startAt: minutesFrom(now, 50),
      endAt: minutesFrom(now, 85),
      actualStartAt: null,
      actualEndAt: null,
      resultUpdatedAt: null,
      umpireName: refereeNames[3] ?? refereeNames[0] ?? '',
      sets: [],
      winner: null
    },
    {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: players[0]._id,
      player2: players[3]._id,
      pairKey: makePairKey(players[0]._id, players[3]._id),
      round: 'group',
      status: 'pending',
      roundNumber: 5,
      drawVersion: 1,
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
    }
  ]);

  return category;
}

async function seedPlayoffOnlyCategory({ tournament, refereeNames }) {
  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'Meghívásos playoff',
    gender: 'mixed',
    ageGroup: 'Nyílt',
    format: 'playoff',
    groupsCount: 1,
    qualifiersPerGroup: 4,
    playoffSize: 4,
    multiTiePolicy: 'direct_then_overall',
    unresolvedTiePolicy: 'manual_override',
    status: 'in_progress',
    drawLockedAt: minutesFrom(new Date(), -180)
  });

  const players = await createPlayers({
    tournament,
    category,
    names: ['Tóth Márton', 'Kelemen Patrik', 'Juhász Bálint', 'Balla Richárd'],
    checkedInCount: 4,
    clubA: 'Demo Meghívásos Klub',
    clubB: 'Vendég Játékosok'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players,
    paidIds: new Set(players.map((player) => String(player._id)))
  });

  const semiBase = minutesFrom(new Date(), -170);
  const semiPairs = [
    [players[0], players[3]],
    [players[1], players[2]]
  ];

  const semis = semiPairs.map((pair, index) => {
    const startAt = minutesFrom(semiBase, index * 45);
    const endAt = minutesFrom(startAt, 35);
    const winner = index === 0 ? pair[0]._id : pair[1]._id;
    const loser = index === 0 ? pair[1]._id : pair[0]._id;

    const base = {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: null,
      player1: pair[0]._id,
      player2: pair[1]._id,
      pairKey: makePairKey(pair[0]._id, pair[1]._id),
      round: 'playoff_semi',
      status: 'finished',
      roundNumber: index + 1,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: index + 1,
      startAt,
      endAt,
      actualStartAt: startAt,
      actualEndAt: endAt,
      resultUpdatedAt: endAt,
      umpireName: refereeNames[index % refereeNames.length] ?? '',
      sets: [],
      winner: null
    };

    return createPlayedFinish(
        base,
        winner,
        loser,
        new Map([
          [String(pair[0]._id), 1],
          [String(pair[1]._id), 4]
        ])
    );
  });

  const insertedSemis = await Match.insertMany(semis);

  const bronzeP1 = String(insertedSemis[0].winner) === String(insertedSemis[0].player1)
      ? insertedSemis[0].player2
      : insertedSemis[0].player1;

  const bronzeP2 = String(insertedSemis[1].winner) === String(insertedSemis[1].player1)
      ? insertedSemis[1].player2
      : insertedSemis[1].player1;

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
      drawVersion: 1,
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
      player1: bronzeP1,
      player2: bronzeP2,
      pairKey: makePairKey(bronzeP1, bronzeP2),
      round: PLAYOFF_BRONZE_ROUND,
      status: 'pending',
      roundNumber: 1,
      drawVersion: 1,
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

  return category;
}

async function seedCompletedGroupCategory({ tournament, refereeNames }) {
  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'Senior női egyéni',
    gender: 'female',
    ageGroup: '35+',
    format: 'group',
    groupsCount: 1,
    qualifiersPerGroup: 2,
    groupSizeTarget: 4,
    groupStageMatchesPerPlayer: 3,
    multiTiePolicy: 'direct_only',
    unresolvedTiePolicy: 'shared_place',
    status: 'completed',
    drawLockedAt: daysAgo(8, 8, 30)
  });

  const players = await createPlayers({
    tournament,
    category,
    names: ['Rácz Éva', 'Mészáros Anikó', 'Pintér Tímea', 'Vas Júlia'],
    checkedInCount: 4,
    checkedInOffsetMinutes: -60 * 24,
    clubA: 'Veterán Tollas SE',
    clubB: 'Duna Tollas Klub'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players,
    paidIds: new Set(players.map((player) => String(player._id)))
  });

  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'Csoport A',
    players: players.map((player) => player._id)
  });

  const ranking = new Map(players.map((player, index) => [String(player._id), index + 1]));
  const rawMatches = generatePartialRoundRobin(players.map((player) => player._id), 3);

  const inserted = await Match.insertMany(
      rawMatches.map((roundMatch) => ({
        tournamentId: tournament._id,
        categoryId: category._id,
        groupId: group._id,
        player1: roundMatch.player1,
        player2: roundMatch.player2,
        pairKey: makePairKey(roundMatch.player1, roundMatch.player2),
        round: 'group',
        status: 'pending',
        roundNumber: roundMatch.roundNumber ?? null,
        drawVersion: 1,
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
      }))
  );

  const placements = buildSchedule(inserted, {
    startAt: daysAgo(8, 9, 0),
    courtsCount: 2,
    matchMinutes: 35,
    playerRestMinutes: 20,
    courtTurnoverMinutes: 5
  });

  const placementById = new Map(placements.map((placement) => [String(placement.matchId), placement]));

  for (let index = 0; index < inserted.length; index += 1) {
    const match = inserted[index].toObject();
    const placement = placementById.get(String(match._id));
    const p1Rank = ranking.get(String(match.player1));
    const p2Rank = ranking.get(String(match.player2));
    const winner = p1Rank < p2Rank ? match.player1 : match.player2;
    const loser = p1Rank < p2Rank ? match.player2 : match.player1;

    const base = {
      ...match,
      courtNumber: placement.courtNumber,
      startAt: placement.startAt,
      endAt: placement.endAt,
      umpireName: refereeNames[index % refereeNames.length] ?? ''
    };

    const finalDoc = index === inserted.length - 1
        ? createWoFinish(base, winner)
        : createPlayedFinish(base, winner, loser, ranking);

    await Match.updateOne({ _id: match._id }, { $set: finalDoc });
  }

  return category;
}

async function seedCompletedGroupPlayoffCategory({ tournament, refereeNames }) {
  const category = await Category.create({
    tournamentId: tournament._id,
    name: 'Férfi egyéni – lezárt főverseny',
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
    status: 'completed',
    drawLockedAt: daysAgo(8, 8, 0)
  });

  const players = await createPlayers({
    tournament,
    category,
    names: [
      'Varga Máté',
      'Szalai Bence',
      'Kis Roland',
      'Hegedűs Ákos',
      'Cseh Dominik',
      'Rózsa Dávid',
      'Berkes Zsolt',
      'Sári Olivér'
    ],
    checkedInCount: 8,
    checkedInOffsetMinutes: -60 * 24,
    clubA: 'Tisza Tollas SE',
    clubB: 'Alföld Tollas Klub'
  });

  const paymentGroup = await PaymentGroup.create({
    tournamentId: tournament._id,
    payerName: 'Tisza Tollas SE',
    billingName: 'Tisza Tollas SE',
    billingAddress: '6600 Szentes, Sport park 2.',
    paid: true,
    note: 'Példa teljesen rendezett csoportos befizetésre.'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players: players.slice(0, 4),
    paidIds: new Set(),
    paymentGroup,
    billingPrefix: 'Tisza Tollas SE'
  });

  await createEntriesForPlayers({
    tournament,
    category,
    players: players.slice(4),
    paidIds: new Set(players.slice(4).map((player) => String(player._id)))
  });

  const group = await Group.create({
    tournamentId: tournament._id,
    categoryId: category._id,
    name: 'Csoport A',
    players: players.map((player) => player._id)
  });

  const ranking = new Map(players.map((player, index) => [String(player._id), index + 1]));
  const rawMatches = generatePartialRoundRobin(players.map((player) => player._id), 5);

  const inserted = await Match.insertMany(
      rawMatches.map((roundMatch) => ({
        tournamentId: tournament._id,
        categoryId: category._id,
        groupId: group._id,
        player1: roundMatch.player1,
        player2: roundMatch.player2,
        pairKey: makePairKey(roundMatch.player1, roundMatch.player2),
        round: 'group',
        status: 'pending',
        roundNumber: roundMatch.roundNumber ?? null,
        drawVersion: 1,
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
      }))
  );

  const placements = buildSchedule(inserted, {
    startAt: daysAgo(8, 9, 0),
    courtsCount: 4,
    matchMinutes: 35,
    playerRestMinutes: 20,
    courtTurnoverMinutes: 5
  });

  const placementById = new Map(placements.map((placement) => [String(placement.matchId), placement]));
  const finishedGroupMatches = [];

  for (let index = 0; index < inserted.length; index += 1) {
    const match = inserted[index].toObject();
    const placement = placementById.get(String(match._id));
    const p1Rank = ranking.get(String(match.player1));
    const p2Rank = ranking.get(String(match.player2));
    const winner = p1Rank < p2Rank ? match.player1 : match.player2;
    const loser = p1Rank < p2Rank ? match.player2 : match.player1;

    const base = {
      ...match,
      courtNumber: placement.courtNumber,
      startAt: placement.startAt,
      endAt: placement.endAt,
      umpireName: refereeNames[index % refereeNames.length] ?? ''
    };

    const finalDoc = createPlayedFinish(base, winner, loser, ranking);
    finishedGroupMatches.push(finalDoc);
    await Match.updateOne({ _id: match._id }, { $set: finalDoc });
  }

  const standings = computeStandings(players, finishedGroupMatches, {
    multiTiePolicy: category.multiTiePolicy,
    unresolvedTiePolicy: category.unresolvedTiePolicy
  });

  const qualified = standings.slice(0, 4);
  const playoffPairs = buildSeededBracketPairs(qualified);
  const initialRound = getInitialPlayoffRoundName(qualified.length);
  const semiBase = daysAgo(7, 15, 0);

  const semiDocs = playoffPairs.map((pair, index) => {
    const startAt = minutesFrom(semiBase, index * 50);
    const endAt = minutesFrom(startAt, 35);
    const winner = index === 0 ? pair.player1.player._id : pair.player2.player._id;
    const loser = index === 0 ? pair.player2.player._id : pair.player1.player._id;

    const base = {
      tournamentId: tournament._id,
      categoryId: category._id,
      groupId: group._id,
      player1: pair.player1.player._id,
      player2: pair.player2.player._id,
      pairKey: makePairKey(pair.player1.player._id, pair.player2.player._id),
      round: initialRound,
      status: 'finished',
      roundNumber: index + 1,
      drawVersion: 1,
      resultType: 'played',
      voided: false,
      courtNumber: index + 1,
      startAt,
      endAt,
      actualStartAt: startAt,
      actualEndAt: endAt,
      resultUpdatedAt: endAt,
      umpireName: refereeNames[index % refereeNames.length] ?? '',
      sets: [],
      winner: null
    };

    return createPlayedFinish(
        base,
        winner,
        loser,
        new Map([
          [String(pair.player1.player._id), index === 0 ? 1 : 2],
          [String(pair.player2.player._id), index === 0 ? 4 : 3]
        ])
    );
  });

  const insertedSemis = await Match.insertMany(semiDocs);
  const semiLosers = insertedSemis.map((match) => (
      String(match.winner) === String(match.player1) ? match.player2 : match.player1
  ));

  const finalWinner = insertedSemis[0].winner;
  const finalLoser = insertedSemis[1].winner;
  const finalStart = daysAgo(7, 17, 30);
  const bronzeStart = daysAgo(7, 17, 35);

  const finalBase = {
    tournamentId: tournament._id,
    categoryId: category._id,
    groupId: group._id,
    player1: insertedSemis[0].winner,
    player2: insertedSemis[1].winner,
    pairKey: makePairKey(insertedSemis[0].winner, insertedSemis[1].winner),
    round: 'playoff_final',
    status: 'finished',
    roundNumber: 1,
    drawVersion: 1,
    resultType: 'played',
    voided: false,
    courtNumber: 1,
    startAt: finalStart,
    endAt: minutesFrom(finalStart, 35),
    actualStartAt: finalStart,
    actualEndAt: minutesFrom(finalStart, 35),
    resultUpdatedAt: minutesFrom(finalStart, 35),
    umpireName: refereeNames[0] ?? '',
    sets: [],
    winner: null
  };

  const bronzeBase = {
    tournamentId: tournament._id,
    categoryId: category._id,
    groupId: group._id,
    player1: semiLosers[0],
    player2: semiLosers[1],
    pairKey: makePairKey(semiLosers[0], semiLosers[1]),
    round: PLAYOFF_BRONZE_ROUND,
    status: 'finished',
    roundNumber: 1,
    drawVersion: 1,
    resultType: 'played',
    voided: false,
    courtNumber: 2,
    startAt: bronzeStart,
    endAt: minutesFrom(bronzeStart, 30),
    actualStartAt: bronzeStart,
    actualEndAt: minutesFrom(bronzeStart, 30),
    resultUpdatedAt: minutesFrom(bronzeStart, 30),
    umpireName: refereeNames[1] ?? '',
    sets: [],
    winner: null
  };

  await Match.insertMany([
    createPlayedFinish(
        finalBase,
        finalWinner,
        finalLoser,
        new Map([
          [String(finalWinner), 1],
          [String(finalLoser), 2]
        ])
    ),
    createWoFinish(bronzeBase, semiLosers[0], 'Az ellenfél sérülés miatt nem állt ki a bronzmérkőzésre.')
  ]);

  return category;
}

async function seedDraftTournament(owner) {
  const tournament = await createTournament({
    owner,
    name: 'DEMO – Tervezet verseny',
    location: 'SZTE Sportközpont',
    date: daysFromNow(14, 9, 0),
    status: 'draft',
    courtsCount: 3,
    entryFeeAmount: 3000,
    referees: ['Kiss András', 'Németh Péter']
  });

  const setup = await seedSetupCategory({ tournament });
  const checkin = await seedCheckinOpenCategory({ tournament });
  const drawLocked = await seedDrawLockedCategory({ tournament });

  await createAuditLogs({
    owner,
    tournament,
    items: [
      {
        entityType: 'tournament',
        entityId: String(tournament._id),
        action: 'tournament.created',
        summary: `Bemutató tervezet verseny létrehozva: ${tournament.name}`
      },
      {
        entityType: 'category',
        entityId: String(setup._id),
        categoryId: setup._id,
        action: 'category.created',
        summary: `Kategória létrehozva: ${setup.name}`
      },
      {
        entityType: 'category',
        entityId: String(checkin._id),
        categoryId: checkin._id,
        action: 'category.checkin_opened',
        summary: `Check-in megnyitva: ${checkin.name}`
      },
      {
        entityType: 'category',
        entityId: String(drawLocked._id),
        categoryId: drawLocked._id,
        action: 'category.draw_finalized',
        summary: `Sorsolás lezárva: ${drawLocked.name}`
      }
    ]
  });

  return tournament;
}

async function seedRunningTournament(owner) {
  const tournament = await createTournament({
    owner,
    name: 'DEMO – Aktív verseny',
    location: 'Kecskemét Városi Sportcsarnok',
    date: new Date(),
    status: 'running',
    courtsCount: 4,
    entryFeeAmount: 3500,
    referees: ['Szabó Gergely', 'Kiss András', 'Németh Péter', 'Fodor Tamás']
  });

  const refereeNames = tournament.referees.map((referee) => referee.name);

  const c1 = await seedRunningGroupPlayoffCategory({ tournament, refereeNames });
  const c2 = await seedRunningGroupCategory({ tournament, refereeNames });
  const c3 = await seedConflictTestCategory({ tournament, refereeNames });
  const c4 = await seedPlayoffOnlyCategory({ tournament, refereeNames });

  await createAuditLogs({
    owner,
    tournament,
    items: [
      {
        entityType: 'tournament',
        entityId: String(tournament._id),
        action: 'tournament.created',
        summary: `Bemutató aktív verseny létrehozva: ${tournament.name}`
      },
      {
        entityType: 'scheduler',
        entityId: String(tournament._id),
        action: 'group.schedule_generated',
        summary: 'Automatikus menetrend generálva a csoportkörös meccsekhez.'
      },
      {
        entityType: 'category',
        entityId: String(c1._id),
        categoryId: c1._id,
        action: 'category.playoff_generated',
        summary: `Rájátszás elkészítve: ${c1.name}`
      },
      {
        entityType: 'category',
        entityId: String(c2._id),
        categoryId: c2._id,
        action: 'match.result_recorded',
        summary: `Vegyes állapotú csoportmeccsek létrehozva: ${c2.name}`
      },
      {
        entityType: 'category',
        entityId: String(c3._id),
        categoryId: c3._id,
        action: 'category.test_scenarios_ready',
        summary: 'Előkészítve a pályaütközés, játékosütközés és ütemezetlen indítás tesztelésére.'
      },
      {
        entityType: 'category',
        entityId: String(c4._id),
        categoryId: c4._id,
        action: 'category.draw_finalized',
        summary: `Playoff ág elkészítve: ${c4.name}`
      }
    ]
  });

  return tournament;
}

async function seedFinishedTournament(owner) {
  const tournament = await createTournament({
    owner,
    name: 'DEMO – Lezárt verseny',
    location: 'Szegedi Városi Sportcsarnok',
    date: daysAgo(7, 8, 0),
    status: 'finished',
    courtsCount: 4,
    entryFeeAmount: 4000,
    referees: ['Varga Attila', 'Nagy Zoltán', 'Fodor Tamás'],
    extra: { finishedResultEditUnlocked: false }
  });

  const refereeNames = tournament.referees.map((referee) => referee.name);

  const c1 = await seedCompletedGroupPlayoffCategory({ tournament, refereeNames });
  const c2 = await seedCompletedGroupCategory({ tournament, refereeNames });

  await createAuditLogs({
    owner,
    tournament,
    items: [
      {
        entityType: 'tournament',
        entityId: String(tournament._id),
        action: 'tournament.created',
        summary: `Bemutató lezárt verseny létrehozva: ${tournament.name}`
      },
      {
        entityType: 'category',
        entityId: String(c1._id),
        categoryId: c1._id,
        action: 'category.completed',
        summary: `Kategória lezárva: ${c1.name}`
      },
      {
        entityType: 'category',
        entityId: String(c2._id),
        categoryId: c2._id,
        action: 'category.completed',
        summary: `Kategória lezárva: ${c2.name}`
      },
      {
        entityType: 'exports',
        entityId: String(tournament._id),
        action: 'results.ready',
        summary: 'A végeredmények készen állnak az eredményhirdetéshez.'
      },
      {
        entityType: 'tournament',
        entityId: String(tournament._id),
        action: 'finished.lock_active',
        summary: 'A lezárt verseny eredményei alapból zároltak, feloldás csak admin döntéssel lehetséges.'
      }
    ]
  });

  return tournament;
}

async function printSummary(tournaments) {
  console.log('\nDemo seed elkészült.\n');
  console.log('Belépési adatok:');
  console.log(`  email: ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);

  for (const tournament of tournaments) {
    const counts = {
      categories: await Category.countDocuments({ tournamentId: tournament._id }),
      players: await Player.countDocuments({ tournamentId: tournament._id }),
      entries: await Entry.countDocuments({ tournamentId: tournament._id }),
      groups: await Group.countDocuments({ tournamentId: tournament._id }),
      matches: await Match.countDocuments({ tournamentId: tournament._id }),
      paymentGroups: await PaymentGroup.countDocuments({ tournamentId: tournament._id }),
      auditLogs: await AuditLog.countDocuments({ tournamentId: tournament._id })
    };

    console.log(`\n- ${tournament.name}`);
    console.log(`  státusz: ${tournament.status}`);
    console.log(`  tournamentId: ${String(tournament._id)}`);
    console.log('  counts:', counts);
  }

  console.log('\nAjánlott gyors tesztek:');
  console.log('1. DEMO – Tervezet verseny / Női egyéni – check-in nyitva → csoportos befizetés egyben rendezése.');
  console.log('2. DEMO – Aktív verseny / Hibavédelmi tesztkategória →');
  console.log('   - futó meccs van a 2-es pályán');
  console.log('   - próbálj elindítani egy másik meccset ugyanarra a pályára');
  console.log('   - próbálj elindítani egy másik meccset ugyanazzal a játékossal');
  console.log('   - próbálj elindítani egy ütemezetlen meccset');
  console.log('3. DEMO – Aktív verseny / Férfi egyéni amatőr → group+playoff, futó döntő, nyitott fizetési csoport.');
  console.log('4. DEMO – Lezárt verseny → végeredmény, WO/RET példák, lezárt eredményjavítás teszt.');
  console.log('\nMegjegyzés: ha a modelled már tartalmazza a finishedResultEditUnlocked mezőt, ez a seed alapból zárolt lezárt versenyt hoz létre.');
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('Missing MONGO_URI in environment');
  }

  const replace = process.argv.includes('--replace');

  await mongoose.connect(process.env.MONGO_URI);

  const owner = await ensureDemoUser({ replace });

  const tournaments = [];
  tournaments.push(await seedDraftTournament(owner));
  tournaments.push(await seedRunningTournament(owner));
  tournaments.push(await seedFinishedTournament(owner));

  await printSummary(tournaments);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors
  }
  process.exit(1);
});