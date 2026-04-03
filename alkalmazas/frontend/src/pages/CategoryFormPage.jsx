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

export function CategoryFormPage({ params }) {
  const { id, categoryId } = params;
  const auth = useAuth();
  const router = useRouter();
  const isEdit = Boolean(categoryId);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
        description="A kategória határozza meg a csoportkör, a továbbjutás és a playoff logikáját."
      />

      <form className="stack-xl" onSubmit={handleSubmit}>
        <SectionCard title="Alapadatok">
          <div className="form-grid form-grid--two">
            <FormField label="Kategória neve" htmlFor="category-name">
              <input id="category-name" value={form.name} onChange={(e) => update('name', e.target.value)} required placeholder="Például: Fiú egyéni U15" />
            </FormField>
            <FormField label="Nem" htmlFor="category-gender">
              <select id="category-gender" value={form.gender} onChange={(e) => update('gender', e.target.value)}>
                <option value="male">férfi</option>
                <option value="female">női</option>
                <option value="mixed">vegyes</option>
                <option value="other">egyéb</option>
              </select>
            </FormField>
            <FormField label="Korosztály" htmlFor="category-ageGroup">
              <input id="category-ageGroup" value={form.ageGroup} onChange={(e) => update('ageGroup', e.target.value)} placeholder="Például: U15" />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard title="Lebonyolítási forma">
          <div className="form-grid form-grid--two">
            <FormField label="Formátum" htmlFor="category-format" hintText="A kategória lehet csak csoportkörös, csoportkörből playoffba vezető vagy eleve tisztán egyenes kieséses.">
              <select id="category-format" value={form.format} onChange={(e) => update('format', e.target.value)}>
                <option value="group">group</option>
                <option value="group+playoff">group+playoff</option>
                <option value="playoff">playoff</option>
              </select>
            </FormField>
            {form.format !== 'playoff' ? (
              <FormField label="Csoportok száma" htmlFor="category-groupsCount" hintText="A draw finalizálásakor ennyi csoportot próbál létrehozni a rendszer. Ha 1, akkor egyetlen csoportban marad a mezőny.">
                <input id="category-groupsCount" type="number" min="1" max="32" value={form.groupsCount} onChange={(e) => update('groupsCount', e.target.value)} />
              </FormField>
            ) : null}
            <FormField label="Csoportlétszám célérték" htmlFor="category-groupSizeTarget" hintText="A csoportkörös kategóriákban ez segíti a draw felosztását és a továbbjutás logikájának tervezését.">
              <input id="category-groupSizeTarget" type="number" min="2" max="64" value={form.groupSizeTarget} onChange={(e) => update('groupSizeTarget', e.target.value)} />
            </FormField>
            {form.format !== 'playoff' ? (
              <FormField label="Meccsek száma játékosonként" htmlFor="category-groupStageMatchesPerPlayer" hintText="Csonka round robin esetén ez határozza meg, hogy egy játékos hány csoportmeccset kapjon. Nagyobb mezőnynél így csökkenthető a teljes meccsszám.">
                <input id="category-groupStageMatchesPerPlayer" type="number" min="1" max="100" value={form.groupStageMatchesPerPlayer} onChange={(e) => update('groupStageMatchesPerPlayer', e.target.value)} />
              </FormField>
            ) : null}
            <FormField label="Továbbjutók száma" htmlFor="category-qualifiersPerGroup" hintText="Group+playoff esetben a csoportból ennyi játékos jut tovább a playoff ágra. A playoff mérete ehhez igazodik.">
              <input id="category-qualifiersPerGroup" type="number" min="1" max="32" value={form.qualifiersPerGroup} onChange={(e) => update('qualifiersPerGroup', e.target.value)} />
            </FormField>
            {form.format === 'playoff' ? (
              <FormField label="Playoff méret" htmlFor="category-playoffSize" hintText="Playoff-only kategóriánál ez adja meg a teljes egyenes kieséses tábla méretét. A jelenlegi backend csak pontosan ekkora indulólétszámot fogad el.">
                <select id="category-playoffSize" value={form.playoffSize} onChange={(e) => update('playoffSize', e.target.value)}>
                  {[2,4,8,16,32].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </FormField>
            ) : (
              <div className="readonly-field">
                <span className="readonly-field__label">Playoff méret</span>
                <strong>{effectivePlayoffSize ?? '-'}</strong>
                <span className="readonly-field__help">Group+playoff esetén a playoff méret automatikusan a továbbjutók számából következik.</span>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Tie-break policy">
          <div className="form-grid form-grid--two">
            <FormField label="Többfős holtverseny" htmlFor="category-multiTiePolicy" hintText="Beállítható, hogy több játékos holtversenyénél csak az egymás elleni mini-tabella számítson-e, vagy utána az összes meccs statisztikája is beleszóljon.">
              <select id="category-multiTiePolicy" value={form.multiTiePolicy} onChange={(e) => update('multiTiePolicy', e.target.value)}>
                <option value="direct_only">direct_only</option>
                <option value="direct_then_overall">direct_then_overall</option>
              </select>
            </FormField>
            <FormField label="Feloldhatatlan holtverseny" htmlFor="category-unresolvedTiePolicy" hintText="Ha minden sportszakmai szempont után is döntetlen marad a sorrend, akkor adható közös helyezés vagy szükséges manuális döntés.">
              <select id="category-unresolvedTiePolicy" value={form.unresolvedTiePolicy} onChange={(e) => update('unresolvedTiePolicy', e.target.value)}>
                <option value="shared_place">shared_place</option>
                <option value="manual_override">manual_override</option>
              </select>
            </FormField>
          </div>
        </SectionCard>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <div className="actions-row">
          <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Mentés...' : isEdit ? 'Módosítás mentése' : 'Kategória létrehozása'}</button>
        </div>
      </form>
    </div>
  );
}
