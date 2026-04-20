import { useEffect, useMemo, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatStatusLabel, toneForStatus, normalizeSearch } from '../services/formatters.jsx';

export function CheckinPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filters, setFilters] = useState({ categoryId: '', attendance: 'all', search: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyCategoryId, setBusyCategoryId] = useState('');

  async function loadAll() {
    const [tournamentData, playersData, categoriesData, groupsData] = await Promise.all([
      api.get(`/api/tournaments/${id}`, { token: auth.token }),
      api.get(`/api/players?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/categories?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/groups?tournamentId=${id}`, { token: auth.token }),
    ]);
    setTournament(tournamentData);
    setPlayers(playersData);
    setCategories(categoriesData);
    setGroups(groupsData);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll()
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [auth.token, id]);

  const categoryMap = useMemo(() => new Map(categories.map((category) => [String(category._id), category])), [categories]);
  const groupCountByCategory = useMemo(() => groups.reduce((acc, group) => {
    const key = String(group.categoryId?._id ?? group.categoryId ?? '');
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {}), [groups]);

  const filteredPlayers = useMemo(() => {
    const search = normalizeSearch(filters.search);
    return players.filter((player) => {
      if (filters.categoryId && String(player.categoryId) !== filters.categoryId) return false;
      if (filters.attendance === 'checkedin' && !player.checkedInAt) return false;
      if (filters.attendance === 'missing' && player.checkedInAt) return false;
      if (!search) return true;
      const categoryName = categoryMap.get(String(player.categoryId))?.name ?? '';
      const haystack = [player.name, player.club, categoryName, player.note].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }, [players, filters, categoryMap]);

  const summary = useMemo(() => ({
    total: players.length,
    checkedIn: players.filter((player) => Boolean(player.checkedInAt)).length,
    missing: players.filter((player) => !player.checkedInAt).length,
  }), [players]);

  async function toggleCheckin(player, checkedIn) {
    try {
      await api.patch(`/api/players/${player._id}/checkin`, { checkedIn }, { token: auth.token });
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function bulkSetVisible(checkedIn) {
    try {
      for (const player of filteredPlayers) {
        // eslint-disable-next-line no-await-in-loop
        await api.patch(`/api/players/${player._id}/checkin`, { checkedIn }, { token: auth.token });
      }
      await loadAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function categoryAction(categoryId, action, body = {}) {
    setBusyCategoryId(categoryId);
    setError('');
    try {
      await api.post(`/api/categories/${categoryId}/${action}`, body, { token: auth.token });
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyCategoryId('');
    }
  }

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Jelenlét"
        title="Jelenlét és sorsolás-előkészítés"
        description="A verseny napján ez az egyik fő operatív oldal: itt dől el, hogy kik a tényleges indulók, és innen indítható a sorsolás lezárása is."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Szűrés és gyors műveletek" subtitle="A jelenléti oldalon fontos, hogy tömegesen és gyorsan kezelhető legyen a részvétel.">
            <div className="form-grid form-grid--three">
              <FormField label="Kategória" htmlFor="checkin-category-filter">
                <select id="checkin-category-filter" value={filters.categoryId} onChange={(e) => setFilters((state) => ({ ...state, categoryId: e.target.value }))}>
                  <option value="">Összes kategória</option>
                  {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </select>
              </FormField>
              <FormField label="Állapot" htmlFor="checkin-attendance-filter">
                <select id="checkin-attendance-filter" value={filters.attendance} onChange={(e) => setFilters((state) => ({ ...state, attendance: e.target.value }))}>
                  <option value="all">Összes</option>
                  <option value="checkedin">Csak jelenléttel jelöltek</option>
                  <option value="missing">Csak hiányzók</option>
                </select>
              </FormField>
              <FormField label="Keresés" htmlFor="checkin-search-filter">
                <input id="checkin-search-filter" value={filters.search} onChange={(e) => setFilters((state) => ({ ...state, search: e.target.value }))} placeholder="Név, klub vagy megjegyzés" />
              </FormField>
            </div>
            <div className="actions-row">
              <button className="button button--secondary" type="button" onClick={() => bulkSetVisible(true)} disabled={filteredPlayers.length === 0}>Láthatók jelenlétre jelölése</button>
              <button className="button button--ghost" type="button" onClick={() => bulkSetVisible(false)} disabled={filteredPlayers.length === 0}>Láthatók jelenlétének visszavonása</button>
            </div>
          </SectionCard>

          <SectionCard title="Játékoslista" subtitle={loading ? 'Betöltés...' : `${filteredPlayers.length} játékos a szűrés szerint`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Játékos</th>
                  <th>Kategória</th>
                  <th>Klub</th>
                  <th>Állapot</th>
                  <th>Megjegyzés</th>
                  <th>Művelet</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => {
                  const category = categoryMap.get(String(player.categoryId));
                  return (
                    <tr key={player._id}>
                      <td>{player.name}</td>
                      <td>{category?.name ?? '—'}</td>
                      <td>{player.club || '—'}</td>
                      <td>
                        <StatusBadge tone={player.checkedInAt ? 'success' : 'warning'}>
                          {player.checkedInAt ? 'jelen van' : 'nincs jelenléttel jelölve'}
                        </StatusBadge>
                      </td>
                      <td>{player.note || '—'}</td>
                      <td>
                        <button className="button button--ghost" type="button" onClick={() => toggleCheckin(player, !player.checkedInAt)}>
                          {player.checkedInAt ? 'Jelenlét visszavonása' : 'Jelenlét jelölése'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredPlayers.length === 0 ? (
                  <tr><td colSpan="6" className="muted">Nincs a szűrésnek megfelelő játékos.</td></tr>
                ) : null}
              </tbody>
            </table>
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Jelenléti összesítő" subtitle={tournament?.name ?? 'Verseny összesítés'}>
            <div className="key-value-list">
              <div className="key-value-list__row"><span className="key-value-list__label">Összes játékos</span><span className="key-value-list__value">{summary.total}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Jelenléttel jelölve</span><span className="key-value-list__value">{summary.checkedIn}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Hiányzók</span><span className="key-value-list__value">{summary.missing}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Kategória műveletek" subtitle="A sorsolás lezárása és a türelmi idő zárása kategóriánként történik.">
            <div className="stack-md">
              {categories.map((category) => (
                <div key={category._id} className="summary-item summary-item--interactive">
                  <div className="summary-item__head">
                    <strong>{category.name}</strong>
                    <StatusBadge tone={toneForStatus(category.status)}>{formatStatusLabel(category.status)}</StatusBadge>
                  </div>
                  <div className="summary-item__meta">
                    <span>{groupCountByCategory[String(category._id)] ?? 0} csoport</span>
                    <AppLink className="text-link" to={`/tournaments/${id}/categories/${category._id}`}>Megnyitás</AppLink>
                  </div>
                  <div className="inline-actions">
                    <button className="button button--ghost" type="button" disabled={busyCategoryId === category._id || ['draw_locked', 'in_progress', 'completed'].includes(category.status)} onClick={() => categoryAction(category._id, 'finalize-draw')}>
                      Sorsolás lezárása
                    </button>
                    <button className="button button--ghost" type="button" disabled={busyCategoryId === category._id || !['draw_locked', 'in_progress'].includes(category.status)} onClick={() => categoryAction(category._id, 'close-grace', { force: true })}>
                      Türelmi idő lezárása
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
