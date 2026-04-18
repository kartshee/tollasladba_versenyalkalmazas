import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AdminPage } from '../pages/AdminPage.jsx';
import { BoardPage } from '../pages/BoardPage.jsx';
import { CategoriesPage } from '../pages/CategoriesPage.jsx';
import { CategoryDetailPage } from '../pages/CategoryDetailPage.jsx';
import { CategoryFormPage } from '../pages/CategoryFormPage.jsx';
import { CheckinPage } from '../pages/CheckinPage.jsx';
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { EntriesPage } from '../pages/EntriesPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { MatchesPage } from '../pages/MatchesPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { PaymentsPage } from '../pages/PaymentsPage.jsx';
import { PlayoffPage } from '../pages/PlayoffPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { SchedulePage } from '../pages/SchedulePage.jsx';
import { StandingsPage } from '../pages/StandingsPage.jsx';
import { TournamentCreatePage } from '../pages/TournamentCreatePage.jsx';
import { TournamentOverviewPage } from '../pages/TournamentOverviewPage.jsx';

const RouterContext = createContext(null);

const routes = [
  { path: '/login', component: LoginPage, layout: 'auth', access: 'guest' },
  { path: '/register', component: RegisterPage, layout: 'auth', access: 'guest' },
  { path: '/', component: DashboardPage, layout: 'app', access: 'private' },
  { path: '/profile', component: ProfilePage, layout: 'app', access: 'private' },
  { path: '/tournaments/new', component: TournamentCreatePage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id', component: TournamentOverviewPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/categories', component: CategoriesPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/categories/new', component: CategoryFormPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/categories/:categoryId', component: CategoryDetailPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/categories/:categoryId/edit', component: CategoryFormPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/categories/:categoryId/standings', component: StandingsPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/categories/:categoryId/playoff', component: PlayoffPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/entries', component: EntriesPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/payments', component: PaymentsPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/checkin', component: CheckinPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/matches', component: MatchesPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/schedule', component: SchedulePage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/board', component: BoardPage, layout: 'app', access: 'private' },
  { path: '/tournaments/:id/admin', component: AdminPage, layout: 'app', access: 'private' },
];

function normalizePath(pathname) {
  if (!pathname) return '/';
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

function matchPath(pathname, pattern) {
  const actual = normalizePath(pathname).split('/').filter(Boolean);
  const target = normalizePath(pattern).split('/').filter(Boolean);

  if (actual.length !== target.length) return null;

  const params = {};
  for (let i = 0; i < target.length; i += 1) {
    const segment = target[i];
    const value = actual[i];

    if (segment.startsWith(':')) {
      params[segment.slice(1)] = decodeURIComponent(value);
      continue;
    }

    if (segment !== value) {
      return null;
    }
  }

  return params;
}

function getRoute(pathname) {
  for (const route of routes) {
    const params = matchPath(pathname, route.path);
    if (params) return { ...route, params };
  }
  return null;
}

function useBrowserRouter() {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setPathname(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    const next = normalizePath(to);
    if (next === pathname) return;
    if (replace) window.history.replaceState({}, '', next);
    else window.history.pushState({}, '', next);
    setPathname(next);
  }, [pathname]);

  return { pathname, navigate };
}

function Provider({ children }) {
  const router = useBrowserRouter();
  const value = useMemo(() => router, [router]);
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

function useRouter() {
  const value = useContext(RouterContext);
  if (!value) throw new Error('useRouter must be used inside AppRouter.Provider');
  return value;
}

export const AppRouter = {
  Provider,
  match: getRoute,
  NotFound: NotFoundPage,
};

export { useRouter };
