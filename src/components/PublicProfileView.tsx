import React, { useEffect, useState } from 'react';
import {
  ArrowUpLeft,
  Check,
  Copy,
  Lock,
  MapPin,
  Share2,
  X,
} from 'lucide-react';
import {
  ACCENT_COLORS,
  RADIUS_MAP,
  THEME_PRESETS,
  type AppearanceSettings,
  type ProfileData,
  type SocialLink,
} from '../shared/types';
import { PLATFORM_MAP, SocialIcon } from './SocialIcons';

interface PublicProfileViewProps {
  profile: ProfileData;
  appearance: AppearanceSettings;
  links: SocialLink[];
  onTrackClick: (link: SocialLink) => void;
  onOpenAdmin: () => void;
  isPreview?: boolean;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  profile,
  appearance,
  links,
  onTrackClick,
  onOpenAdmin,
  isPreview = false,
}) => {
  const theme = THEME_PRESETS[appearance.theme] || THEME_PRESETS.alabaster;
  const accent = ACCENT_COLORS[appearance.accentColor] || ACCENT_COLORS.cobalt;
  const radius = RADIUS_MAP[appearance.cardRadius] || RADIUS_MAP.soft;

  const [avatarFailed, setAvatarFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [copiedPage, setCopiedPage] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profile.avatarUrl]);

  useEffect(() => {
    setCoverFailed(false);
  }, [profile.coverUrl]);

  const copyTextSafely = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  };

  const initials = profile.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('');

  const handleLinkClick = (e: React.MouseEvent, link: SocialLink) => {
    if (isPreview) {
      e.preventDefault();
      return;
    }
    onTrackClick(link);
  };

  const handleCopyPageUrl = async () => {
    if (await copyTextSafely(window.location.origin)) {
      setCopiedPage(true);
      setTimeout(() => setCopiedPage(false), 2000);
    }
  };

  const handleCopyShortLink = async (linkId: string) => {
    if (await copyTextSafely(`${window.location.origin}/r/${linkId}`)) {
      setCopiedId(linkId);
      setTimeout(() => setCopiedId(null), 1800);
    }
  };

  const renderIconBox = (link: SocialLink, isFeatured: boolean) => {
    const platformMeta = PLATFORM_MAP[link.platform] || PLATFORM_MAP.website;
    const brandColor = platformMeta.brandColor;

    if (appearance.iconStyle === 'minimal') {
      return (
        <div
          className="w-11 h-11 flex items-center justify-center shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-3"
          style={{
            color: isFeatured ? accent.onAccent : theme.textPrimary,
          }}
        >
          <SocialIcon platform={link.platform} className="w-6 h-6" />
        </div>
      );
    }

    if (appearance.iconStyle === 'solid') {
      return (
        <div
          className="w-11 h-11 flex items-center justify-center shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105 group-hover:-rotate-3 shadow-xs"
          style={{
            borderRadius: radius.iconPx,
            backgroundColor: isFeatured ? 'rgba(255,255,255,0.18)' : brandColor,
            color: '#FFFFFF',
          }}
        >
          <SocialIcon platform={link.platform} className="w-5 h-5" />
        </div>
      );
    }

    // Duotone default
    return (
      <div
        className="w-11 h-11 flex items-center justify-center shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:-rotate-3"
        style={{
          borderRadius: radius.iconPx,
          backgroundColor: isFeatured
            ? 'rgba(255,255,255,0.18)'
            : theme.isDark
              ? 'rgba(255,255,255,0.07)'
              : `${brandColor}14`,
          color: isFeatured ? '#FFFFFF' : theme.isDark ? '#F4F5F7' : brandColor,
        }}
      >
        <SocialIcon platform={link.platform} className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div
      className="min-h-screen w-full transition-colors duration-300 flex flex-col"
      style={{
        backgroundColor: theme.canvasBg,
        color: theme.textPrimary,
      }}
    >
      {/* Top Minimal Action Strip (Clean, unobtrusive) */}
      {!isPreview && (
        <header className="w-full max-w-3xl mx-auto px-5 pt-5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-transform duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.borderColor}`,
              borderRadius: radius.iconPx,
              color: theme.textPrimary,
            }}
            aria-label="مشاركة الصفحة"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>مشاركة الصفحة</span>
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-transform duration-150 active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.borderColor}`,
              borderRadius: radius.iconPx,
              color: theme.textSecondary,
            }}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>لوحة التحكم</span>
          </button>
        </header>
      )}

      {/* Main Content Container */}
      <main
        className={`w-full mx-auto flex-1 px-5 ${
          isPreview ? 'py-5 max-w-md' : 'py-8 md:py-12 max-w-2xl'
        }`}
      >
        {/* Profile Header Card / Editorial Hero */}
        <section
          className="overflow-hidden mb-7"
          style={{
            backgroundColor: theme.surfaceBg,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: radius.cardPx,
          }}
        >
          {profile.showCover && (
            <div className="relative h-32 sm:h-40 w-full overflow-hidden">
              {profile.coverUrl && !coverFailed ? (
                <img
                  src={profile.coverUrl}
                  alt="غلاف الملف الشخصي"
                  referrerPolicy="no-referrer"
                  onError={() => setCoverFailed(true)}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: `linear-gradient(135deg, ${accent.hex}22, ${theme.mutedBg})`,
                  }}
                />
              )}
            </div>
          )}

          <div className={`px-6 pb-7 ${profile.showCover ? '-mt-12 relative z-10' : 'pt-7'}`}>
            <div className="flex flex-col items-center text-center">
              {/* Avatar */}
              <div
                className="w-24 h-24 overflow-hidden flex items-center justify-center text-2xl font-bold shadow-sm mb-4"
                style={{
                  borderRadius:
                    appearance.cardRadius === 'sharp' ? '14px' : '9999px',
                  border: `4px solid ${theme.surfaceBg}`,
                  backgroundColor: accent.hex,
                  color: accent.onAccent,
                }}
              >
                {profile.avatarUrl && !avatarFailed ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarFailed(true)}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <span>{initials || 'ر'}</span>
                )}
              </div>

              {/* Display Name */}
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-balance">
                {profile.displayName}
              </h1>

              {/* Clean Unboxed Metadata Line (Zero-Pill Discipline) */}
              {(profile.handle || profile.location) && (
                <div
                  className="mt-1.5 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm"
                  style={{ color: theme.textSecondary }}
                >
                  {profile.handle && (
                    <span className="font-mono" dir="ltr">
                      {profile.handle}
                    </span>
                  )}
                  {profile.handle && profile.location && (
                    <span aria-hidden="true">·</span>
                  )}
                  {profile.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 opacity-75" />
                      <span>{profile.location}</span>
                    </span>
                  )}
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <p
                  className="mt-3.5 max-w-lg text-sm sm:text-[15px] leading-relaxed"
                  style={{ color: theme.textSecondary }}
                >
                  {profile.bio}
                </p>
              )}

              {/* Interactive Quick Social Icon Strip */}
              {profile.showQuickIcons && links.length > 0 && (
                <div
                  className="mt-5 pt-5 w-full flex flex-wrap items-center justify-center gap-2.5"
                  style={{ borderTop: `1px solid ${theme.borderColor}` }}
                  aria-label="أيقونات الوصول السريع"
                >
                  {links.slice(0, 7).map((link) => {
                    const meta = PLATFORM_MAP[link.platform] || PLATFORM_MAP.website;
                    return (
                      <a
                        key={`quick-${link.id}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => handleLinkClick(e, link)}
                        title={link.title}
                        aria-label={link.title}
                        className="group relative w-11 h-11 flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2"
                        style={{
                          borderRadius: radius.iconPx,
                          backgroundColor: theme.mutedBg,
                          color: theme.textPrimary,
                          border: `1px solid ${theme.borderColor}`,
                        }}
                      >
                        <span
                          className="transition-colors duration-200 group-hover:opacity-100"
                          style={{
                            color: theme.isDark ? undefined : meta.brandColor,
                          }}
                        >
                          <SocialIcon platform={link.platform} className="w-5 h-5" />
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Links List / Grid */}
        {links.length === 0 ? (
          <div
            className="p-8 text-center text-sm"
            style={{
              backgroundColor: theme.surfaceBg,
              border: `1px solid ${theme.borderColor}`,
              borderRadius: radius.cardPx,
              color: theme.textSecondary,
            }}
          >
            لا توجد روابط منشورة حالياً. افتح لوحة التحكم لإضافة روابطك.
          </div>
        ) : (
          <section
            className={
              appearance.layout === 'grid' && !isPreview
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
                : 'flex flex-col gap-3'
            }
            aria-label="قائمة الروابط"
          >
            {links.map((link) => {
              const isFeatured = link.featured;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => handleLinkClick(e, link)}
                  className="group relative flex items-center justify-between gap-4 p-4 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    backgroundColor: isFeatured ? accent.hex : theme.surfaceBg,
                    color: isFeatured ? accent.onAccent : theme.textPrimary,
                    border: isFeatured
                      ? `1px solid ${accent.hex}`
                      : `1px solid ${theme.borderColor}`,
                    borderRadius: radius.cardPx,
                  }}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {renderIconBox(link, isFeatured)}
                    <div className="min-w-0 text-right">
                      <div className="font-semibold text-[15px] leading-snug truncate">
                        {link.title}
                      </div>
                      {link.subtitle && (
                        <div
                          className="text-xs mt-0.5 truncate"
                          style={{
                            color: isFeatured
                              ? 'rgba(255,255,255,0.82)'
                              : theme.textSecondary,
                          }}
                        >
                          {link.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="w-8 h-8 flex items-center justify-center shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-x-1 group-hover:-translate-y-0.5"
                    style={{
                      color: isFeatured
                        ? 'rgba(255,255,255,0.9)'
                        : theme.textSecondary,
                    }}
                    aria-hidden="true"
                  >
                    <ArrowUpLeft className="w-4 h-4" />
                  </div>
                </a>
              );
            })}
          </section>
        )}
      </main>

      {/* Quiet Footer */}
      {!isPreview && (
        <footer
          className="w-full max-w-2xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3 text-xs"
          style={{ color: theme.textSecondary }}
        >
          <span>© {new Date().getFullYear()} {profile.displayName}</span>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="hover:underline cursor-pointer"
          >
            إدارة الروابط والإحصائيات
          </button>
        </footer>
      )}

      {/* Share Modal */}
      {shareOpen && !isPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShareOpen(false)}
        >
          <div
            className="w-full max-w-md p-6 shadow-xl"
            style={{
              backgroundColor: theme.surfaceBg,
              color: theme.textPrimary,
              border: `1px solid ${theme.borderColor}`,
              borderRadius: radius.cardPx,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold">مشاركة الصفحة والروابط</h2>
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="p-2 rounded-lg hover:opacity-75 cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>
                  رابط صفحتك المباشر
                </p>
                <div
                  className="flex items-center justify-between gap-2 p-2.5"
                  style={{
                    backgroundColor: theme.mutedBg,
                    borderRadius: radius.iconPx,
                    border: `1px solid ${theme.borderColor}`,
                  }}
                >
                  <span className="text-xs font-mono truncate px-1" dir="ltr">
                    {window.location.origin}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPageUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium shrink-0 cursor-pointer"
                    style={{
                      backgroundColor: accent.hex,
                      color: accent.onAccent,
                      borderRadius: radius.iconPx,
                    }}
                  >
                    {copiedPage ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPage ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>

              {links.length > 0 && (
                <div>
                  <p className="text-xs mb-2" style={{ color: theme.textSecondary }}>
                    روابط التتبع المختصرة (تحسب كل نقرة بدقة)
                  </p>
                  <div className="max-h-52 overflow-y-auto space-y-2">
                    {links.map((link) => (
                      <div
                        key={`share-${link.id}`}
                        className="flex items-center justify-between gap-2 p-2.5"
                        style={{
                          backgroundColor: theme.mutedBg,
                          borderRadius: radius.iconPx,
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <SocialIcon platform={link.platform} className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-medium truncate">{link.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyShortLink(link.id)}
                          className="text-xs px-2.5 py-1 shrink-0 cursor-pointer"
                          style={{
                            border: `1px solid ${theme.borderColor}`,
                            borderRadius: radius.iconPx,
                            backgroundColor: theme.surfaceBg,
                          }}
                        >
                          {copiedId === link.id ? 'تم النسخ' : 'نسخ الرابط'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
