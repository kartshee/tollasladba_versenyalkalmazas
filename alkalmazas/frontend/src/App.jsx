import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AppRouter, useRouter } from './router/router.jsx';

function AppShell() {
  const auth = useAuth();
  const router = useRouter();
  const route = AppRouter.match(router.pathname);

  if (!route) {
    return (
      <AppLayout>
        <AppRouter.NotFound />
      </AppLayout>
    );
  }

  if (!auth.loading && route.access === 'private' && !auth.isAuthenticated) {
    router.navigate('/login', { replace: true });
    return null;
  }

  if (!auth.loading && route.access === 'guest' && auth.isAuthenticated) {
    router.navigate('/', { replace: true });
    return null;
  }

  const page = <route.component params={route.params} />;
  return route.layout === 'auth' ? <AuthLayout>{page}</AuthLayout> : <AppLayout>{page}</AppLayout>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter.Provider>
        <AppShell />
      </AppRouter.Provider>
    </AuthProvider>
  );
}
