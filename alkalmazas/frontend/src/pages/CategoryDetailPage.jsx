import { useEffect, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function CategoryDetailPage({ params }) {
  const { id, categoryId } = params;
  const auth = useAuth();
  const [category, setCategory] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.get(`/api/categories/${categoryId}`, { token: auth.token });
        if (active) setCategory(data);
      } catch (err) {
        if (active) setError(err.message);
      }
    }
    load();
    return () => { active = false; };
  }, [auth.token, categoryId]);

  async function finalizeDraw() {
    setBusy(true);
    setError('');
    try {
      const updated = await api.post(`/api/categories/${categoryId}/finalize-draw`, {}, { token: auth.token });
      await api.get(`/api/categories/${categoryId}`, { token: auth.token }).then(setCategory);
      window.alert(`Draw lezárva. Generált meccsek: ${updated.generatedMatches}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!category) return <div className="muted">{error || 'Betöltés...'}</div>;

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}/categories`}>Vissza a kategóriákhoz</BackLink>
      <PageHeader
        eyebrow="Kategória műveletek"
        title={category.name}
        description="Innen érhetők el a draw, standings, playoff és egyéb kategória-szintű műveletek."
        action={<AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${categoryId}/edit`}>Szerkesztés</AppLink>}
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Formátum" value={category.format} />
        <StatCard label="Állapot" value={category.status} />
        <StatCard label="Továbbjutók" value={category.qualifiersPerGroup} />
        <StatCard label="Playoff méret" value={category.playoffSize ?? '-'} />
      </div>

      <SectionCard title="Gyors műveletek" subtitle="A legfontosabb kategória-szintű admin lépések.">
        <div className="quick-links">
          <button className="quick-link quick-link--button" type="button" onClick={finalizeDraw} disabled={busy}>
            <strong>{busy ? 'Draw lezárása...' : 'Draw finalizálása'}</strong>
            <span>A backend a check-inelt és jogosult játékosok alapján lezárja a sorsolást és generálja a csoport- vagy playoff meccseket.</span>
          </button>
          <AppLink className="quick-link" to={`/tournaments/${id}/categories/${categoryId}/standings`}>
            <strong>Standings</strong>
            <span>Csoportállás, tie-break állapot és shared place jelzések.</span>
          </AppLink>
          <AppLink className="quick-link" to={`/tournaments/${id}/categories/${categoryId}/playoff`}>
            <strong>Playoff</strong>
            <span>Bracket nézet, bronzmeccs és továbbjutás követése.</span>
          </AppLink>
          <AppLink className="quick-link" to={`/tournaments/${id}/matches`}>
            <strong>Meccsek oldal</strong>
            <span>Eredményrögzítés, státuszkezelés és játékvezető hozzárendelés.</span>
          </AppLink>
        </div>
      </SectionCard>
    </div>
  );
}
