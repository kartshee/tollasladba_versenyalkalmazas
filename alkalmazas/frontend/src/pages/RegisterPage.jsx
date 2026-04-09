import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../router/router.jsx';
import { AppLink } from '../components/AppLink.jsx';
import { FormField } from '../components/FormField.jsx';

export function RegisterPage() {
  const auth = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function setField(field) {
    return (e) => setForm((s) => ({ ...s, [field]: e.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('A két jelszó nem egyezik.');
      return;
    }
    setSubmitting(true);
    try {
      await auth.register({ name: form.name, email: form.email, password: form.password });
      router.navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-lg">
      <div className="auth-heading">
        <h1>Regisztráció</h1>
        <p>Hozz létre admin fiókot a saját versenyeid kezeléséhez.</p>
      </div>

      <form className="stack-md" onSubmit={handleSubmit}>
        <FormField label="Név" htmlFor="register-name">
          <input
            id="register-name"
            value={form.name}
            onChange={setField('name')}
            placeholder="Példa Elek"
            required
            autoComplete="name"
          />
        </FormField>

        <FormField label="E-mail" htmlFor="register-email">
          <input
            id="register-email"
            value={form.email}
            onChange={setField('email')}
            type="email"
            placeholder="nev@example.com"
            required
            autoComplete="email"
          />
        </FormField>

        <div className="form-grid form-grid--two">
          <FormField label="Jelszó" htmlFor="register-password">
            <input
              id="register-password"
              value={form.password}
              onChange={setField('password')}
              type="password"
              placeholder="Legalább 6 karakter"
              required
              autoComplete="new-password"
            />
          </FormField>

          <FormField label="Jelszó megerősítése" htmlFor="register-password-confirm">
            <input
              id="register-password-confirm"
              value={form.confirmPassword}
              onChange={setField('confirmPassword')}
              type="password"
              placeholder="Ismételd meg"
              required
              autoComplete="new-password"
            />
          </FormField>
        </div>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <button
          className="button button--primary button--block"
          type="submit"
          disabled={submitting}
          style={{ marginTop: '0.25rem' }}
        >
          {submitting ? 'Regisztráció...' : 'Fiók létrehozása'}
        </button>
      </form>

      <p className="auth-footer-text" style={{ textAlign: 'center' }}>
        Már van fiókod?{' '}
        <AppLink to="/login" className="text-link">
          Belépés
        </AppLink>
      </p>
    </div>
  );
}
