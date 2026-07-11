import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSpaceStore } from './stores/spaceStore';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Onboarding } from './pages/Onboarding';
import { InviteAcceptPage } from './pages/InviteAcceptPage';

// Heavy routes — code-split to keep initial bundle lean
const TwoFactorPage       = lazy(() => import('./pages/TwoFactorPage').then(m => ({ default: m.TwoFactorPage })));
const AdminShell          = lazy(() => import('./components/admin/AdminShell').then(m => ({ default: m.AdminShell })));
const UserSettingsModal   = lazy(() => import('./components/modals/UserSettingsModal').then(m => ({ default: m.UserSettingsModal })));
const TwoFactorSetupModal = lazy(() => import('./components/modals/TwoFactorSetupModal').then(m => ({ default: m.TwoFactorSetupModal })));

// ── Guards ──────────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore(s => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user);
  if (!user?.is_admin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

// ── Onboarding redirect ──────────────────────────────────────────────────────
// After auth, if the user has no spaces yet, push them to /onboarding.

function OnboardingRedirect() {
  const spaces      = useSpaceStore(s => s.spaces);
  const fetchSpaces = useSpaceStore(s => s.fetchSpaces);
  const navigate    = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpaces()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
  }, [fetchSpaces]);

  useEffect(() => {
    if (!loading && spaces.length === 0) {
      navigate('/onboarding', { replace: true });
    }
  }, [spaces.length, loading, navigate]);

  if (loading) return <PageSpinner />;
  return null;
}

// ── Loading fallback ─────────────────────────────────────────────────────────

function PageSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100vw', height: '100dvh', background: 'var(--canvas)',
      color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
      fontSize: 13, letterSpacing: '0.08em',
    }}>
      loading…
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export function App() {
  const { accessToken, refresh } = useAuthStore();

  // Attempt silent token refresh on cold load (persisted refresh_token)
  useEffect(() => {
    if (!accessToken) refresh();
  }, []);

  return (
    <Suspense fallback={<PageSpinner />}>
      <Routes>
        {/* ── Public ── */}
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/register"      element={<RegisterPage />} />
        <Route path="/2fa"           element={<TwoFactorPage />} />
        <Route path="/invite/:code"  element={<InviteAcceptPage />} />

        {/* ── Onboarding (auth required, runs before /app) ── */}
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />

        {/* ── Settings (rendered as overlays inside AppShell) ── */}
        <Route
          path="/settings/profile"
          element={
            <RequireAuth>
              <AppShell />
              <UserSettingsModal />
            </RequireAuth>
          }
        />
        <Route
          path="/settings/2fa"
          element={
            <RequireAuth>
              <AppShell />
              <TwoFactorSetupModal />
            </RequireAuth>
          }
        />

        {/* ── Admin ── */}
        <Route
          path="/admin/*"
          element={
            <RequireAuth>
              <RequireAdmin>
                <AdminShell />
              </RequireAdmin>
            </RequireAuth>
          }
        />

        {/* ── App shell (catch-all protected) ── */}
        <Route
          path="/app/*"
          element={
            <RequireAuth>
              <OnboardingRedirect />
              <AppShell />
            </RequireAuth>
          }
        />

        {/* ── Root redirect ── */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* ── 404 ── */}
        <Route
          path="*"
          element={
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              width: '100vw', height: '100dvh',
              background: 'var(--canvas)', gap: 16,
              fontFamily: 'var(--font-display)',
            }}>
              <span style={{ fontSize: 64, opacity: 0.15 }}>404</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 14, letterSpacing: '0.06em' }}>
                This route does not exist.
              </span>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
}
