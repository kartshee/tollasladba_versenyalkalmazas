import { useEffect, useMemo, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const statusTone = { draft: 'neutral', running: 'success', finished: 'warning' };
const statusLabel = { draft: 'Tervezet', running: 'Aktív', finished: 'Lezárt' };

export function DashboardPage() {
  const auth = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.get('/api/tournaments', { token: auth.token });
        if (!active) return;
        setTournaments(data);
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [auth.token]);

  const grouped = useMemo(() => ({
    draft: tournaments.filter((item) => item.status === 'draft'),
    running: tournaments.filter((item) => item.status === 'running'),
    finished: tournaments.filter((item) => item.status === 'finished'),
  }), [tournaments]);

  return (
    <div className="stack-xl">
      <PageHeader
        eyebrow="Dashboard"
        title="Saját versenyek"
        description="A versenyek áttekintése, gyors navigáció és új verseny létrehozása egy helyen."
        action={<AppLink className="button button--primary" to="/tournaments/new">Új verseny</AppLink>}
      />

      <div className="stats-grid">
        <StatCard label="Összes verseny" value={tournaments.length} />
        <StatCard label="Tervezetek" value={grouped.draft.length} />
        <StatCard label="Aktív versenyek" value={grouped.running.length} />
        <StatCard label="Lezárt versenyek" value={grouped.finished.length} />
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}

      <SectionCard title="Versenyek" subtitle="A saját versenyeid időrendben, a legfrissebbek elöl.">
        {loading ? <div className="muted">Betöltés...</div> : null}
        {!loading && tournaments.length === 0 ? (
          <EmptyState
            title="Még nincs versenyed"
            description="Hozz létre egy új versenyt, majd állítsd be a globális paramétereket, kategóriákat és nevezéseket."
            action={<AppLink className="button button--primary" to="/tournaments/new">Első verseny létrehozása</AppLink>}
          />
        ) : null}

        {!loading && tournaments.length > 0 ? (
          <div className="card-grid">
            {tournaments.map((tournament) => (
              <AppLink key={tournament._id} to={`/tournaments/${tournament._id}`} className="tournament-card">
                <div className="tournament-card__top">
                  <h3>{tournament.name}</h3>
                  <StatusBadge tone={statusTone[tournament.status] ?? 'neutral'}>{statusLabel[tournament.status] ?? tournament.status}</StatusBadge>
                </div>
                <p>{tournament.location || 'Helyszín még nincs megadva.'}</p>
                <div className="tournament-card__meta">
                  <span>{tournament.date ? new Date(tournament.date).toLocaleDateString('hu-HU') : 'Dátum nincs megadva'}</span>
                  <span>{tournament.config?.courtsCount ?? 1} pálya</span>
                </div>
              </AppLink>
            ))}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
