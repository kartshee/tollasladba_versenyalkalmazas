import assert from 'node:assert/strict';
import { generatePartialRoundRobin } from '../services/roundRobin.service.js';
import { buildSchedule } from '../services/scheduler.service.js';

function pairKey(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}_${y}` : `${y}_${x}`;
}

function checkRR({ n, m, expectStrictPerPlayer = true }) {
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  const matches = generatePartialRoundRobin(ids, m);

  // no self matches
  for (const mm of matches) {
    assert.notEqual(String(mm.player1), String(mm.player2), 'self match');
  }

  // no duplicate pairs
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
  // Scheduler expects docs with _id, player1, player2
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

  // Court non-overlap
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

  // Player rest constraint
  const matchMs = matchMinutes * 60 * 1000;
  const restMs = restMinutes * 60 * 1000;

  const byPlayer = new Map();
  for (const p of plan) {
    const doc = docs[Number(p.matchId.slice(1))];
    const p1 = String(doc.player1);
    const p2 = String(doc.player2);
    byPlayer.set(p1, [...(byPlayer.get(p1) ?? []), p]);
    byPlayer.set(p2, [...(byPlayer.get(p2) ?? []), p]);

    // sanity: endAt-startAt
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

function main() {
  // Even n: strict m games/player is feasible for any m<=n-1
  for (const n of [4, 6, 8, 10, 12]) {
    for (const m of [1, 2, 3, 5, 6]) {
      if (m > n - 1) continue;
      checkRR({ n, m, expectStrictPerPlayer: true });
    }
  }

  // Odd n: strict m games/player is feasible only when m is even (partial) or full RR (m=n-1)
  for (const n of [5, 7, 9, 11]) {
    checkRR({ n, m: n - 1, expectStrictPerPlayer: true });
    for (const m of [2, 4, 6]) {
      if (m > n - 1) continue;
      checkRR({ n, m, expectStrictPerPlayer: true });
    }
  }

  // Scheduler smoke
  const { matches } = checkRR({ n: 8, m: 5, expectStrictPerPlayer: true });
  checkSchedule({ matches, courtsCount: 2, matchMinutes: 35, restMinutes: 20, turnoverMinutes: 0 });

  console.log('OK: round robin + scheduler invariants passed');
}

main();
