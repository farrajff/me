export type SocialPlatform =
  | 'x'
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'linkedin'
  | 'github'
  | 'telegram'
  | 'whatsapp'
  | 'snapchat'
  | 'behance'
  | 'dribbble'
  | 'podcast'
  | 'email'
  | 'website';

export type ThemePresetId = 'alabaster' | 'obsidian' | 'sand' | 'slate' | 'ink';
export type AccentColorId = 'cobalt' | 'emerald' | 'crimson' | 'amber' | 'violet' | 'charcoal';
export type CardRadiusId = 'sharp' | 'soft' | 'round';
export type LayoutMode = 'list' | 'grid';
export type IconStyle = 'duotone' | 'solid' | 'minimal';

export interface ProfileData {
  displayName: string;
  handle: string;
  bio: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
  showCover: boolean;
  showQuickIcons: boolean;
}

export interface AppearanceSettings {
  theme: ThemePresetId;
  accentColor: AccentColorId;
  cardRadius: CardRadiusId;
  layout: LayoutMode;
  iconStyle: IconStyle;
}

export interface SocialLink {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  platform: SocialPlatform;
  isActive: boolean;
  featured: boolean;
  order: number;
  clicks: number;
  createdAt: string;
}

export interface ClickEvent {
  id: string;
  linkId: string;
  timestamp: string;
  device: 'mobile' | 'desktop';
}

export interface AnalyticsData {
  dailyClicks: Record<string, Record<string, number>>;
  recentEvents: ClickEvent[];
  totalPageViews: number;
  dailyPageViews: Record<string, number>;
  deviceCounts: {
    mobile: number;
    desktop: number;
  };
}

export interface PublicPayload {
  profile: ProfileData;
  appearance: AppearanceSettings;
  links: SocialLink[];
}

export interface AdminDashboardPayload {
  profile: ProfileData;
  appearance: AppearanceSettings;
  links: SocialLink[];
  analytics: AnalyticsData;
}

export interface ThemePreset {
  id: ThemePresetId;
  nameAr: string;
  isDark: boolean;
  canvasBg: string;
  surfaceBg: string;
  surfaceHoverBg: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  mutedBg: string;
}

export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  alabaster: {
    id: 'alabaster',
    nameAr: 'الورق الكلاسيكي',
    isDark: false,
    canvasBg: '#F8F7F4',
    surfaceBg: '#FFFFFF',
    surfaceHoverBg: '#F3F2EE',
    borderColor: 'rgba(17, 19, 21, 0.09)',
    textPrimary: '#111315',
    textSecondary: '#5A606B',
    mutedBg: '#EFEDE8',
  },
  obsidian: {
    id: 'obsidian',
    nameAr: 'الأوبسيديان الداكن',
    isDark: true,
    canvasBg: '#0B0D10',
    surfaceBg: '#14171C',
    surfaceHoverBg: '#1B1F26',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#F4F5F7',
    textSecondary: '#9CA3AF',
    mutedBg: '#1D2129',
  },
  sand: {
    id: 'sand',
    nameAr: 'الرملي الدافئ',
    isDark: false,
    canvasBg: '#F3EFE7',
    surfaceBg: '#FAF8F3',
    surfaceHoverBg: '#EFEAE0',
    borderColor: 'rgba(31, 29, 26, 0.1)',
    textPrimary: '#1F1D1A',
    textSecondary: '#655F56',
    mutedBg: '#E9E3D7',
  },
  slate: {
    id: 'slate',
    nameAr: 'الأردوازي العميق',
    isDark: true,
    canvasBg: '#0F172A',
    surfaceBg: '#172236',
    surfaceHoverBg: '#1E2C45',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    mutedBg: '#1E293B',
  },
  ink: {
    id: 'ink',
    nameAr: 'الأبيض التحريري',
    isDark: false,
    canvasBg: '#FFFFFF',
    surfaceBg: '#FAFAFA',
    surfaceHoverBg: '#F4F4F5',
    borderColor: 'rgba(9, 9, 11, 0.1)',
    textPrimary: '#09090B',
    textSecondary: '#52525B',
    mutedBg: '#F4F4F5',
  },
};

export interface AccentPreset {
  id: AccentColorId;
  nameAr: string;
  hex: string;
  softHex: string;
  onAccent: string;
}

export const ACCENT_COLORS: Record<AccentColorId, AccentPreset> = {
  cobalt: {
    id: 'cobalt',
    nameAr: 'أزرق كوبالت',
    hex: '#1D4ED8',
    softHex: 'rgba(29, 78, 216, 0.12)',
    onAccent: '#FFFFFF',
  },
  emerald: {
    id: 'emerald',
    nameAr: 'زمردي عميق',
    hex: '#0F766E',
    softHex: 'rgba(15, 118, 110, 0.12)',
    onAccent: '#FFFFFF',
  },
  crimson: {
    id: 'crimson',
    nameAr: 'مرجاني قرمزي',
    hex: '#E11D48',
    softHex: 'rgba(225, 29, 72, 0.12)',
    onAccent: '#FFFFFF',
  },
  amber: {
    id: 'amber',
    nameAr: 'كهرماني دافئ',
    hex: '#B45309',
    softHex: 'rgba(180, 83, 9, 0.12)',
    onAccent: '#FFFFFF',
  },
  violet: {
    id: 'violet',
    nameAr: 'نيلي داكن',
    hex: '#4338CA',
    softHex: 'rgba(67, 56, 202, 0.12)',
    onAccent: '#FFFFFF',
  },
  charcoal: {
    id: 'charcoal',
    nameAr: 'أسود جرافيتي',
    hex: '#18181B',
    softHex: 'rgba(24, 24, 27, 0.1)',
    onAccent: '#FFFFFF',
  },
};

export const RADIUS_MAP: Record<CardRadiusId, { labelAr: string; cardPx: string; iconPx: string }> = {
  sharp: { labelAr: 'حواف هندسية', cardPx: '8px', iconPx: '6px' },
  soft: { labelAr: 'زوايا ناعمة', cardPx: '14px', iconPx: '10px' },
  round: { labelAr: 'منحنية بالكامل', cardPx: '22px', iconPx: '14px' },
};
