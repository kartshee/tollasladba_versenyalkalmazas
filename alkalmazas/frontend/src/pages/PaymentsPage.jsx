import { useEffect, useMemo, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { StatCard } from '../components/StatCard.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const emptyForm = {
  payerName: '',
  billingName: '',
  billingAddress: '',
  paid: false,
  note: '',
  entryIds: [],
};

function PaymentGroupRow({ group, onSelect, selected }) {
  return (
    <tr className={selected ? 'data-table__row--active' : ''}>
      <td>
        <button className="text-button" type="button" onClick={() => onSelect(group)}>
          {group.payerName}
        </button>
      </td>
      <td>{group.billingName || '—'}</td>
      <td>{group.entriesCount ?? 0} nevezés</td>
      <td>
        <StatusBadge tone={group.paid ? 'success' : 'warning'}>
          {group.paid ? 'Befizetve' : 'Nem fizette be'}
        </StatusBadge>
      </td>
      <td>{group.note || '—'}</td>
      <td>
        <button className="button button--ghost" type="button" onClick={() => onSelect(group)}>
          Szerkesztés
        </button>
      </td>
    </tr>
  );
}

export function PaymentsPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [groups, setGroups] = useState([]);
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Selected group for editing
  const [editingGroup, setEditingGroup] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadAll() {
    const [groupsData, entriesData, categoriesData] = await Promise.all([
      api.get(`/api/payment-groups?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/entries?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/categories?tournamentId=${id}`, { token: auth.token }),
    ]);
    setGroups(groupsData);
    setEntries(entriesData);
    setCategories(categoriesData);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll()
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [auth.token, id]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [String(c._id), c.name])),
    [categories],
  );

  // Entries not yet in a payment group
  const ungroupedEntries = useMemo(
    () => entries.filter((e) => !e.paymentGroupId),
    [entries],
  );

  const summary = useMemo(() => ({
    total: groups.length,
    paid: groups.filter((g) => g.paid).length,
    unpaid: groups.filter((g) => !g.paid).length,
    totalEntries: entries.length,
    paidEntries: entries.filter((e) => e.paid).length,
  }), [groups, entries]);

  function openNew() {
    setEditingGroup(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(group) {
    setEditingGroup(group);
    // Find which entries belong to this group
    const groupEntryIds = entries
      .filter((e) => String(e.paymentGroupId) === String(group._id))
      .map((e) => String(e._id));
    setForm({
      payerName: group.payerName ?? '',
      billingName: group.billingName ?? '',
      billingAddress: group.billingAddress ?? '',
      paid: group.paid ?? false,
      note: group.note ?? '',
      entryIds: groupEntryIds,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingGroup(null);
    setForm(emptyForm);
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleEntry(entryId) {
    const sid = String(entryId);
    setForm((current) => ({
      ...current,
      entryIds: current.entryIds.includes(sid)
        ? current.entryIds.filter((x) => x !== sid)
        : [...current.entryIds, sid],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        tournamentId: id,
        payerName: form.payerName,
        billingName: form.billingName,
        billingAddress: form.billingAddress,
        paid: Boolean(form.paid),
        note: form.note,
        entryIds: form.entryIds,
      };

      if (editingGroup) {
        await api.patch(`/api/payment-groups/${editingGroup._id}`, payload, { token: auth.token });
      } else {
        await api.post('/api/payment-groups', payload, { token: auth.token });
      }

      await loadAll();
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // The entries that can be shown in form (current group's entries + ungrouped)
  const selectableEntries = useMemo(() => {
    if (!editingGroup) return ungroupedEntries;
    const groupEntryIds = new Set(form.entryIds);
    return entries.filter((e) => !e.paymentGroupId || groupEntryIds.has(String(e._id)));
  }, [editingGroup, entries, ungroupedEntries, form.entryIds]);

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Fizetési csoportok"
        title="Nevezési díj kezelés"
        description="A csoportos befizetések adminisztrációja. Egy fizetési csoport több nevezést fog össze, és jelzi, hogy ki és mikor egyenlítette ki a díjat."
        action={
          <button className="button button--primary" type="button" onClick={openNew}>
            Új fizetési csoport
          </button>
        }
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="stats-grid">
        <StatCard label="Fizetési csoportok" value={summary.total} />
        <StatCard label="Befizetve" value={summary.paid} />
        <StatCard label="Még nem fizette" value={summary.unpaid} />
        <StatCard label="Csoportosítatlan nevezések" value={ungroupedEntries.length} />
      </div>

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          {showForm ? (
            <SectionCard
              title={editingGroup ? 'Fizetési csoport szerkesztése' : 'Új fizetési csoport'}
              subtitle="A fizető neve, számlázási adatok és a hozzárendelt nevezések."
            >
              <form className="stack-lg" onSubmit={handleSubmit}>
                <div className="form-grid form-grid--two">
                  <FormField label="Fizető neve" htmlFor="payerName" hintText="A tényleges kifizető neve – ez jelenik meg a nyilvántartásban.">
                    <input id="payerName" value={form.payerName} onChange={(e) => update('payerName', e.target.value)} required placeholder="Például: Kecskeméti Tollas SE" />
                  </FormField>
                  <FormField label="Számlázási név" htmlFor="billingName">
                    <input id="billingName" value={form.billingName} onChange={(e) => update('billingName', e.target.value)} placeholder="Ha eltér a fizető nevétől" />
                  </FormField>
                  <FormField label="Számlázási cím" htmlFor="billingAddress">
                    <input id="billingAddress" value={form.billingAddress} onChange={(e) => update('billingAddress', e.target.value)} placeholder="Például: 6000 Kecskemét, Sport u. 1." />
                  </FormField>
                  <FormField label="Státusz" htmlFor="paid">
                    <select id="paid" value={String(form.paid)} onChange={(e) => update('paid', e.target.value === 'true')}>
                      <option value="false">Nem fizette be</option>
                      <option value="true">Befizetve</option>
                    </select>
                  </FormField>
                  <FormField label="Megjegyzés" htmlFor="note">
                    <input id="note" value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Opcionális megjegyzés" />
                  </FormField>
                </div>

                <div>
                  <h4 className="form-section-label">Hozzárendelt nevezések</h4>
                  <p className="hint-text">Jelöld be, mely nevezések tartoznak ehhez a fizetési csoporthoz.</p>
                  {selectableEntries.length === 0 ? (
                    <div className="muted">Nincs csoportosítható nevezés (az összes már más csoporthoz van rendelve).</div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Kiválasztva</th>
                          <th>Játékos neve</th>
                          <th>Kategória</th>
                          <th>Befizetve?</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectableEntries.map((entry) => (
                          <tr key={entry._id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={form.entryIds.includes(String(entry._id))}
                                onChange={() => toggleEntry(entry._id)}
                                style={{ width: 'auto' }}
                              />
                            </td>
                            <td>{entry.playerId?.name ?? entry.playerId ?? '—'}</td>
                            <td>{categoryMap.get(String(entry.categoryId?._id ?? entry.categoryId)) ?? '—'}</td>
                            <td>
                              <StatusBadge tone={entry.paid ? 'success' : 'warning'}>
                                {entry.paid ? 'igen' : 'nem'}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="actions-row">
                  <button className="button button--primary" type="submit" disabled={busy}>
                    {busy ? 'Mentés...' : editingGroup ? 'Módosítás mentése' : 'Csoport létrehozása'}
                  </button>
                  <button className="button button--ghost" type="button" onClick={closeForm}>
                    Mégse
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <SectionCard title="Fizetési csoportok listája" subtitle={loading ? 'Betöltés...' : `${groups.length} csoport összesen`}>
            {!loading && groups.length === 0 ? (
              <EmptyState
                title="Még nincs fizetési csoport"
                description="Hozz létre egy új csoportot, ha több nevezést egyszerre szeretnél nyilvántartani."
                action={<button className="button button--primary" type="button" onClick={openNew}>Első csoport létrehozása</button>}
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fizető neve</th>
                    <th>Számlázási név</th>
                    <th>Nevezések</th>
                    <th>Státusz</th>
                    <th>Megjegyzés</th>
                    <th>Művelet</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <PaymentGroupRow
                      key={group._id}
                      group={group}
                      onSelect={openEdit}
                      selected={editingGroup && String(editingGroup._id) === String(group._id)}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Összesítő">
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Összes csoport</span>
                <span className="key-value-list__value">{summary.total}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Befizetve</span>
                <span className="key-value-list__value">{summary.paid}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Hátralékos</span>
                <span className="key-value-list__value">{summary.unpaid}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Csoportosítatlan nevezések</span>
                <span className="key-value-list__value">{ungroupedEntries.length}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Hogyan működik?" subtitle="A fizetési csoport célja.">
            <ul className="bullet-list">
              <li>Egy csoport több nevezést fog össze egyetlen fizető alá.</li>
              <li>Tipikusan akkor hasznos, ha egy egyesület egyszerre fizeti be több játékos nevezési díját.</li>
              <li>A rendszer nem kezel tényleges banki tranzakciót – ez kizárólag adminisztratív nyilvántartás.</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
