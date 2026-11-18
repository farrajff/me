import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import type {
  AnalyticsData,
  AppearanceSettings,
  ProfileData,
  SocialLink,
  SocialPlatform,
} from './src/shared/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');
const DIST_DIR = path.resolve(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 3000;

interface StoreSchema {
  profile: ProfileData;
  appearance: AppearanceSettings;
  links: SocialLink[];
  analytics: AnalyticsData;
  auth: {
    passwordHash: string | null;
    sessionSecret: string;
  };
}

const VALID_PLATFORMS = new Set<SocialPlatform>([
  'x',
  'instagram',
  'youtube',
  'tiktok',
  'linkedin',
  'github',
  'telegram',
  'whatsapp',
  'snapchat',
  'behance',
  'dribbble',
  'podcast',
  'email',
  'website',
]);

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialStore(): StoreSchema {
  const now = new Date().toISOString();
  return {
    profile: {
      displayName: 'طارق المنصور',
      handle: '@tariq.studio',
      bio: 'مصمم منتجات رقمية ومهندس واجهات أمامية. أشارك هنا أحدث مشاريعي، مقالاتي التقنية، وقنوات التواصل الرسمية.',
      location: 'الرياض · متاح للاستشارات الإبداعية',
      avatarUrl: '/src/assets/images/creator_avatar_portrait_1794980796833.jpg',
      coverUrl: '/src/assets/images/profile_cover_architecture_1794980795891.jpg',
      showCover: true,
      showQuickIcons: true,
    },
    appearance: {
      theme: 'alabaster',
      accentColor: 'cobalt',
      cardRadius: 'soft',
      layout: 'list',
      iconStyle: 'duotone',
    },
    links: [
      {
        id: 'lnk-website',
        title: 'معرض الأعمال والموقع الرسمي',
        subtitle: 'استعراض أحدث المشاريع الرقمية ودراسات الحالة',
        url: 'https://example.com',
        platform: 'website',
        isActive: true,
        featured: true,
        order: 0,
        clicks: 0,
        createdAt: now,
      },
      {
        id: 'lnk-x',
        title: 'منصة إكس (X)',
        subtitle: 'خواطر يومية حول تصميم الواجهات وبناء المنتجات',
        url: 'https://x.com',
        platform: 'x',
        isActive: true,
        featured: false,
        order: 1,
        clicks: 0,
        createdAt: now,
      },
      {
        id: 'lnk-instagram',
        title: 'إنستغرام',
        subtitle: 'لقطات من خلف الكواليس وتصاميم بصرية مختارة',
        url: 'https://instagram.com',
        platform: 'instagram',
        isActive: true,
        featured: false,
        order: 2,
        clicks: 0,
        createdAt: now,
      },
      {
        id: 'lnk-youtube',
        title: 'قناة يوتيوب',
        subtitle: 'شروحات عملية متعمقة في تجربة المستخدم والبرمجة',
        url: 'https://youtube.com',
        platform: 'youtube',
        isActive: true,
        featured: false,
        order: 3,
        clicks: 0,
        createdAt: now,
      },
      {
        id: 'lnk-linkedin',
        title: 'لينكدإن',
        subtitle: 'التواصل المهني والخبرات العملية',
        url: 'https://linkedin.com',
        platform: 'linkedin',
        isActive: true,
        featured: false,
        order: 4,
        clicks: 0,
        createdAt: now,
      },
      {
        id: 'lnk-github',
        title: 'جيت هب (GitHub)',
        subtitle: 'مكتبات ومشاريع مفتوحة المصدر',
        url: 'https://github.com',
        platform: 'github',
        isActive: true,
        featured: false,
        order: 5,
        clicks: 0,
        createdAt: now,
      },
      {
        id: 'lnk-telegram',
        title: 'قناة تليغرام',
        subtitle: 'روابط وموارد تصميم مختارة أسبوعياً',
        url: 'https://t.me',
        platform: 'telegram',
        isActive: true,
        featured: false,
        order: 6,
        clicks: 0,
        createdAt: now,
      },
    ],
    analytics: {
      dailyClicks: {},
      recentEvents: [],
      totalPageViews: 0,
      dailyPageViews: {},
      deviceCounts: {
        mobile: 0,
        desktop: 0,
      },
    },
    auth: {
      passwordHash: null,
      sessionSecret: crypto.randomBytes(32).toString('hex'),
    },
  };
}

function loadStore(): StoreSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial = createInitialStore();
    saveStoreToDisk(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreSchema>;
    const fallback = createInitialStore();
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
      auth: {
        passwordHash: parsed.auth?.passwordHash ?? null,
        sessionSecret: parsed.auth?.sessionSecret || crypto.randomBytes(32).toString('hex'),
      },
    };
  } catch {
    const initial = createInitialStore();
    saveStoreToDisk(initial);
    return initial;
  }
}

