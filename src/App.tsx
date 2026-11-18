import React, { Component, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import type { PublicPayload, SocialLink } from './shared/types';
import { createDefaultPublicPayload } from './shared/defaultData';
import { fetchAuthStatus, fetchPublicData, trackLinkClick } from './services/dataClient';
import { PublicProfileView } from './components/PublicProfileView';
import { AuthGate } from './components/AuthGate';

const DashboardView = lazy(() =>
  import('./components/DashboardView').then((m) => ({ default: m.DashboardView })),
);

const CACHE_KEY = 'rawabiti_public_cache_v1';
const TOKEN_KEY = 'rawabiti_admin_token';

function readCachedPublic(): PublicPayload {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PublicPayload;
      if (parsed?.profile && Array.isArray(parsed?.links)) {
        return parsed;
      }
    }
  } catch {
    // Fallback to default below
  }
  return createDefaultPublicPayload();
}

function isAdminLocation(): boolean {
  return (
    window.location.hash === '#/admin' ||
    window.location.pathname === '/admin' ||
    window.location.pathname.endsWith('/admin')
  );
}

class AppErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F7F4] text-[#111315] flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h1 className="text-lg font-bold">تعذر عرض الصفحة</h1>
            <p className="text-sm text-slate-600">حدث خطأ غير متوقع. اضغط لإعادة تحميل الصفحة.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-xl cursor-pointer"
            >
              إعادة التحميل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [view, setView] = useState<'public' | 'admin'>(() =>
    isAdminLocation() ? 'admin' : 'public',
  );
  const [publicData, setPublicData] = useState<PublicPayload>(() => readCachedPublic());
  const [authStatus, setAuthStatus] = useState<{
    checked: boolean;
    isConfigured: boolean;
    authenticated: boolean;
  }>({ checked: false, isConfigured: false, authenticated: false });
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || '');

  const loadPublicData = useCallback(async (trackView = false) => {
    try {
      const payload = await fetchPublicData(trackView);
      setPublicData(payload);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore storage quota errors
      }
    } catch {
      // Keep current rendered data
    }
  }, []);

  const checkAuthStatus = useCallback(async (currentToken: string) => {
    try {
      const status = await fetchAuthStatus(currentToken);
      setAuthStatus({
        checked: true,
        isConfigured: status.isConfigured,
        authenticated: status.authenticated,
      });
      if (!status.authenticated && currentToken) {
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
      }
    } catch {
      setAuthStatus({ checked: true, isConfigured: false, authenticated: false });
    }
  }, []);

  useEffect(() => {
    const isInitialPublic = !isAdminLocation();
    loadPublicData(isInitialPublic);
  }, [loadPublicData]);

  useEffect(() => {
    if (view === 'admin') {
      checkAuthStatus(token);
    }
  }, [view, token, checkAuthStatus]);

  useEffect(() => {
    const onRouteChange = () => {
      setView(isAdminLocation() ? 'admin' : 'public');
    };
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('hashchange', onRouteChange);
    };
  }, []);

  const navigateTo = (target: 'public' | 'admin') => {
    if (target === 'admin') {
      window.location.hash = '#/admin';
    } else {
      if (window.location.hash) {
        window.location.hash = '';
      }
      if (window.location.pathname === '/admin') {
        window.history.pushState({}, '', '/');
      }
    }
    setView(target);
  };

  const handleTrackClick = useCallback((link: SocialLink) => {
    trackLinkClick(link.id);
  }, []);

  const handleAuthenticated = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setAuthStatus({ checked: true, isConfigured: true, authenticated: true });
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken('');
    setAuthStatus((prev) => ({ ...prev, authenticated: false }));
  };

  if (view === 'admin') {
    if (!authStatus.checked) {
      return (
        <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6">
          <div className="w-full max-w-md h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        </div>
      );
    }

    if (!authStatus.authenticated || !token) {
      return (
        <AuthGate
          isConfigured={authStatus.isConfigured}
          onAuthenticated={handleAuthenticated}
          onBackToPublic={() => navigateTo('public')}
        />
      );
    }

    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#F6F6F4] flex items-center justify-center p-6">
            <div className="w-full max-w-3xl h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
          </div>
        }
      >
        <DashboardView
          token={token}
          onTokenUpdated={(newToken) => {
            localStorage.setItem(TOKEN_KEY, newToken);
            setToken(newToken);
          }}
          onLogout={handleLogout}
          onBackToPublic={() => {
            loadPublicData(false);
            navigateTo('public');
          }}
          onPublicDataChanged={() => loadPublicData(false)}
        />
      </Suspense>
    );
  }

  return (
    <PublicProfileView
      profile={publicData.profile}
      appearance={publicData.appearance}
      links={publicData.links}
      onTrackClick={handleTrackClick}
      onOpenAdmin={() => navigateTo('admin')}
    />
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
