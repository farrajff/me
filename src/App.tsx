import React, { Component, Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';
import type { PublicPayload, SocialLink } from './shared/types';
import { createDefaultPublicPayload } from './shared/defaultData';
import {
  fetchPasswordConfigured,
  fetchPublicData,
  signOutAdminGoogle,
  trackLinkClick,
} from './services/dataClient';
import { PublicProfileView } from './components/PublicProfileView';
import { AuthGate } from './components/AuthGate';

const DashboardView = lazy(() =>
  import('./components/DashboardView').then((m) => ({ default: m.DashboardView })),
);

const CACHE_KEY = 'rawabiti_public_cache_v2';
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
            <p className="text-sm text-slate-600">
              حدث خطأ غير متوقع أثناء الاتصال بقاعدة البيانات. اضغط لإعادة المحاولة.
            </p>
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
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const [token, setToken] = useState<string>(() => sessionStorage.getItem(TOKEN_KEY) || '');

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
      // Keep cached/default data if offline
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const isInitialPublic = !isAdminLocation();
    void loadPublicData(isInitialPublic);
  }, [loadPublicData]);

  useEffect(() => {
    if (view !== 'admin' || !authReady || !firebaseUser) return;
    let cancelled = false;
    setCheckingConfig(true);
    fetchPasswordConfigured()
      .then((configured) => {
        if (!cancelled) setPasswordConfigured(configured);
      })
      .catch(() => {
        if (!cancelled) setPasswordConfigured(false);
      })
      .finally(() => {
        if (!cancelled) setCheckingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, authReady, firebaseUser]);

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
    sessionStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setPasswordConfigured(true);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    await signOutAdminGoogle().catch(() => {});
  };

  if (view === 'admin') {
    if (!authReady) {
      return (
        <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6">
          <div className="w-full max-w-md h-64 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        </div>
      );
    }

    if (!firebaseUser || !token) {
      return (
        <AuthGate
          firebaseUser={firebaseUser}
          isConfigured={passwordConfigured}
          checkingConfig={checkingConfig}
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
            sessionStorage.setItem(TOKEN_KEY, newToken);
            setToken(newToken);
          }}
          onLogout={() => void handleLogout()}
          onBackToPublic={() => {
            void loadPublicData(false);
            navigateTo('public');
          }}
          onPublicDataChanged={() => void loadPublicData(false)}
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