function saveStoreToDisk(data: StoreSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

let store: StoreSchema = loadStore();

function persistStore(): void {
  saveStoreToDisk(store);
}

// --- Cryptographic Password & Session Helpers ---

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  } catch {
    return false;
  }
}

function createSessionToken(): string {
  const payload = {
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', store.auth.sessionSecret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return false;
  try {
    const expectedSig = crypto
      .createHmac('sha256', store.auth.sessionSecret)
      .update(encoded)
      .digest('base64url');
    const bufA = Buffer.from(providedSig, 'utf-8');
    const bufB = Buffer.from(expectedSig, 'utf-8');
    if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
      return false;
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as {
      exp?: number;
    };
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function extractBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!store.auth.passwordHash) {
    res.status(401).json({ error: 'لم يتم تعيين كلمة مرور الإدارة بعد.' });
    return;
  }
  const token = extractBearerToken(req);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'انتهت صلاحية الجلسة أو كلمة المرور غير صالحة.' });
    return;
  }
  next();
}

function isSafeExternalUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return trimmed.length > 7;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(rawUrl: string): string {
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

function recordClickForLink(link: SocialLink, userAgent: string): void {
  const today = getTodayKey();
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
  const device: 'mobile' | 'desktop' = isMobile ? 'mobile' : 'desktop';

  link.clicks = (link.clicks || 0) + 1;

  if (!store.analytics.dailyClicks[today]) {
    store.analytics.dailyClicks[today] = {};
  }
  store.analytics.dailyClicks[today][link.id] =
    (store.analytics.dailyClicks[today][link.id] || 0) + 1;

  store.analytics.deviceCounts[device] = (store.analytics.deviceCounts[device] || 0) + 1;

  store.analytics.recentEvents.unshift({
    id: crypto.randomUUID(),
    linkId: link.id,
    timestamp: new Date().toISOString(),
    device,
  });

  if (store.analytics.recentEvents.length > 150) {
    store.analytics.recentEvents = store.analytics.recentEvents.slice(0, 150);
  }

  persistStore();
}

// --- Express App ---

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(express.text({ type: 'text/plain', limit: '64kb' }));

// Public Profile & Links Payload (ultra-fast in-memory response)
app.get('/api/public', (req: Request, res: Response) => {
  if (req.query.trackView === '1') {
    const today = getTodayKey();
    store.analytics.totalPageViews += 1;
    store.analytics.dailyPageViews[today] = (store.analytics.dailyPageViews[today] || 0) + 1;
    persistStore();
  }

  const activeLinks = [...store.links]
    .filter((link) => link.isActive)
    .sort((a, b) => a.order - b.order);

  res.setHeader('Cache-Control', 'no-store');
  res.json({
    profile: store.profile,
    appearance: store.appearance,
    links: activeLinks,
  });
});

// Accurate Click Tracking Endpoint (supports fetch keepalive & sendBeacon)
app.post('/api/links/:id/click', (req: Request, res: Response) => {
  const link = store.links.find((item) => item.id === req.params.id && item.isActive);
  if (!link) {
    res.status(404).json({ error: 'الرابط غير موجود.' });
    return;
  }
  const userAgent = String(req.headers['user-agent'] || '');
  recordClickForLink(link, userAgent);
  res.json({ ok: true, clicks: link.clicks });
});

// Shareable Short Tracking Redirect Route (/r/:id)
app.get('/r/:id', (req: Request, res: Response) => {
  const link = store.links.find((item) => item.id === req.params.id && item.isActive);
  if (!link || !isSafeExternalUrl(link.url)) {
    res.redirect(302, '/');
    return;
  }
  const userAgent = String(req.headers['user-agent'] || '');
  recordClickForLink(link, userAgent);
  res.redirect(302, link.url);
});

// Auth Status
app.get('/api/auth/status', (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  res.json({
    isConfigured: Boolean(store.auth.passwordHash),
    authenticated: Boolean(store.auth.passwordHash) && verifySessionToken(token),
  });
});

// First-time Encrypted Password Setup
app.post('/api/auth/setup', (req: Request, res: Response) => {
  if (store.auth.passwordHash) {
    res.status(409).json({ error: 'تم تعيين كلمة المرور مسبقاً.' });
    return;
  }
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
  if (password.length < 4 || password.length > 128) {
    res.status(400).json({ error: 'يجب أن تكون كلمة المرور 4 أحرف على الأقل.' });
    return;
  }
  store.auth.passwordHash = hashPassword(password);
  persistStore();
  const token = createSessionToken();
  res.json({ token });
});

const loginFailures = new Map<string, { count: number; resetAt: number }>();

// Login with Encrypted Password
app.post('/api/auth/login', (req: Request, res: Response) => {
  if (!store.auth.passwordHash) {
    res.status(400).json({ error: 'يرجى إعداد كلمة مرور جديدة أولاً.' });
    return;
  }

  const clientIp = req.ip || 'unknown';
  const now = Date.now();
  const record = loginFailures.get(clientIp);
  if (record && record.resetAt > now && record.count >= 10) {
    res.status(429).json({ error: 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار بضع دقائق.' });
    return;
  }

  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!password || !verifyPassword(password, store.auth.passwordHash)) {
    const nextCount = record && record.resetAt > now ? record.count + 1 : 1;
    loginFailures.set(clientIp, { count: nextCount, resetAt: now + 5 * 60 * 1000 });
    res.status(401).json({ error: 'كلمة المرور غير صحيحة.' });
    return;
  }

  loginFailures.delete(clientIp);
  const token = createSessionToken();
  res.json({ token });
});

// Change Password (Protected)
app.post('/api/auth/change-password', requireAuth, (req: Request, res: Response) => {
  const currentPassword =
    typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword =
    typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';

  if (!store.auth.passwordHash || !verifyPassword(currentPassword, store.auth.passwordHash)) {
    res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة.' });
    return;
  }
  if (newPassword.length < 4 || newPassword.length > 128) {
    res.status(400).json({ error: 'يجب أن تكون كلمة المرور الجديدة 4 أحرف على الأقل.' });
    return;
  }

  store.auth.passwordHash = hashPassword(newPassword);
  store.auth.sessionSecret = crypto.randomBytes(32).toString('hex');
  persistStore();
  const token = createSessionToken();
  res.json({ ok: true, token });
});

// Admin Dashboard Full Data (Protected)
app.get('/api/admin/dashboard', requireAuth, (_req: Request, res: Response) => {
  const sortedLinks = [...store.links].sort((a, b) => a.order - b.order);
  res.json({
    profile: store.profile,
    appearance: store.appearance,
    links: sortedLinks,
    analytics: store.analytics,
  });
});

// Update Profile (Protected)
app.put('/api/admin/profile', requireAuth, (req: Request, res: Response) => {
  const body = req.body ?? {};
  const displayName =
    typeof body.displayName === 'string'
      ? body.displayName.trim().slice(0, 80)
      : store.profile.displayName;
  const handle =
    typeof body.handle === 'string' ? body.handle.trim().slice(0, 60) : store.profile.handle;
  const bio = typeof body.bio === 'string' ? body.bio.trim().slice(0, 260) : store.profile.bio;
  const location =
    typeof body.location === 'string' ? body.location.trim().slice(0, 80) : store.profile.location;
  const avatarUrl =
    typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() : store.profile.avatarUrl;
  const coverUrl =
    typeof body.coverUrl === 'string' ? body.coverUrl.trim() : store.profile.coverUrl;
  const showCover =
    typeof body.showCover === 'boolean' ? body.showCover : store.profile.showCover;
  const showQuickIcons =
    typeof body.showQuickIcons === 'boolean' ? body.showQuickIcons : store.profile.showQuickIcons;

  if (!displayName) {
    res.status(400).json({ error: 'الاسم الظاهر مطلوب.' });
    return;
  }

  store.profile = {
    displayName,
    handle,
    bio,
    location,
    avatarUrl,
    coverUrl,
    showCover,
    showQuickIcons,
  };
  persistStore();
  res.json({ profile: store.profile });
});

// Update Appearance (Protected)
app.put('/api/admin/appearance', requireAuth, (req: Request, res: Response) => {
  const body = req.body ?? {};
  const validThemes = new Set(['alabaster', 'obsidian', 'sand', 'slate', 'ink']);
  const validAccents = new Set(['cobalt', 'emerald', 'crimson', 'amber', 'violet', 'charcoal']);
  const validRadii = new Set(['sharp', 'soft', 'round']);
  const validLayouts = new Set(['list', 'grid']);
  const validIcons = new Set(['duotone', 'solid', 'minimal']);

  store.appearance = {
    theme: validThemes.has(body.theme) ? body.theme : store.appearance.theme,
    accentColor: validAccents.has(body.accentColor)
      ? body.accentColor
      : store.appearance.accentColor,
    cardRadius: validRadii.has(body.cardRadius) ? body.cardRadius : store.appearance.cardRadius,
    layout: validLayouts.has(body.layout) ? body.layout : store.appearance.layout,
    iconStyle: validIcons.has(body.iconStyle) ? body.iconStyle : store.appearance.iconStyle,
  };
  persistStore();
  res.json({ appearance: store.appearance });
});

// Create Link (Protected)
app.post('/api/admin/links', requireAuth, (req: Request, res: Response) => {
  const body = req.body ?? {};
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : '';
  const subtitle = typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0, 120) : '';
  const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
  const platform: SocialPlatform = VALID_PLATFORMS.has(body.platform)
    ? body.platform
    : 'website';
  const featured = Boolean(body.featured);
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);

  if (!title) {
    res.status(400).json({ error: 'عنوان الرابط مطلوب.' });
    return;
  }

  const normalizedUrl = normalizeUrl(rawUrl);
  if (!isSafeExternalUrl(normalizedUrl)) {
    res.status(400).json({ error: 'يرجى إدخال رابط إلكتروني صحيح.' });
    return;
  }

  const maxOrder = store.links.reduce((max, item) => Math.max(max, item.order), -1);
  const newLink: SocialLink = {
    id: `lnk-${crypto.randomBytes(4).toString('hex')}`,
    title,
    subtitle,
    url: normalizedUrl,
    platform,
    isActive,
    featured,
    order: maxOrder + 1,
    clicks: 0,
    createdAt: new Date().toISOString(),
  };

  store.links.push(newLink);
  persistStore();
  res.status(201).json({ link: newLink });
});

