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

  return (
    <div className="stack-xl">
      <BackLink to="/">Vissza a dashboardra</BackLink>
      <PageHeader
        eyebrow="Verseny áttekintése"
        title={tournament.name}
        description={tournament.location || 'A verseny globális adminisztrációs oldala.'}
        action={<StatusBadge tone={tournament.status === 'running' ? 'success' : tournament.status === 'finished' ? 'warning' : 'neutral'}>{tournament.status}</StatusBadge>}
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Kategóriák" value={categories.length} />
        <StatCard label="Nevezések" value={entries.length} />
        <StatCard label="Pályák" value={tournament.config?.courtsCount ?? 1} />
        <StatCard label="Játékvezetők" value={tournament.referees?.length ?? 0} />
      </div>

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
            <span>Globális scheduler és pályanézet.</span>
          </AppLink>
          <AppLink className="quick-link" to={`/tournaments/${id}/board`}>
            <strong>Board</strong>
            <span>Futó és következő meccsek kijelzős nézete.</span>
          </AppLink>
        </div>
      </SectionCard>

      <SectionCard title="Gyors állapotváltás" subtitle="Draft → running → finished állapotkezelés a backend támogatása alapján.">
        <div className="actions-row">
          <button className="button button--primary" type="button" disabled={tournament.status !== 'draft'} onClick={() => changeStatus('start')}>Verseny indítása</button>
          <button className="button button--secondary" type="button" disabled={tournament.status !== 'running'} onClick={() => changeStatus('finish')}>Verseny lezárása</button>
        </div>
      </SectionCard>
    </div>
  );
}
