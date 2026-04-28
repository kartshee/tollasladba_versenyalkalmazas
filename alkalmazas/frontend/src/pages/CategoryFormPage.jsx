import { useEffect, useMemo, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { useRouter } from '../router/router.jsx';

const initialForm = {
  name: '',
  gender: 'other',
  ageGroup: '',
  format: 'group+playoff',
  groupsCount: 1,
  groupSizeTarget: 8,
  groupStageMatchesPerPlayer: 5,
  qualifiersPerGroup: 4,
  playoffSize: 4,
  multiTiePolicy: 'direct_only',
  unresolvedTiePolicy: 'shared_place',
};

function HowItWorks({ open, onToggle }) {
  return (
    <div className={`howto-block${open ? ' howto-block--open' : ''}`}>
      <button className="howto-block__toggle" type="button" onClick={onToggle}>
        <span>Hogyan működnek a kategória beállítások?</span>
        <span className="howto-block__chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="howto-block__body">
          <p>
            Egy kategória önálló lebonyolítási egység a versenyen belül – például „Felnőtt férfi egyes" vagy „Vegyes páros U18".
            Minden kategóriának saját sorsolása, meccslistája és tabellája van.
          </p>

          <h4>Lebonyolítási formátumok</h4>
          <p>
            <strong>Csoportkör:</strong> a játékosok kis csoportokban körmérkőzéses alapon játszanak egymással. A végeredmény
            a tabellán látható, de nincs külön rájátszás. Akkor érdemes, ha a helyezés a cél, nem a bajnok kiemelése.
          </p>
          <p>
            <strong>Csoportkör + rájátszás:</strong> a leggyakoribb forma. Először csoportkör, majd a csoportokból
            a legjobb n játékos egyenes kieséses táblán méri össze tudását. A továbbjutók száma csoportonként beállítható.
          </p>
          <p>
            <strong>Egyenes kiesés:</strong> nincs csoportkör, a sorsolás egyből playoff táblát hoz létre.
            A rendszer pontosan annyi játékost vár, amennyi a táblaméret (pl. 8 vagy 16 fő).
          </p>

          <h4>Csonka round robin (részleges körmérkőzés)</h4>
          <p>
            Ha egy csoportban sok a játékos, a teljes körmérkőzés (mindenki mindenkivel) túl sok meccset eredményezne.
            A <em>meccsek száma játékosonként</em> beállítással ez korlátozható: például 10 fős csoportban 4-es értékkel
            mindenki csak 4 meccset játszik a lehetséges 9 helyett. A rendszer véletlenszerűen generálja a párokat,
            figyelve az egyenletes elosztásra.
          </p>

          <h4>Walkover (WO), feladás (FF) és sérülés (RET)</h4>
          <p>
            Ha egy játékos nem jelenik meg a meccsre, a meccset <strong>walkoverként (WO)</strong> lehet lezárni –
            a megjelent játékos kap győzelmet, de szetteredmény nem kerül rögzítésre.
            <strong> Feladás (FF)</strong> esetén a meccs elindult, de az egyik fél játék közben visszalépett.
            <strong> Sérülés (RET)</strong> a meccs közbeni kényszermegállást jelenti. Mindhárom esetben győztest
            kell jelölni, és a tabellaszámításban a rendszer külön kezeli ezeket a w.o. policy alapján.
          </p>

          <h4>Holtverseny (tie) feloldása</h4>
          <p>
            Ha két vagy több játékosnak azonos a győzelmi aránya a csoportkör végén, holtverseny keletkezik.
            A feloldás menete:
          </p>
          <p>
            <strong>1. Mini-tabella:</strong> csak az egymás elleni meccsek számítanak. Ha ez egyértelmű eredményt ad,
            a sorrend meghatározódik.
          </p>
          <p>
            <strong>2. Összes meccs statisztikája (ha engedélyezve van):</strong> ha a mini-tabella után is döntetlen
            a helyzet, beleszámít a szett-különbség és a pont-különbség az összes csoportmeccsből.
          </p>
          <p>
            <strong>3. Feloldhatatlan holtverseny:</strong> ha minden szempont után is azonos a két játékos,
            vagy közös helyezést adunk (pl. mindkettő „2. hely"), vagy manuális döntést kérünk az adminisztrátortól.
          </p>
        </div>
      )}
    </div>
  );
}

