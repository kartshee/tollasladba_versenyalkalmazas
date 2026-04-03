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
    <div>
      <div className="auth-heading">
        <h1>Regisztráció</h1>
        <p>Hozz létre admin fiókot a saját versenyeid kezeléséhez.</p>
      </div>

      <form className="stack-lg" onSubmit={handleSubmit}>
        <FormField label="Név" htmlFor="register-name">
          <input id="register-name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} placeholder="Példa Elek" required />
        </FormField>

        <FormField label="E-mail" htmlFor="register-email">
          <input id="register-email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} type="email" placeholder="nev@example.com" required />
        </FormField>

        <FormField label="Jelszó" htmlFor="register-password">
          <input id="register-password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} type="password" placeholder="Legalább 6 karakter" required />
        </FormField>

        <FormField label="Jelszó megerősítése" htmlFor="register-password-confirm">
          <input id="register-password-confirm" value={form.confirmPassword} onChange={(e) => setForm((s) => ({ ...s, confirmPassword: e.target.value }))} type="password" required />
        </FormField>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <button className="button button--primary button--block" type="submit" disabled={submitting}>
          {submitting ? 'Regisztráció...' : 'Regisztráció'}
        </button>
      </form>

      <p className="auth-footer-text">
        Már van fiókod? <AppLink to="/login">Belépés</AppLink>
      </p>
    </div>
  );
}
