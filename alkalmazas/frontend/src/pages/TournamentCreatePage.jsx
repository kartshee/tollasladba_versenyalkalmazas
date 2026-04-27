import { useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { useRouter } from '../router/router.jsx';

const initialForm = {
  name: '',
  date: '',
  location: '',
  courtsCount: 4,
  estimatedMatchMinutes: 35,
  minRestPlayerMinutes: 20,
  minRestRefereeMinutes: 10,
  courtTurnoverMinutes: 0,
  checkInGraceMinutesDefault: 40,
  entryFeeEnabled: false,
  entryFeeAmount: 0,
  bestOf: 3,
  pointsToWin: 21,
  winBy: 2,
  cap: 30,
  hasReferees: false,
  refereesText: '',
};

function HowItWorks({ open, onToggle }) {
  return (
    <div className={`howto-block${open ? ' howto-block--open' : ''}`}>
      <button className="howto-block__toggle" type="button" onClick={onToggle}>
        <span>Hogyan konfiguráljak versenyt?</span>
        <span className="howto-block__chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="howto-block__body">
          <p>
            Ezen az oldalon a <strong>verseny globális kereteit</strong> állítod be – ezek az egész versenyre vonatkoznak,
            nem kategóriánként értelmezendők.
          </p>
          <h4>Pályák és ütemezés</h4>
          <p>
            A <em>pályák száma</em> határozza meg, hány meccs futhat párhuzamosan. A <em>becsült meccsidő</em> és a
            <em> pihenőidők</em> alapján a rendszer automatikusan oszt el meccseket, hogy ne kelljen kézzel ütemezni.
            A check-in türelmi idő azt jelenti, hogy a meccs tervezett kezdete előtt hány perccel kell a játékosnak
            megjelennie – ha nem jelent meg, a rendszer azt jelzi.
          </p>
          <h4>Meccsszabályok</h4>
          <p>
            A nyert szettek száma beállítás határozza meg, hány megnyert szettig tart egy meccs (például BO3 esetén az nyer, aki előbb 2 szettet nyer).
            A <em>ponthatár</em> és <em>pontelőny</em> a szett végét szabja meg – tollaslabdában általában 21 pontig,
            2 pontos előnnyel, 30-as plafonnal.
          </p>
          <h4>Kategóriák</h4>
          <p>
            A verseny létrehozása után <strong>kategóriákat</strong> kell felvenni (pl. Felnőtt férfi egyes, Vegyes
            páros stb.). Kategóriánként külön lehet beállítani a formátumot (csoportkör, playoff, vegyes),
            a csoportméretet és a továbbjutók számát. A meccsszabályokat is felül lehet bírálni kategóriánként.
          </p>
          <h4>Sorsolás és menetrend</h4>
          <p>
            A nevezések felvétele és a check-in után a <em>Sorsolás lezárása</em> gomb hozza létre a csoportokat és
            generálja a meccseket. Ezután az ütemező automatikusan pályákhoz és időpontokhoz rendeli a meccseket –
            ezt az <em>Ütemezés</em> oldalon lehet elindítani és finomhangolni.
          </p>
        </div>
      )}
    </div>
  );
}

