import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import type { PublicPayload, SocialLink } from './shared/types';
import { PublicProfileView } from './components/PublicProfileView';
import { AuthGate } from './components/AuthGate';

const DashboardView = lazy(() =>
  import('./components/DashboardView').then((m) => ({ default: m.DashboardView })),
);

const CACHE_KEY = 'rawabiti_public_cache_v1';
const TOKEN_KEY = 'rawabiti_admin_token';

function readCachedPublic(): PublicPayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PublicPayload) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [view, setView] = useState<'public' | 'admin'>(() =>
    window.location.pathname === '/admin' ? 'admin' : 'public',
  );
  const [publicData, setPublicData] = useState<PublicPayload | null>(() => readCachedPublic());
  const [authStatus, setAuthStatus] = useState<{
    checked: boolean;
    isConfigured: boolean;
    authenticated: boolean;
  }>({ checked: false, isConfigured: true, authenticated: false });
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || '');

  const loadPublicData = useCallback(async (trackView = false) => {
    try {
      const url = trackView ? '/api/public?trackView=1' : '/api/public';
      const res = await fetch(url);
      if (!res.ok) return;
      const payload = (await res.json()) as PublicPayload;
      setPublicData(payload);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      } catch {
        // Ignore storage quota errors
      }
    } catch {
      // Keep cached data if offline
    }
  }, []);

  const checkAuthStatus = useCallback(async (currentToken: string) => {
    try {
      const res = await fetch('/api/auth/status', {
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
      });
      if (!res.ok) return;
      const status = (await res.json()) as { isConfigured: boolean; authenticated: boolean };
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
      setAuthStatus({ checked: true, isConfigured: true, authenticated: false });
    }
  }, []);

  useEffect(() => {
    const isInitialPublic = window.location.pathname !== '/admin';
    loadPublicData(isInitialPublic);
  }, [loadPublicData]);

  useEffect(() => {
    if (view === 'admin') {
      checkAuthStatus(token);
    }
  }, [view, token, checkAuthStatus]);

  useEffect(() => {
    const onPopState = () => {
      setView(window.location.pathname === '/admin' ? 'admin' : 'public');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateTo = (target: 'public' | 'admin') => {
    const path = target === 'admin' ? '/admin' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setView(target);
  };

  const handleTrackClick = useCallback((link: SocialLink) => {
    const endpoint = `/api/links/${encodeURIComponent(link.id)}/click`;
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(endpoint, '');
    } else {
      fetch(endpoint, { method: 'POST', keepalive: true }).catch(() => {});
    }
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

  if (!publicData) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-5">
        <div className="w-full max-w-2xl space-y-4">
          <div className="h-64 bg-white border border-slate-200/80 rounded-2xl animate-pulse" />
          <div className="h-16 bg-white border border-slate-200/80 rounded-2xl animate-pulse" />
          <div className="h-16 bg-white border border-slate-200/80 rounded-2xl animate-pulse" />
          <div className="h-16 bg-white border border-slate-200/80 rounded-2xl animate-pulse" />
        </div>
      </div>
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
