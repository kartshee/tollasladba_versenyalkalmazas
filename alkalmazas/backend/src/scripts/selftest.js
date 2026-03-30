import assert from 'node:assert/strict';
import { generatePartialRoundRobin } from '../services/roundRobin.service.js';
import { buildSchedule } from '../services/scheduler.service.js';
import { computeStandings, findCutoffTieBlock } from '../services/standings.service.js';
import { normalizeCategoryPayload } from '../services/configValidation.service.js';
import { buildSeededBracketPairs, getInitialPlayoffRoundName, getNextPlayoffRoundName } from '../services/playoff.service.js';

function pairKey(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}_${y}` : `${y}_${x}`;
}

function checkRR({ n, m, expectStrictPerPlayer = true }) {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  const matches = generatePartialRoundRobin(ids, m);

  for (const mm of matches) {
    assert.notEqual(String(mm.player1), String(mm.player2), 'self match');
  }

  const seen = new Set();
  for (const mm of matches) {
    const k = pairKey(mm.player1, mm.player2);
    assert(!seen.has(k), `duplicate pair ${k}`);
    seen.add(k);
  }

  const counts = new Map(ids.map((id) => [id, 0]));
  for (const mm of matches) {
    counts.set(String(mm.player1), (counts.get(String(mm.player1)) ?? 0) + 1);
    counts.set(String(mm.player2), (counts.get(String(mm.player2)) ?? 0) + 1);
  }

  if (expectStrictPerPlayer) {
    for (const [id, c] of counts.entries()) {
      assert.equal(c, m, `player ${id} has ${c} matches; expected ${m}`);
    }
    assert.equal(matches.length, (n * m) / 2, `expected match count ${n * m / 2}`);
  }

  return { matches, counts };
}

function checkSchedule({ matches, courtsCount = 2, matchMinutes = 35, restMinutes = 20, turnoverMinutes = 0 }) {
  const docs = matches.map((m, idx) => ({
    _id: `m${idx}`,
    player1: m.player1,
    player2: m.player2,
    createdAt: new Date(0)
  }));

  const startAt = new Date('2026-01-01T09:00:00.000Z');
  const plan = buildSchedule(docs, {
    startAt,
    courtsCount,
    matchMinutes,
    playerRestMinutes: restMinutes,
    courtTurnoverMinutes: turnoverMinutes
  });

  assert.equal(plan.length, docs.length, 'schedule length mismatch');

  const byCourt = new Map();
  for (const p of plan) {
    const c = p.courtNumber;
    byCourt.set(c, [...(byCourt.get(c) ?? []), p]);
  }
  for (const [court, items] of byCourt.entries()) {
    items.sort((a, b) => a.startAt - b.startAt);
    for (let i = 1; i < items.length; i++) {
      assert(items[i].startAt >= items[i - 1].endAt, `court ${court} overlap`);
    }
  }

  const matchMs = matchMinutes * 60 * 1000;
  const restMs = restMinutes * 60 * 1000;

  const byPlayer = new Map();
  for (const p of plan) {
    const doc = docs[Number(p.matchId.slice(1))];
    const p1 = String(doc.player1);
    const p2 = String(doc.player2);
    byPlayer.set(p1, [...(byPlayer.get(p1) ?? []), p]);
    byPlayer.set(p2, [...(byPlayer.get(p2) ?? []), p]);

    assert.equal(p.endAt - p.startAt, matchMs, 'wrong duration');
    assert(p.startAt >= startAt, 'starts before base');
  }

  for (const [player, items] of byPlayer.entries()) {
    items.sort((a, b) => a.startAt - b.startAt);
    for (let i = 1; i < items.length; i++) {
      const minNextStart = items[i - 1].endAt.getTime() + restMs;
      assert(items[i].startAt.getTime() >= minNextStart, `player ${player} rest violated`);
    }
  }

  return plan;
}

function player(id, name) {
  return { _id: id, name };
}

function match(player1, player2, winner, sets, resultType = 'played') {
  return { player1, player2, winner, sets, resultType, status: 'finished', voided: false };
}

function checkStandingsPolicies() {
  const A = player('a', 'A');
  const B = player('b', 'B');
  const C = player('c', 'C');
  const D = player('d', 'D');
  const players = [A, B, C, D];

  const matches = [
    match(A._id, B._id, A._id, [{ p1: 21, p2: 18 }, { p1: 21, p2: 18 }]),
    match(B._id, C._id, B._id, [{ p1: 21, p2: 18 }, { p1: 21, p2: 18 }]),
    match(C._id, A._id, C._id, [{ p1: 21, p2: 18 }, { p1: 21, p2: 18 }]),
    match(A._id, D._id, A._id, [{ p1: 21, p2: 5 }, { p1: 21, p2: 5 }]),
    match(B._id, D._id, B._id, [{ p1: 21, p2: 10 }, { p1: 21, p2: 10 }]),
    match(C._id, D._id, C._id, [{ p1: 21, p2: 15 }, { p1: 21, p2: 15 }])
  ];

  const directOnly = computeStandings(players, matches, {
    multiTiePolicy: 'direct_only',
    unresolvedTiePolicy: 'shared_place'
  });
  assert.equal(directOnly[0].place, 1);
  assert.equal(directOnly[1].place, 1);
  assert.equal(directOnly[2].place, 1);
  assert.equal(directOnly[0].tieResolved, false);
  assert(findCutoffTieBlock(directOnly, 2)?.length === 3, 'expected cutoff tie block of 3');

  const directThenOverall = computeStandings(players, matches, {
    multiTiePolicy: 'direct_then_overall',
    unresolvedTiePolicy: 'manual_override'
  });
  assert.deepEqual(directThenOverall.slice(0, 4).map((x) => x.player.name), ['A', 'B', 'C', 'D']);
  assert.equal(directThenOverall[0].tieResolved, true);
  assert.equal(findCutoffTieBlock(directThenOverall, 2), null);

  const exactTie = computeStandings([A, B], [
    match(A._id, B._id, A._id, [] , 'wo')
  ], {
    multiTiePolicy: 'direct_then_overall',
    unresolvedTiePolicy: 'manual_override'
  });
  assert.equal(exactTie[0].player.name, 'A');
}

function checkCategoryValidation() {
  const groupPlayoff = normalizeCategoryPayload({
    name: 'X',
    format: 'group+playoff',
    groupSizeTarget: 8,
    qualifiersPerGroup: 8
  }, { partial: false });
  assert.equal(groupPlayoff.playoffSize, 8);

  const playoffOnly = normalizeCategoryPayload({
    name: 'Y',
    format: 'playoff',
    playoffSize: 16,
    qualifiersPerGroup: 16
  }, { partial: false });
  assert.equal(playoffOnly.format, 'playoff');
  assert.equal(playoffOnly.playoffSize, 16);

  assert.throws(() => normalizeCategoryPayload({
    name: 'Bad',
    format: 'group+playoff',
    groupSizeTarget: 8,
    qualifiersPerGroup: 3
  }, { partial: false }));
}

function checkPlayoffHelpers() {
  const entrants = ['s1', 's2', 's3', 's4'].map((id, idx) => ({ player: { _id: id, name: `P${idx + 1}` } }));
  const pairs = buildSeededBracketPairs(entrants);
  assert.equal(pairs.length, 2);
  assert.equal(getInitialPlayoffRoundName(8), 'playoff_quarter');
  assert.equal(getNextPlayoffRoundName('playoff_quarter'), 'playoff_semi');
}

function main() {
  for (const n of [4, 6, 8, 10, 12]) {
    for (const m of [1, 2, 3, 5, 6]) {
      if (m > n - 1) continue;
      checkRR({ n, m, expectStrictPerPlayer: true });
    }
  }

  for (const n of [5, 7, 9, 11]) {
    checkRR({ n, m: n - 1, expectStrictPerPlayer: true });
    for (const m of [2, 4, 6]) {
      if (m > n - 1) continue;
      checkRR({ n, m, expectStrictPerPlayer: true });
    }
  }

  const { matches } = checkRR({ n: 8, m: 5, expectStrictPerPlayer: true });
  checkSchedule({ matches, courtsCount: 2, matchMinutes: 35, restMinutes: 20, turnoverMinutes: 0 });
  checkStandingsPolicies();
  checkCategoryValidation();
  checkPlayoffHelpers();

  console.log('OK: round robin + scheduler + standings + config invariants passed');
}

main();
