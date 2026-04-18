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
  refereesText: '',
};

export function TournamentCreatePage() {
  const auth = useAuth();
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    const referees = form.refereesText
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

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
        title="Verseny globális beállításai"
        description="A verseny alapadatai, a lebonyolítási paraméterek és a globális erőforrások. Ezek az egész versenyre vonatkoznak, nem kategóriánként értelmezendők."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <form className="stack-lg" onSubmit={handleSubmit}>
            <SectionCard title="Alapadatok" subtitle="A verseny azonosító és szervezési alapadatai.">
              <div className="form-grid form-grid--two">
                <FormField label="Verseny neve" htmlFor="name">
                  <input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Például: Városi diákolimpia 2025" />
                </FormField>
                <FormField label="Dátum" htmlFor="date">
                  <input id="date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
                </FormField>
                <FormField label="Helyszín" htmlFor="location">
                  <input id="location" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Például: Sportcsarnok, Szeged" />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Pályák és ütemezési paraméterek" subtitle="A globális scheduler és a pályabeosztás kiindulási beállításai.">
              <div className="form-grid form-grid--two">
                <FormField label="Pályák száma" htmlFor="courts" hintText="A teljes versenyen egyszerre használható pályák száma. A globális scheduler ezt tekinti maximális kapacitásnak.">
                  <input id="courts" type="number" min="1" max="50" value={form.courtsCount} onChange={(e) => update('courtsCount', e.target.value)} />
                </FormField>
                <FormField label="Becsült meccsidő (perc)" htmlFor="estimatedMatchMinutes" hintText="A scheduler ezt használja kiindulási becslésként az időpontok és pályák kiosztásához.">
                  <input id="estimatedMatchMinutes" type="number" min="1" max="240" value={form.estimatedMatchMinutes} onChange={(e) => update('estimatedMatchMinutes', e.target.value)} />
                </FormField>
                <FormField label="Minimális játékospihenő (perc)" htmlFor="minRestPlayerMinutes" hintText="Két meccs között legalább ennyi pihenőt próbál tartani a rendszer ugyanannak a játékosnak.">
                  <input id="minRestPlayerMinutes" type="number" min="0" max="240" value={form.minRestPlayerMinutes} onChange={(e) => update('minRestPlayerMinutes', e.target.value)} />
                </FormField>
                <FormField label="Minimális játékvezető-pihenő (perc)" htmlFor="minRestRefereeMinutes" hintText="Ha a meccsekhez játékvezető lesz rendelve, a rendszer ezzel a pihenőértékkel is tud számolni.">
                  <input id="minRestRefereeMinutes" type="number" min="0" max="240" value={form.minRestRefereeMinutes} onChange={(e) => update('minRestRefereeMinutes', e.target.value)} />
                </FormField>
                <FormField label="Pályaforgatási idő (perc)" htmlFor="courtTurnoverMinutes" hintText="Meccsek közé beépíthető technikai átmeneti idő, például eredménylap vagy pályarendezés miatt.">
                  <input id="courtTurnoverMinutes" type="number" min="0" max="120" value={form.courtTurnoverMinutes} onChange={(e) => update('courtTurnoverMinutes', e.target.value)} />
                </FormField>
                <FormField label="Check-in türelmi idő (perc)" htmlFor="checkInGraceMinutesDefault" hintText="Ennyi perccel a meccs tervezett kezdete után számít későnek egy nem check-inelt játékos. Az alapértéket kategóriánként felül lehet bírálni.">
                  <input id="checkInGraceMinutesDefault" type="number" min="0" max="120" value={form.checkInGraceMinutesDefault} onChange={(e) => update('checkInGraceMinutesDefault', e.target.value)} />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Meccsszabályok" subtitle="A verseny mérkőzéseire vonatkozó alap szabályok. Ezek érvényesek, hacsak kategóriánként felül nem bírálják.">
              <div className="form-grid form-grid--two">
                <FormField label="Szett rendszer (bestOf)" htmlFor="bestOf" hintText="Hány nyert szettig tart egy meccs. bestOf 3 = az nyer, aki előbb nyer 2 szettet. A backend jelenleg 1, 3 és 5 értéket fogad el.">
                  <select id="bestOf" value={form.bestOf} onChange={(e) => update('bestOf', Number(e.target.value))}>
                    <option value={1}>Best of 1 (1 nyert szett)</option>
                    <option value={3}>Best of 3 (2 nyert szett)</option>
                    <option value={5}>Best of 5 (3 nyert szett)</option>
                  </select>
                </FormField>
                <FormField label="Pontig tart egy szett" htmlFor="pointsToWin" hintText="Normál tollaslabda szett 21 pontig megy. Rövidített lebonyolításnál lehet alacsonyabb értéket beállítani.">
                  <input id="pointsToWin" type="number" min="5" max="30" value={form.pointsToWin} onChange={(e) => update('pointsToWin', e.target.value)} />
                </FormField>
                <FormField label="Szükséges pontelőny (winBy)" htmlFor="winBy" hintText="A szett nyeréséhez szükséges minimum pontelőny. Tollaslabdában általában 2, tehát 21:19 érvényes, 21:20 nem.">
                  <input id="winBy" type="number" min="1" max="5" value={form.winBy} onChange={(e) => update('winBy', e.target.value)} />
                </FormField>
                <FormField label="Pontplafon (cap)" htmlFor="cap" hintText="Maximum pontszám, amelynél a szett lezárul, akkor is, ha a pontelőny-feltétel még nem teljesül. Tollaslabdában 30:29 lezárja a szettet.">
                  <input id="cap" type="number" min="10" max="50" value={form.cap} onChange={(e) => update('cap', e.target.value)} />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Nevezési díj" subtitle="Adminisztratív nyilvántartás, nem online fizetési rendszer.">
              <div className="form-grid form-grid--two">
                <FormField label="Van nevezési díj" htmlFor="entryFeeEnabled" hintText="Ha be van kapcsolva, minden nevezéshez létrejön egy adminisztratív díjstátusz, amely külön kezelhető a nevezések között.">
                  <select id="entryFeeEnabled" value={String(form.entryFeeEnabled)} onChange={(e) => update('entryFeeEnabled', e.target.value === 'true')}>
                    <option value="false">Nincs</option>
                    <option value="true">Van</option>
                  </select>
                </FormField>
                <FormField label="Nevezési díj összege (Ft)" htmlFor="entryFeeAmount" hintText="Csak adminisztratív nyilvántartásként szolgál. A rendszer nem kezel valódi banki tranzakciót.">
                  <input id="entryFeeAmount" type="number" min="0" step="100" value={form.entryFeeAmount} onChange={(e) => update('entryFeeAmount', e.target.value)} disabled={!form.entryFeeEnabled} />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard title="Hivatalos személyek" subtitle="A játékvezetők a teljes verseny globális erőforrásai, nem kategóriánként kezelendők.">
              <div className="form-grid">
                <FormField label="Játékvezetők listája" htmlFor="refereesText" hintText="Adj meg egy nevet soronként. Ezek a nevek később a meccsekhez rendelhetők hozzá játékvezetőként.">
                  <textarea id="refereesText" value={form.refereesText} onChange={(e) => update('refereesText', e.target.value)} rows="6" placeholder={'Kovács Péter\nSzabó Anna\nNagy István'} />
                </FormField>
              </div>
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
          <SectionCard title="Gyors összesítő">
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
                <span className="key-value-list__label">Játékospihenő</span>
                <span className="key-value-list__value">{form.minRestPlayerMinutes} perc</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Szett rendszer</span>
                <span className="key-value-list__value">BO{form.bestOf}, {form.pointsToWin} pont</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Nevezési díj</span>
                <span className="key-value-list__value">{form.entryFeeEnabled ? `${form.entryFeeAmount} Ft` : 'nincs'}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Játékvezetők</span>
                <span className="key-value-list__value">{refereeCount}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Fontos megjegyzés" subtitle="Mit állítasz be ezen az oldalon?">
            <ul className="bullet-list">
              <li>A teljes verseny globális kereteit és alapadatait.</li>
              <li>A scheduler kiindulási paramétereit (pályák, meccsidő, pihenők).</li>
              <li>A meccsszabályokat – ezek alapján validálja a backend az eredményeket.</li>
              <li>A játékvezetők globális listáját.</li>
              <li>A verseny indítása után az adatok már csak korlátosan módosíthatók.</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
