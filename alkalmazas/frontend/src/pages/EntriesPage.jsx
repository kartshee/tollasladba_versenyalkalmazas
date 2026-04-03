import { useEffect, useState } from 'react';
import { BackLink, PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function EntriesPage({ params }) {
  const { id } = params;
  const auth = useAuth();
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', club: '', categoryId: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    const [entriesData, categoriesData] = await Promise.all([
      api.get(`/api/entries?tournamentId=${id}`, { token: auth.token }),
      api.get(`/api/categories?tournamentId=${id}`, { token: auth.token }),
    ]);
    setEntries(entriesData);
    setCategories(categoriesData);
  }

  useEffect(() => {
    loadAll().catch((err) => setError(err.message));
  }, [auth.token, id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/players', {
        tournamentId: id,
        categoryId: form.categoryId || null,
        name: form.name,
        club: form.club,
      }, { token: auth.token });
      setForm({ name: '', club: '', categoryId: '' });
      await loadAll();
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
        title="Játékosok és nevezési díjak"
        description="Az első frontend körben itt már felvehető játékos, láthatók a nevezések és a fizetési státuszok."
      />

      {error ? <div className="alert alert--error">{error}</div> : null}

      <SectionCard title="Új játékos felvétele">
        <form className="form-grid form-grid--three" onSubmit={handleSubmit}>
          <FormField label="Név" htmlFor="entry-name">
            <input id="entry-name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
          </FormField>
          <FormField label="Klub" htmlFor="entry-club">
            <input id="entry-club" value={form.club} onChange={(e) => setForm((s) => ({ ...s, club: e.target.value }))} />
          </FormField>
          <FormField label="Kategória" htmlFor="entry-category">
            <select id="entry-category" value={form.categoryId} onChange={(e) => setForm((s) => ({ ...s, categoryId: e.target.value }))}>
              <option value="">Kategória kiválasztása</option>
              {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
          </FormField>
          <div className="actions-row actions-row--compact">
            <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? 'Mentés...' : 'Játékos hozzáadása'}</button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Nevezések listája">
        <table className="data-table">
          <thead>
            <tr>
              <th>Játékos</th>
              <th>Kategória</th>
              <th>Klub</th>
              <th>Fizetett</th>
              <th>Összeg</th>
              <th>Payment group</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry._id}>
                <td>{entry.playerId?.name}</td>
                <td>{entry.categoryId?.name}</td>
                <td>{entry.playerId?.club || '-'}</td>
                <td><StatusBadge tone={entry.paid ? 'success' : 'warning'}>{entry.paid ? 'igen' : 'nem'}</StatusBadge></td>
                <td>{entry.feeAmount ?? 0} Ft</td>
                <td>{entry.paymentGroupId?.payerName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
