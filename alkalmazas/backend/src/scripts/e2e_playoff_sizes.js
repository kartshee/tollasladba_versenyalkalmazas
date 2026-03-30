import assert from 'node:assert/strict';
import { createAuthContext } from './_auth.js';

let j;

async function setPlayed(matchId, winnerName, player1Name, player2Name) {
  const isP1 = player1Name === winnerName;
  const result = await j('PATCH', `/api/matches/${matchId}/result`, {
    sets: isP1 ? [{ p1: 21, p2: 12 }, { p1: 21, p2: 13 }] : [{ p1: 12, p2: 21 }, { p1: 13, p2: 21 }]
  });
  assert.equal(result.status, 'finished');
  return result;
}

async function main() {
  const auth = await createAuthContext('PSIZE');
  j = (method, path, body) => auth.j(method, path, body);

  const tournament = await j('POST', '/api/tournaments', { name: `PSIZE ${new Date().toISOString()}` });
  const category = await j('POST', '/api/categories', {
    tournamentId: tournament._id,
    name: 'Top8 playoff',
    format: 'group+playoff',
    groupsCount: 1,
    groupSizeTarget: 8,
    groupStageMatchesPerPlayer: 7,
    qualifiersPerGroup: 8,
    playoffSize: 8
  });

  for (const name of ['A','B','C','D','E','F','G','H']) {
    const p = await j('POST', '/api/players', { tournamentId: tournament._id, categoryId: category._id, name });
    await j('PATCH', `/api/players/${p._id}/checkin`, { checkedIn: true });
  }

  const locked = await j('POST', `/api/categories/${category._id}/finalize-draw`);
  assert.equal(locked.groupsCreated, 1);
  const groups = await j('GET', `/api/groups?categoryId=${category._id}`);
  const groupId = groups[0]._id;
  const groupMatches = await j('GET', `/api/matches?groupId=${groupId}&round=group`);

  // Seed strict ranking A>B>C>D>E>F>G>H by making lexicographically smaller player always win.
  for (const match of groupMatches) {
    const p1 = match.player1.name;
    const p2 = match.player2.name;
    const winner = [p1, p2].sort()[0];
    await setPlayed(match._id, winner, p1, p2);
  }

  const created = await j('POST', `/api/groups/${groupId}/playoff`);
  assert.equal(created.playoff.round, 'playoff_quarter');
  assert.equal(created.playoff.matches.length, 4);

  for (const quarter of created.playoff.matches) {
    const winner = [quarter.player1.name, quarter.player2.name].sort()[0];
    await setPlayed(quarter._id, winner, quarter.player1.name, quarter.player2.name);
  }

  const semisCreated = await j('POST', `/api/groups/${groupId}/playoff/advance`);
  assert.equal(semisCreated.created, 2);
  assert(semisCreated.matches.every((m) => m.round === 'playoff_semi'));

  for (const semi of semisCreated.matches) {
    const winner = [semi.player1.name, semi.player2.name].sort()[0];
    await setPlayed(semi._id, winner, semi.player1.name, semi.player2.name);
  }

  const finalsCreated = await j('POST', `/api/groups/${groupId}/playoff/advance`);
  assert.equal(finalsCreated.created, 2);
  const rounds = finalsCreated.matches.map((m) => m.round).sort();
  assert.deepEqual(rounds, ['playoff_bronze', 'playoff_final']);

  console.log('OK: playoff size 8 smoke passed');
  console.log({ tournamentId: tournament._id, categoryId: category._id, groupId, rounds });
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
