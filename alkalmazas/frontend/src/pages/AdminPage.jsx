/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime } from '../services/formatters.jsx';

const ACTION_LABELS = {
  'tournament.created': 'Verseny létrehozva',
  'tournament.updated': 'Verseny módosítva',
  'tournament.started': 'Verseny elindítva',
  'tournament.finished': 'Verseny lezárva',
  'tournament.finished_edit_unlocked': 'Eredményjavítás feloldva',
  'tournament.finished_edit_locked': 'Eredményjavítás visszazárva',
  'category.created': 'Kategória létrehozva',
  'category.updated': 'Kategória módosítva',
  'category.draw_finalized': 'Draw lezárva',
  'player.bulk_added': 'Játékosok tömeges felvétele',
  'player.checkin': 'Check-in jelölés',
  'group.schedule_generated': 'Ütemezés generálva',
  'match.result_set': 'Eredmény rögzítve',
  'match.result_updated': 'Eredmény javítva',
  'match.outcome_set': 'Speciális lezárás',
  'match.status_changed': 'Státuszváltás',
  'playoff.generated': 'Playoff generálva',
  'playoff.advanced': 'Playoff következő kör',
  'payment_group.created': 'Fizetési csoport létrehozva',
  'payment_group.updated': 'Fizetési csoport módosítva',
};

function actionLabel(action) {
  return ACTION_LABELS[action] ?? action;
}

function actionTone(action) {
  if (action.includes('created') || action.includes('started') || action.includes('generated') || action.includes('advanced')) return 'success';
  if (action.includes('updated') || action.includes('set') || action.includes('changed')) return 'neutral';
  if (action.includes('finished') || action.includes('finalized')) return 'warning';
  return 'neutral';
}

export function AdminPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [tournament, setTournament] = useState(null);
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportCategoryId, setExportCategoryId] = useState('');
  const [exportGroupId, setExportGroupId] = useState('');

  async function loadAll() {
    const [tournamentData, categoriesData, groupsData, auditData] = await Promise.all([
      api.get(`/api/tournaments/${id}`, { token: auth.token }),
      api.get(`/api/categories?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/groups?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/audit-logs?tournamentId=${id}`, { token: auth.token }),
    ]);
    setTournament(tournamentData);
    setCategories(categoriesData);
    setGroups(groupsData);
    setAuditLogs(auditData);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll()
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [auth.token, id]);

  function buildExportUrl(path) {
    const base = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
    return `${base}${path}`;
  }

  function downloadCsv(path) {
    // Build authenticated download link via fetch + blob
    const url = buildExportUrl(path);
    fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`Export hiba: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        const filename = path.split('/').pop() ?? 'export.csv';
        a.download = filename;
        a.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch((err) => setError(err.message));
  }

  const categoryGroups = useMemo(() => {
    return groups.filter((g) => exportCategoryId ? String(g.categoryId) === exportCategoryId : true);
  }, [groups, exportCategoryId]);

  const matchesCsvPath = useMemo(() => {
    let path = `/api/exports/tournaments/${id}/matches.csv`;
    if (exportCategoryId) path += `?categoryId=${exportCategoryId}`;
    return path;
  }, [id, exportCategoryId]);

  const playersCsvPath = useMemo(() => {
    let path = `/api/exports/tournaments/${id}/players.csv`;
    if (exportCategoryId) path += `?categoryId=${exportCategoryId}`;
    return path;
  }, [id, exportCategoryId]);

  const standingsCsvPath = exportGroupId
    ? `/api/exports/groups/${exportGroupId}/standings.csv`
    : null;

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Admin"
        title="Export és műveleti napló"
        description="CSV exportok letöltése és a rendszer műveleti naplójának áttekintése."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">

          <SectionCard title="CSV Export" subtitle="Az adatok letölthetők CSV formátumban, táblázatkezelőben megnyithatók.">
            <div className="form-grid form-grid--two" style={{ marginBottom: '1.25rem' }}>
              <div>
                <label className="form-label" htmlFor="export-category">Szűrés kategóriára (opcionális)</label>
                <select id="export-category" value={exportCategoryId} onChange={(e) => { setExportCategoryId(e.target.value); setExportGroupId(''); }}>
                  <option value="">Összes kategória</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="export-group">Tabella – Csoport kiválasztása</label>
                <select id="export-group" value={exportGroupId} onChange={(e) => setExportGroupId(e.target.value)}>
                  <option value="">— válassz csoportot —</option>
                  {categoryGroups.map((g) => <option key={g._id} value={g._id}>{g.name}</option>)}
                </select>
              </div>
            </div>

            <div className="export-grid">
              <div className="export-card">
                <div className="export-card__info">
                  <strong>Meccslista</strong>
                  <span className="muted">Meccsek státusszal, eredménnyel, pályával, időponttal.</span>
                  {exportCategoryId ? <span className="hint-text">Szűrve: {categories.find((c) => c._id === exportCategoryId)?.name}</span> : null}
                </div>
                <button className="button button--primary" type="button" onClick={() => downloadCsv(matchesCsvPath)}>
                  Letöltés
                </button>
              </div>

              <div className="export-card">
                <div className="export-card__info">
                  <strong>Játékos / Check-in lista</strong>
                  <span className="muted">Játékosok club-adattal, check-in státusszal.</span>
                  {exportCategoryId ? <span className="hint-text">Szűrve: {categories.find((c) => c._id === exportCategoryId)?.name}</span> : null}
                </div>
                <button className="button button--primary" type="button" onClick={() => downloadCsv(playersCsvPath)}>
                  Letöltés
                </button>
              </div>

              <div className="export-card">
                <div className="export-card__info">
                  <strong>Csoportállás (tabella)</strong>
                  <span className="muted">Helyezések, győzelmek, szett- és pontkülönbség.</span>
                  {!exportGroupId ? <span className="hint-text warning-text">Válassz csoportot a fenti szűrőből.</span> : null}
                </div>
                <button
                  className="button button--primary"
                  type="button"
                  disabled={!exportGroupId}
                  onClick={() => standingsCsvPath && downloadCsv(standingsCsvPath)}
                >
                  Letöltés
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Műveleti napló"
            subtitle={loading ? 'Betöltés...' : `${auditLogs.length} naplóbejegyzés`}
          >
            {!loading && auditLogs.length === 0 ? (
              <div className="muted">Még nincs naplóbejegyzés ehhez a versenyhez.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Időpont</th>
                    <th>Művelet</th>
                    <th>Összefoglaló</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                      <td>
                        <StatusBadge tone={actionTone(log.action)}>
                          {actionLabel(log.action)}
                        </StatusBadge>
                      </td>
                      <td>{log.summary ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Verseny összesítő" subtitle={tournament?.name ?? ''}>
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Kategóriák</span>
                <span className="key-value-list__value">{categories.length}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Csoportok</span>
                <span className="key-value-list__value">{groups.length}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Naplóbejegyzések</span>
                <span className="key-value-list__value">{auditLogs.length}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Export megjegyzések">
            <ul className="bullet-list">
              <li>A CSV fájlok táblázatkezelőben (pl. Excel, LibreOffice Calc) megnyithatók.</li>
              <li>Meccslista és játékoslista kategóriaszűrővel szűkíthető.</li>
              <li>Tabella exporthoz ki kell választani a konkrét csoportot.</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
