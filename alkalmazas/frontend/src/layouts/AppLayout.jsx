import { useAuth } from '../context/AuthContext.jsx';
import { useRouter } from '../router/router.jsx';
import { AppLink } from '../components/AppLink.jsx';

function NavLink({ to, label, icon, exact = false }) {
  const { pathname } = useRouter();
  const normalizedTo = to.endsWith('/') && to !== '/' ? to.slice(0, -1) : to;
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
  const active = exact
    ? normalizedPath === normalizedTo
    : normalizedPath === normalizedTo || (normalizedTo !== '/' && normalizedPath.startsWith(`${normalizedTo}/`));
  return (
    <AppLink className={`sidebar-link${active ? ' sidebar-link--active' : ''}`} to={to}>
      {icon ? <span className="sidebar-link__icon">{icon}</span> : null}
      {label}
    </AppLink>
  );
}

function isObjectIdLike(value) {
  return /^[0-9a-fA-F]{24}$/.test(String(value ?? ''));
}

function getContext(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const ti = parts.indexOf('tournaments');
  if (ti === -1 || !parts[ti + 1]) return null;

  const tournamentId = parts[ti + 1];
  if (!isObjectIdLike(tournamentId)) return null;

  const ci = parts.indexOf('categories');
  const rawCategoryId = ci !== -1 && parts[ci + 1] && parts[ci + 1] !== 'new' ? parts[ci + 1] : null;
  const categoryId = rawCategoryId && isObjectIdLike(rawCategoryId) ? rawCategoryId : null;

  return { tournamentId, categoryId };
}

function userInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AppLayout({ children }) {
  const auth = useAuth();
  const { pathname } = useRouter();
  const ctx = getContext(pathname);
  const name = auth.user?.name ?? '';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="brand-mark brand-mark--small">TVR</div>
          <div>
            <div className="sidebar__title">TVR</div>
            <div className="sidebar__subtitle">Versenykezelő rendszer</div>
          </div>
        </div>

        <div className="sidebar__body">
          <div className="sidebar__section">
            <div className="sidebar__section-title">Főmenü</div>
            <nav className="sidebar__nav">
              <NavLink to="/" label="Főoldal" icon="⊞" />
              <NavLink to="/tournaments/new" label="Új verseny" icon="+" />
            </nav>
          </div>

          {ctx ? (
            <>
              <div className="sidebar__divider" />
              <div className="sidebar__section">
                <div className="sidebar__section-title">Aktuális verseny</div>
                <nav className="sidebar__nav">
                  <NavLink to={`/tournaments/${ctx.tournamentId}`} label="Áttekintés" icon="◈" exact />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/categories`} label="Kategóriák" icon="⊟" />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/entries`} label="Nevezések" icon="☰" />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/payments`} label="Befizetések" icon="$" />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/checkin`} label="Jelenlét" icon="✓" />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/matches`} label="Meccsek" icon="⚡" />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/schedule`} label="Ütemezés" icon="◷" />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/results`} label="Eredmények" icon="🏆" />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/board`} label="Kijelző" icon="▣" />
                  <NavLink to={`/tournaments/${ctx.tournamentId}/admin`} label="Export / napló" icon="↓" />
                </nav>
              </div>

              {ctx.categoryId ? (
                <>
                  <div className="sidebar__divider" />
                  <div className="sidebar__section">
                    <div className="sidebar__section-title">Kategória</div>
                    <nav className="sidebar__nav">
                      <NavLink to={`/tournaments/${ctx.tournamentId}/categories/${ctx.categoryId}`} label="Műveletek" icon="◇" exact />
                      <NavLink to={`/tournaments/${ctx.tournamentId}/categories/${ctx.categoryId}/standings`} label="Tabella" icon="≡" />
                      <NavLink to={`/tournaments/${ctx.tournamentId}/categories/${ctx.categoryId}/playoff`} label="Rájátszás" icon="⊳" />
                    </nav>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="sidebar__footer">
          <AppLink className="sidebar__profile-link" to="/profile">
            <div className="sidebar__user-card">
              <div className="sidebar__user-avatar">{userInitials(name)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="sidebar__user-name">{name || 'Felhasználó'}</div>
                <div className="sidebar__user-email">{auth.user?.email ?? ''}</div>
                <div className="sidebar__user-hint">Profil szerkesztése →</div>
              </div>
            </div>
          </AppLink>
          <button className="button button--danger-soft button--block button--sm" type="button" onClick={auth.logout}>
            Kijelentkezés
          </button>
        </div>
      </aside>

      <div className="app-shell__content">
        <header className="topbar">
          <div className="topbar__left">
            <span className="topbar__title">Tollaslabda Versenykezelő Rendszer</span>
            {ctx ? (
              <>
                <span className="topbar__sep">/</span>
                <span className="topbar__badge">Aktuális verseny</span>
              </>
            ) : null}
          </div>
          <span className="topbar__meta">Admin felület</span>
        </header>

        <main className="page-content">
          <div className="content-wrap">{children}</div>
        </main>
      </div>
    </div>
  );
}
