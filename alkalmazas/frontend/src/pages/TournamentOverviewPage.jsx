import { useEffect, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function TournamentOverviewPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [tournamentData, categoriesData, entriesData] = await Promise.all([
          api.get(`/api/tournaments/${id}`, { token: auth.token }),
          api.get(`/api/categories?tournamentId=${id}`, { token: auth.token }),
          api.get(`/api/entries?tournamentId=${id}`, { token: auth.token }),
        ]);
        if (!active) return;
        setTournament(tournamentData);
        setCategories(categoriesData);
        setEntries(entriesData);
      } catch (err) {
        if (!active) return;
        setError(err.message);
      }
    }
    load();
    return () => { active = false; };
  }, [auth.token, id]);

  async function changeStatus(nextAction) {
    try {
      const updated = await api.post(`/api/tournaments/${id}/${nextAction}`, {}, { token: auth.token });
      setTournament(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!tournament) {
    return <div className="muted">{error || 'Betöltés...'}</div>;
  }

  const referees = tournament.referees?.map((r) => r.name).filter(Boolean) ?? [];

  return (
    <div className="stack-xl">
      <BackLink to="/">Vissza a dashboardra</BackLink>
      <PageHeader
        eyebrow="Verseny áttekintése"
        title={tournament.name}
        description={tournament.location || 'A verseny központi adminisztrációs oldala, innen érhető el minden fő művelet.'}
        action={
          <StatusBadge tone={tournament.status === 'running' ? 'success' : tournament.status === 'finished' ? 'warning' : 'neutral'}>
            {tournament.status}
          </StatusBadge>
        }
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Kategóriák" value={categories.length} />
        <StatCard label="Nevezések" value={entries.length} />
        <StatCard label="Pályák" value={tournament.config?.courtsCount ?? 1} />
        <StatCard label="Játékvezetők" value={referees.length} />
      </div>

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Verseny műveletek" subtitle="A fő adminisztratív belépési pontok ehhez a versenyhez.">
            <div className="quick-links">
              <AppLink className="quick-link" to={`/tournaments/${id}/categories`}>
                <strong>Kategóriák</strong>
                <span>Kategóriák listája, létrehozása és szerkesztése.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/entries`}>
                <strong>Nevezések</strong>
                <span>Játékosok, nevezések és nevezési díj státuszok kezelése.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/checkin`}>
                <strong>Check-in</strong>
                <span>Jelenlétkezelés versenynapi használatra.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/matches`}>
                <strong>Meccsek</strong>
                <span>Meccslista, eredményrögzítés és játékvezető hozzárendelés.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/schedule`}>
                <strong>Ütemezés</strong>
                <span>Globális ütemező és pályanézet.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/board`}>
                <strong>Board</strong>
                <span>Futó és következő meccsek kijelzős nézete.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/payments`}>
                <strong>Befizetések</strong>
                <span>Fizetési csoportok és nevezési díj adminisztrációja.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/admin`}>
                <strong>Export / Napló</strong>
                <span>CSV letöltések és műveleti napló megtekintése.</span>
              </AppLink>
            </div>
          </SectionCard>

          <SectionCard title="Kategóriák áttekintése" subtitle="Gyors rálátás a versenyben szereplő kategóriákra.">
            {categories.length === 0 ? (
              <div className="muted">Ehhez a versenyhez még nincs kategória létrehozva.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kategória</th>
                    <th>Formátum</th>
                    <th>Állapot</th>
                    <th>Művelet</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category._id}>
                      <td>{category.name}</td>
                      <td>{category.format}</td>
                      <td><StatusBadge>{category.status}</StatusBadge></td>
                      <td>
                        <AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${category._id}`}>
                          Megnyitás
                        </AppLink>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Verseny összesítő">
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Helyszín</span>
                <span className="key-value-list__value">{tournament.location || '—'}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Dátum</span>
                <span className="key-value-list__value">{tournament.date ? new Date(tournament.date).toLocaleDateString('hu-HU') : '—'}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Állapot</span>
                <span className="key-value-list__value">{tournament.status}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Pályák</span>
                <span className="key-value-list__value">{tournament.config?.courtsCount ?? 1}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Gyors állapotváltás" subtitle="A fő versenyállapot kezelése.">
            <div className="stack-md">
              <button className="button button--primary button--block" type="button" disabled={tournament.status !== 'draft'} onClick={() => changeStatus('start')}>
                Verseny indítása
              </button>
              <button className="button button--secondary button--block" type="button" disabled={tournament.status !== 'running'} onClick={() => changeStatus('finish')}>
                Verseny lezárása
              </button>
            </div>
          </SectionCard>

          <SectionCard title="Játékvezetők" subtitle="Globális versenyerőforrások.">
            {referees.length === 0 ? (
              <div className="muted">Ehhez a versenyhez még nincs játékvezető megadva.</div>
            ) : (
              <ul className="bullet-list">
                {referees.map((name) => <li key={name}>{name}</li>)}
              </ul>
            )}
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
