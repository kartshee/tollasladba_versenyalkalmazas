import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../router/router.jsx';
import { AppLink } from '../components/AppLink.jsx';
import { FormField } from '../components/FormField.jsx';

export function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await auth.login({ email, password });
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
        <h1>Bejelentkezés</h1>
        <p>Lépj be a versenykezelő admin felületre.</p>
      </div>

      <form className="stack-md" onSubmit={handleSubmit}>
        <FormField label="E-mail" htmlFor="login-email">
          <input
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="nev@example.com"
            required
            autoComplete="email"
          />
        </FormField>

        <FormField label="Jelszó" htmlFor="login-password">
          <input
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Jelszó"
            required
            autoComplete="current-password"
          />
        </FormField>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <button
          className="button button--primary button--block"
          type="submit"
          disabled={submitting}
          style={{ marginTop: '0.25rem' }}
        >
          {submitting ? 'Beléptetés...' : 'Belépés'}
        </button>
      </form>

      <p className="auth-footer-text" style={{ textAlign: 'center' }}>
        Még nincs fiókod?{' '}
        <AppLink to="/register" className="text-link">
          Regisztráció
        </AppLink>
      </p>
    </div>
  );
}
