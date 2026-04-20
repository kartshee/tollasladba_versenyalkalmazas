import { useEffect, useMemo, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { AppLink } from '../components/AppLink.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime, formatDateTimeLocalInput, roundLabel, toneForStatus, formatStatusLabel } from '../services/formatters.jsx';

function defaultScheduleForm(tournament) {
  const config = tournament?.config ?? {};
  return {
    courtsCount: String(config.courtsCount ?? 1),
    matchMinutes: String(config.estimatedMatchMinutes ?? 35),
    playerRestMinutes: String(config.minRestPlayerMinutes ?? 20),
    courtTurnoverMinutes: String(config.courtTurnoverMinutes ?? 0),
    fairnessGap: '1',
    startAt: formatDateTimeLocalInput(),
    force: false,
  };
}

export function SchedulePage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [form, setForm] = useState(defaultScheduleForm(null));
  const [formInitialized, setFormInitialized] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  async function loadAll() {
    const [tournamentData, matchesData] = await Promise.all([
      api.get(`/api/tournaments/${id}`, { token: auth.token }),
      api.get(`/api/matches?tournamentId=${id}`, { token: auth.token }),
    ]);
    setTournament(tournamentData);
    setMatches(matchesData);
    if (!formInitialized) {
      setForm(defaultScheduleForm(tournamentData));
      setFormInitialized(true);
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll().catch((err) => active && setError(err.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [auth.token, id]);

  const scheduledMatches = useMemo(() => matches.filter((match) => match.startAt && match.courtNumber).sort((a, b) => new Date(a.startAt) - new Date(b.startAt)), [matches]);
  const pendingMatches = useMemo(() => matches.filter((match) => match.status === 'pending' && !match.startAt), [matches]);
  const courtBuckets = useMemo(() => scheduledMatches.reduce((acc, match) => {
    const key = String(match.courtNumber ?? '—');
    acc[key] = acc[key] ?? [];
    acc[key].push(match);
    return acc;
  }, {}), [scheduledMatches]);

  async function runScheduler(event) {
    event.preventDefault();
    setScheduling(true);
    setError('');
    try {
      await api.post(`/api/matches/tournament/${id}/schedule/global`, {
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        courtsCount: Number(form.courtsCount),
        matchMinutes: Number(form.matchMinutes),
        playerRestMinutes: Number(form.playerRestMinutes),
        courtTurnoverMinutes: Number(form.courtTurnoverMinutes),
        fairnessGap: Number(form.fairnessGap),
        force: form.force,
      }, { token: auth.token });
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Ütemezés"
        title="Menetrend generálása és pályanézet"
        description="Itt futtatható a globális ütemező. A sorsolás lezárása után ez az oldal osztja ki a meccsekhez a pályákat és az időpontokat."
      />
      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Hogyan működik az ütemezés?" subtitle="A menetrend készítése a jelenlegi rendszerben tudatosan kézi indítású művelet.">
            <ul className="bullet-list">
              <li>Előbb a kategóriák sorsolását kell lezárni, hogy létrejöjjenek a meccsek.</li>
              <li>Ezután a rendszer a még ütemezetlen, várakozó meccseket osztja ki pályákra és idősávokra.</li>
              <li>A kezdési időpontot itt lehet megadni, nem kötelező az aktuális időből kiindulni.</li>
              <li>Az újratervezés kapcsolóval a már korábban beütemezett, de még nem lejátszott meccsek is újrakioszthatók.</li>
            </ul>
          </SectionCard>

          <SectionCard title="Menetrend generálása" subtitle="A globális ütemező a teljes verseny várakozó meccseit osztja el a pályákon.">
            <form className="form-grid form-grid--four filters-grid" onSubmit={runScheduler}>
              <FormField label="Kezdési időpont" htmlFor="schedule-start-at" hintText="Ettől az időponttól kezdve építi fel a rendszer a menetrendet.">
                <input id="schedule-start-at" type="datetime-local" value={form.startAt} onChange={(e) => setForm((state) => ({ ...state, startAt: e.target.value }))} />
              </FormField>
              <FormField label="Pályák száma" htmlFor="schedule-courts">
                <input id="schedule-courts" type="number" min="1" max="50" value={form.courtsCount} onChange={(e) => setForm((state) => ({ ...state, courtsCount: e.target.value }))} />
              </FormField>
              <FormField label="Meccsidő (perc)" htmlFor="schedule-match-minutes">
                <input id="schedule-match-minutes" type="number" min="1" max="240" value={form.matchMinutes} onChange={(e) => setForm((state) => ({ ...state, matchMinutes: e.target.value }))} />
              </FormField>
              <FormField label="Játékospihenő (perc)" htmlFor="schedule-rest-minutes">
                <input id="schedule-rest-minutes" type="number" min="0" max="240" value={form.playerRestMinutes} onChange={(e) => setForm((state) => ({ ...state, playerRestMinutes: e.target.value }))} />
              </FormField>
              <FormField label="Pályaforgatási idő (perc)" htmlFor="schedule-turnover-minutes">
                <input id="schedule-turnover-minutes" type="number" min="0" max="120" value={form.courtTurnoverMinutes} onChange={(e) => setForm((state) => ({ ...state, courtTurnoverMinutes: e.target.value }))} />
              </FormField>
              <FormField label="Fairness gap" htmlFor="schedule-fairness-gap" hintText="A globális ütemező ezt használja arra, hogy egy kategória se fusson el túlzottan a többihez képest.">
                <input id="schedule-fairness-gap" type="number" min="0" max="5" value={form.fairnessGap} onChange={(e) => setForm((state) => ({ ...state, fairnessGap: e.target.value }))} />
              </FormField>
              <FormField label="Újratervezés" htmlFor="schedule-force" hintText="Bekapcsolva a korábban kiosztott, de még várakozó meccsek is újraszámolhatók.">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minHeight: '44px' }}>
                  <input id="schedule-force" type="checkbox" checked={form.force} onChange={(e) => setForm((state) => ({ ...state, force: e.target.checked }))} />
                  <span>{form.force ? 'Engedélyezve' : 'Kikapcsolva'}</span>
                </label>
              </FormField>
              <div className="actions-row">
                <button className="button button--primary" type="submit" disabled={scheduling}>{scheduling ? 'Generálás...' : 'Automatikus menetrend készítése'}</button>
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
              <div className="key-value-list__row"><span className="key-value-list__label">Még ütemezetlen várakozó</span><span className="key-value-list__value">{pendingMatches.length}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Pályák</span><span className="key-value-list__value">{tournament?.config?.courtsCount ?? '—'}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Alap meccsidő</span><span className="key-value-list__value">{tournament?.config?.estimatedMatchMinutes ?? '—'} perc</span></div>
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
