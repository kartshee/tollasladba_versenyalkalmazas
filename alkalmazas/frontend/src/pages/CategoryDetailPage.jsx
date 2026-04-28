import { useEffect, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatCategoryFormat, formatStatusLabel } from '../services/formatters.jsx';

function unresolvedPolicyLabel(v) {
  if (v === 'shared_place') return 'Közös helyezés';
  if (v === 'manual_override') return 'Manuális döntés';
  return v ?? '—';
}

function multiTiePolicyLabel(v) {
  if (v === 'direct_only') return 'Csak mini-tabella';
  if (v === 'direct_then_overall') return 'Mini-tabella, majd összesített';
  return v ?? '—';
}

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
      window.alert(`Sorsolás lezárva. Generált meccsek: ${updated.generatedMatches}`);
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
        description="Innen érhetők el a sorsolás, tabella, playoff és egyéb kategória-szintű műveletek."
        action={<AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${categoryId}/edit`}>Szerkesztés</AppLink>}
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Formátum" value={formatCategoryFormat(category.format)} />
        <StatCard label="Állapot" value={formatStatusLabel(category.status)} />
        <StatCard label="Továbbjutók" value={category.qualifiersPerGroup} />
        <StatCard label="Playoff méret" value={category.playoffSize ?? '-'} />
      </div>

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Gyors műveletek" subtitle="A legfontosabb kategória-szintű admin lépések.">
            <div className="quick-links">
              <button className="quick-link quick-link--button" type="button" onClick={finalizeDraw} disabled={busy}>
                <strong>{busy ? 'Sorsolás lezárása...' : 'Sorsolás lezárása'}</strong>
                <span>A backend a check-inelt és jogosult játékosok alapján lezárja a sorsolást és generálja a csoport- vagy playoff meccseket.</span>
              </button>
              <AppLink className="quick-link" to={`/tournaments/${id}/categories/${categoryId}/standings`}>
                <strong>Tabella</strong>
                <span>Csoportállás, holtverseny állapot és közös helyezés jelzések.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/categories/${categoryId}/playoff`}>
                <strong>Rájátszás</strong>
                <span>Ágrajz nézet, bronzmeccs és továbbjutás követése.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/matches`}>
                <strong>Meccsek oldal</strong>
                <span>Eredményrögzítés, státuszkezelés és játékvezető hozzárendelés.</span>
              </AppLink>
            </div>
          </SectionCard>

          <SectionCard title="Kategória magyarázat" subtitle="A beállított policyk jelentése.">
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Többfős holtverseny</span>
                <span className="key-value-list__value">{multiTiePolicyLabel(category.multiTiePolicy)}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Feloldhatatlan holtverseny</span>
                <span className="key-value-list__value">{unresolvedPolicyLabel(category.unresolvedTiePolicy)}</span>
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Kategória összesítő">
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Formátum</span>
                <span className="key-value-list__value">{formatCategoryFormat(category.format)}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Állapot</span>
                <span className="key-value-list__value"><StatusBadge>{formatStatusLabel(category.status)}</StatusBadge></span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Csoportok</span>
                <span className="key-value-list__value">{category.groupsCount}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">RR meccsszám</span>
                <span className="key-value-list__value">{category.groupStageMatchesPerPlayer ?? '-'}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Következő lépések">
            <ul className="bullet-list">
              <li>Ellenőrizd a nevezéseket és a check-in státuszokat.</li>
              <li>Ha mindenki megérkezett, zárd le a sorsolást.</li>
              <li>A sorsolás után a meccsek és a tabella a megfelelő oldalakon követhető.</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
