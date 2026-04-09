import { useEffect, useMemo, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { AppLink } from '../components/AppLink.jsx';
import { formatCurrency, formatStatusLabel, toneForStatus, normalizeSearch } from '../services/formatters.js';

const emptyEntryForm = {
  feeAmount: '',
  billingName: '',
  billingAddress: '',
  paid: false,
  paymentGroupId: '',
};

export function EntriesPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [tournament, setTournament] = useState(null);
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentGroups, setPaymentGroups] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quickAdd, setQuickAdd] = useState({ name: '', club: '', categoryId: '' });
  const [filters, setFilters] = useState({ categoryId: '', paid: 'all', search: '' });
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [entryForm, setEntryForm] = useState(emptyEntryForm);
  const [paymentForm, setPaymentForm] = useState({ payerName: '', billingName: '', billingAddress: '', paid: false, entryIdsText: '' });

  async function loadAll() {
    const [tournamentData, entriesData, categoriesData, paymentData] = await Promise.all([
      api.get(`/api/tournaments/${id}`, { token: auth.token }),
      api.get(`/api/entries?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/categories?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/payment-groups?tournamentId=${id}`, { token: auth.token }),
    ]);

    setTournament(tournamentData);
    setEntries(entriesData);
    setCategories(categoriesData);
    setPaymentGroups(paymentData);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAll()
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [auth.token, id]);

  const filteredEntries = useMemo(() => {
    const search = normalizeSearch(filters.search);
    return entries.filter((entry) => {
      if (filters.categoryId && String(entry.categoryId?._id ?? entry.categoryId) !== filters.categoryId) return false;
      if (filters.paid === 'paid' && !entry.paid) return false;
      if (filters.paid === 'unpaid' && entry.paid) return false;
      if (!search) return true;
      const haystack = [
        entry.playerId?.name,
        entry.playerId?.club,
        entry.categoryId?.name,
        entry.paymentGroupId?.payerName,
        entry.billingName,
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }, [entries, filters]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((entry) => String(entry._id) === String(selectedEntryId)) ?? entries.find((entry) => String(entry._id) === String(selectedEntryId)) ?? null,
    [entries, filteredEntries, selectedEntryId],
  );

  useEffect(() => {
    if (!selectedEntry) {
      setEntryForm(emptyEntryForm);
      return;
    }
    setEntryForm({
      feeAmount: String(selectedEntry.feeAmount ?? ''),
      billingName: selectedEntry.billingName ?? '',
      billingAddress: selectedEntry.billingAddress ?? '',
      paid: Boolean(selectedEntry.paid),
      paymentGroupId: selectedEntry.paymentGroupId?._id ?? selectedEntry.paymentGroupId ?? '',
    });
  }, [selectedEntry]);

  const summary = useMemo(() => {
    const paidCount = entries.filter((entry) => entry.paid).length;
    const unpaidCount = entries.length - paidCount;
    const totalExpected = entries.reduce((sum, entry) => sum + Number(entry.feeAmount ?? 0), 0);
    const totalPaid = entries.filter((entry) => entry.paid).reduce((sum, entry) => sum + Number(entry.feeAmount ?? 0), 0);
    return { paidCount, unpaidCount, totalExpected, totalPaid };
  }, [entries]);

  async function refreshAndKeepSelection(nextSelectedId = selectedEntryId) {
    await loadAll();
    setSelectedEntryId(nextSelectedId ?? '');
  }

  async function handleCreatePlayer(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/players', {
        tournamentId: id,
        categoryId: quickAdd.categoryId || null,
        name: quickAdd.name,
        club: quickAdd.club,
      }, { token: auth.token });
      setQuickAdd({ name: '', club: '', categoryId: quickAdd.categoryId || '' });
      await refreshAndKeepSelection('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateEntry(event) {
    event.preventDefault();
    if (!selectedEntry) return;
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/api/entries/${selectedEntry._id}`, {
        feeAmount: Number(entryForm.feeAmount || 0),
        paid: entryForm.paid,
        billingName: entryForm.billingName,
        billingAddress: entryForm.billingAddress,
        paymentGroupId: entryForm.paymentGroupId || null,
      }, { token: auth.token });
      await refreshAndKeepSelection(selectedEntry._id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickPaidToggle(entry) {
    try {
      await api.patch(`/api/entries/${entry._id}`, { paid: !entry.paid }, { token: auth.token });
      await refreshAndKeepSelection(entry._id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreatePaymentGroup(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const entryIds = paymentForm.entryIdsText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

      await api.post('/api/payment-groups', {
        tournamentId: id,
        payerName: paymentForm.payerName,
        billingName: paymentForm.billingName,
        billingAddress: paymentForm.billingAddress,
        paid: paymentForm.paid,
        entryIds,
      }, { token: auth.token });

      setPaymentForm({ payerName: '', billingName: '', billingAddress: '', paid: false, entryIdsText: '' });
      await refreshAndKeepSelection(selectedEntryId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-xl">
      <BackLink to={`/tournaments/${id}`}>Vissza a versenyhez</BackLink>
      <PageHeader
        eyebrow="Nevezések"
        title="Játékosok, nevezések és díjak"
        description="A nevezések itt már nem csak játékoslistaként jelennek meg. Látható a kategória, a díjstátusz, a számlázás és a csoportos befizetés is."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <div className="page-grid">
        <div className="page-grid__main stack-lg">
          <SectionCard title="Szűrés és gyors felvétel" subtitle="Frontend teszthez és adminisztrációhoz is ez a legfontosabb belépési pont.">
            <div className="two-column-grid">
              <form className="stack-md" onSubmit={handleCreatePlayer}>
                <div className="section-card__title-row"><h3>Új játékos felvétele</h3></div>
                <div className="form-grid form-grid--three">
                  <FormField label="Név" htmlFor="entry-name">
                    <input id="entry-name" value={quickAdd.name} onChange={(e) => setQuickAdd((state) => ({ ...state, name: e.target.value }))} required />
                  </FormField>
                  <FormField label="Klub" htmlFor="entry-club">
                    <input id="entry-club" value={quickAdd.club} onChange={(e) => setQuickAdd((state) => ({ ...state, club: e.target.value }))} />
                  </FormField>
                  <FormField label="Kategória" htmlFor="entry-category" hintText="A játékos létrehozásakor rögtön hozzárendelhető egy kategóriához. Ha a kategória már lezárt draw állapotban van, a játékos később csak friendly státuszban kerülhet be.">
                    <select id="entry-category" value={quickAdd.categoryId} onChange={(e) => setQuickAdd((state) => ({ ...state, categoryId: e.target.value }))} required>
                      <option value="">Kategória kiválasztása</option>
                      {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                    </select>
                  </FormField>
                </div>
                <div className="actions-row">
                  <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Mentés...' : 'Játékos hozzáadása'}</button>
                </div>
              </form>

              <div className="stack-md">
                <div className="section-card__title-row"><h3>Lista szűrése</h3></div>
                <div className="form-grid form-grid--three">
                  <FormField label="Kategória" htmlFor="entries-filter-category">
                    <select id="entries-filter-category" value={filters.categoryId} onChange={(e) => setFilters((state) => ({ ...state, categoryId: e.target.value }))}>
                      <option value="">Összes kategória</option>
                      {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Fizetés" htmlFor="entries-filter-paid">
                    <select id="entries-filter-paid" value={filters.paid} onChange={(e) => setFilters((state) => ({ ...state, paid: e.target.value }))}>
                      <option value="all">Összes</option>
                      <option value="paid">Befizetett</option>
                      <option value="unpaid">Nincs befizetve</option>
                    </select>
                  </FormField>
                  <FormField label="Keresés" htmlFor="entries-filter-search">
                    <input id="entries-filter-search" value={filters.search} onChange={(e) => setFilters((state) => ({ ...state, search: e.target.value }))} placeholder="Név, klub, kategória" />
                  </FormField>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Nevezési lista" subtitle={loading ? 'Betöltés...' : `${filteredEntries.length} megjelenített nevezés`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Játékos</th>
                  <th>Kategória</th>
                  <th>Klub</th>
                  <th>Fizetett</th>
                  <th>Összeg</th>
                  <th>Payment group</th>
                  <th>Művelet</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => {
                  const active = String(selectedEntryId) === String(entry._id);
                  return (
                    <tr key={entry._id} className={active ? 'data-table__row--active' : ''}>
                      <td>
                        <button className="text-button" type="button" onClick={() => setSelectedEntryId(entry._id)}>
                          {entry.playerId?.name ?? 'Ismeretlen játékos'}
                        </button>
                      </td>
                      <td>{entry.categoryId?.name ?? '—'}</td>
                      <td>{entry.playerId?.club || '—'}</td>
                      <td>
                        <StatusBadge tone={entry.paid ? 'success' : 'warning'}>
                          {entry.paid ? 'befizetve' : 'nincs befizetve'}
                        </StatusBadge>
                      </td>
                      <td>{formatCurrency(entry.feeAmount)}</td>
                      <td>{entry.paymentGroupId?.payerName || '—'}</td>
                      <td>
                        <div className="inline-actions">
                          <button className="button button--ghost" type="button" onClick={() => setSelectedEntryId(entry._id)}>
                            Szerkesztés
                          </button>
                          <button className="button button--ghost" type="button" onClick={() => handleQuickPaidToggle(entry)}>
                            {entry.paid ? 'Visszaállít' : 'Fizetett'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="muted">Nincs a szűrésnek megfelelő nevezés.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </SectionCard>
        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Összesítő" subtitle={tournament ? `${tournament.name}` : 'Verseny összesítés'}>
            <div className="key-value-list">
              <div className="key-value-list__row"><span className="key-value-list__label">Összes nevezés</span><span className="key-value-list__value">{entries.length}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Befizetett</span><span className="key-value-list__value">{summary.paidCount}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Hátralékos</span><span className="key-value-list__value">{summary.unpaidCount}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Elvárt bevétel</span><span className="key-value-list__value">{formatCurrency(summary.totalExpected)}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Rögzített bevétel</span><span className="key-value-list__value">{formatCurrency(summary.totalPaid)}</span></div>
              <div className="key-value-list__row"><span className="key-value-list__label">Fizetési csoportok</span><span className="key-value-list__value">{paymentGroups.length}</span></div>
            </div>
          </SectionCard>

          <SectionCard title="Kijelölt nevezés" subtitle="A jobb oldali panelen szerkeszthetők a fizetési adatok.">
            {!selectedEntry ? (
              <div className="muted">Válassz ki egy nevezést a táblázatból.</div>
            ) : (
              <form className="stack-md" onSubmit={handleUpdateEntry}>
                <div className="readonly-field">
                  <span className="readonly-field__label">Játékos</span>
                  <strong>{selectedEntry.playerId?.name}</strong>
                  <span className="readonly-field__help">{selectedEntry.categoryId?.name ?? 'Kategória nélkül'}</span>
                </div>
                <FormField label="Díjösszeg" htmlFor="entry-fee-amount">
                  <input id="entry-fee-amount" type="number" min="0" step="100" value={entryForm.feeAmount} onChange={(e) => setEntryForm((state) => ({ ...state, feeAmount: e.target.value }))} />
                </FormField>
                <FormField label="Payment group" htmlFor="entry-payment-group" hintText="Ha egy klub vagy csapat egyben fizeti a nevezéseket, itt rendelhető a nevezés egy közös fizetési csoporthoz.">
                  <select id="entry-payment-group" value={entryForm.paymentGroupId} onChange={(e) => setEntryForm((state) => ({ ...state, paymentGroupId: e.target.value }))}>
                    <option value="">Nincs hozzárendelve</option>
                    {paymentGroups.map((group) => <option key={group._id} value={group._id}>{group.payerName}</option>)}
                  </select>
                </FormField>
                <FormField label="Számlázási név" htmlFor="entry-billing-name">
                  <input id="entry-billing-name" value={entryForm.billingName} onChange={(e) => setEntryForm((state) => ({ ...state, billingName: e.target.value }))} />
                </FormField>
                <FormField label="Számlázási cím" htmlFor="entry-billing-address">
                  <textarea id="entry-billing-address" rows="3" value={entryForm.billingAddress} onChange={(e) => setEntryForm((state) => ({ ...state, billingAddress: e.target.value }))} />
                </FormField>
                <label className="checkbox-row">
                  <input type="checkbox" checked={entryForm.paid} onChange={(e) => setEntryForm((state) => ({ ...state, paid: e.target.checked }))} />
                  <span>Befizetve</span>
                </label>
                <div className="actions-row">
                  <button className="button button--primary button--block" type="submit" disabled={submitting}>Mentés</button>
                </div>
              </form>
            )}
          </SectionCard>

          <SectionCard title="Új payment group" subtitle="Csoportos befizetések adminisztratív kezelése.">
            <form className="stack-md" onSubmit={handleCreatePaymentGroup}>
              <FormField label="Fizető neve" htmlFor="payment-payer-name">
                <input id="payment-payer-name" value={paymentForm.payerName} onChange={(e) => setPaymentForm((state) => ({ ...state, payerName: e.target.value }))} required />
              </FormField>
              <FormField label="Számlázási név" htmlFor="payment-billing-name">
                <input id="payment-billing-name" value={paymentForm.billingName} onChange={(e) => setPaymentForm((state) => ({ ...state, billingName: e.target.value }))} />
              </FormField>
              <FormField label="Számlázási cím" htmlFor="payment-billing-address">
                <textarea id="payment-billing-address" rows="2" value={paymentForm.billingAddress} onChange={(e) => setPaymentForm((state) => ({ ...state, billingAddress: e.target.value }))} />
              </FormField>
              <FormField label="Nevezés ID-k (soronként)" htmlFor="payment-entry-ids" hintText="Opcionális. Ha megadod, a felsorolt nevezések automatikusan ehhez a payment grouphoz lesznek rendelve.">
                <textarea id="payment-entry-ids" rows="3" value={paymentForm.entryIdsText} onChange={(e) => setPaymentForm((state) => ({ ...state, entryIdsText: e.target.value }))} placeholder="6612...\n6613..." />
              </FormField>
              <label className="checkbox-row">
                <input type="checkbox" checked={paymentForm.paid} onChange={(e) => setPaymentForm((state) => ({ ...state, paid: e.target.checked }))} />
                <span>Fizetve</span>
              </label>
              <button className="button button--secondary button--block" type="submit" disabled={submitting}>Payment group létrehozása</button>
            </form>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
