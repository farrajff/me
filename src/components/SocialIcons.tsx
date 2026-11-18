import React from 'react';
import type { SocialPlatform } from '../shared/types';

export interface PlatformMeta {
  id: SocialPlatform;
  labelAr: string;
  brandColor: string;
  placeholderUrl: string;
}

export const PLATFORM_LIST: PlatformMeta[] = [
  {
    id: 'x',
    labelAr: 'منصة إكس (X)',
    brandColor: '#0F1419',
    placeholderUrl: 'https://x.com/username',
  },
  {
    id: 'instagram',
    labelAr: 'إنستغرام',
    brandColor: '#E1306C',
    placeholderUrl: 'https://instagram.com/username',
  },
  {
    id: 'youtube',
    labelAr: 'يوتيوب',
    brandColor: '#FF0000',
    placeholderUrl: 'https://youtube.com/@channel',
  },
  {
    id: 'tiktok',
    labelAr: 'تيك توك',
    brandColor: '#111111',
    placeholderUrl: 'https://tiktok.com/@username',
  },
  {
    id: 'linkedin',
    labelAr: 'لينكدإن',
    brandColor: '#0A66C2',
    placeholderUrl: 'https://linkedin.com/in/username',
  },
  {
    id: 'github',
    labelAr: 'جيت هب',
    brandColor: '#24292E',
    placeholderUrl: 'https://github.com/username',
  },
  {
    id: 'telegram',
    labelAr: 'تليغرام',
    brandColor: '#229ED9',
    placeholderUrl: 'https://t.me/username',
  },
  {
    id: 'whatsapp',
    labelAr: 'واتساب',
    brandColor: '#25D366',
    placeholderUrl: 'https://wa.me/966500000000',
  },
  {
    id: 'snapchat',
    labelAr: 'سناب شات',
    brandColor: '#D9B900',
    placeholderUrl: 'https://snapchat.com/add/username',
  },
  {
    id: 'behance',
    labelAr: 'بيهانس',
    brandColor: '#1769FF',
    placeholderUrl: 'https://behance.net/username',
  },
  {
    id: 'dribbble',
    labelAr: 'دريبل',
    brandColor: '#EA4C89',
    placeholderUrl: 'https://dribbble.com/username',
  },
  {
    id: 'podcast',
    labelAr: 'بودكاست',
    brandColor: '#7C3AED',
    placeholderUrl: 'https://podcasts.apple.com/...',
  },
  {
    id: 'email',
    labelAr: 'البريد الإلكتروني',
    brandColor: '#0F766E',
    placeholderUrl: 'mailto:hello@example.com',
  },
  {
    id: 'website',
    labelAr: 'موقع إلكتروني',
    brandColor: '#1D4ED8',
    placeholderUrl: 'https://example.com',
  },
];

export const PLATFORM_MAP: Record<SocialPlatform, PlatformMeta> = PLATFORM_LIST.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<SocialPlatform, PlatformMeta>,
);

interface SocialIconProps {
  platform: SocialPlatform;
  className?: string;
}

export const SocialIcon: React.FC<SocialIconProps> = ({ platform, className = 'w-5 h-5' }) => {
  switch (platform) {
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'youtube':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.73a8.19 8.19 0 0 0 4.76 1.52V6.8a4.84 4.84 0 0 1-1-.11z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case 'github':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    case 'telegram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.344 5L2 22l5.125-1.344c1.469.797 3.125 1.219 4.906 1.219 5.516 0 9.969-4.453 9.969-9.969C22 6.453 17.547 2 12.031 2zm5.813 14.125c-.25.703-1.438 1.328-2 1.406-.5.078-1.141.109-1.844-.109-.422-.141-.969-.313-1.672-.625-2.953-1.281-4.875-4.266-5.016-4.469-.141-.188-1.203-1.594-1.203-3.047s.75-2.156 1.031-2.453c.266-.297.594-.375.797-.375h.578c.188 0 .438-.078.688.531.25.609.859 2.094.938 2.25.078.156.125.328.016.531-.094.203-.156.328-.313.5-.156.172-.328.391-.469.516-.156.156-.313.328-.141.641.188.313.813 1.344 1.75 2.172 1.203 1.078 2.219 1.406 2.531 1.563.313.156.5.125.688-.078.188-.219.797-.938 1.016-1.25.203-.313.422-.266.703-.156.297.109 1.844.875 2.156 1.031.313.156.531.234.609.359.078.125.078.734-.172 1.438z" />
        </svg>
      );
    case 'snapchat':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.12-.062-.18-.014-.229.15-.448.391-.493 3.249-.54 4.715-3.878 4.776-4.014l.014-.015c.181-.344.21-.644.12-.868-.195-.45-.884-.675-1.333-.81-.135-.044-.255-.09-.344-.119-.823-.329-1.228-.719-1.213-1.168 0-.359.284-.689.734-.838.15-.061.329-.09.509-.09.12 0 .299.016.464.104.374.181.733.285 1.033.301.198 0 .326-.045.401-.09-.008-.165-.018-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.638 1.069 10.995.793 11.985.793h.221z" />
        </svg>
      );
    case 'behance':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988H0V5.021h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zM3 11h3.584c2.508 0 2.906-3-.312-3H3v3zm3.391 3H3v3.016h3.341c3.055 0 2.868-3.016.05-3.016z" />
        </svg>
      );
    case 'dribbble':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94" />
          <path d="M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32" />
          <path d="M8.56 2.75c4.37 6 6 9.42 8 17.72" />
        </svg>
      );
    case 'podcast':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      );
    case 'email':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="3" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case 'website':
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.5 12h19" />
          <path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19z" />
        </svg>
      );
  }
};
