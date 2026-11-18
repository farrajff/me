import type { AdminDashboardPayload, PublicPayload } from './types';
import { DEFAULT_AVATAR_URL, DEFAULT_COVER_URL } from './defaultAssets';

export function createDefaultDashboardData(): AdminDashboardPayload {
  const now = new Date().toISOString();
  return {
    profile: {
      displayName: 'طارق المنصور',
      handle: '@tariq.studio',
      bio: 'مصمم منتجات رقمية ومهندس واجهات أمامية. أشارك هنا أحدث مشاريعي، مقالاتي التقنية، وقنوات التواصل الرسمية.',
      location: 'الرياض · متاح للاستشارات الإبداعية',
      avatarUrl: DEFAULT_AVATAR_URL,
      coverUrl: DEFAULT_COVER_URL,
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
  };
}

export function createDefaultPublicPayload(): PublicPayload {
  const full = createDefaultDashboardData();
  return {
    profile: full.profile,
    appearance: full.appearance,
    links: full.links.filter((l) => l.isActive),
  };
}
