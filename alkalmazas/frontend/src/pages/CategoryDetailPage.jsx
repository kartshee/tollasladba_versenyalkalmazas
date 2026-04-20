import { useEffect, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatCategoryFormat, formatMultiTiePolicy, formatStatusLabel, formatUnresolvedTiePolicy, toneForStatus } from '../services/formatters.jsx';

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
      window.alert(`A sorsolás lezárult. Generált meccsek száma: ${updated.generatedMatches}`);
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
        description="Innen érhetők el a sorsolás, a tabella, a rájátszás és az egyéb kategória-szintű műveletek."
        action={<AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${categoryId}/edit`}>Szerkesztés</AppLink>}
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Formátum" value={formatCategoryFormat(category.format)} />
        <StatCard label="Állapot" value={formatStatusLabel(category.status)} />
        <StatCard label="Továbbjutók" value={category.qualifiersPerGroup} />
        <StatCard label="Rájátszás mérete" value={category.playoffSize ?? '-'} />
      </div>

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Gyors műveletek" subtitle="A legfontosabb kategória-szintű admin lépések.">
            <div className="quick-links">
              <button className="quick-link quick-link--button" type="button" onClick={finalizeDraw} disabled={busy}>
                <strong>{busy ? 'Sorsolás lezárása...' : 'Sorsolás lezárása'}</strong>
                <span>A rendszer a check-inelt és jogosult játékosok alapján lezárja a sorsolást, létrehozza a csoportokat, majd generálja a meccseket.</span>
              </button>
              <AppLink className="quick-link" to={`/tournaments/${id}/categories/${categoryId}/standings`}>
                <strong>Tabella</strong>
                <span>Csoportállás, holtverseny-feloldás és közös helyezések követése.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/categories/${categoryId}/playoff`}>
                <strong>Rájátszás</strong>
                <span>Ágfa, bronzmeccs és továbbjutás kezelése.</span>
              </AppLink>
              <AppLink className="quick-link" to={`/tournaments/${id}/matches`}>
                <strong>Meccsek</strong>
                <span>Eredményrögzítés, státuszkezelés és játékvezető hozzárendelés.</span>
              </AppLink>
            </div>
          </SectionCard>

          <SectionCard title="Kategória magyarázat" subtitle="A beállított szabályok rövid értelmezése.">
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Többfős holtverseny</span>
                <span className="key-value-list__value">{formatMultiTiePolicy(category.multiTiePolicy)}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Feloldhatatlan holtverseny</span>
                <span className="key-value-list__value">{formatUnresolvedTiePolicy(category.unresolvedTiePolicy)}</span>
              </div>
            </div>
            <ul className="bullet-list" style={{ marginTop: '1rem' }}>
              <li>A sorsolás lezárása után jön létre a tényleges meccsállomány.</li>
              <li>Az időpontok és pályák kiosztása külön, az Ütemezés oldalon történik.</li>
              <li>A rájátszásos kategóriák végső helyezése a playoff eredményeiből áll össze.</li>
            </ul>
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
                <span className="key-value-list__value"><StatusBadge tone={toneForStatus(category.status)}>{formatStatusLabel(category.status)}</StatusBadge></span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Csoportok</span>
                <span className="key-value-list__value">{category.groupsCount}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Csonka körmérkőzés célérték</span>
                <span className="key-value-list__value">{category.groupStageMatchesPerPlayer ?? '-'}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Ajánlott következő lépés">
            <ul className="bullet-list">
              <li>Nevezések és check-in ellenőrzése.</li>
              <li>A sorsolás lezárása.</li>
              <li>Tabella, eredmények és menetrend nyomon követése.</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
