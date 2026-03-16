/*
Run with:
  BASE_URL=http://localhost:5001 node src/scripts/e2e_smoke.js 8 5
*/

import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL ?? 'http://localhost:5001';

const playersCount = Number(process.argv[2] ?? 8);
const matchesPerPlayer = Number(process.argv[3] ?? 5);

function idOf(x) {
  if (x && typeof x === 'object') return String(x._id ?? x.id ?? x);
  return String(x);
}

function pairKey(a, b) {
  const x = String(a);
  const y = String(b);
  return x < y ? `${x}_${y}` : `${y}_${x}`;
}

async function j(method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

function assertRoundRobinInvariants({ matches, playerIds, m }) {
  // no self matches + no duplicate pairs
  const seen = new Set();
  const counts = new Map(playerIds.map((pid) => [String(pid), 0]));

  for (const mm of matches) {
    const p1 = idOf(mm.player1);
    const p2 = idOf(mm.player2);

    assert.notEqual(p1, p2, 'self match');

    const k = pairKey(p1, p2);
    assert(!seen.has(k), `duplicate pair ${k}`);
    seen.add(k);

    counts.set(p1, (counts.get(p1) ?? 0) + 1);
    counts.set(p2, (counts.get(p2) ?? 0) + 1);
  }

  for (const pid of playerIds) {
    const c = counts.get(String(pid)) ?? 0;
    assert.equal(c, m, `player ${pid} has ${c} matches; expected ${m}`);
  }

  assert.equal(matches.length, (playerIds.length * m) / 2, 'wrong total match count');
}

function assertScheduleInvariants({ matches, playerIds, matchMinutes, restMinutes, turnoverMinutes }) {
  const matchMs = matchMinutes * 60 * 1000;
  const restMs = restMinutes * 60 * 1000;
  const turnMs = turnoverMinutes * 60 * 1000;

  // all scheduled fields present + correct duration
  for (const mm of matches) {
    assert(mm.startAt, 'missing startAt');
    assert(mm.endAt, 'missing endAt');
    assert(mm.courtNumber, 'missing courtNumber');

    const s = new Date(mm.startAt);
    const e = new Date(mm.endAt);
    assert(!Number.isNaN(s.getTime()), 'invalid startAt date');
    assert(!Number.isNaN(e.getTime()), 'invalid endAt date');
    assert.equal(e.getTime() - s.getTime(), matchMs, 'wrong match duration');
  }

  // court non-overlap (with turnover)
  const byCourt = new Map();
  for (const mm of matches) {
    const c = Number(mm.courtNumber);
    byCourt.set(c, [...(byCourt.get(c) ?? []), mm]);
  }
  for (const [court, items] of byCourt.entries()) {
    items.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    for (let i = 1; i < items.length; i++) {
      const prevEnd = new Date(items[i - 1].endAt).getTime();
      const currStart = new Date(items[i].startAt).getTime();
      assert(currStart >= prevEnd + turnMs, `court ${court} overlap/turnover violated`);
    }
  }

  // player rest constraint
  const byPlayer = new Map(playerIds.map((pid) => [String(pid), []]));
  for (const mm of matches) {
    const p1 = idOf(mm.player1);
    const p2 = idOf(mm.player2);
    byPlayer.get(p1)?.push(mm);
    byPlayer.get(p2)?.push(mm);
  }

  for (const [pid, items] of byPlayer.entries()) {
    items.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    for (let i = 1; i < items.length; i++) {
      const prevEnd = new Date(items[i - 1].endAt).getTime();
      const currStart = new Date(items[i].startAt).getTime();
      assert(currStart >= prevEnd + restMs, `player ${pid} rest violated`);
    }
  }
}

async function main() {
  // 1) Create tournament
  const stamp = new Date().toISOString();
  const t = await j('POST', '/api/tournaments', { name: `SMOKE ${stamp}` });
  assert(t?._id);

  // 2) Create category
  const c = await j('POST', '/api/categories', {
    tournamentId: t._id,
    name: 'SMOKE Cat',
    groupStageMatchesPerPlayer: matchesPerPlayer,
    format: 'group+playoff'
  });
  assert(c?._id);

  // 3) Create players
  const pIds = [];
  for (let i = 1; i <= playersCount; i++) {
    const p = await j('POST', '/api/players', {
      tournamentId: t._id,
      categoryId: c._id,
      name: `P${i}`,
      club: i % 2 === 0 ? 'B' : 'A'
    });
    pIds.push(p._id);
  }

  // 4) Check in players (scheduler requires checked-in + main eligible)
  for (const playerId of pIds) {
    const checkedIn = await j('PATCH', `/api/players/${playerId}/checkin`, { checkedIn: true });
    assert(checkedIn?.checkedInAt, `player ${playerId} should be checked in`);
  }

  // 5) Create group
  const g = await j('POST', '/api/groups', {
    tournamentId: t._id,
    categoryId: c._id,
    name: 'Group A',
    players: pIds
  });
  assert(g?._id);

  // 6) Generate matches
  const gen = await j('POST', `/api/matches/group/${g._id}`, { matchesPerPlayer });
  assert(typeof gen.generated === 'number');
  assert(Array.isArray(gen.matches));

  // RR invariants (DB inserted docs returned)
  assertRoundRobinInvariants({ matches: gen.matches, playerIds: pIds, m: matchesPerPlayer });

  // 6b) Idempotency: second generate must 409 (no duplicates)
  let got409 = false;
  try {
    await j('POST', `/api/matches/group/${g._id}`, { matchesPerPlayer });
  } catch (e) {
    got409 = String(e.message).includes('-> 409');
    if (!got409) throw e;
  }
  assert(got409, 'expected 409 when generating matches twice for same group');

  // 7) Schedule
  const matchMinutes = 35;
  const restMinutes = 20;
  const turnoverMinutes = 0;

  const sch = await j('POST', `/api/matches/group/${g._id}/schedule`, {
    startAt: new Date().toISOString(),
    courtsCount: 2,
    matchMinutes,
    playerRestMinutes: restMinutes,
    courtTurnoverMinutes: turnoverMinutes,
    force: true
  });

  console.log('SCHEDULE RESPONSE:', sch);

  assert(typeof sch.scheduled === 'number');
  assert(Array.isArray(sch.matches));
  assert.equal(sch.scheduled, gen.generated, 'scheduled count must equal generated');

  // Scheduler invariants (integration-level)
  assertScheduleInvariants({
    matches: sch.matches.filter((m) => m.round === 'group' && m.voided !== true),
    playerIds: pIds,
    matchMinutes,
    restMinutes,
    turnoverMinutes
  });

  // 8) Finish one match as WO
  const firstMatch = gen.matches[0];
  const finished = await j('PATCH', `/api/matches/${firstMatch._id}/outcome`, {
    type: 'wo',
    winnerSide: 'player1'
  });
  assert.equal(finished.status, 'finished');
  assert.equal(finished.resultType, 'wo');

  // 9) Standings (must return all players)
  const standings = await j('GET', `/api/groups/${g._id}/standings`);
  assert(Array.isArray(standings));
  assert.equal(standings.length, playersCount, 'standings must include all players');

  console.log('OK: e2e smoke passed (with invariants)');
  console.log({ tournamentId: t._id, categoryId: c._id, groupId: g._id, generated: gen.generated });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});