import { useEffect, useMemo, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { AppLink } from '../components/AppLink.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime, roundLabel, toneForStatus, formatStatusLabel } from '../services/formatters.jsx';

function defaultScheduleForm(tournament) {
  const config = tournament?.config ?? {};
  return {
    courtsCount: String(config.courtsCount ?? 1),
    matchMinutes: String(config.estimatedMatchMinutes ?? 35),
    playerRestMinutes: String(config.minRestPlayerMinutes ?? 20),
    courtTurnoverMinutes: String(config.courtTurnoverMinutes ?? 0),
    assignUmpires: true,
  };
}

export function SchedulePage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [form, setForm] = useState(defaultScheduleForm(null));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [reestimating, setReestimating] = useState(false);

  async function loadAll() {
    const [tournamentData, matchesData] = await Promise.all([
      api.get(`/api/tournaments/${id}`, { token: auth.token }),
      api.get(`/api/matches?tournamentId=${id}`, { token: auth.token }),
    ]);
    setTournament(tournamentData);
    setMatches(matchesData);
    setForm((current) => current.courtsCount ? current : defaultScheduleForm(tournamentData));
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll().catch((err) => active && setError(err.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [auth.token, id]);

  const scheduledMatches = useMemo(() => matches.filter((match) => match.startAt && match.courtNumber).sort((a, b) => new Date(a.startAt) - new Date(b.startAt)), [matches]);
  const pendingMatches = useMemo(() => matches.filter((match) => match.status === 'pending' && !match.startAt), [matches]);
  const courtBuckets = useMemo(() => {
    return scheduledMatches.reduce((acc, match) => {
      const key = String(match.courtNumber ?? '—');
      acc[key] = acc[key] ?? [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [scheduledMatches]);

  async function runScheduler(event) {
    event.preventDefault();
    setScheduling(true);
    setError('');
    try {
      await api.post(`/api/matches/tournament/${id}/schedule/global`, {
        courtsCount: Number(form.courtsCount),
        matchMinutes: Number(form.matchMinutes),
        playerRestMinutes: Number(form.playerRestMinutes),
        courtTurnoverMinutes: Number(form.courtTurnoverMinutes),
        assignUmpires: Boolean(form.assignUmpires),
        force: false,
      }, { token: auth.token });
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setScheduling(false);
    }
  }

  async function reestimateSchedule() {
    setReestimating(true);
    setError('');
    try {
      await api.post(`/api/matches/tournament/${id}/schedule/reestimate`, {
        courtsCount: Number(form.courtsCount),
        matchMinutes: Number(form.matchMinutes),
        playerRestMinutes: Number(form.playerRestMinutes),
        courtTurnoverMinutes: Number(form.courtTurnoverMinutes),
        assignUmpires: Boolean(form.assignUmpires),
        force: true,
      }, { token: auth.token });
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setReestimating(false);
    }
  }

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Ütemezés"
        title="Globális ütemező és pályanézet"
        description="Az ütemezés oldalon a teljes verseny várakozó meccsei pályákra és idősávokra oszthatók. A rendszer játékvezetői rotációt is tud adni, és a csúszások alapján újrabecsülheti a hátralévő kezdési időket."
      />
      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Automatikus menetrend készítése" subtitle="A rendszer a teljes verseny várakozó meccseit osztja el a pályákon. Az egyenletes kategóriaelosztás háttérben automatikusan működik.">
            <form className="form-grid form-grid--four filters-grid" onSubmit={runScheduler}>
              <FormField label="Pályák száma" htmlFor="schedule-courts">
                <input id="schedule-courts" type="number" min="1" max="50" value={form.courtsCount} onChange={(e) => setForm((state) => ({ ...state, courtsCount: e.target.value }))} />
              </FormField>
              <FormField label="Meccsidő (perc)" htmlFor="schedule-match-minutes">
                <input id="schedule-match-minutes" type="number" min="1" max="240" value={form.matchMinutes} onChange={(e) => setForm((state) => ({ ...state, matchMinutes: e.target.value }))} />
              </FormField>
              <FormField label="Játékospihenő (perc)" htmlFor="schedule-rest-minutes">
                <input id="schedule-rest-minutes" type="number" min="0" max="240" value={form.playerRestMinutes} onChange={(e) => setForm((state) => ({ ...state, playerRestMinutes: e.target.value }))} />
              </FormField>
              <FormField label="Pályaforgás (perc)" htmlFor="schedule-turnover-minutes">
                <input id="schedule-turnover-minutes" type="number" min="0" max="120" value={form.courtTurnoverMinutes} onChange={(e) => setForm((state) => ({ ...state, courtTurnoverMinutes: e.target.value }))} />
              </FormField>
              <label className="checkbox-row">
                <input type="checkbox" checked={form.assignUmpires} onChange={(e) => setForm((state) => ({ ...state, assignUmpires: e.target.checked }))} />
                <span>Játékvezetők automatikus rotációja</span>
              </label>
              <div className="actions-row">
                <button className="button button--primary" type="submit" disabled={scheduling}>{scheduling ? 'Ütemezés...' : 'Ütemező futtatása'}</button>
                <button className="button button--secondary" type="button" onClick={reestimateSchedule} disabled={reestimating || scheduledMatches.length === 0}>
                  {reestimating ? 'Újrabecslés...' : 'Dinamikus becslés frissítése'}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Pályák szerinti bontás" subtitle={loading ? 'Betöltés...' : `${scheduledMatches.length} betervezett meccs`}>
            {Object.keys(courtBuckets).length === 0 ? <div className="muted">Még nincs betervezett meccs.</div> : (
              <div className="court-grid">
                {Object.entries(courtBuckets).map(([court, courtMatches]) => (
                  <div className="court-column" key={court}>
                    <h3>{court}. pálya</h3>
                    <div className="stack-md">
                      {courtMatches.map((match) => (
                        <div key={match._id} className="summary-item summary-item--interactive">
                          <div className="summary-item__head">
                            <strong>{match.player1?.name ?? match.player1} – {match.player2?.name ?? match.player2}</strong>
                            <StatusBadge tone={toneForStatus(match.status)}>{formatStatusLabel(match.status)}</StatusBadge>
                          </div>
                          <div className="summary-item__meta">
                            <span>{roundLabel(match.round)}</span>
                            <span>{formatDateTime(match.startAt)}</span>
                            {match.umpireName ? <span>Jv.: {match.umpireName}</span> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Ütemezési összesítő" subtitle={tournament?.name ?? 'Verseny'}>
            <div className="key-value-list">
              <div className="key-value-list__row"><span className="key-value-list__label">Betervezett meccsek</span><span className="key-value-list__value">{scheduledMatches.length}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Még ütemezetlen</span><span className="key-value-list__value">{pendingMatches.length}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Pályák</span><span className="key-value-list__value">{tournament?.config?.courtsCount ?? '—'}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Jelenlegi meccsidő</span><span className="key-value-list__value">{tournament?.config?.estimatedMatchMinutes ?? '—'} perc</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Játékvezetők</span><span className="key-value-list__value">{tournament?.referees?.length ?? 0}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Kapcsolódó oldalak">
            <div className="stack-md">
              <AppLink className="button button--ghost button--block" to={`/tournaments/${id}/matches`}>Meccsek oldal</AppLink>
              <AppLink className="button button--ghost button--block" to={`/tournaments/${id}/board`}>Kijelző előnézet</AppLink>
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
