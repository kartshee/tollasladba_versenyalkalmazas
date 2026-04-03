import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../router/router.jsx';
import { AppLink } from '../components/AppLink.jsx';

function MainNavLink({ to, label }) {
  const { pathname } = useRouter();
  const active = pathname === to || (to !== '/' && pathname.startsWith(to));
  return (
    <AppLink className={`sidebar-link ${active ? 'sidebar-link--active' : ''}`} to={to}>
      {label}
    </AppLink>
  );
}

export function AppLayout({ children }) {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__top">
          <div className="brand-mark brand-mark--small">TB</div>
          <div>
            <div className="sidebar__title">Versenyadmin</div>
            <div className="sidebar__subtitle">Navy blue admin felület</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          <MainNavLink to="/" label="Dashboard" />
          <MainNavLink to="/tournaments/new" label="Új verseny" />
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">{auth.user?.name ?? 'Bejelentkezett felhasználó'}</div>
          <button className="button button--ghost button--block" type="button" onClick={auth.logout}>
            Kijelentkezés
          </button>
        </div>
      </aside>

      <div className="app-shell__content">
        <header className="topbar">
          <div>
            <div className="topbar__title">Tollaslabda versenykezelő rendszer</div>
            <div className="topbar__subtitle">Gyors, stabil és erőforrástakarékos működésre tervezve</div>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