// Update Link (Protected)
app.put('/api/admin/links/:id', requireAuth, (req: Request, res: Response) => {
  const link = store.links.find((item) => item.id === req.params.id);
  if (!link) {
    res.status(404).json({ error: 'الرابط غير موجود.' });
    return;
  }

  const body = req.body ?? {};
  if (typeof body.title === 'string') {
    const trimmed = body.title.trim().slice(0, 80);
    if (!trimmed) {
      res.status(400).json({ error: 'عنوان الرابط مطلوب.' });
      return;
    }
    link.title = trimmed;
  }
  if (typeof body.subtitle === 'string') {
    link.subtitle = body.subtitle.trim().slice(0, 120);
  }
  if (typeof body.url === 'string') {
    const normalized = normalizeUrl(body.url);
    if (!isSafeExternalUrl(normalized)) {
      res.status(400).json({ error: 'يرجى إدخال رابط إلكتروني صحيح.' });
      return;
    }
    link.url = normalized;
  }
  if (VALID_PLATFORMS.has(body.platform)) {
    link.platform = body.platform;
  }
  if (typeof body.isActive === 'boolean') {
    link.isActive = body.isActive;
  }
  if (typeof body.featured === 'boolean') {
    link.featured = body.featured;
  }

  persistStore();
  res.json({ link });
});