export function CategoryFormPage({ params }) {
  const { id, categoryId } = params;
  const auth = useAuth();
  const router = useRouter();
  const isEdit = Boolean(categoryId);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    async function load() {
      try {
        const category = await api.get(`/api/categories/${categoryId}`, { token: auth.token });
        if (!active) return;
        setForm({
          name: category.name ?? '',
          gender: category.gender ?? 'other',
          ageGroup: category.ageGroup ?? '',
          format: category.format ?? 'group+playoff',
          groupsCount: category.groupsCount ?? 1,
          groupSizeTarget: category.groupSizeTarget ?? 8,
          groupStageMatchesPerPlayer: category.groupStageMatchesPerPlayer ?? 5,
          qualifiersPerGroup: category.qualifiersPerGroup ?? 4,
          playoffSize: category.playoffSize ?? category.qualifiersPerGroup ?? 4,
          multiTiePolicy: category.multiTiePolicy ?? 'direct_only',
          unresolvedTiePolicy: category.unresolvedTiePolicy ?? 'shared_place',
        });
      } catch (err) {
        if (!active) return;
        setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [auth.token, categoryId, isEdit]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const effectivePlayoffSize = useMemo(() => {
    if (form.format === 'group+playoff') return Number(form.qualifiersPerGroup);
    if (form.format === 'playoff') return Number(form.playoffSize);
    return null;
  }, [form.format, form.playoffSize, form.qualifiersPerGroup]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      tournamentId: id,
      name: form.name,
      gender: form.gender,
      ageGroup: form.ageGroup,
      format: form.format,
      groupsCount: form.format === 'playoff' ? 1 : Number(form.groupsCount),
      groupSizeTarget: Number(form.groupSizeTarget),
      groupStageMatchesPerPlayer: form.format === 'playoff' ? null : Number(form.groupStageMatchesPerPlayer),
      qualifiersPerGroup: Number(form.qualifiersPerGroup),
      playoffSize: effectivePlayoffSize,
      multiTiePolicy: form.multiTiePolicy,
      unresolvedTiePolicy: form.unresolvedTiePolicy,
    };

    try {
      if (isEdit) {
        await api.patch(`/api/categories/${categoryId}`, payload, { token: auth.token });
      } else {
        await api.post('/api/categories', payload, { token: auth.token });
      }
      router.navigate(`/tournaments/${id}/categories`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="muted">Betöltés...</div>;

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}/categories`}>Vissza a kategóriákhoz</BackLink>
      <PageHeader
        eyebrow={isEdit ? 'Kategória szerkesztése' : 'Új kategória'}
        title={isEdit ? 'Kategória szerkesztése' : 'Új kategória létrehozása'}
        description="A kategória határozza meg a csoportkör, a továbbjutás és a rájátszás logikáját."
      />

      <HowItWorks open={helpOpen} onToggle={() => setHelpOpen((v) => !v)} />

      <form className="stack-xl" onSubmit={handleSubmit}>
        <SectionCard title="Alapadatok">
          <div className="form-grid form-grid--two">
            <FormField label="Kategória neve" htmlFor="category-name">
              <input id="category-name" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Például: Fiú egyéni U15" />
            </FormField>
            <FormField label="Nem" htmlFor="category-gender">
              <select id="category-gender" value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                <option value="male">Férfi</option>
                <option value="female">Női</option>
                <option value="mixed">Vegyes</option>
                <option value="other">Egyéb</option>
              </select>
            </FormField>
            <FormField label="Korosztály" htmlFor="category-ageGroup">
              <input id="category-ageGroup" value={form.ageGroup} onChange={(e) => update('ageGroup', e.target.value)} placeholder="Például: U15" />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Lebonyolítási forma">
          <div className="form-grid form-grid--two">
            <FormField label="Formátum" htmlFor="category-format" hintText="Válaszd ki a lebonyolítás módját. A súgóban részletes leírás olvasható mindhárom lehetőségről.">
              <select id="category-format" value={form.format} onChange={(e) => update('format', e.target.value)}>
                <option value="group">Csak csoportkör</option>
                <option value="group+playoff">Csoportkör + rájátszás</option>
                <option value="playoff">Csak egyenes kiesés</option>
              </select>
            </FormField>
            {form.format !== 'playoff' ? (
              <FormField label="Csoportok száma" htmlFor="category-groupsCount" hintText="A sorsolás lezárásakor ennyi csoportot hoz létre a rendszer. Ha 1, akkor a teljes mezőny egyetlen csoportban játszik.">
                <input id="category-groupsCount" type="number" min="1" max="32" value={form.groupsCount} onChange={(e) => update('groupsCount', e.target.value)} />
              </FormField>
            ) : null}
            <FormField label="Csoportlétszám célérték" htmlFor="category-groupSizeTarget" hintText="A sorsolás ennyi fős csoportokat próbál kialakítani. Befolyásolja a továbbjutás tervezését.">
              <input id="category-groupSizeTarget" type="number" min="2" max="64" value={form.groupSizeTarget} onChange={(e) => update('groupSizeTarget', e.target.value)} />
            </FormField>
            {form.format !== 'playoff' ? (
              <FormField label="Meccsek száma játékosonként" htmlFor="category-groupStageMatchesPerPlayer" hintText="Csonka round robin: mindenki ennyi csoportmeccset kap. Nagy mezőnynél így csökkenthető a meccsszám anélkül, hogy valaki ki lenne zárva a körmérkőzésből.">
                <input id="category-groupStageMatchesPerPlayer" type="number" min="1" max="100" value={form.groupStageMatchesPerPlayer} onChange={(e) => update('groupStageMatchesPerPlayer', e.target.value)} />
              </FormField>
            ) : null}
            <FormField label="Továbbjutók száma csoportonként" htmlFor="category-qualifiersPerGroup" hintText="Csoportkör + rájátszás esetén csoportonként ennyi játékos kerül a playoff táblára.">
              <input id="category-qualifiersPerGroup" type="number" min="1" max="32" value={form.qualifiersPerGroup} onChange={(e) => update('qualifiersPerGroup', e.target.value)} />
            </FormField>
            {form.format === 'playoff' ? (
              <FormField label="Playoff tábla mérete" htmlFor="category-playoffSize" hintText="Egyenes kieséses kategóriánál pontosan ennyi játékos indulhat. A sorsolás csak akkor fut le, ha a megfelelő számú játékos check-inelt.">
                <select id="category-playoffSize" value={form.playoffSize} onChange={(e) => update('playoffSize', e.target.value)}>
                  {[2, 4, 8, 16, 32].map((size) => <option key={size} value={size}>{size} fő</option>)}
                </select>
              </FormField>
            ) : (
              <div className="readonly-field">
                <span className="readonly-field__label">Playoff tábla mérete</span>
                <strong>{effectivePlayoffSize ?? '—'}</strong>
                <span className="readonly-field__help">Csoportkör + rájátszás esetén automatikusan a továbbjutók számából következik.</span>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Holtverseny szabály" subtitle="Mi döntsön, ha két játékos teljesen azonos eredménnyel zárja a csoportkört?">
          <div className="form-grid form-grid--two">
            <FormField label="Többfős holtverseny feloldása" htmlFor="category-multiTiePolicy" hintText="Mini-tabella (csak egymás elleni): ha a közvetlen meccsük egyértelmű eredményt ad, az dönt. Mini-tabella, majd összes meccs: ha a közvetlen meccs sem old fel, jön a szett- és pontkülönbség az összes meccsből.">
              <select id="category-multiTiePolicy" value={form.multiTiePolicy} onChange={(e) => update('multiTiePolicy', e.target.value)}>
                <option value="direct_only">Csak közvetlen meccs (mini-tabella)</option>
                <option value="direct_then_overall">Közvetlen meccs, majd összes statisztika</option>
              </select>
            </FormField>
            <FormField label="Feloldhatatlan holtverseny" htmlFor="category-unresolvedTiePolicy" hintText="Ha minden szempont után is azonos a sorrend, közös helyezést adhat a rendszer, vagy manuális döntést kérhet az adminisztrátortól.">
              <select id="category-unresolvedTiePolicy" value={form.unresolvedTiePolicy} onChange={(e) => update('unresolvedTiePolicy', e.target.value)}>
                <option value="shared_place">Közös helyezés</option>
                <option value="manual_override">Manuális döntés szükséges</option>
              </select>
            </FormField>
          </div>
        </SectionCard>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <div className="actions-row">
          <button className="button button--primary" type="submit" disabled={submitting}>
            {submitting ? 'Mentés...' : isEdit ? 'Módosítás mentése' : 'Kategória létrehozása'}
          </button>
        </div>
      </form>
    </div>
  );
}
