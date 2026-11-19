import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { signInWithPopup, signOut } from 'firebase/auth';
import { OperationType, auth, db, googleProvider, handleFirestoreError } from '../firebase';
import { createDefaultDashboardData } from '../shared/defaultData';
import type {
  AdminDashboardPayload,
  AppearanceSettings,
  ClickEvent,
  ProfileData,
  PublicPayload,
  SocialLink,
  SocialPlatform,
} from '../shared/types';

let firestoreLinksSeeded = false;

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function randomHex(bytesLen = 8): string {
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

function isoFromFirestore(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function getAppMode(): 'server' | 'static' {
  return 'static';
}

export async function signInAdminWithGoogle(): Promise<void> {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutAdminGoogle(): Promise<void> {
  await signOut(auth);
}

async function ensureInitialSeedInFirestore(): Promise<void> {
  const publicRef = doc(db, 'site', 'public');
  let snap;
  try {
    snap = await getDoc(publicRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site/public');
  }

  if (snap.exists()) {
    firestoreLinksSeeded = true;
    return;
  }

  const defaults = createDefaultDashboardData();
  const batch = writeBatch(db);

  batch.set(publicRef, {
    ...defaults.profile,
    ...defaults.appearance,
    updatedAt: serverTimestamp(),
  });

  defaults.links.forEach((link) => {
    const linkRef = doc(db, 'links', link.id);
    batch.set(linkRef, {
      title: link.title,
      subtitle: link.subtitle,
      url: link.url,
      platform: link.platform,
      isActive: link.isActive,
      featured: link.featured,
      order: link.order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
    firestoreLinksSeeded = true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'site/public');
  }
}

export async function fetchPublicData(trackView = false): Promise<PublicPayload> {
  const defaults = createDefaultDashboardData();

  let publicSnap;
  try {
    publicSnap = await getDoc(doc(db, 'site', 'public'));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site/public');
  }

  if (!publicSnap.exists()) {
    firestoreLinksSeeded = false;
    return {
      profile: defaults.profile,
      appearance: defaults.appearance,
      links: defaults.links.filter((l) => l.isActive),
    };
  }

  firestoreLinksSeeded = true;
  const siteData = publicSnap.data();

  let linksSnap;
  try {
    linksSnap = await getDocs(query(collection(db, 'links'), where('isActive', '==', true)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'links');
  }

  const links: SocialLink[] = linksSnap.docs
    .map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        title: String(d.title || ''),
        subtitle: String(d.subtitle || ''),
        url: String(d.url || ''),
        platform: (d.platform || 'website') as SocialPlatform,
        isActive: Boolean(d.isActive),
        featured: Boolean(d.featured),
        order: typeof d.order === 'number' ? d.order : 0,
        clicks: 0,
        createdAt: isoFromFirestore(d.createdAt),
      };
    })
    .sort((a, b) => a.order - b.order);

  if (trackView) {
    const viewId = `vw-${randomHex(8)}`;
    setDoc(doc(db, 'pageViews', viewId), {
      dateKey: getTodayKey(),
      createdAt: serverTimestamp(),
    }).catch((error) => {
      console.error('PageView tracking failed:', error);
    });
  }

  return {
    profile: {
      displayName: String(siteData.displayName ?? defaults.profile.displayName),
      handle: String(siteData.handle ?? defaults.profile.handle),
      bio: String(siteData.bio ?? defaults.profile.bio),
      location: String(siteData.location ?? defaults.profile.location),
      avatarUrl: String(siteData.avatarUrl ?? defaults.profile.avatarUrl),
      coverUrl: String(siteData.coverUrl ?? defaults.profile.coverUrl),
      showCover: Boolean(siteData.showCover ?? defaults.profile.showCover),
      showQuickIcons: Boolean(siteData.showQuickIcons ?? defaults.profile.showQuickIcons),
    },
    appearance: {
      theme: (siteData.theme ?? defaults.appearance.theme) as AppearanceSettings['theme'],
      accentColor: (siteData.accentColor ??
        defaults.appearance.accentColor) as AppearanceSettings['accentColor'],
      cardRadius: (siteData.cardRadius ??
        defaults.appearance.cardRadius) as AppearanceSettings['cardRadius'],
      layout: (siteData.layout ?? defaults.appearance.layout) as AppearanceSettings['layout'],
      iconStyle: (siteData.iconStyle ??
        defaults.appearance.iconStyle) as AppearanceSettings['iconStyle'],
    },
    links,
  };
}

export function trackLinkClick(linkId: string): void {
  if (!firestoreLinksSeeded) return;
  const eventId = `ev-${randomHex(8)}`;
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
  const device: 'mobile' | 'desktop' = isMobile ? 'mobile' : 'desktop';

  setDoc(doc(db, 'clickEvents', eventId), {
    linkId,
    dateKey: getTodayKey(),
    device,
    createdAt: serverTimestamp(),
  }).catch((error) => {
    console.error('Click tracking failed:', error);
  });
}

export async function fetchPasswordConfigured(): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'site', 'security'));
    return snap.exists() && typeof snap.data()?.passwordHash === 'string';
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site/security');
  }
}

