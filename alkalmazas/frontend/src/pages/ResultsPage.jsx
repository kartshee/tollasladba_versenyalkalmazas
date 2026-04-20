import { useEffect, useMemo, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatCategoryFormat, formatStatusLabel, roundLabel, setsToText, toneForStatus } from '../services/formatters.jsx';

function getLoser(match) {
  if (!match?.winner) return null;
  const winnerId = String(match.winner?._id ?? match.winner);
  const p1Id = String(match.player1?._id ?? match.player1 ?? '');
  return winnerId === p1Id ? match.player2 : match.player1;
}

function resultCard(label, player) {
  if (!player) return null;
  return (
    <div className="summary-item summary-item--interactive" key={label}>
      <div className="summary-item__head">
        <strong>{label}</strong>
        <span>{player.name ?? '—'}</span>
      </div>
    </div>
  );
}

export function ResultsPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [matches, setMatches] = useState([]);
  const [standingsByGroup, setStandingsByGroup] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [tournamentData, categoriesData, groupsData, matchesData] = await Promise.all([
          api.get(`/api/tournaments/${id}`, { token: auth.token }),
          api.get(`/api/categories?tournamentId=${id}`, { token: auth.token }),
          api.get(`/api/groups?tournamentId=${id}`, { token: auth.token }),
          api.get(`/api/matches?tournamentId=${id}`, { token: auth.token }),
        ]);

        const standingsPairs = await Promise.all(groupsData.map(async (group) => ([group._id, await api.get(`/api/groups/${group._id}/standings`, { token: auth.token })])));

        if (!active) return;
        setTournament(tournamentData);
        setCategories(categoriesData);
        setGroups(groupsData);
        setMatches(matchesData);
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
  }, [auth.token, id]);

  const groupsByCategory = useMemo(() => groups.reduce((acc, group) => {
    const key = String(group.categoryId?._id ?? group.categoryId);
    acc[key] = acc[key] ?? [];
    acc[key].push(group);
    return acc;
  }, {}), [groups]);

  const matchesByCategory = useMemo(() => matches.reduce((acc, match) => {
    const key = String(match.categoryId?._id ?? match.categoryId);
    acc[key] = acc[key] ?? [];
    acc[key].push(match);
    return acc;
  }, {}), [matches]);

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Eredmények"
        title="Végeredmény és eredményhirdetés"
        description="Ez az oldal a lezárult vagy lezáráshoz közeli versenyek összesített eredményképét mutatja. Rájátszásos kategóriában dobogót, tisztán csoportkörös kategóriában tabellát jelenít meg."
        action={tournament ? <StatusBadge tone={toneForStatus(tournament.status)}>{formatStatusLabel(tournament.status)}</StatusBadge> : null}
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          {loading ? <SectionCard title="Betöltés"><div className="muted">Eredmények betöltése...</div></SectionCard> : null}

          {!loading && categories.length === 0 ? (
            <SectionCard title="Még nincs eredményezhető kategória">
              <div className="muted">Ehhez a versenyhez még nincs kategória létrehozva.</div>
            </SectionCard>
          ) : null}

          {!loading && categories.map((category) => {
            const categoryGroups = groupsByCategory[String(category._id)] ?? [];
            const categoryMatches = matchesByCategory[String(category._id)] ?? [];
            const playoffMatches = categoryMatches.filter((match) => String(match.round ?? '').startsWith('playoff_'));
            const finalMatch = playoffMatches.find((match) => match.round === 'playoff_final' && match.winner);
            const bronzeMatch = playoffMatches.find((match) => match.round === 'playoff_bronze' && match.winner);
            const singleGroup = categoryGroups.length === 1 ? categoryGroups[0] : null;
            const singleGroupStandings = singleGroup ? standingsByGroup[singleGroup._id] ?? [] : [];
            const hasPodium = Boolean(finalMatch);

            return (
              <SectionCard key={category._id} title={category.name} subtitle={formatCategoryFormat(category.format)}>
                {hasPodium ? (
                  <div className="stack-md">
                    <div className="stats-grid">
                      {resultCard('1. hely', finalMatch.winner)}
                      {resultCard('2. hely', getLoser(finalMatch))}
                      {resultCard('3. hely', bronzeMatch?.winner ?? null)}
                    </div>
                    <div className="key-value-list">
                      <div className="key-value-list__row"><span className="key-value-list__label">Döntő</span><span className="key-value-list__value">{(finalMatch.player1?.name ?? '—')} – {(finalMatch.player2?.name ?? '—')} ({setsToText(finalMatch.sets)})</span></div>
                      {bronzeMatch ? <div className="key-value-list__row"><span className="key-value-list__label">Bronzmeccs</span><span className="key-value-list__value">{(bronzeMatch.player1?.name ?? '—')} – {(bronzeMatch.player2?.name ?? '—')} ({setsToText(bronzeMatch.sets)})</span></div> : null}
                    </div>
                  </div>
                ) : null}

                {!hasPodium && category.format === 'group' && categoryGroups.length === 1 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hely</th>
                        <th>Játékos</th>
                        <th>Győzelem</th>
                        <th>Lejátszott</th>
                        <th>Szettkülönbség</th>
                        <th>Pontkülönbség</th>
                      </tr>
                    </thead>
                    <tbody>
                      {singleGroupStandings.map((entry) => (
                        <tr key={entry.player._id}>
                          <td>{entry.place}</td>
                          <td>{entry.player.name}</td>
                          <td>{entry.wins}</td>
                          <td>{entry.played}</td>
                          <td>{entry.setDiff}</td>
                          <td>{entry.pointDiff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}

                {!hasPodium && category.format === 'group' && categoryGroups.length > 1 ? (
                  <div className="stack-lg">
                    <p className="muted">Többcsoportos, rájátszás nélküli kategóriánál a rendszer nem állít fel automatikus, teljes közös dobogót. Ilyenkor csoportonkénti végeredmény jelenik meg.</p>
                    {categoryGroups.map((group) => {
                      const standings = standingsByGroup[group._id] ?? [];
                      return (
                        <div key={group._id} className="stack-md">
                          <h3>{group.name}</h3>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Hely</th>
                                <th>Játékos</th>
                                <th>Győzelem</th>
                                <th>Lejátszott</th>
                              </tr>
                            </thead>
                            <tbody>
                              {standings.map((entry) => (
                                <tr key={entry.player._id}>
                                  <td>{entry.place}</td>
                                  <td>{entry.player.name}</td>
                                  <td>{entry.wins}</td>
                                  <td>{entry.played}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {!hasPodium && category.format !== 'group' ? (
                  <div className="stack-md">
                    <p className="muted">Ehhez a kategóriához még nincs lezárt döntő, ezért a dobogó még nem állapítható meg automatikusan.</p>
                    <div className="key-value-list">
                      <div className="key-value-list__row"><span className="key-value-list__label">Rájátszás meccsek</span><span className="key-value-list__value">{playoffMatches.length}</span></div>
                      <div className="key-value-list__row"><span className="key-value-list__label">Utolsó lezárt kör</span><span className="key-value-list__value">{playoffMatches.filter((match) => match.winner).slice(-1)[0] ? roundLabel(playoffMatches.filter((match) => match.winner).slice(-1)[0].round) : 'még nincs'}</span></div>
                    </div>
                  </div>
                ) : null}
              </SectionCard>
            );
          })}
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Mikor használható jól ez az oldal?">
            <ul className="bullet-list">
              <li>Lezárt vagy lezáráshoz közeli versenyek összesítésére.</li>
              <li>Eredményhirdetés előtti gyors ellenőrzésre.</li>
              <li>Kategóriánkénti végső helyezések áttekintésére.</li>
            </ul>
          </SectionCard>

          <SectionCard title="Kapcsolódó oldalak">
            <div className="stack-md">
              <AppLink className="button button--ghost button--block" to={`/tournaments/${id}/matches`}>Meccsek</AppLink>
              <AppLink className="button button--ghost button--block" to={`/tournaments/${id}/board`}>Kijelző</AppLink>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
