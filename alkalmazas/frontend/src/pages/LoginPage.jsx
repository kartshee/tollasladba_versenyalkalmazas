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
    <div>
      <div className="auth-heading">
        <h1>Bejelentkezés</h1>
        <p>Lépj be a versenykezelő admin felületre.</p>
      </div>

      <form className="stack-lg" onSubmit={handleSubmit}>
        <FormField label="E-mail" htmlFor="login-email">
          <input id="login-email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="nev@example.com" required />
        </FormField>

        <FormField label="Jelszó" htmlFor="login-password">
          <input id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Legalább 6 karakter" required />
        </FormField>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <button className="button button--primary button--block" type="submit" disabled={submitting}>
          {submitting ? 'Beléptetés...' : 'Belépés'}
        </button>
      </form>

      <p className="auth-footer-text">
        Még nincs fiókod? <AppLink to="/register">Regisztráció</AppLink>
      </p>
    </div>
  );
}
