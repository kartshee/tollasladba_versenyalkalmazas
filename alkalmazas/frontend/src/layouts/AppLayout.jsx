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

function getContext(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const tournamentsIndex = parts.indexOf('tournaments');
  if (tournamentsIndex === -1 || !parts[tournamentsIndex + 1]) return null;
  const tournamentId = parts[tournamentsIndex + 1];
  return {
    tournamentId,
    categoryId: parts.includes('categories') && parts[parts.indexOf('categories') + 1] && parts[parts.indexOf('categories') + 1] !== 'new'
      ? parts[parts.indexOf('categories') + 1]
      : null,
  };
}

export function AppLayout({ children }) {
  const auth = useAuth();
  const { pathname } = useRouter();
  const context = getContext(pathname);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand-mark brand-mark--small">TB</div>
          <div>
            <div className="sidebar__title">Tollas admin</div>
            <div className="sidebar__subtitle">Egyszerű, gyors versenykezelés</div>
          </div>
        </div>

        <div className="sidebar__section">
          <div className="sidebar__section-title">Általános</div>
          <nav className="sidebar__nav">
            <MainNavLink to="/" label="Főoldal" />
            <MainNavLink to="/tournaments/new" label="Új verseny" />
          </nav>
        </div>

        {context ? (
          <div className="sidebar__section">
            <div className="sidebar__section-title">Aktuális verseny</div>
            <nav className="sidebar__nav">
              <MainNavLink to={`/tournaments/${context.tournamentId}`} label="Áttekintés" />
              <MainNavLink to={`/tournaments/${context.tournamentId}/categories`} label="Kategóriák" />
              <MainNavLink to={`/tournaments/${context.tournamentId}/entries`} label="Nevezések" />
              <MainNavLink to={`/tournaments/${context.tournamentId}/checkin`} label="Check-in" />
              <MainNavLink to={`/tournaments/${context.tournamentId}/matches`} label="Meccsek" />
              <MainNavLink to={`/tournaments/${context.tournamentId}/schedule`} label="Ütemezés" />
              <MainNavLink to={`/tournaments/${context.tournamentId}/board`} label="Board" />
              {context.categoryId ? (
                <>
                  <MainNavLink to={`/tournaments/${context.tournamentId}/categories/${context.categoryId}`} label="Kategória műveletek" />
                  <MainNavLink to={`/tournaments/${context.tournamentId}/categories/${context.categoryId}/standings`} label="Standings" />
                  <MainNavLink to={`/tournaments/${context.tournamentId}/categories/${context.categoryId}/playoff`} label="Playoff" />
                </>
              ) : null}
            </nav>
          </div>
        ) : null}

        <div className="sidebar__footer">
          <div className="sidebar__user-card">
            <div className="sidebar__user-name">{auth.user?.name ?? 'Bejelentkezett felhasználó'}</div>
            <div className="sidebar__user-email">{auth.user?.email ?? 'admin'}</div>
          </div>
          <button className="button button--danger-soft button--block" type="button" onClick={auth.logout}>
            Kijelentkezés
          </button>
        </div>
      </aside>

      <div className="app-shell__content">
        <header className="topbar">
          <div>
            <div className="topbar__title">Tollaslabda versenykezelő rendszer</div>
            <div className="topbar__subtitle">Intuitív admin felület döntnököknek és versenyszervezőknek</div>
          </div>
          <div className="topbar__meta">Navy blue admin UI</div>
        </header>
        <main className="page-content">
          <div className="content-wrap">{children}</div>
        </main>
      </div>
    </div>
  );
}
