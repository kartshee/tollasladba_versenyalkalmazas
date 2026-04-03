import { useEffect, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function BoardPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [board, setBoard] = useState({ runningMatches: [], upcomingMatches: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/public/tournaments/${id}/board`, { token: auth.token }).then(setBoard).catch((err) => setError(err.message));
  }, [auth.token, id]);

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader eyebrow="Board" title="Kijelzős nézet előnézete" description="A futó és a következőként betervezett meccsek gyors áttekintése." />
      {error ? <div className="alert alert--error">{error}</div> : null}
      <div className="two-column-grid">
        <SectionCard title="Most játszik">
          {board.runningMatches?.length ? board.runningMatches.map((match) => <div className="board-item" key={match._id}>{match.player1?.name || match.player1} – {match.player2?.name || match.player2}</div>) : <div className="muted">Nincs futó meccs.</div>}
        </SectionCard>
        <SectionCard title="Következik">
          {board.upcomingMatches?.length ? board.upcomingMatches.map((match) => <div className="board-item" key={match._id}>{match.player1?.name || match.player1} – {match.player2?.name || match.player2}</div>) : <div className="muted">Nincs betervezett következő meccs.</div>}
        </SectionCard>
      </div>
    </div>
  );
}
