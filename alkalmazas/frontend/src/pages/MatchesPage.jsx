import { useEffect, useMemo, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime, formatStatusLabel, toneForStatus, roundLabel, setsToText, outcomeLabel, normalizeSearch } from '../services/formatters.jsx';

const emptyResultRows = [
  { p1: '', p2: '' },
  { p1: '', p2: '' },
  { p1: '', p2: '' },
];

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

function safeText(value) {
  return String(value ?? '').trim().toLocaleLowerCase('hu-HU');
}

function safeTime(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

function defaultMatchCompare(a, b) {
  const timeDiff = safeTime(a.startAt) - safeTime(b.startAt);
  if (timeDiff !== 0) return timeDiff;

  const courtA = Number.isFinite(Number(a.courtNumber)) ? Number(a.courtNumber) : Number.POSITIVE_INFINITY;
  const courtB = Number.isFinite(Number(b.courtNumber)) ? Number(b.courtNumber) : Number.POSITIVE_INFINITY;
  if (courtA !== courtB) return courtA - courtB;

  return safeText(a.player1?.name ?? a.player1).localeCompare(safeText(b.player1?.name ?? b.player1), 'hu');
}

function sortMatches(matches, categoryMap, sort) {
  const direction = sort.direction === 'desc' ? -1 : 1;

  const sorted = [...matches].sort((a, b) => {
    let result = 0;

    switch (sort.key) {
      case 'round':
        result = safeText(roundLabel(a.round)).localeCompare(safeText(roundLabel(b.round)), 'hu');
        break;
      case 'players': {
        const playersA = `${safeText(a.player1?.name ?? a.player1)} ${safeText(a.player2?.name ?? a.player2)}`;
        const playersB = `${safeText(b.player1?.name ?? b.player1)} ${safeText(b.player2?.name ?? b.player2)}`;
        result = playersA.localeCompare(playersB, 'hu');
        break;
      }
      case 'category':
        result = safeText(categoryMap.get(String(a.categoryId?._id ?? a.categoryId))).localeCompare(
          safeText(categoryMap.get(String(b.categoryId?._id ?? b.categoryId))),
          'hu',
        );
        break;
      case 'status':
        result = safeText(formatStatusLabel(a.status)).localeCompare(safeText(formatStatusLabel(b.status)), 'hu');
        break;
      case 'court': {
        const courtA = Number.isFinite(Number(a.courtNumber)) ? Number(a.courtNumber) : Number.POSITIVE_INFINITY;
        const courtB = Number.isFinite(Number(b.courtNumber)) ? Number(b.courtNumber) : Number.POSITIVE_INFINITY;
        result = courtA - courtB;
        break;
      }
      case 'time':
        result = safeTime(a.startAt) - safeTime(b.startAt);
        break;
      case 'result': {
        const resultA = `${safeText(a.winner?.name ?? a.winner)} ${safeText(outcomeLabel(a.resultType))} ${safeText(setsToText(a.sets))}`;
        const resultB = `${safeText(b.winner?.name ?? b.winner)} ${safeText(outcomeLabel(b.resultType))} ${safeText(setsToText(b.sets))}`;
        result = resultA.localeCompare(resultB, 'hu');
        break;
      }
      default:
        result = defaultMatchCompare(a, b);
        break;
    }

    if (result !== 0) return result * direction;
    return defaultMatchCompare(a, b);
  });

  return sorted;
}

function SortHeader({ label, sortKey, currentSort, onToggle }) {
  const active = currentSort.key === sortKey;
  const arrow = !active ? '↕' : currentSort.direction === 'asc' ? '↑' : '↓';

  return (
    <button
      className="text-button"
      type="button"
      onClick={() => onToggle(sortKey)}
      style={{ fontWeight: active ? 700 : 600 }}
      title="Rendezés"
    >
      {label} {arrow}
    </button>
  );
}

export function MatchesPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [matches, setMatches] = useState([]);
  const [filters, setFilters] = useState({ categoryId: '', status: 'all', round: 'all', search: '' });
  const [sort, setSort] = useState({ key: 'time', direction: 'asc' });
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [umpireName, setUmpireName] = useState('');
  const [resultRows, setResultRows] = useState(emptyResultRows);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function loadAll() {
    const [tournamentData, categoriesData, matchesData] = await Promise.all([
      api.get(`/api/tournaments/${id}`, { token: auth.token }),
      api.get(`/api/categories?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/matches?tournamentId=${id}`, { token: auth.token }),
    ]);
    setTournament(tournamentData);
    setCategories(categoriesData);
    setMatches(matchesData);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll()
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [auth.token, id]);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [String(category._id), category.name])), [categories]);
  const roundOptions = useMemo(() => [...new Set(matches.map((match) => match.round).filter(Boolean))], [matches]);
  const umpireOptions = useMemo(() => tournament?.referees?.map((referee) => referee.name).filter(Boolean) ?? [], [tournament]);

  const filteredMatches = useMemo(() => {
    const search = normalizeSearch(filters.search);
    return matches.filter((match) => {
      if (filters.categoryId && String(match.categoryId?._id ?? match.categoryId) !== filters.categoryId) return false;
      if (filters.status !== 'all' && match.status !== filters.status) return false;
      if (filters.round !== 'all' && match.round !== filters.round) return false;
      if (!search) return true;
      const haystack = [
        match.player1?.name ?? '',
        match.player2?.name ?? '',
        categoryMap.get(String(match.categoryId?._id ?? match.categoryId)) ?? '',
        match.umpireName ?? '',
        match.round ?? '',
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }, [matches, filters, categoryMap]);

  const sortedMatches = useMemo(
    () => sortMatches(filteredMatches, categoryMap, sort),
    [filteredMatches, categoryMap, sort],
  );

  const selectedMatch = useMemo(
    () => sortedMatches.find((match) => String(match._id) === String(selectedMatchId))
      ?? matches.find((match) => String(match._id) === String(selectedMatchId))
      ?? null,
    [sortedMatches, matches, selectedMatchId],
  );

  useEffect(() => {
    if (!selectedMatch) {
      setUmpireName('');
      setResultRows(emptyResultRows);
      return;
    }
    setUmpireName(selectedMatch.umpireName ?? '');
    setResultRows(mapResultRows(selectedMatch.sets));
  }, [selectedMatch]);

  const summary = useMemo(() => ({
    total: matches.length,
    pending: matches.filter((match) => match.status === 'pending').length,
    running: matches.filter((match) => match.status === 'running').length,
    finished: matches.filter((match) => match.status === 'finished').length,
  }), [matches]);

  function toggleSort(nextKey) {
    setSort((current) => {
      if (current.key === nextKey) {
        return { key: nextKey, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: nextKey, direction: nextKey === 'time' ? 'asc' : 'asc' };
    });
  }

  async function perform(action) {
    setBusy(true);
    setError('');
    try {
      await action();
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(status) {
    if (!selectedMatch) return;
    await perform(() => api.patch(`/api/matches/${selectedMatch._id}/status`, { status }, { token: auth.token }));
  }

  async function saveUmpire() {
    if (!selectedMatch) return;
    await perform(() => api.patch(`/api/matches/${selectedMatch._id}/umpire`, { umpireName }, { token: auth.token }));
  }

  async function saveResult(event) {
    event.preventDefault();
    if (!selectedMatch) return;
    const sets = normalizeResultRows(resultRows);
    await perform(() => api.patch(`/api/matches/${selectedMatch._id}/result`, { sets }, { token: auth.token }));
  }

  async function saveOutcome(type, winnerSide) {
    if (!selectedMatch) return;
    await perform(() => api.patch(`/api/matches/${selectedMatch._id}/outcome`, { type, winnerSide }, { token: auth.token }));
  }

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Meccsek"
        title="Operatív meccskezelés"
        description="A teljes meccsállomány egy helyen látható. Alapértelmezetten időrendben jelenik meg, de minden oszlop szerint rendezhető."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Szűrés" subtitle="Gyorsan leszűrhető a releváns meccshalmaz kategóriára, körre vagy státuszra.">
            <div className="form-grid form-grid--four filters-grid">
              <FormField label="Kategória" htmlFor="matches-category-filter">
                <select id="matches-category-filter" value={filters.categoryId} onChange={(e) => setFilters((state) => ({ ...state, categoryId: e.target.value }))}>
                  <option value="">Összes kategória</option>
                  {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </select>
              </FormField>
              <FormField label="Státusz" htmlFor="matches-status-filter">
                <select id="matches-status-filter" value={filters.status} onChange={(e) => setFilters((state) => ({ ...state, status: e.target.value }))}>
                  <option value="all">Összes</option>
                  <option value="pending">Várakozik</option>
                  <option value="running">Fut</option>
                  <option value="finished">Befejezett</option>
                </select>
              </FormField>
              <FormField label="Kör" htmlFor="matches-round-filter">
                <select id="matches-round-filter" value={filters.round} onChange={(e) => setFilters((state) => ({ ...state, round: e.target.value }))}>
                  <option value="all">Összes</option>
                  {roundOptions.map((round) => <option key={round} value={round}>{roundLabel(round)}</option>)}
                </select>
              </FormField>
              <FormField label="Keresés" htmlFor="matches-search-filter">
                <input id="matches-search-filter" value={filters.search} onChange={(e) => setFilters((state) => ({ ...state, search: e.target.value }))} placeholder="Játékos vagy játékvezető" />
              </FormField>
            </div>
          </SectionCard>

          <SectionCard title="Meccslista" subtitle={loading ? 'Betöltés...' : `${sortedMatches.length} meccs a szűrés szerint`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th><SortHeader label="Kör" sortKey="round" currentSort={sort} onToggle={toggleSort} /></th>
                  <th><SortHeader label="Játékosok" sortKey="players" currentSort={sort} onToggle={toggleSort} /></th>
                  <th><SortHeader label="Kategória" sortKey="category" currentSort={sort} onToggle={toggleSort} /></th>
                  <th><SortHeader label="Státusz" sortKey="status" currentSort={sort} onToggle={toggleSort} /></th>
                  <th><SortHeader label="Pálya" sortKey="court" currentSort={sort} onToggle={toggleSort} /></th>
                  <th><SortHeader label="Időpont" sortKey="time" currentSort={sort} onToggle={toggleSort} /></th>
                  <th><SortHeader label="Eredmény" sortKey="result" currentSort={sort} onToggle={toggleSort} /></th>
                  <th>Művelet</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatches.map((match) => {
                  const active = String(selectedMatchId) === String(match._id);
                  return (
                    <tr key={match._id} className={active ? 'data-table__row--active' : ''}>
                      <td>{roundLabel(match.round)}</td>
                      <td>
                        <button className="text-button" type="button" onClick={() => setSelectedMatchId(match._id)}>
                          {match.player1?.name ?? match.player1} – {match.player2?.name ?? match.player2}
                        </button>
                      </td>
                      <td>{categoryMap.get(String(match.categoryId?._id ?? match.categoryId)) ?? '—'}</td>
                      <td><StatusBadge tone={toneForStatus(match.status)}>{formatStatusLabel(match.status)}</StatusBadge></td>
                      <td>{match.courtNumber ?? '—'}</td>
                      <td>{formatDateTime(match.startAt)}</td>
                      <td>{match.winner ? `${match.winner?.name ?? match.winner} • ${outcomeLabel(match.resultType)} • ${setsToText(match.sets)}` : '—'}</td>
                      <td><button className="button button--ghost" type="button" onClick={() => setSelectedMatchId(match._id)}>Megnyitás</button></td>
                    </tr>
                  );
                })}
                {!loading && sortedMatches.length === 0 ? (
                  <tr><td colSpan="8" className="muted">Nincs a szűrésnek megfelelő meccs.</td></tr>
                ) : null}
              </tbody>
            </table>
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Meccs összesítő">
            <div className="key-value-list">
              <div className="key-value-list__row"><span className="key-value-list__label">Összes meccs</span><span className="key-value-list__value">{summary.total}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Várakozó</span><span className="key-value-list__value">{summary.pending}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Fut</span><span className="key-value-list__value">{summary.running}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Befejezett</span><span className="key-value-list__value">{summary.finished}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Kijelölt meccs" subtitle="Itt állítható a státusz, a játékvezető és az eredmény.">
            {!selectedMatch ? (
              <div className="muted">Válassz ki egy meccset a táblázatból.</div>
            ) : (
              <div className="stack-md">
                <div className="readonly-field">
                  <span className="readonly-field__label">Párosítás</span>
                  <strong>{selectedMatch.player1?.name ?? selectedMatch.player1} – {selectedMatch.player2?.name ?? selectedMatch.player2}</strong>
                  <span className="readonly-field__help">{roundLabel(selectedMatch.round)} • {categoryMap.get(String(selectedMatch.categoryId?._id ?? selectedMatch.categoryId)) ?? '—'}</span>
                </div>

                <div className="inline-actions">
                  <button className="button button--ghost" type="button" disabled={busy || selectedMatch.status === 'pending'} onClick={() => updateStatus('pending')}>Várakozó</button>
                  <button className="button button--secondary" type="button" disabled={busy || selectedMatch.status === 'running'} onClick={() => updateStatus('running')}>Fut</button>
                </div>

                <FormField label="Játékvezető" htmlFor="match-umpire-name" hintText="A játékvezető a verseny globális erőforrása, de meccsszinten itt rendelhető hozzá.">
                  <input list="umpire-options" id="match-umpire-name" value={umpireName} onChange={(e) => setUmpireName(e.target.value)} placeholder="Név megadása" />
                </FormField>
                <datalist id="umpire-options">
                  {umpireOptions.map((name) => <option key={name} value={name} />)}
                </datalist>
                <button className="button button--ghost button--block" type="button" disabled={busy} onClick={saveUmpire}>Játékvezető mentése</button>

                <form className="stack-md" onSubmit={saveResult}>
                  <div className="section-card__title-row"><h3>Normál eredmény</h3></div>
                  {resultRows.map((row, index) => (
                    <div key={`set-${index}`} className="score-row">
                      <span>{index + 1}. szett</span>
                      <input type="number" min="0" value={row.p1} onChange={(e) => setResultRows((state) => state.map((item, itemIndex) => itemIndex === index ? { ...item, p1: e.target.value } : item))} placeholder="P1" />
                      <input type="number" min="0" value={row.p2} onChange={(e) => setResultRows((state) => state.map((item, itemIndex) => itemIndex === index ? { ...item, p2: e.target.value } : item))} placeholder="P2" />
                    </div>
                  ))}
                  <button className="button button--primary button--block" type="submit" disabled={busy}>Eredmény mentése</button>
                </form>

                <div className="stack-md">
                  <div className="section-card__title-row"><h3>Speciális lezárás</h3></div>
                  <div className="inline-actions">
                    <button className="button button--ghost" type="button" disabled={busy} onClick={() => saveOutcome('wo', 'player1')}>W.O. játékos 1</button>
                    <button className="button button--ghost" type="button" disabled={busy} onClick={() => saveOutcome('wo', 'player2')}>W.O. játékos 2</button>
                  </div>
                  <div className="inline-actions">
                    <button className="button button--ghost" type="button" disabled={busy} onClick={() => saveOutcome('ff', 'player1')}>Feladás játékos 1</button>
                    <button className="button button--ghost" type="button" disabled={busy} onClick={() => saveOutcome('ff', 'player2')}>Feladás játékos 2</button>
                  </div>
                  <div className="inline-actions">
                    <button className="button button--ghost" type="button" disabled={busy} onClick={() => saveOutcome('ret', 'player1')}>Visszalépés játékos 1</button>
                    <button className="button button--ghost" type="button" disabled={busy} onClick={() => saveOutcome('ret', 'player2')}>Visszalépés játékos 2</button>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
