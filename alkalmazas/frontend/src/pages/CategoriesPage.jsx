import { useEffect, useState } from 'react';
import { AppLink } from '../components/AppLink.jsx';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatCategoryFormat, formatStatusLabel, toneForStatus } from '../services/formatters.jsx';

export function CategoriesPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.get(`/api/categories?tournamentId=${id}`, { token: auth.token });
        if (!active) return;
        setCategories(data);
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [auth.token, id]);

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Kategóriák"
        title="Kategóriák kezelése"
        description="Itt hozhatók létre és szerkeszthetők a kategóriák, valamint innen nyithatók meg a kategória-specifikus műveletek."
        action={<AppLink className="button button--primary" to={`/tournaments/${id}/categories/new`}>Új kategória</AppLink>}
      />
      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Kategórialista" subtitle="A versenyhez tartozó összes kategória egy helyen.">
            {loading ? <div className="muted">Betöltés...</div> : null}
            {!loading && categories.length === 0 ? <div className="muted">Még nincs kategória.</div> : null}
            {!loading && categories.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Név</th>
                    <th>Formátum</th>
                    <th>Csoportok</th>
                    <th>Továbbjutók</th>
                    <th>Rájátszás mérete</th>
                    <th>Állapot</th>
                    <th>Műveletek</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category._id}>
                      <td>{category.name}</td>
                      <td>{formatCategoryFormat(category.format)}</td>
                      <td>{category.groupsCount}</td>
                      <td>{category.qualifiersPerGroup}</td>
                      <td>{category.playoffSize ?? '-'}</td>
                      <td>
                        <StatusBadge tone={toneForStatus(category.status)}>{formatStatusLabel(category.status)}</StatusBadge>
                      </td>
                      <td>
                        <div className="inline-actions">
                          <AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${category._id}`}>Megnyitás</AppLink>
                          <AppLink className="button button--ghost" to={`/tournaments/${id}/categories/${category._id}/edit`}>Szerkesztés</AppLink>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Mit kezelsz itt?">
            <ul className="bullet-list">
              <li>A kategória lebonyolítási formáját: csoportkör, csoportkör + rájátszás vagy egyenes kiesés.</li>
              <li>A továbbjutók számát és a rájátszás méretét.</li>
              <li>A holtverseny-feloldási szabályokat és a kapcsolódó működési elveket.</li>
            </ul>
          </SectionCard>

          <SectionCard title="Gyors összesítő">
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Kategóriák száma</span>
                <span className="key-value-list__value">{categories.length}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Rájátszásos kategóriák</span>
                <span className="key-value-list__value">{categories.filter((c) => c.format !== 'group').length}</span>
              </div>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
