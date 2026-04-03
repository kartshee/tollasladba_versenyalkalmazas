import { useEffect, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function MatchesPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/matches?tournamentId=${id}`, { token: auth.token }).then(setMatches).catch((err) => setError(err.message));
  }, [auth.token, id]);

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader eyebrow="Meccsek" title="Meccslista" description="Ezen az oldalon látható a teljes meccsállomány, ideértve a pályát, időpontot, státuszt és a játékvezetőt is." />
      {error ? <div className="alert alert--error">{error}</div> : null}
      <SectionCard title="Meccsek">
        <table className="data-table">
          <thead>
            <tr>
              <th>Round</th>
              <th>Játékos 1</th>
              <th>Játékos 2</th>
              <th>Státusz</th>
              <th>Pálya</th>
              <th>Játékvezető</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match._id}>
                <td>{match.round}</td>
                <td>{match.player1?.name || match.player1}</td>
                <td>{match.player2?.name || match.player2}</td>
                <td>{match.status}</td>
                <td>{match.courtNumber ?? '-'}</td>
                <td>{match.umpireName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
