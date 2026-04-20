import { useEffect, useRef, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { api } from '../services/api.js';
import { formatDateTime } from '../services/formatters.jsx';

function formatTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
}

function MatchCard({ match, variant = 'running' }) {
  const p1 = match.player1?.name ?? '—';
  const p2 = match.player2?.name ?? '—';
  const category = match.categoryId?.name ?? '—';
  const court = match.courtNumber ? `${match.courtNumber}. pálya` : '—';
  const time = variant === 'upcoming' ? formatTime(match.startAt) : null;

  return (
    <div className={`board-card board-card--${variant}`}>
      <div className="board-card__court">{court}</div>
      <div className="board-card__players">
        <span className="board-card__player">{p1}</span>
        <span className="board-card__vs">–</span>
        <span className="board-card__player">{p2}</span>
      </div>
      <div className="board-card__meta">
        <span className="board-card__category">{category}</span>
        {time ? <span className="board-card__time">{time}</span> : null}
        {variant === 'running'
          ? <StatusBadge tone="success">Folyamatban</StatusBadge>
          : <StatusBadge tone="neutral">Következik</StatusBadge>}
      </div>
    </div>
  );
}

export function BoardPage({ params }) {
  const { id } = params;
  const [board, setBoard] = useState({ runningMatches: [], upcomingMatches: [], tournament: null });
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  async function loadBoard() {
    try {
      const data = await api.get(`/public/tournaments/${id}/board`);
      setBoard(data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadBoard();
    intervalRef.current = setInterval(loadBoard, 30_000);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  const running = board.runningMatches ?? [];
  const upcoming = board.upcomingMatches ?? [];

  // Group upcoming by court for easier reading
  const upcomingByCourt = upcoming.reduce((acc, match) => {
    const key = match.courtNumber ? `${match.courtNumber}. pálya` : 'Pálya nélkül';
    acc[key] = acc[key] ?? [];
    acc[key].push(match);
    return acc;
  }, {});

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Kijelző"
        title="Kijelzős nézet"
        description="A futó és a következőként betervezett meccsek gyors áttekintése. Az oldal 30 másodpercenként automatikusan frissül."
        action={
          <div className="topbar-meta-group">
            {lastUpdated ? (
              <span className="muted" style={{ fontSize: '0.8rem' }}>
                Frissítve: {lastUpdated.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            ) : null}
            <button className="button button--ghost" type="button" onClick={loadBoard}>
              Frissítés
            </button>
          </div>
        }
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <SectionCard
        title={`Most játszik${running.length > 0 ? ` (${running.length})` : ''}`}
        subtitle="Jelenleg futó meccsek pályánként."
      >
        {running.length === 0 ? (
          <div className="empty-state">
            <p className="muted">Nincs jelenleg futó meccs.</p>
          </div>
        ) : (
          <div className="board-grid">
            {running.map((match) => (
              <MatchCard key={match._id} match={match} variant="running" />
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={`Következik${upcoming.length > 0 ? ` (${upcoming.length})` : ''}`}
        subtitle="Legközelebb sorra kerülő, betervezett meccsek."
      >
        {upcoming.length === 0 ? (
          <div className="empty-state">
            <p className="muted">Nincs betervezett következő meccs.</p>
          </div>
        ) : (
          Object.keys(upcomingByCourt).length > 1 ? (
            <div className="court-grid">
              {Object.entries(upcomingByCourt).map(([courtLabel, courtMatches]) => (
                <div key={courtLabel} className="court-column">
                  <h3>{courtLabel}</h3>
                  <div className="stack-md">
                    {courtMatches.map((match) => (
                      <MatchCard key={match._id} match={match} variant="upcoming" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="board-grid">
              {upcoming.map((match) => (
                <MatchCard key={match._id} match={match} variant="upcoming" />
              ))}
            </div>
          )
        )}
      </SectionCard>

      <SectionCard title="Összesítő" subtitle="A verseny aktuális állapota.">
        <div className="key-value-list">
          <div className="key-value-list__row">
            <span className="key-value-list__label">Verseny neve</span>
            <span className="key-value-list__value">{board.tournament?.name ?? '—'}</span>
          </div>
          <div className="key-value-list__row">
            <span className="key-value-list__label">Futó meccsek</span>
            <span className="key-value-list__value">{running.length}</span>
          </div>
          <div className="key-value-list__row">
            <span className="key-value-list__label">Következő meccsek</span>
            <span className="key-value-list__value">{upcoming.length}</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
