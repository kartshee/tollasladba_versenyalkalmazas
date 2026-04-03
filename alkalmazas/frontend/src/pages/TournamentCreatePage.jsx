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
  entryFeeEnabled: false,
  entryFeeAmount: 0,
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
          entryFeeEnabled: Boolean(form.entryFeeEnabled),
          entryFeeAmount: Number(form.entryFeeEnabled ? form.entryFeeAmount : 0),
        },
      }, { token: auth.token });

      router.navigate(`/tournaments/${created._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-xl">
      <BackLink to="/">Vissza a dashboardra</BackLink>
      <PageHeader
        eyebrow="Új verseny"
        title="Verseny globális beállításai"
        description="Itt adhatók meg a verseny alapadatai, a globális erőforrások és a lebonyolítást befolyásoló fő paraméterek."
      />

      <form className="stack-xl" onSubmit={handleSubmit}>
        <SectionCard title="Alapadatok" subtitle="A verseny azonosító adatai.">
          <div className="form-grid form-grid--two">
            <FormField label="Verseny neve" htmlFor="name">
              <input id="name" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Például: Városi diákolimpia" />
            </FormField>
            <FormField label="Dátum" htmlFor="date">
              <input id="date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
            </FormField>
            <FormField label="Helyszín" htmlFor="location">
              <input id="location" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Például: Sportcsarnok, Szeged" />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Globális beállítások" subtitle="A scheduler és a versenynapi adminisztráció alapparaméterei.">
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
            <FormField label="Pályaforgatási idő (perc)" htmlFor="courtTurnoverMinutes" hintText="A meccsek közé beépíthető rövid technikai átmeneti idő, például eredménylap vagy pályarendezés miatt.">
              <input id="courtTurnoverMinutes" type="number" min="0" max="120" value={form.courtTurnoverMinutes} onChange={(e) => update('courtTurnoverMinutes', e.target.value)} />
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
  );
}
