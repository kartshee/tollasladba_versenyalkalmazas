import { useEffect, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function CheckinPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState('');

  async function loadPlayers() {
    const data = await api.get(`/api/players?tournamentId=${id}`, { token: auth.token });
    setPlayers(data);
  }

  useEffect(() => {
    loadPlayers().catch((err) => setError(err.message));
  }, [auth.token, id]);

  async function toggle(player) {
    try {
      await api.patch(`/api/players/${player._id}/checkin`, { checkedIn: !player.checkedInAt }, { token: auth.token });
      await loadPlayers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader eyebrow="Check-in" title="Jelenlétkezelés" description="Versenynapi operatív oldal a ténylegesen megjelent játékosok kezelésére." />
      {error ? <div className="alert alert--error">{error}</div> : null}
      <SectionCard title="Játékosok">
        <table className="data-table">
          <thead>
            <tr>
              <th>Név</th>
              <th>Kategória</th>
              <th>Állapot</th>
              <th>Művelet</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player._id}>
                <td>{player.name}</td>
                <td>{player.categoryId || '-'}</td>
                <td><StatusBadge tone={player.checkedInAt ? 'success' : 'warning'}>{player.checkedInAt ? 'jelen van' : 'nincs check-in'}</StatusBadge></td>
                <td><button className="button button--ghost" type="button" onClick={() => toggle(player)}>{player.checkedInAt ? 'Check-out' : 'Check-in'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
