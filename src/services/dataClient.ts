import { createDefaultDashboardData } from '../shared/defaultData';
import type {
  AdminDashboardPayload,
  AppearanceSettings,
  ProfileData,
  PublicPayload,
  SocialLink,
  SocialPlatform,
} from '../shared/types';

const STATIC_STORE_KEY = 'rawabiti_static_store_v1';
const STATIC_AUTH_KEY = 'rawabiti_static_auth_v1';
const STATIC_TOKEN_PREFIX = 'static.';

interface StaticAuthRecord {
  passwordHash: string;
  sessionSecret: string;
}

let detectedMode: 'server' | 'static' | null = null;

async function isJsonOkResponse(res: Response): Promise<boolean> {
  if (!res.ok) return false;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json');
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadStaticStore(): AdminDashboardPayload {
  try {
    const raw = localStorage.getItem(STATIC_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AdminDashboardPayload>;
      const fallback = createDefaultDashboardData();
      return {
        profile: { ...fallback.profile, ...parsed.profile },
        appearance: { ...fallback.appearance, ...parsed.appearance },
        links: Array.isArray(parsed.links) ? parsed.links : fallback.links,
        analytics: {
          dailyClicks: parsed.analytics?.dailyClicks ?? {},
          recentEvents: Array.isArray(parsed.analytics?.recentEvents)
            ? parsed.analytics.recentEvents
            : [],
          totalPageViews: parsed.analytics?.totalPageViews ?? 0,
          dailyPageViews: parsed.analytics?.dailyPageViews ?? {},
          deviceCounts: parsed.analytics?.deviceCounts ?? { mobile: 0, desktop: 0 },
        },
      };
    }
  } catch {
    // Fallback below
  }
  const initial = createDefaultDashboardData();
  saveStaticStore(initial);
  return initial;
}

function saveStaticStore(data: AdminDashboardPayload): void {
  try {
    localStorage.setItem(STATIC_STORE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

function loadStaticAuth(): StaticAuthRecord | null {
  try {
    const raw = localStorage.getItem(STATIC_AUTH_KEY);
    return raw ? (JSON.parse(raw) as StaticAuthRecord) : null;
  } catch {
    return null;
  }
}

function saveStaticAuth(record: StaticAuthRecord): void {
  try {
    localStorage.setItem(STATIC_AUTH_KEY, JSON.stringify(record));
  } catch {
    // Ignore
  }
}

function randomHex(bytesLen = 16): string {
  const arr = new Uint8Array(bytesLen);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytesLen; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPasswordClient(password: string, existingSalt?: string): Promise<string> {
  const salt = existingSalt || randomHex(16);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const derived = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256,
    );
    const hex = Array.from(new Uint8Array(derived), (b) => b.toString(16).padStart(2, '0')).join(
      '',
    );
    return `${salt}:${hex}`;
  }
  // Minimal fallback for non-secure contexts
  let hash = 2166136261;
  const input = `${salt}:${password}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${salt}:${(hash >>> 0).toString(16)}`;
}

async function verifyPasswordClient(password: string, stored: string): Promise<boolean> {
  const [salt] = stored.split(':');
  if (!salt) return false;
  const candidate = await hashPasswordClient(password, salt);
  if (candidate.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return diff === 0;
}

function normalizeUrlClient(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  ) {
    return trimmed;
  }
  if (trimmed.includes('@') && !trimmed.includes('/')) {
    return `mailto:${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function getAppMode(): 'server' | 'static' {
  return detectedMode || 'static';
}

export async function fetchPublicData(trackView = false): Promise<PublicPayload> {
  if (detectedMode !== 'static') {
    try {
      const url = trackView ? './api/public?trackView=1' : './api/public';
      const res = await fetch(url);
      if (await isJsonOkResponse(res)) {
        detectedMode = 'server';
        return (await res.json()) as PublicPayload;
      }
    } catch {
      // Fall back to static mode
    }
  }

  detectedMode = 'static';
  const store = loadStaticStore();
  if (trackView) {
    const today = getTodayKey();
    store.analytics.totalPageViews += 1;
    store.analytics.dailyPageViews[today] = (store.analytics.dailyPageViews[today] || 0) + 1;
    saveStaticStore(store);
  }
  return {
    profile: store.profile,
    appearance: store.appearance,
    links: [...store.links].filter((l) => l.isActive).sort((a, b) => a.order - b.order),
  };
}

export function trackLinkClick(linkId: string): void {
  if (detectedMode === 'server') {
    const endpoint = `./api/links/${encodeURIComponent(linkId)}/click`;
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(endpoint, '');
    } else {
      fetch(endpoint, { method: 'POST', keepalive: true }).catch(() => {});
    }
    return;
  }

  const store = loadStaticStore();
  const link = store.links.find((l) => l.id === linkId && l.isActive);
  if (!link) return;
  const today = getTodayKey();
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
  const device: 'mobile' | 'desktop' = isMobile ? 'mobile' : 'desktop';

  link.clicks = (link.clicks || 0) + 1;
  if (!store.analytics.dailyClicks[today]) store.analytics.dailyClicks[today] = {};
  store.analytics.dailyClicks[today][link.id] =
    (store.analytics.dailyClicks[today][link.id] || 0) + 1;
  store.analytics.deviceCounts[device] = (store.analytics.deviceCounts[device] || 0) + 1;
  store.analytics.recentEvents.unshift({
    id: randomHex(8),
    linkId: link.id,
    timestamp: new Date().toISOString(),
    device,
  });
  if (store.analytics.recentEvents.length > 150) {
    store.analytics.recentEvents = store.analytics.recentEvents.slice(0, 150);
  }
  saveStaticStore(store);
}

export async function fetchAuthStatus(
  token: string,
): Promise<{ isConfigured: boolean; authenticated: boolean }> {
  if (detectedMode !== 'static') {
    try {
      const res = await fetch('./api/auth/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (await isJsonOkResponse(res)) {
        detectedMode = 'server';
        return (await res.json()) as { isConfigured: boolean; authenticated: boolean };
      }
    } catch {
      // Fall back to static mode
    }
  }

  detectedMode = 'static';
  const auth = loadStaticAuth();
  const isConfigured = Boolean(auth?.passwordHash);
  const authenticated = Boolean(
    isConfigured && auth && token === `${STATIC_TOKEN_PREFIX}${auth.sessionSecret}`,
  );
  return { isConfigured, authenticated };
}

export async function setupPassword(password: string): Promise<string> {
  if (detectedMode === 'server') {
    const res = await fetch('./api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const body = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !body.token) {
      throw new Error(body.error || 'تعذر حفظ كلمة المرور.');
    }
    return body.token;
  }

  const existing = loadStaticAuth();
  if (existing?.passwordHash) {
    throw new Error('تم تعيين كلمة المرور مسبقاً.');
  }
  const passwordHash = await hashPasswordClient(password);
  const sessionSecret = randomHex(16);
  saveStaticAuth({ passwordHash, sessionSecret });
  return `${STATIC_TOKEN_PREFIX}${sessionSecret}`;
}

export async function loginWithPassword(password: string): Promise<string> {
  if (detectedMode === 'server') {
    const res = await fetch('./api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const body = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !body.token) {
      throw new Error(body.error || 'كلمة المرور غير صحيحة.');
    }
    return body.token;
  }

  const auth = loadStaticAuth();
  if (!auth?.passwordHash) {
    throw new Error('يرجى إعداد كلمة مرور جديدة أولاً.');
  }
  const valid = await verifyPasswordClient(password, auth.passwordHash);
  if (!valid) {
    throw new Error('كلمة المرور غير صحيحة.');
  }
  return `${STATIC_TOKEN_PREFIX}${auth.sessionSecret}`;
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  if (detectedMode === 'server') {
    const res = await fetch('./api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const body = (await res.json()) as { token?: string; error?: string };
    if (!res.ok || !body.token) {
      throw new Error(body.error || 'تعذر تحديث كلمة المرور.');
    }
    return body.token;
  }

  const auth = loadStaticAuth();
  if (!auth?.passwordHash || !(await verifyPasswordClient(currentPassword, auth.passwordHash))) {
    throw new Error('كلمة المرور الحالية غير صحيحة.');
  }
  const passwordHash = await hashPasswordClient(newPassword);
  const sessionSecret = randomHex(16);
  saveStaticAuth({ passwordHash, sessionSecret });
  return `${STATIC_TOKEN_PREFIX}${sessionSecret}`;
}

export async function fetchAdminDashboard(token: string): Promise<AdminDashboardPayload> {
  if (detectedMode === 'server') {
    const res = await fetch('./api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    if (!res.ok) throw new Error('تعذر تحميل بيانات لوحة التحكم.');
    return (await res.json()) as AdminDashboardPayload;
  }

  const store = loadStaticStore();
  return {
    ...store,
    links: [...store.links].sort((a, b) => a.order - b.order),
  };
}

export async function saveProfileAndAppearance(
  token: string,
  profile: ProfileData,
  appearance: AppearanceSettings,
): Promise<void> {
  if (detectedMode === 'server') {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    const [pRes, aRes] = await Promise.all([
      fetch('./api/admin/profile', { method: 'PUT', headers, body: JSON.stringify(profile) }),
      fetch('./api/admin/appearance', {
        method: 'PUT',
        headers,
        body: JSON.stringify(appearance),
      }),
    ]);
    if (pRes.status === 401 || aRes.status === 401) throw new Error('UNAUTHORIZED');
    if (!pRes.ok || !aRes.ok) throw new Error('تعذر حفظ التغييرات.');
    return;
  }

  const store = loadStaticStore();
  store.profile = profile;
  store.appearance = appearance;
  saveStaticStore(store);
}

export async function saveLinkItem(
  token: string,
  linkId: string | null,
  payload: {
    platform: SocialPlatform;
    title: string;
    subtitle: string;
    url: string;
    featured: boolean;
  },
): Promise<void> {
  if (detectedMode === 'server') {
    const url = linkId ? `./api/admin/links/${linkId}` : './api/admin/links';
    const method = linkId ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || 'تعذر حفظ الرابط.');
    }
    return;
  }

  const store = loadStaticStore();
  const normalized = normalizeUrlClient(payload.url);
  if (linkId) {
    const target = store.links.find((l) => l.id === linkId);
    if (target) {
      target.platform = payload.platform;
      target.title = payload.title;
      target.subtitle = payload.subtitle;
      target.url = normalized;
      target.featured = payload.featured;
    }
  } else {
    const maxOrder = store.links.reduce((max, item) => Math.max(max, item.order), -1);
    store.links.push({
      id: `lnk-${randomHex(4)}`,
      platform: payload.platform,
      title: payload.title,
      subtitle: payload.subtitle,
      url: normalized,
      isActive: true,
      featured: payload.featured,
      order: maxOrder + 1,
      clicks: 0,
      createdAt: new Date().toISOString(),
    });
  }
  saveStaticStore(store);
}

export async function patchLinkItem(
  token: string,
  linkId: string,
  patch: Partial<Pick<SocialLink, 'isActive' | 'featured'>>,
): Promise<void> {
  if (detectedMode === 'server') {
    const res = await fetch(`./api/admin/links/${linkId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    return;
  }

  const store = loadStaticStore();
  const target = store.links.find((l) => l.id === linkId);
  if (target) {
    Object.assign(target, patch);
    saveStaticStore(store);
  }
}

export async function reorderLinkItems(token: string, orderedIds: string[]): Promise<void> {
  if (detectedMode === 'server') {
    const res = await fetch('./api/admin/links-order', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ orderedIds }),
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    return;
  }

  const store = loadStaticStore();
  const orderMap = new Map<string, number>();
  orderedIds.forEach((id, idx) => orderMap.set(id, idx));
  store.links.forEach((l) => {
    const ord = orderMap.get(l.id);
    if (typeof ord === 'number') l.order = ord;
  });
  store.links.sort((a, b) => a.order - b.order);
  saveStaticStore(store);
}

export async function deleteLinkItem(token: string, linkId: string): Promise<void> {
  if (detectedMode === 'server') {
    const res = await fetch(`./api/admin/links/${linkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    return;
  }

  const store = loadStaticStore();
  store.links = store.links
    .filter((l) => l.id !== linkId)
    .sort((a, b) => a.order - b.order)
    .map((l, idx) => ({ ...l, order: idx }));
  saveStaticStore(store);
}

export async function resetAnalyticsData(token: string): Promise<void> {
  if (detectedMode === 'server') {
    const res = await fetch('./api/admin/analytics/reset', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) throw new Error('UNAUTHORIZED');
    return;
  }

  const store = loadStaticStore();
  store.links.forEach((l) => {
    l.clicks = 0;
  });
  store.analytics = {
    dailyClicks: {},
    recentEvents: [],
    totalPageViews: 0,
    dailyPageViews: {},
    deviceCounts: { mobile: 0, desktop: 0 },
  };
  saveStaticStore(store);
}
