import { useEffect, useMemo, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime, formatStatusLabel, toneForStatus, roundLabel, setsToText, outcomeLabel, byName } from '../services/formatters.js';

const emptyResultRows = [
  { p1: '', p2: '' },
  { p1: '', p2: '' },
  { p1: '', p2: '' },
];

function playoffMatchRows(matches = []) {
  const grouped = matches.reduce((acc, match) => {
    const key = match.round ?? 'other';
    acc[key] = acc[key] ?? [];
    acc[key].push(match);
    return acc;
  }, {});

  const order = ['playoff_round_of_32', 'playoff_round_of_16', 'playoff_quarter', 'playoff_semi', 'playoff_final', 'playoff_bronze'];
  return order.filter((round) => grouped[round]?.length).map((round) => ({ round, matches: grouped[round] }));
}

function mapResultRows(sets) {
  const rows = Array.isArray(sets) ? sets.map((set) => ({ p1: String(set.p1 ?? ''), p2: String(set.p2 ?? '') })) : [];
  while (rows.length < 3) rows.push({ p1: '', p2: '' });
  return rows.slice(0, 3);
}

function normalizeResultRows(rows) {
  return rows
    .filter((row) => row.p1 !== '' || row.p2 !== '')
    .map((row) => ({ p1: Number(row.p1), p2: Number(row.p2) }));
}