// Reorder Links (Protected)
app.put('/api/admin/links-order', requireAuth, (req: Request, res: Response) => {
  const orderedIds = Array.isArray(req.body?.orderedIds) ? (req.body.orderedIds as string[]) : [];
  if (orderedIds.length === 0) {
    res.status(400).json({ error: 'قائمة الترتيب غير صالحة.' });
    return;
  }

  const orderMap = new Map<string, number>();
  orderedIds.forEach((id, idx) => orderMap.set(id, idx));

  store.links.forEach((link) => {
    const newOrder = orderMap.get(link.id);
    if (typeof newOrder === 'number') {
      link.order = newOrder;
    }
  });

  store.links.sort((a, b) => a.order - b.order);
  persistStore();
  res.json({ links: store.links });
});

// Delete Link (Protected)
app.delete('/api/admin/links/:id', requireAuth, (req: Request, res: Response) => {
  const idx = store.links.findIndex((item) => item.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'الرابط غير موجود.' });
    return;
  }
  store.links.splice(idx, 1);
  store.links.sort((a, b) => a.order - b.order).forEach((item, index) => {
    item.order = index;
  });
  persistStore();
  res.json({ ok: true });
});

// Reset Click Analytics (Protected)
app.post('/api/admin/analytics/reset', requireAuth, (_req: Request, res: Response) => {
  store.links.forEach((link) => {
    link.clicks = 0;
  });
  store.analytics = {
    dailyClicks: {},
    recentEvents: [],
    totalPageViews: 0,
    dailyPageViews: {},
    deviceCounts: { mobile: 0, desktop: 0 },
  };
  persistStore();
  res.json({ ok: true });
});

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(DIST_DIR, {
        maxAge: '1y',
        immutable: true,
        index: false,
      }),
    );
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
