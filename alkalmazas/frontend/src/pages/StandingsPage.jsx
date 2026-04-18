import { useEffect, useMemo, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatStatusLabel, toneForStatus } from '../services/formatters.jsx';

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

        const standingsPairs = await Promise.all(
          groupsData.map(async (group) => [
            group._id,
            await api.get(`/api/groups/${group._id}/standings`, { token: auth.token }),
          ]),
        );

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
        eyebrow="Standings"
        title="Csoportállás és tie-break"
        description="A standings oldal csoportonként mutatja a helyezéseket, a tie-break eredményét, a shared place állapotot és a továbbjutási logikához fontos mutatókat."
        action={category ? <StatusBadge tone={toneForStatus(category.status)}>{formatStatusLabel(category.status)}</StatusBadge> : null}
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          {loading ? <SectionCard title="Betöltés"><div className="muted">Standings betöltése...</div></SectionCard> : null}

          {!loading && groups.length === 0 ? (
            <SectionCard title="Nincs csoport">
              <div className="muted">Ehhez a kategóriához még nincs létrehozott csoport, ezért standings sem számolható.</div>
            </SectionCard>
          ) : null}

          {!loading && groups.map((group) => {
            const standings = standingsByGroup[group._id] ?? [];
            return (
              <SectionCard key={group._id} title={group.name} subtitle={`${standings.length} játékos a tabellában`} action={<AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${categoryId}/playoff`}>Playoff</AppLink>}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Hely</th>
                      <th>Játékos</th>
                      <th>Győzelem</th>
                      <th>Lejátszott</th>
                      <th>Win rate</th>
                      <th>Szett diff</th>
                      <th>Pont diff</th>
                      <th>Tie-break</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((entry) => (
                      <tr key={entry.player?._id ?? `${group._id}-${entry.player?.name}`}>
                        <td>{entry.place ?? '—'}</td>
                        <td>
                          <div className="stack-xs">
                            <strong>{entry.player?.name ?? 'Ismeretlen játékos'}</strong>
                            {entry.sharedPlace ? <span className="table-note">Közös helyezés</span> : null}
                          </div>
                        </td>
                        <td>{entry.wins}</td>
                        <td>{entry.played}</td>
                        <td>{entry.played > 0 ? (entry.wins / entry.played).toFixed(3) : '0.000'}</td>
                        <td>{entry.setDiff}</td>
                        <td>{entry.pointDiff}</td>
                        <td>
                          {entry.tieResolved === false ? (
                            <StatusBadge tone="warning">nincs feloldva</StatusBadge>
                          ) : entry.sharedPlace ? (
                            <StatusBadge tone="neutral">shared place</StatusBadge>
                          ) : (
                            <StatusBadge tone="success">rendben</StatusBadge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </SectionCard>
            );
          })}
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Standings összesítő" subtitle={category?.name ?? 'Kategória'}>
            <div className="key-value-list">
              <div className="key-value-list__row"><span className="key-value-list__label">Csoportok</span><span className="key-value-list__value">{summary.groups}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Értékelt játékosok</span><span className="key-value-list__value">{summary.players}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Unresolved tie</span><span className="key-value-list__value">{summary.unresolved}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Shared place</span><span className="key-value-list__value">{summary.sharedPlaces}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Tie-break policy" subtitle="A kategória konfigurációja alapján.">
            {category ? (
              <ul className="bullet-list">
                <li><strong>Többfős holtverseny:</strong> {category.multiTiePolicy === 'direct_only' ? 'csak mini-tabella' : 'mini-tabella, majd overall'}</li>
                <li><strong>Feloldhatatlan tie:</strong> {category.unresolvedTiePolicy === 'shared_place' ? 'közös helyezés' : 'kézi döntés szükséges'}</li>
              </ul>
            ) : <div className="muted">Betöltés...</div>}
          </SectionCard>

          <SectionCard title="Következő lépés" subtitle="A standings után a playoff generálás vagy a következő fordulóba jutók meghatározása jön.">
            <div className="stack-md">
              <AppLink className="button button--primary button--block" to={`/tournaments/${id}/categories/${categoryId}/playoff`}>
                Playoff megnyitása
              </AppLink>
              <AppLink className="button button--ghost button--block" to={`/tournaments/${id}/matches`}>
                Meccsek oldal
              </AppLink>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