export function TournamentCreatePage() {
  const auth = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [howtoOpen, setHowtoOpen] = useState(false);

  function update(key, value) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const referees = form.hasReferees
      ? form.refereesText.split(/\r?\n/).map((n) => n.trim()).filter(Boolean).map((name) => ({ name }))
      : [];

    try {
      const created = await api.post('/api/tournaments', {
        name: form.name,
        date: form.date || null,
        location: form.location,
        referees,
        config: {
          courtsCount: Number(form.courtsCount),
          estimatedMatchMinutes: Number(form.estimatedMatchMinutes),
          minRestPlayerMinutes: Number(form.minRestPlayerMinutes),
          minRestRefereeMinutes: Number(form.minRestRefereeMinutes),
          courtTurnoverMinutes: Number(form.courtTurnoverMinutes),
          checkInGraceMinutesDefault: Number(form.checkInGraceMinutesDefault),
          entryFeeEnabled: Boolean(form.entryFeeEnabled),
          entryFeeAmount: Number(form.entryFeeEnabled ? form.entryFeeAmount : 0),
          matchRules: {
            bestOf: Number(form.bestOf),
            pointsToWin: Number(form.pointsToWin),
            winBy: Number(form.winBy),
            cap: Number(form.cap),
          },
        },
      }, { token: auth.token });

      router.navigate(`/tournaments/${created._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const refereeCount = form.refereesText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).length;

  return (
    <div className="stack-xl">
      <BackLink to="/">Vissza a dashboardra</BackLink>
      <PageHeader
        eyebrow="Új verseny"
        title="Verseny konfigurálása"
        description="Globális beállítások – pályák, ütemező paraméterek, meccsszabályok. A kategóriákat a verseny létrehozása után lehet felvenni."
      />

      <HowItWorks open={howtoOpen} onToggle={() => setHowtoOpen((v) => !v)} />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <form className="stack-lg" onSubmit={handleSubmit}>

            <SectionCard title="Alapadatok">
              <div className="form-grid form-grid--two">
                <FormField label="Verseny neve" htmlFor="name">
                  <input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Pl. Városi diákolimpia 2025" />
                </FormField>
                <FormField label="Dátum" htmlFor="date">
                  <input id="date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
                </FormField>
                <FormField label="Helyszín" htmlFor="location">
                  <input id="location" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Pl. Sportcsarnok, Szeged" />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Pályák és ütemezés" subtitle="A scheduler kiindulási paraméterei.">
              <div className="form-grid form-grid--two">
                <FormField label="Pályák száma" htmlFor="courts" hintText="Egyszerre használható pályák maximuma.">
                  <input id="courts" type="number" min="1" max="50" value={form.courtsCount} onChange={(e) => update('courtsCount', e.target.value)} />
                </FormField>
                <FormField label="Becsült meccsidő (perc)" htmlFor="estimatedMatchMinutes" hintText="Kiindulási becslés az ütemezőnek.">
                  <input id="estimatedMatchMinutes" type="number" min="1" max="240" value={form.estimatedMatchMinutes} onChange={(e) => update('estimatedMatchMinutes', e.target.value)} />
                </FormField>
                <FormField label="Minimális játékospihenő (perc)" htmlFor="minRestPlayerMinutes" hintText="Ugyanannak a játékosnak két meccs között minimálisan hagyott idő.">
                  <input id="minRestPlayerMinutes" type="number" min="0" max="240" value={form.minRestPlayerMinutes} onChange={(e) => update('minRestPlayerMinutes', e.target.value)} />
                </FormField>
                <FormField label="Minimális játékvezető-pihenő (perc)" htmlFor="minRestRefereeMinutes">
                  <input id="minRestRefereeMinutes" type="number" min="0" max="240" value={form.minRestRefereeMinutes} onChange={(e) => update('minRestRefereeMinutes', e.target.value)} />
                </FormField>
                <FormField label="Pályaforgatási idő (perc)" htmlFor="courtTurnoverMinutes" hintText="Technikai átmenet meccsek között.">
                  <input id="courtTurnoverMinutes" type="number" min="0" max="120" value={form.courtTurnoverMinutes} onChange={(e) => update('courtTurnoverMinutes', e.target.value)} />
                </FormField>
                <FormField label="Check-in türelmi idő (perc)" htmlFor="checkInGraceMinutesDefault" hintText="Hány perccel a meccs előtt kell megjelennie a játékosnak. Kategóriánként felülbírálható.">
                  <input id="checkInGraceMinutesDefault" type="number" min="0" max="120" value={form.checkInGraceMinutesDefault} onChange={(e) => update('checkInGraceMinutesDefault', e.target.value)} />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Meccsszabályok" subtitle="Az egész versenyre vonatkozó alapértelmezés – kategóriánként felülbírálható.">
              <div className="form-grid form-grid--two">
                <FormField label="Szett rendszer" htmlFor="bestOf">
                  <select id="bestOf" value={form.bestOf} onChange={(e) => update('bestOf', Number(e.target.value))}>
                    <option value={1}>1 nyert szett</option>
                    <option value={3}>2 nyert szett (BO3)</option>
                    <option value={5}>3 nyert szett (BO5)</option>
                  </select>
                </FormField>
                <FormField label="Szett hossza (pont)" htmlFor="pointsToWin" hintText="Általában 21.">
                  <input id="pointsToWin" type="number" min="5" max="30" value={form.pointsToWin} onChange={(e) => update('pointsToWin', e.target.value)} />
                </FormField>
                <FormField label="Pontelőny a szett zárásához" htmlFor="winBy" hintText="Tollaslabdában 2.">
                  <input id="winBy" type="number" min="1" max="5" value={form.winBy} onChange={(e) => update('winBy', e.target.value)} />
                </FormField>
                <FormField label="Pontplafon" htmlFor="cap" hintText="Tollaslabdában 30 – ennél lezárul a szett előny nélkül is.">
                  <input id="cap" type="number" min="10" max="50" value={form.cap} onChange={(e) => update('cap', e.target.value)} />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Nevezési díj" subtitle="Adminisztratív nyilvántartás, nem online fizetési rendszer.">
              <div className="form-grid form-grid--two">
                <FormField label="Van nevezési díj?" htmlFor="entryFeeEnabled">
                  <select id="entryFeeEnabled" value={String(form.entryFeeEnabled)} onChange={(e) => update('entryFeeEnabled', e.target.value === 'true')}>
                    <option value="false">Nincs</option>
                    <option value="true">Van</option>
                  </select>
                </FormField>
                {form.entryFeeEnabled && (
                  <FormField label="Összeg (Ft)" htmlFor="entryFeeAmount">
                    <input id="entryFeeAmount" type="number" min="0" step="100" value={form.entryFeeAmount} onChange={(e) => update('entryFeeAmount', e.target.value)} />
                  </FormField>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Játékvezetők" subtitle="Opcionális – csak ha a versenyen van bírói rendszer.">
              <div className="form-grid" style={{ marginBottom: form.hasReferees ? '1rem' : 0 }}>
                <FormField label="Van-e játékvezető a versenyen?" htmlFor="hasReferees">
                  <select id="hasReferees" value={String(form.hasReferees)} onChange={(e) => update('hasReferees', e.target.value === 'true')}>
                    <option value="false">Nincs</option>
                    <option value="true">Van</option>
                  </select>
                </FormField>
              </div>
              {form.hasReferees && (
                <div className="form-grid">
                  <FormField label="Játékvezetők (soronként egy név)" htmlFor="refereesText">
                    <textarea
                      id="refereesText"
                      value={form.refereesText}
                      onChange={(e) => update('refereesText', e.target.value)}
                      rows="5"
                      placeholder={'Kovács Péter\nSzabó Anna\nNagy István'}
                    />
                  </FormField>
                </div>
              )}
            </SectionCard>

            {error ? <div className="alert alert--error">{error}</div> : null}

            <div className="actions-row">
              <button className="button button--primary" type="submit" disabled={submitting}>
                {submitting ? 'Mentés...' : 'Verseny létrehozása'}
              </button>
            </div>
          </form>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Összesítő">
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Pályák</span>
                <span className="key-value-list__value">{form.courtsCount}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Meccsidő</span>
                <span className="key-value-list__value">{form.estimatedMatchMinutes} perc</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Szett rendszer</span>
                <span className="key-value-list__value">BO{form.bestOf}, {form.pointsToWin} pont</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Nevezési díj</span>
                <span className="key-value-list__value">{form.entryFeeEnabled ? `${form.entryFeeAmount} Ft` : 'nincs'}</span>
              </div>
              {form.hasReferees && (
                <div className="key-value-list__row">
                  <span className="key-value-list__label">Játékvezetők</span>
                  <span className="key-value-list__value">{refereeCount}</span>
                </div>
              )}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
