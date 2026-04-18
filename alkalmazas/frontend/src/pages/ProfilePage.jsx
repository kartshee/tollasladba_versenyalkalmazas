import { useState } from 'react';
import { PageHeader } from '../components/PageHeader.jsx';
import { FormField } from '../components/FormField.jsx';
import { SectionCard } from '../components/SectionCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

export function ProfilePage() {
  const auth = useAuth();
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  function updatePw(key, value) {
    setPasswordForm((current) => ({ ...current, [key]: value }));
    setPwError('');
    setPwSuccess('');
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPwError('Az új jelszó és a megerősítés nem egyezik.');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPwError('Az új jelszónak legalább 6 karakter hosszúnak kell lennie.');
      return;
    }

    setPwBusy(true);
    try {
      await api.patch('/api/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      }, { token: auth.token });
      setPwSuccess('A jelszó sikeresen megváltozott.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwBusy(false);
    }
  }

  const user = auth.user;

  return (
    <div className="stack-xl">
      <PageHeader
        eyebrow="Profil"
        title="Fiókbeállítások"
        description="A bejelentkezési adatok és a jelszócsere kezelése."
      />

      <div className="page-grid">
        <div className="page-grid__main stack-lg">

          <SectionCard title="Fiók adatok" subtitle="A bejelentkezéshez használt adatok.">
            <div className="key-value-list">
              <div className="key-value-list__row">
                <span className="key-value-list__label">Név</span>
                <span className="key-value-list__value">{user?.name ?? '—'}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">E-mail</span>
                <span className="key-value-list__value">{user?.email ?? '—'}</span>
              </div>
              <div className="key-value-list__row">
                <span className="key-value-list__label">Szerepkör</span>
                <span className="key-value-list__value">{user?.role ?? '—'}</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Jelszó módosítása" subtitle="A jelszó megváltoztatásához meg kell adni a jelenlegi jelszót is.">
            {pwError ? <div className="alert alert--error" style={{ marginBottom: '1rem' }}>{pwError}</div> : null}
            {pwSuccess ? <div className="alert alert--success" style={{ marginBottom: '1rem' }}>{pwSuccess}</div> : null}

            <form className="stack-lg" onSubmit={handlePasswordChange}>
              <div className="form-grid form-grid--two">
                <FormField label="Jelenlegi jelszó" htmlFor="currentPassword">
                  <input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => updatePw('currentPassword', e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </FormField>
                <FormField label="Új jelszó" htmlFor="newPassword">
                  <input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => updatePw('newPassword', e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </FormField>
                <FormField label="Új jelszó megerősítése" htmlFor="confirmPassword">
                  <input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => updatePw('confirmPassword', e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </FormField>
              </div>

              <div className="actions-row">
                <button className="button button--primary" type="submit" disabled={pwBusy}>
                  {pwBusy ? 'Mentés...' : 'Jelszó módosítása'}
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Kijelentkezés" subtitle="A munkamenet befejezése.">
            <button className="button button--danger-soft" type="button" onClick={auth.logout}>
              Kijelentkezés
            </button>
          </SectionCard>

        </div>

        <aside className="page-grid__side aside-stack">
          <SectionCard title="Biztonsági megjegyzések">
            <ul className="bullet-list">
              <li>A jelszó biztonságosan tárolt – nem látható visszafejtve.</li>
              <li>A jelszóváltoztatáshoz mindig szükséges a jelenlegi jelszó megadása.</li>
              <li>Legalább 6 karakteres jelszó szükséges.</li>
            </ul>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