export async function setupPassword(password: string): Promise<string> {
  await ensureInitialSeedInFirestore();
  const secRef = doc(db, 'site', 'security');
  let existingSnap;
  try {
    existingSnap = await getDoc(secRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site/security');
  }

  if (existingSnap.exists() && existingSnap.data()?.passwordHash) {
    throw new Error('تم تعيين كلمة المرور مسبقاً.');
  }

  const passwordHash = await hashPasswordClient(password);
  try {
    await setDoc(secRef, {
      passwordHash,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'site/security');
  }
  return `fb-${randomHex(12)}`;
}

export async function loginWithPassword(password: string): Promise<string> {
  await ensureInitialSeedInFirestore();
  let secSnap;
  try {
    secSnap = await getDoc(doc(db, 'site', 'security'));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site/security');
  }

  const storedHash = secSnap.exists() ? String(secSnap.data()?.passwordHash || '') : '';
  if (!storedHash) {
    throw new Error('يرجى إعداد كلمة مرور جديدة أولاً.');
  }
  const valid = await verifyPasswordClient(password, storedHash);
  if (!valid) {
    throw new Error('كلمة المرور غير صحيحة.');
  }
  return `fb-${randomHex(12)}`;
}

export async function changePassword(
  _token: string,
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  const secRef = doc(db, 'site', 'security');
  let secSnap;
  try {
    secSnap = await getDoc(secRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site/security');
  }
  const storedHash = secSnap.exists() ? String(secSnap.data()?.passwordHash || '') : '';
  if (!storedHash || !(await verifyPasswordClient(currentPassword, storedHash))) {
    throw new Error('كلمة المرور الحالية غير صحيحة.');
  }

  const passwordHash = await hashPasswordClient(newPassword);
  try {
    await updateDoc(secRef, {
      passwordHash,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'site/security');
  }
  return `fb-${randomHex(12)}`;
}

export async function fetchAdminDashboard(_token: string): Promise<AdminDashboardPayload> {
  await ensureInitialSeedInFirestore();
  const defaults = createDefaultDashboardData();

  let siteSnap;
  try {
    siteSnap = await getDoc(doc(db, 'site', 'public'));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'site/public');
  }

  let linksSnap;
  try {
    linksSnap = await getDocs(collection(db, 'links'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'links');
  }

  let clicksSnap;
  try {
    clicksSnap = await getDocs(collection(db, 'clickEvents'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'clickEvents');
  }

  let viewsSnap;
  try {
    viewsSnap = await getDocs(collection(db, 'pageViews'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'pageViews');
  }

  const clickCountByLink: Record<string, number> = {};
  const dailyClicks: Record<string, Record<string, number>> = {};
  const deviceCounts = { mobile: 0, desktop: 0 };
  const recentEvents: ClickEvent[] = [];

  clicksSnap.docs.forEach((docSnap) => {
    const d = docSnap.data();
    const linkId = String(d.linkId || '');
    const dateKey = String(d.dateKey || getTodayKey());
    const device = d.device === 'mobile' ? 'mobile' : 'desktop';
    const timestamp = isoFromFirestore(d.createdAt);

    clickCountByLink[linkId] = (clickCountByLink[linkId] || 0) + 1;
    if (!dailyClicks[dateKey]) dailyClicks[dateKey] = {};
    dailyClicks[dateKey][linkId] = (dailyClicks[dateKey][linkId] || 0) + 1;
    deviceCounts[device] += 1;
    recentEvents.push({
      id: docSnap.id,
      linkId,
      timestamp,
      device,
    });
  });

  recentEvents.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  const dailyPageViews: Record<string, number> = {};
  viewsSnap.docs.forEach((docSnap) => {
    const dateKey = String(docSnap.data()?.dateKey || getTodayKey());
    dailyPageViews[dateKey] = (dailyPageViews[dateKey] || 0) + 1;
  });

  const links: SocialLink[] = linksSnap.docs
    .map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        title: String(d.title || ''),
        subtitle: String(d.subtitle || ''),
        url: String(d.url || ''),
        platform: (d.platform || 'website') as SocialPlatform,
        isActive: Boolean(d.isActive),
        featured: Boolean(d.featured),
        order: typeof d.order === 'number' ? d.order : 0,
        clicks: clickCountByLink[docSnap.id] || 0,
        createdAt: isoFromFirestore(d.createdAt),
      };
    })
    .sort((a, b) => a.order - b.order);

  const siteData = siteSnap.exists() ? siteSnap.data() : {};

  return {
    profile: {
      displayName: String(siteData.displayName ?? defaults.profile.displayName),
      handle: String(siteData.handle ?? defaults.profile.handle),
      bio: String(siteData.bio ?? defaults.profile.bio),
      location: String(siteData.location ?? defaults.profile.location),
      avatarUrl: String(siteData.avatarUrl ?? defaults.profile.avatarUrl),
      coverUrl: String(siteData.coverUrl ?? defaults.profile.coverUrl),
      showCover: Boolean(siteData.showCover ?? defaults.profile.showCover),
      showQuickIcons: Boolean(siteData.showQuickIcons ?? defaults.profile.showQuickIcons),
    },
    appearance: {
      theme: (siteData.theme ?? defaults.appearance.theme) as AppearanceSettings['theme'],
      accentColor: (siteData.accentColor ??
        defaults.appearance.accentColor) as AppearanceSettings['accentColor'],
      cardRadius: (siteData.cardRadius ??
        defaults.appearance.cardRadius) as AppearanceSettings['cardRadius'],
      layout: (siteData.layout ?? defaults.appearance.layout) as AppearanceSettings['layout'],
      iconStyle: (siteData.iconStyle ??
        defaults.appearance.iconStyle) as AppearanceSettings['iconStyle'],
    },
    links,
    analytics: {
      dailyClicks,
      recentEvents: recentEvents.slice(0, 150),
      totalPageViews: viewsSnap.size,
      dailyPageViews,
      deviceCounts,
    },
  };
}

export async function saveProfileAndAppearance(
  _token: string,
  profile: ProfileData,
  appearance: AppearanceSettings,
): Promise<void> {
  try {
    await setDoc(doc(db, 'site', 'public'), {
      displayName: profile.displayName.trim().slice(0, 80),
      handle: profile.handle.trim().slice(0, 60),
      bio: profile.bio.trim().slice(0, 260),
      location: profile.location.trim().slice(0, 80),
      avatarUrl: profile.avatarUrl.trim().slice(0, 150000),
      coverUrl: profile.coverUrl.trim().slice(0, 350000),
      showCover: Boolean(profile.showCover),
      showQuickIcons: Boolean(profile.showQuickIcons),
      theme: appearance.theme,
      accentColor: appearance.accentColor,
      cardRadius: appearance.cardRadius,
      layout: appearance.layout,
      iconStyle: appearance.iconStyle,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'site/public');
  }
}

export async function saveLinkItem(
  _token: string,
  linkId: string | null,
  payload: {
    platform: SocialPlatform;
    title: string;
    subtitle: string;
    url: string;
    featured: boolean;
  },
): Promise<void> {
  const normalizedUrl = normalizeUrlClient(payload.url).slice(0, 512);
  if (linkId) {
    try {
      await updateDoc(doc(db, 'links', linkId), {
        platform: payload.platform,
        title: payload.title.trim().slice(0, 80),
        subtitle: payload.subtitle.trim().slice(0, 120),
        url: normalizedUrl,
        featured: Boolean(payload.featured),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `links/${linkId}`);
    }
    return;
  }

  let existingSnap;
  try {
    existingSnap = await getDocs(collection(db, 'links'));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'links');
  }
  const maxOrder = existingSnap.docs.reduce((max, d) => {
    const ord = d.data()?.order;
    return typeof ord === 'number' ? Math.max(max, ord) : max;
  }, -1);

  const newId = `lnk-${randomHex(4)}`;
  try {
    await setDoc(doc(db, 'links', newId), {
      platform: payload.platform,
      title: payload.title.trim().slice(0, 80),
      subtitle: payload.subtitle.trim().slice(0, 120),
      url: normalizedUrl,
      isActive: true,
      featured: Boolean(payload.featured),
      order: maxOrder + 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `links/${newId}`);
  }
}

export async function patchLinkItem(
  _token: string,
  linkId: string,
  patch: Partial<Pick<SocialLink, 'isActive' | 'featured'>>,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'links', linkId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `links/${linkId}`);
  }
}

export async function reorderLinkItems(_token: string, orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, idx) => {
    batch.update(doc(db, 'links', id), {
      order: idx,
      updatedAt: serverTimestamp(),
    });
  });
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'links');
  }
}

export async function deleteLinkItem(_token: string, linkId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'links', linkId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `links/${linkId}`);
  }
}

export async function resetAnalyticsData(_token: string): Promise<void> {
  try {
    const [clicksSnap, viewsSnap] = await Promise.all([
      getDocs(collection(db, 'clickEvents')),
      getDocs(collection(db, 'pageViews')),
    ]);
    const allRefs = [...clicksSnap.docs.map((d) => d.ref), ...viewsSnap.docs.map((d) => d.ref)];
    for (let i = 0; i < allRefs.length; i += 400) {
      const batch = writeBatch(db);
      allRefs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'clickEvents');
  }
}