export function PlayoffPage({ params }) {
  const { id, categoryId } = params;
  const auth = useAuth();
  const [category, setCategory] = useState(null);
  const [groups, setGroups] = useState([]);
  const [playoffByGroup, setPlayoffByGroup] = useState({});
  const [playoffOnlyMatches, setPlayoffOnlyMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [resultRows, setResultRows] = useState(emptyResultRows);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState('');

  async function loadAll() {
    const [categoryData, groupsData, categoryMatches] = await Promise.all([
      api.get(`/api/categories/${categoryId}`, { token: auth.token }),
      api.get(`/api/groups?tournamentId=${id}&categoryId=${categoryId}`, { token: auth.token }),
      api.get(`/api/matches?tournamentId=${id}&categoryId=${categoryId}`, { token: auth.token }),
    ]);

    const playoffMatches = categoryMatches.filter((match) => String(match.round ?? '').startsWith('playoff_'));
    const byGroup = {};

    if (categoryData.format === 'group+playoff' && groupsData.length > 0) {
      const groupResults = await Promise.all(groupsData.map(async (group) => {
        try {
          const data = await api.get(`/api/groups/${group._id}/playoff`, { token: auth.token });
          return [group._id, data];
        } catch {
          return [group._id, { matches: [], rounds: {}, semis: [], bronze: null, final: null }];
        }
      }));
      Object.assign(byGroup, Object.fromEntries(groupResults));
    }

    setCategory(categoryData);
    setGroups(groupsData.sort((a, b) => byName(a.name, b.name)));
    setPlayoffByGroup(byGroup);
    setPlayoffOnlyMatches(playoffMatches.filter((match) => !match.groupId));
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll()
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [auth.token, id, categoryId]);

  const selectedMatch = useMemo(() => {
    const allMatches = category?.format === 'playoff'
      ? playoffOnlyMatches
      : Object.values(playoffByGroup).flatMap((item) => item.matches ?? []);
    return allMatches.find((match) => String(match._id) === String(selectedMatchId)) ?? null;
  }, [category?.format, playoffByGroup, playoffOnlyMatches, selectedMatchId]);

  useEffect(() => {
    if (!selectedMatch) {
      setResultRows(emptyResultRows);
      return;
    }
    setResultRows(mapResultRows(selectedMatch.sets));
  }, [selectedMatch]);

  const summary = useMemo(() => {
    const allMatches = category?.format === 'playoff' ? playoffOnlyMatches : Object.values(playoffByGroup).flatMap((item) => item.matches ?? []);
    return {
      total: allMatches.length,
      pending: allMatches.filter((match) => match.status === 'pending').length,
      running: allMatches.filter((match) => match.status === 'running').length,
      finished: allMatches.filter((match) => match.status === 'finished').length,
    };
  }, [category?.format, playoffByGroup, playoffOnlyMatches]);

  async function perform(key, action) {
    setBusyKey(key);
    setError('');
    try {
      await action();
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey('');
    }
  }

  async function generateGroupPlayoff(groupId) {
    await perform(`generate-${groupId}`, () => api.post(`/api/groups/${groupId}/playoff`, {}, { token: auth.token }));
  }

  async function advanceGroupPlayoff(groupId) {
    await perform(`advance-${groupId}`, () => api.post(`/api/groups/${groupId}/playoff/advance`, {}, { token: auth.token }));
  }

  async function advancePlayoffOnly() {
    await perform('advance-category', () => api.post(`/api/categories/${categoryId}/playoff/advance`, {}, { token: auth.token }));
  }

  async function saveSelectedResult(event) {
    event.preventDefault();
    if (!selectedMatch) return;
    const sets = normalizeResultRows(resultRows);
    await perform(`result-${selectedMatch._id}`, () => api.patch(`/api/matches/${selectedMatch._id}/result`, { sets }, { token: auth.token }));
  }

  async function updateSelectedStatus(status) {
    if (!selectedMatch) return;
    await perform(`status-${selectedMatch._id}`, () => api.patch(`/api/matches/${selectedMatch._id}/status`, { status }, { token: auth.token }));
  }

  function renderMatchCard(match) {
    const active = String(selectedMatchId ?? '') === String(match._id);
    return (
      <button key={match._id} type="button" className={`bracket-match ${active ? 'bracket-match--active' : ''}`} onClick={() => setSelectedMatchId(match._id)}>
        <div className="bracket-match__meta">
          <StatusBadge tone={toneForStatus(match.status)}>{formatStatusLabel(match.status)}</StatusBadge>
          <span>{formatDateTime(match.startAt)}</span>
        </div>
        <strong>{match.player1?.name ?? match.player1}</strong>
        <strong>{match.player2?.name ?? match.player2}</strong>
        <span className="muted">{match.winner ? `Győztes: ${match.winner?.name ?? match.winner}` : 'Nincs még győztes'}</span>
        <span className="muted">{outcomeLabel(match.resultType)} • {setsToText(match.sets)}</span>
      </button>
    );
  }

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}/categories/${categoryId}`}>Vissza a kategóriához</BackLink>
      <PageHeader
        eyebrow="Playoff"
        title="Playoff és bronzmeccs"
        description="A playoff nézet a kategória teljes kieséses ágát mutatja. Innen generálható és továbbvihető a bracket, valamint gyorsan ellenőrizhető a döntő és a bronzmeccs állapota."
        action={category ? <StatusBadge tone={toneForStatus(category.status)}>{formatStatusLabel(category.status)}</StatusBadge> : null}
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          {loading ? <SectionCard title="Betöltés"><div className="muted">Playoff adatok betöltése...</div></SectionCard> : null}

          {!loading && category?.format === 'playoff' ? (
            <SectionCard title="Playoff-only kategória" subtitle="A bracket eleve csoportkör nélkül indul.">
              {playoffOnlyMatches.length === 0 ? (
                <div className="muted">Ehhez a kategóriához még nincs playoff draw generálva.</div>
              ) : (
                <div className="bracket-grid">
                  {playoffMatchRows(playoffOnlyMatches).map((section) => (
                    <div key={section.round} className="bracket-column">
                      <h3>{roundLabel(section.round)}</h3>
                      <div className="stack-md">
                        {section.matches.map(renderMatchCard)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="actions-row">
                <button className="button button--primary" type="button" disabled={busyKey === 'advance-category'} onClick={advancePlayoffOnly}>
                  Következő kör generálása
                </button>
                <AppLink className="button button--ghost" to={`/tournaments/${id}/matches`}>Meccsek oldal</AppLink>
              </div>
            </SectionCard>
          ) : null}

          {!loading && category?.format === 'group+playoff' ? groups.map((group) => {
            const playoff = playoffByGroup[group._id] ?? { matches: [], rounds: {} };
            const rows = playoffMatchRows(playoff.matches ?? []);
            return (
              <SectionCard key={group._id} title={group.name} subtitle="A csoportból induló playoff ág állapota.">
                {rows.length === 0 ? (
                  <div className="empty-state">
                    <h3>Még nincs playoff generálva</h3>
                    <p>Ha a csoportkör kész és a továbbjutók eldőltek, innen létrehozható a playoff ág.</p>
                    <div className="actions-row">
                      <button className="button button--primary" type="button" disabled={busyKey === `generate-${group._id}`} onClick={() => generateGroupPlayoff(group._id)}>
                        Playoff generálása
                      </button>
                      <AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${categoryId}/standings`}>Standings</AppLink>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bracket-grid">
                      {rows.map((section) => (
                        <div key={`${group._id}-${section.round}`} className="bracket-column">
                          <h3>{roundLabel(section.round)}</h3>
                          <div className="stack-md">
                            {section.matches.map(renderMatchCard)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="actions-row">
                      <button className="button button--secondary" type="button" disabled={busyKey === `advance-${group._id}`} onClick={() => advanceGroupPlayoff(group._id)}>
                        Következő kör generálása
                      </button>
                    </div>
                  </>
                )}
              </SectionCard>
            );
          }) : null}
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Playoff összesítő" subtitle={category?.name ?? 'Kategória'}>
            <div className="key-value-list">
              <div className="key-value-list__row"><span className="key-value-list__label">Összes playoff meccs</span><span className="key-value-list__value">{summary.total}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Pending</span><span className="key-value-list__value">{summary.pending}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Running</span><span className="key-value-list__value">{summary.running}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Finished</span><span className="key-value-list__value">{summary.finished}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Kijelölt playoff meccs" subtitle="Gyors eredményrögzítés a playoff nézetből.">
            {!selectedMatch ? (
              <div className="muted">Válassz egy meccset a bracketből.</div>
            ) : (
              <form className="stack-md" onSubmit={saveSelectedResult}>
                <div className="readonly-field">
                  <span className="readonly-field__label">Párosítás</span>
                  <strong>{selectedMatch.player1?.name ?? selectedMatch.player1} – {selectedMatch.player2?.name ?? selectedMatch.player2}</strong>
                  <span className="readonly-field__help">{roundLabel(selectedMatch.round)} • {formatDateTime(selectedMatch.startAt)}</span>
                </div>
                <div className="inline-actions">
                  <button className="button button--ghost" type="button" onClick={() => updateSelectedStatus('running')}>Running</button>
                  <button className="button button--ghost" type="button" onClick={() => updateSelectedStatus('pending')}>Pending</button>
                </div>
                {resultRows.map((row, index) => (
                  <div key={`playoff-set-${index}`} className="score-row">
                    <span>{index + 1}. szett</span>
                    <input type="number" min="0" value={row.p1} onChange={(e) => setResultRows((state) => state.map((item, itemIndex) => itemIndex === index ? { ...item, p1: e.target.value } : item))} placeholder="P1" />
                    <input type="number" min="0" value={row.p2} onChange={(e) => setResultRows((state) => state.map((item, itemIndex) => itemIndex === index ? { ...item, p2: e.target.value } : item))} placeholder="P2" />
                  </div>
                ))}
                <button className="button button--primary button--block" type="submit" disabled={!selectedMatch}>Eredmény mentése</button>
              </form>
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
