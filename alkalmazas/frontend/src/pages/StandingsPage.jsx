import { useEffect, useMemo, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatMultiTiePolicy, formatStatusLabel, formatUnresolvedTiePolicy, toneForStatus } from '../services/formatters.jsx';

export function StandingsPage({ params }) {
  const { id, categoryId } = params;
  const auth = useAuth();
  const [category, setCategory] = useState(null);
  const [groups, setGroups] = useState([]);
  const [standingsByGroup, setStandingsByGroup] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [categoryData, groupsData] = await Promise.all([
          api.get(`/api/categories/${categoryId}`, { token: auth.token }),
          api.get(`/api/groups?tournamentId=${id}&categoryId=${categoryId}`, { token: auth.token }),
        ]);

        const standingsPairs = await Promise.all(groupsData.map(async (group) => ([group._id, await api.get(`/api/groups/${group._id}/standings`, { token: auth.token })])));

        if (!active) return;
        setCategory(categoryData);
        setGroups(groupsData);
        setStandingsByGroup(Object.fromEntries(standingsPairs));
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [auth.token, id, categoryId]);

  const summary = useMemo(() => {
    const allEntries = Object.values(standingsByGroup).flat();
    return {
      groups: groups.length,
      players: allEntries.length,
      unresolved: allEntries.filter((entry) => entry.tieResolved === false).length,
      sharedPlaces: allEntries.filter((entry) => entry.sharedPlace === true).length,
    };
  }, [groups.length, standingsByGroup]);

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}/categories/${categoryId}`}>Vissza a kategóriához</BackLink>
      <PageHeader
        eyebrow="Tabella"
        title="Csoportállás és holtverseny-feloldás"
        description="A tabella oldal csoportonként mutatja a helyezéseket, a holtverseny-feloldás eredményét, a közös helyezéseket és a továbbjutáshoz fontos mutatókat."
        action={category ? <StatusBadge tone={toneForStatus(category.status)}>{formatStatusLabel(category.status)}</StatusBadge> : null}
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          {loading ? <SectionCard title="Betöltés"><div className="muted">Tabella betöltése...</div></SectionCard> : null}

          {!loading && groups.length === 0 ? (
            <SectionCard title="Nincs csoport">
              <div className="stack-md">
                <p className="muted">
                  Ehhez a kategóriához még nem lett lezárva a sorsolás, ezért nem jött létre csoport és nem számolható tabella.
                  A sorsolás a <strong>Kategória műveletek</strong> oldalon indítható el a <strong>Sorsolás lezárása</strong> gombbal.
                </p>
                <AppLink className="button button--primary" to={`/tournaments/${id}/categories/${categoryId}`}>
                  Ugrás a kategória műveletekhez
                </AppLink>
              </div>
            </SectionCard>
          ) : null}

          {!loading && groups.length > 0 ? groups.map((group) => {
            const standings = standingsByGroup[group._id] ?? [];
            return (
              <SectionCard key={group._id} title={group.name} subtitle={`${standings.length} játékos a tabellában`} action={<AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${categoryId}/playoff`}>Rájátszás</AppLink>}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hely</th>
                      <th>Játékos</th>
                      <th>Győzelem</th>
                      <th>Lejátszott</th>
                      <th>Szettkülönbség</th>
                      <th>Pontkülönbség</th>
                      <th>Megjegyzés</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((entry) => (
                      <tr key={entry.player._id}>
                        <td>{entry.place}</td>
                        <td>{entry.player.name}</td>
                        <td>{entry.wins}</td>
                        <td>{entry.played}</td>
                        <td>{entry.setDiff}</td>
                        <td>{entry.pointDiff}</td>
                        <td>
                          {entry.sharedPlace ? <StatusBadge tone="warning">Közös helyezés</StatusBadge> : null}
                          {entry.tieResolved === false && !entry.sharedPlace ? <StatusBadge tone="neutral">Kézi döntés szükséges</StatusBadge> : null}
                        </td>
                      </tr>
                    ))}
                    {standings.length === 0 ? <tr><td colSpan="7" className="muted">Ebben a csoportban még nincs számolható tabella.</td></tr> : null}
                  </tbody>
                </table>
              </SectionCard>
            );
          }) : null}
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Tabella összesítő" subtitle={category?.name ?? 'Kategória'}>
            <div className="key-value-list">
              <div className="key-value-list__row"><span className="key-value-list__label">Csoportok</span><span className="key-value-list__value">{summary.groups}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Játékosok</span><span className="key-value-list__value">{summary.players}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Feloldatlan holtverseny</span><span className="key-value-list__value">{summary.unresolved}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Közös helyezés</span><span className="key-value-list__value">{summary.sharedPlaces}</span></div>
            </div>
          </SectionCard>

          {category ? (
            <SectionCard title="Szabályértelmezés">
              <ul className="bullet-list">
                <li><strong>Többfős holtverseny:</strong> {formatMultiTiePolicy(category.multiTiePolicy)}</li>
                <li><strong>Feloldhatatlan holtverseny:</strong> {formatUnresolvedTiePolicy(category.unresolvedTiePolicy)}</li>
              </ul>
            </SectionCard>
          ) : null}

          <SectionCard title="Kapcsolódó műveletek">
            <div className="stack-md">
              <AppLink className="button button--ghost button--block" to={`/tournaments/${id}/categories/${categoryId}`}>Kategória műveletek</AppLink>
              <AppLink className="button button--ghost button--block" to={`/tournaments/${id}/categories/${categoryId}/playoff`}>Rájátszás megnyitása</AppLink>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
