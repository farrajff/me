import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutGrid,
  Link2,
  Lock,
  LogOut,
  Monitor,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ACCENT_COLORS,
  RADIUS_MAP,
  THEME_PRESETS,
  type AccentColorId,
  type AdminDashboardPayload,
  type AppearanceSettings,
  type CardRadiusId,
  type IconStyle,
  type LayoutMode,
  type ProfileData,
  type SocialLink,
  type SocialPlatform,
  type ThemePresetId,
} from '../shared/types';
import { PublicProfileView } from './PublicProfileView';
import { PLATFORM_LIST, PLATFORM_MAP, SocialIcon } from './SocialIcons';
import {
  changePassword as changePasswordApi,
  deleteLinkItem,
  fetchAdminDashboard,
  getAppMode,
  patchLinkItem,
  reorderLinkItems,
  resetAnalyticsData,
  saveLinkItem,
  saveProfileAndAppearance,
} from '../services/dataClient';

type DashboardTab = 'links' | 'appearance' | 'analytics' | 'security';

interface DashboardViewProps {
  token: string;
  onTokenUpdated: (newToken: string) => void;
  onLogout: () => void;
  onBackToPublic: () => void;
  onPublicDataChanged: () => void;
}

function resizeImageFile(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('تعذر معالجة الصورة'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function getLastNDaysKeys(days: number): string[] {
  const keys: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function formatArabicDateShort(isoDate: string): string {
  try {
    const [year, month, day] = isoDate.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    return new Intl.DateTimeFormat('ar-SA', {
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return isoDate;
  }
}

function formatArabicDateTime(isoTs: string): string {
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoTs));
  } catch {
    return isoTs;
  }
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  token,
  onTokenUpdated,
  onLogout,
  onBackToPublic,
  onPublicDataChanged,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('links');
  const [data, setData] = useState<AdminDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Link Add / Edit modal state
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<SocialLink | null>(null);
  const [formPlatform, setFormPlatform] = useState<SocialPlatform>('x');
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [linkFormError, setLinkFormError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);

  // Appearance & Profile draft state
  const [draftProfile, setDraftProfile] = useState<ProfileData | null>(null);
  const [draftAppearance, setDraftAppearance] = useState<AppearanceSettings | null>(null);
  const [savingAppearance, setSavingAppearance] = useState(false);

  // Analytics state
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [confirmResetStats, setConfirmResetStats] = useState(false);

  // Security password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'ok' | 'err'; msg: string } | null>(
    null,
  );
  const [savingPassword, setSavingPassword] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 2600);
  };

  const fetchDashboard = useCallback(async () => {
    try {
      setError('');
      const payload = await fetchAdminDashboard(token);
      setData(payload);
      setDraftProfile(payload.profile);
      setDraftAppearance(payload.appearance);
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع.');
    } finally {
      setLoading(false);
    }
  }, [token, onLogout]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // --- Link CRUD Handlers ---
  const openAddModal = () => {
    setEditingLink(null);
    setFormPlatform('instagram');
    setFormTitle(PLATFORM_MAP.instagram.labelAr);
    setFormSubtitle('');
    setFormUrl('');
    setFormFeatured(false);
    setLinkFormError('');
    setLinkModalOpen(true);
  };

  const openEditModal = (link: SocialLink) => {
    setEditingLink(link);
    setFormPlatform(link.platform);
    setFormTitle(link.title);
    setFormSubtitle(link.subtitle);
    setFormUrl(link.url);
    setFormFeatured(link.featured);
    setLinkFormError('');
    setLinkModalOpen(true);
  };

  const handlePlatformSelect = (platform: SocialPlatform) => {
    setFormPlatform(platform);
    if (!editingLink) {
      const prevMeta = PLATFORM_MAP[formPlatform];
      if (!formTitle || formTitle === prevMeta.labelAr) {
        setFormTitle(PLATFORM_MAP[platform].labelAr);
      }
    }
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkFormError('');
    if (!formTitle.trim()) {
      setLinkFormError('يرجى إدخال عنوان للرابط.');
      return;
    }
    if (!formUrl.trim()) {
      setLinkFormError('يرجى إدخال عنوان URL.');
      return;
    }

    setSavingLink(true);
    try {
      await saveLinkItem(token, editingLink ? editingLink.id : null, {
        platform: formPlatform,
        title: formTitle.trim(),
        subtitle: formSubtitle.trim(),
        url: formUrl.trim(),
        featured: formFeatured,
      });
      setLinkModalOpen(false);
      await fetchDashboard();
      onPublicDataChanged();
      showToast(editingLink ? 'تم تحديث الرابط بنجاح.' : 'تمت إضافة الرابط بنجاح.');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onLogout();
        return;
      }
      setLinkFormError(err instanceof Error ? err.message : 'تعذر حفظ الرابط.');
    } finally {
      setSavingLink(false);
    }
  };

  const handleToggleActive = async (link: SocialLink) => {
    try {
      await patchLinkItem(token, link.id, { isActive: !link.isActive });
      await fetchDashboard();
      onPublicDataChanged();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') onLogout();
    }
  };

  const handleToggleFeatured = async (link: SocialLink) => {
    try {
      await patchLinkItem(token, link.id, { featured: !link.featured });
      await fetchDashboard();
      onPublicDataChanged();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') onLogout();
    }
  };

  const handleMoveLink = async (index: number, direction: 'up' | 'down') => {
    if (!data) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= data.links.length) return;

    const reordered = [...data.links];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    setData({ ...data, links: reordered });
    try {
      await reorderLinkItems(
        token,
        reordered.map((item) => item.id),
      );
      onPublicDataChanged();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onLogout();
        return;
      }
      await fetchDashboard();
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      await deleteLinkItem(token, id);
      setDeleteConfirmId(null);
      await fetchDashboard();
      onPublicDataChanged();
      showToast('تم حذف الرابط.');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') onLogout();
    }
  };

  const handleCopyTrackingUrl = async (id: string) => {
    try {
      const base = window.location.href.split('#')[0].replace(/\/$/, '');
      const targetUrl =
        getAppMode() === 'server' ? `${base}/r/${id}` : data?.links.find((l) => l.id === id)?.url || '';
      await navigator.clipboard.writeText(targetUrl);
      setCopiedTrackingId(id);
      setTimeout(() => setCopiedTrackingId(null), 1800);
    } catch {
      // Ignore
    }
  };

  // --- Appearance & Profile Save ---
  const handleSaveAppearanceAndProfile = async () => {
    if (!draftProfile || !draftAppearance) return;
    setSavingAppearance(true);
    try {
      await saveProfileAndAppearance(token, draftProfile, draftAppearance);
      await fetchDashboard();
      onPublicDataChanged();
      showToast('تم حفظ المظهر وبيانات الملف بنجاح.');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        onLogout();
        return;
      }
      showToast('تعذر حفظ التغييرات.');
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'avatarUrl' | 'coverUrl',
  ) => {
    const file = e.target.files?.[0];
    if (!file || !draftProfile) return;
    try {
      const resized = await resizeImageFile(file, field === 'avatarUrl' ? 300 : 800);
      setDraftProfile({ ...draftProfile, [field]: resized });
    } catch {
      showToast('تعذر معالجة الصورة المختارة.');
    }
  };

  // --- Analytics Reset ---
  const handleResetAnalytics = async () => {
    try {
      await resetAnalyticsData(token);
      setConfirmResetStats(false);
      await fetchDashboard();
      showToast('تم تصفير جميع إحصائيات النقرات.');
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') onLogout();
    }
  };

  // --- Change Password ---
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.trim().length < 4) {
      setPasswordStatus({ type: 'err', msg: 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordStatus({ type: 'err', msg: 'كلمتا المرور الجديدتان غير متطابقتين.' });
      return;
    }
    setSavingPassword(true);
    try {
      const newToken = await changePasswordApi(token, currentPassword, newPassword.trim());
      onTokenUpdated(newToken);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordStatus({ type: 'ok', msg: 'تم تحديث كلمة المرور المشفرة بنجاح.' });
    } catch (err) {
      setPasswordStatus({
        type: 'err',
        msg: err instanceof Error ? err.message : 'تعذر تحديث كلمة المرور.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // --- Computed Analytics ---
  const analyticsStats = useMemo(() => {
    if (!data) {
      return {
        totalClicks: 0,
        todayClicks: 0,
        ctrPercent: '0.0',
        topLink: null as SocialLink | null,
        chartSeries: [] as { date: string; label: string; count: number }[],
        maxDayCount: 1,
        todayByLink: {} as Record<string, number>,
        lastClickByLink: {} as Record<string, string>,
      };
    }

    const todayKey = new Date().toISOString().slice(0, 10);
    const totalClicks = data.links.reduce((sum, link) => sum + (link.clicks || 0), 0);
    const todayByLink = data.analytics.dailyClicks[todayKey] || {};
    const todayClicks = Object.values(todayByLink).reduce((sum, n) => sum + n, 0);
    const views = data.analytics.totalPageViews || 0;
    const ctrPercent = views > 0 ? ((totalClicks / views) * 100).toFixed(1) : '0.0';

    const topLink =
      data.links.length > 0
        ? [...data.links].sort((a, b) => b.clicks - a.clicks)[0]
        : null;

    const daysKeys = getLastNDaysKeys(chartDays);
    const chartSeries = daysKeys.map((date) => {
      const dayMap = data.analytics.dailyClicks[date] || {};
      const count = Object.values(dayMap).reduce((sum, n) => sum + n, 0);
      return {
        date,
        label: formatArabicDateShort(date),
        count,
      };
    });
    const maxDayCount = Math.max(1, ...chartSeries.map((d) => d.count));

    const lastClickByLink: Record<string, string> = {};
    for (const ev of data.analytics.recentEvents) {
      if (!lastClickByLink[ev.linkId]) {
        lastClickByLink[ev.linkId] = ev.timestamp;
      }
    }

    return {
      totalClicks,
      todayClicks,
      ctrPercent,
      topLink,
      chartSeries,
      maxDayCount,
      todayByLink,
      lastClickByLink,
    };
  }, [data, chartDays]);

  const linkTitleById = useMemo(() => {
    const map: Record<string, SocialLink> = {};
    data?.links.forEach((l) => {
      map[l.id] = l;
    });
    return map;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] text-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-4">
          <div className="h-12 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
            <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          </div>
          <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data || !draftProfile || !draftAppearance) {
    return (
      <div className="min-h-screen bg-[#F8F7F4] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4">
          <p className="text-sm text-red-700">{error || 'تعذر تحميل لوحة التحكم.'}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={fetchDashboard}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-xl cursor-pointer"
            >
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={onBackToPublic}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-xl cursor-pointer"
            >
              العودة للصفحة العامة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: { id: DashboardTab; label: string; icon: React.ReactNode }[] = [
    { id: 'links', label: 'إدارة الروابط', icon: <Link2 className="w-4 h-4" /> },
    { id: 'appearance', label: 'المظهر والملف', icon: <Palette className="w-4 h-4" /> },
    { id: 'analytics', label: 'الإحصائيات', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'security', label: 'الأمان وكلمة المرور', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F4] text-[#111315] flex flex-col lg:flex-row">
      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-5 z-50 flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-white bg-slate-900 rounded-xl shadow-lg"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Sidebar (Desktop) */}
      <aside className="lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-l border-slate-200 flex flex-col justify-between">
        <div>
          <div className="px-5 py-5 border-b border-slate-200 flex items-center justify-between gap-3">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
              روابطي · الإدارة
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="lg:hidden inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>قفل</span>
            </button>
          </div>

          <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto" aria-label="أقسام لوحة التحكم">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-4 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={onBackToPublic}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>عرض الصفحة العامة</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>قفل الجلسة</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="bg-white border-b border-slate-200 px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {navItems.find((n) => n.id === activeTab)?.label}
            </h1>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onBackToPublic}
              className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>الصفحة العامة</span>
            </button>
            {activeTab === 'links' && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة رابط جديد</span>
              </button>
            )}
            {activeTab === 'appearance' && (
              <button
                type="button"
                onClick={handleSaveAppearanceAndProfile}
                disabled={savingAppearance}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{savingAppearance ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
              </button>
            )}
            {activeTab === 'analytics' && (
              <button
                type="button"
                onClick={fetchDashboard}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>تحديث الإحصائيات</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-5 sm:p-8 max-w-6xl w-full mx-auto">
          {/* TAB 1: LINKS MANAGEMENT */}
          {activeTab === 'links' && (
            <div className="space-y-5">
              {/* Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">إجمالي الروابط</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{data.links.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">الروابط النشطة</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums text-emerald-700">
                    {data.links.filter((l) => l.isActive).length}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">إجمالي النقرات</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums text-blue-700">
                    {analyticsStats.totalClicks}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500">نقرات اليوم</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">
                    {analyticsStats.todayClicks}
                  </div>
                </div>
              </div>

              {/* Links List */}
              {data.links.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                  <p className="text-sm text-slate-600">لا توجد روابط مضافة حتى الآن.</p>
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-xl cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>أضف أول رابط الآن</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden">
                  {data.links.map((link, index) => {
                    const meta = PLATFORM_MAP[link.platform] || PLATFORM_MAP.website;
                    return (
                      <div
                        key={link.id}
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          link.isActive ? 'bg-white' : 'bg-slate-50/70 opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Order Controls */}
                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveLink(index, 'up')}
                              aria-label="تحريك للأعلى"
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-25 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === data.links.length - 1}
                              onClick={() => handleMoveLink(index, 'down')}
                              aria-label="تحريك للأسفل"
                              className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-25 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Platform Icon */}
                          <div
                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${meta.brandColor}14`,
                              color: meta.brandColor,
                            }}
                          >
                            <SocialIcon platform={link.platform} className="w-5 h-5" />
                          </div>

                          {/* Link Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900 truncate">
                                {link.title}
                              </span>
                              <span className="text-xs text-slate-400 shrink-0">·</span>
                              <span className="text-xs text-slate-500 shrink-0">{meta.labelAr}</span>
                              {link.featured && (
                                <>
                                  <span className="text-xs text-slate-400 shrink-0">·</span>
                                  <span className="text-xs font-medium text-blue-700 shrink-0">
                                    مميز
                                  </span>
                                </>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 font-mono truncate mt-0.5" dir="ltr">
                              {link.url}
                            </div>
                          </div>
                        </div>

                        {/* Actions & Exact Click Counter */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                          <div className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg tabular-nums">
                            {link.clicks} نقرة
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCopyTrackingUrl(link.id)}
                            title="نسخ رابط التتبع المباشر"
                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            {copiedTrackingId === link.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(link)}
                            title={link.featured ? 'إلغاء التمييز' : 'تمييز الرابط'}
                            className={`p-2 rounded-lg cursor-pointer ${
                              link.featured
                                ? 'text-amber-600 bg-amber-50'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Star className="w-4 h-4" fill={link.featured ? 'currentColor' : 'none'} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleActive(link)}
                            title={link.isActive ? 'إخفاء من الصفحة' : 'إظهار في الصفحة'}
                            className={`p-2 rounded-lg cursor-pointer ${
                              link.isActive
                                ? 'text-emerald-700 hover:bg-emerald-50'
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {link.isActive ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(link)}
                            title="تعديل"
                            className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {deleteConfirmId === link.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleDeleteLink(link.id)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded-lg cursor-pointer"
                              >
                                تأكيد
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(link.id)}
                              title="حذف"
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: APPEARANCE & PROFILE */}
          {activeTab === 'appearance' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
              {/* Editor Controls */}
              <div className="xl:col-span-7 space-y-6">
                {/* Profile Section */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h2 className="text-base font-bold text-slate-900">البيانات الشخصية</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        الاسم الظاهر
                      </label>
                      <input
                        type="text"
                        value={draftProfile.displayName}
                        onChange={(e) =>
                          setDraftProfile({ ...draftProfile, displayName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        المعرّف (Handle)
                      </label>
                      <input
                        type="text"
                        dir="ltr"
                        value={draftProfile.handle}
                        onChange={(e) =>
                          setDraftProfile({ ...draftProfile, handle: e.target.value })
                        }
                        className="w-full px-3.5 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      النبذة التعريفية
                    </label>
                    <textarea
                      rows={3}
                      value={draftProfile.bio}
                      onChange={(e) => setDraftProfile({ ...draftProfile, bio: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      الموقع / الحالة
                    </label>
                    <input
                      type="text"
                      value={draftProfile.location}
                      onChange={(e) =>
                        setDraftProfile({ ...draftProfile, location: e.target.value })
                      }
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        الصورة الشخصية (رابط أو رفع ملف)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={draftProfile.avatarUrl}
                          onChange={(e) =>
                            setDraftProfile({ ...draftProfile, avatarUrl: e.target.value })
                          }
                          placeholder="https://..."
                          className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
                        />
                        <label className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'avatarUrl')}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        صورة الغلاف (رابط أو رفع ملف)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          dir="ltr"
                          value={draftProfile.coverUrl}
                          onChange={(e) =>
                            setDraftProfile({ ...draftProfile, coverUrl: e.target.value })
                          }
                          placeholder="https://..."
                          className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl"
                        />
                        <label className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer shrink-0">
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, 'coverUrl')}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6 pt-2">
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftProfile.showCover}
                        onChange={(e) =>
                          setDraftProfile({ ...draftProfile, showCover: e.target.checked })
                        }
                        className="w-4 h-4 accent-blue-700 rounded"
                      />
                      <span>إظهار صورة الغلاف</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draftProfile.showQuickIcons}
                        onChange={(e) =>
                          setDraftProfile({ ...draftProfile, showQuickIcons: e.target.checked })
                        }
                        className="w-4 h-4 accent-blue-700 rounded"
                      />
                      <span>إظهار شريط الأيقونات التفاعلي السريع</span>
                    </label>
                  </div>
                </section>

                {/* Theme & Style Section */}
                <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                  <h2 className="text-base font-bold text-slate-900">تخصيص المظهر والألوان</h2>

                  {/* Themes */}
                  <div>
                    <div className="text-xs font-medium text-slate-700 mb-2.5">السمة العامة</div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {(Object.keys(THEME_PRESETS) as ThemePresetId[]).map((themeId) => {
                        const preset = THEME_PRESETS[themeId];
                        const selected = draftAppearance.theme === themeId;
                        return (
                          <button
                            key={themeId}
                            type="button"
                            onClick={() =>
                              setDraftAppearance({ ...draftAppearance, theme: themeId })
                            }
                            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                              selected
                                ? 'border-blue-700 ring-2 ring-blue-700/20'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div
                              className="w-full h-9 rounded-lg border mb-2 flex items-center justify-center"
                              style={{
                                backgroundColor: preset.canvasBg,
                                borderColor: preset.borderColor,
                              }}
                            >
                              <div
                                className="w-6 h-3 rounded-xs"
                                style={{ backgroundColor: preset.surfaceBg }}
                              />
                            </div>
                            <div className="text-xs font-medium text-slate-800 truncate">
                              {preset.nameAr}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Accent Colors */}
                  <div>
                    <div className="text-xs font-medium text-slate-700 mb-2.5">
                      اللون الرئيسي (للروابط المميزة)
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {(Object.keys(ACCENT_COLORS) as AccentColorId[]).map((accentId) => {
                        const accent = ACCENT_COLORS[accentId];
                        const selected = draftAppearance.accentColor === accentId;
                        return (
                          <button
                            key={accentId}
                            type="button"
                            onClick={() =>
                              setDraftAppearance({ ...draftAppearance, accentColor: accentId })
                            }
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer ${
                              selected
                                ? 'border-slate-900 bg-slate-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: accent.hex }}
                            />
                            <span>{accent.nameAr}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Radius + Layout + Icon Style */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-2">حواف البطاقات</div>
                      <div className="flex flex-col gap-1.5">
                        {(Object.keys(RADIUS_MAP) as CardRadiusId[]).map((rId) => (
                          <button
                            key={rId}
                            type="button"
                            onClick={() =>
                              setDraftAppearance({ ...draftAppearance, cardRadius: rId })
                            }
                            className={`px-3 py-2 text-xs font-medium rounded-xl border text-right cursor-pointer ${
                              draftAppearance.cardRadius === rId
                                ? 'border-blue-700 bg-blue-50 text-blue-800'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            {RADIUS_MAP[rId].labelAr}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-2">تخطيط الروابط</div>
                      <div className="flex flex-col gap-1.5">
                        {(
                          [
                            { id: 'list', label: 'قائمة عمودية' },
                            { id: 'grid', label: 'شبكة ثنائية' },
                          ] as { id: LayoutMode; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setDraftAppearance({ ...draftAppearance, layout: opt.id })
                            }
                            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl border cursor-pointer ${
                              draftAppearance.layout === opt.id
                                ? 'border-blue-700 bg-blue-50 text-blue-800'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            <span>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-700 mb-2">نمط الأيقونات</div>
                      <div className="flex flex-col gap-1.5">
                        {(
                          [
                            { id: 'duotone', label: 'مؤطر ناعم' },
                            { id: 'solid', label: 'ملون بارز' },
                            { id: 'minimal', label: 'بسيط بدون خلفية' },
                          ] as { id: IconStyle; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setDraftAppearance({ ...draftAppearance, iconStyle: opt.id })
                            }
                            className={`px-3 py-2 text-xs font-medium rounded-xl border text-right cursor-pointer ${
                              draftAppearance.iconStyle === opt.id
                                ? 'border-blue-700 bg-blue-50 text-blue-800'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Live Preview Column */}
              <div className="xl:col-span-5 xl:sticky xl:top-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-semibold text-slate-700">معاينة حية مباشرة</span>
                    <span className="text-xs text-slate-400">تتحدث فوراً</span>
                  </div>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[680px] overflow-y-auto">
                    <PublicProfileView
                      profile={draftProfile}
                      appearance={draftAppearance}
                      links={data.links.filter((l) => l.isActive)}
                      onTrackClick={() => {}}
                      onOpenAdmin={() => {}}
                      isPreview
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRECISION ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* 4-Column KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">إجمالي النقرات</div>
                  <div className="text-3xl font-bold mt-1.5 tabular-nums text-slate-900">
                    {analyticsStats.totalClicks}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">عبر جميع الروابط</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">نقرات اليوم</div>
                  <div className="text-3xl font-bold mt-1.5 tabular-nums text-blue-700">
                    {analyticsStats.todayClicks}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">محدثة لحظياً</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">مشاهدات الصفحة</div>
                  <div className="text-3xl font-bold mt-1.5 tabular-nums text-slate-900">
                    {data.analytics.totalPageViews}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    معدل النقر لكل زيارة: {analyticsStats.ctrPercent}%
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5">
                  <div className="text-xs text-slate-500">الرابط الأكثر تفاعلاً</div>
                  <div className="text-base font-bold mt-2 truncate text-slate-900">
                    {analyticsStats.topLink && analyticsStats.topLink.clicks > 0
                      ? analyticsStats.topLink.title
                      : 'لا توجد نقرات بعد'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 tabular-nums">
                    {analyticsStats.topLink && analyticsStats.topLink.clicks > 0
                      ? `${analyticsStats.topLink.clicks} نقرة`
                      : 'انقر على أي رابط لاختبار التتبع'}
                  </div>
                </div>
              </div>

              {/* Daily Click Activity Chart + Device Split */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">حركة النقرات اليومية</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        توزيع دقيق للنقرات المسجلة خلال الفترة المحددة
                      </p>
                    </div>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                      {([7, 14, 30] as const).map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setChartDays(days)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                            chartDays === days
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {days} يوم
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clean Custom SVG Bar Chart */}
                  <div className="h-52 flex items-end gap-1.5 sm:gap-2.5 pt-6">
                    {analyticsStats.chartSeries.map((point) => {
                      const heightPct = Math.max(
                        point.count > 0 ? 10 : 3,
                        Math.round((point.count / analyticsStats.maxDayCount) * 100),
                      );
                      const isHovered = hoveredDay === point.date;
                      return (
                        <div
                          key={point.date}
                          onMouseEnter={() => setHoveredDay(point.date)}
                          onMouseLeave={() => setHoveredDay(null)}
                          className="flex-1 h-full flex flex-col items-center justify-end group relative"
                        >
                          {isHovered && (
                            <div className="absolute -top-2 z-10 px-2 py-1 text-[11px] font-medium text-white bg-slate-900 rounded-lg whitespace-nowrap tabular-nums shadow-sm pointer-events-none">
                              {point.label}: {point.count} نقرة
                            </div>
                          )}
                          <div
                            className="w-full max-w-[32px] rounded-t-md transition-all duration-200"
                            style={{
                              height: `${heightPct}%`,
                              backgroundColor:
                                point.count > 0
                                  ? isHovered
                                    ? '#1E40AF'
                                    : '#1D4ED8'
                                  : '#E2E8F0',
                            }}
                          />
                          {(chartDays <= 14 ||
                            analyticsStats.chartSeries.indexOf(point) % 5 === 0) && (
                            <span className="text-[10px] text-slate-400 mt-2 truncate max-w-full">
                              {point.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Device Breakdown */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">الأجهزة المستخدمة</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      توزيع النقرات حسب نوع جهاز الزائر
                    </p>

                    <div className="mt-6 space-y-4">
                      {(() => {
                        const mobile = data.analytics.deviceCounts.mobile || 0;
                        const desktop = data.analytics.deviceCounts.desktop || 0;
                        const totalDev = mobile + desktop;
                        const mobilePct = totalDev > 0 ? Math.round((mobile / totalDev) * 100) : 0;
                        const desktopPct = totalDev > 0 ? 100 - mobilePct : 0;
                        return (
                          <>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                  <Smartphone className="w-4 h-4 text-blue-700" />
                                  <span>الهواتف الذكية</span>
                                </span>
                                <span className="tabular-nums text-slate-600">
                                  {mobile} ({mobilePct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-700 rounded-full transition-all"
                                  style={{ width: `${mobilePct}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                                  <Monitor className="w-4 h-4 text-slate-700" />
                                  <span>أجهزة الحاسوب</span>
                                </span>
                                <span className="tabular-nums text-slate-600">
                                  {desktop} ({desktopPct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-700 rounded-full transition-all"
                                  style={{ width: `${desktopPct}%` }}
                                />
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="pt-5 mt-6 border-t border-slate-200 flex items-center justify-between">
                    {confirmResetStats ? (
                      <div className="flex items-center gap-2 w-full justify-between">
                        <span className="text-xs text-red-700 font-medium">تصفير كل النقرات؟</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleResetAnalytics}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 rounded-lg cursor-pointer"
                          >
                            نعم
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmResetStats(false)}
                            className="px-2.5 py-1 text-xs text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmResetStats(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>تصفير عداد الإحصائيات</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Per-Link Exact Statistics Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    إحصائيات النقرات لكل رابط
                  </h2>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {data.links.length} روابط
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-5">الرابط</th>
                        <th className="py-3 px-4">الحالة</th>
                        <th className="py-3 px-4">نقرات اليوم</th>
                        <th className="py-3 px-4">إجمالي النقرات</th>
                        <th className="py-3 px-4 min-w-[150px]">النسبة</th>
                        <th className="py-3 px-5">آخر نقرة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {[...data.links]
                        .sort((a, b) => b.clicks - a.clicks)
                        .map((link) => {
                          const share =
                            analyticsStats.totalClicks > 0
                              ? Math.round((link.clicks / analyticsStats.totalClicks) * 100)
                              : 0;
                          const todayCount = analyticsStats.todayByLink[link.id] || 0;
                          const lastClick = analyticsStats.lastClickByLink[link.id];
                          const meta = PLATFORM_MAP[link.platform] || PLATFORM_MAP.website;
                          return (
                            <tr key={`stat-${link.id}`} className="hover:bg-slate-50/80">
                              <td className="py-3.5 px-5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span style={{ color: meta.brandColor }}>
                                    <SocialIcon platform={link.platform} className="w-4 h-4" />
                                  </span>
                                  <div className="min-w-0">
                                    <div className="font-medium text-slate-900 truncate max-w-[220px]">
                                      {link.title}
                                    </div>
                                    <div
                                      className="text-xs text-slate-400 font-mono truncate max-w-[220px]"
                                      dir="ltr"
                                    >
                                      {link.url}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs">
                                <span
                                  className={
                                    link.isActive
                                      ? 'text-emerald-700 font-medium'
                                      : 'text-slate-400'
                                  }
                                >
                                  {link.isActive ? 'نشط' : 'مخفي'}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 tabular-nums font-medium text-slate-700">
                                {todayCount}
                              </td>
                              <td className="py-3.5 px-4 tabular-nums font-bold text-slate-900">
                                {link.clicks}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-700 rounded-full"
                                      style={{ width: `${share}%` }}
                                    />
                                  </div>
                                  <span className="text-xs tabular-nums text-slate-600 w-9 text-left">
                                    {share}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3.5 px-5 text-xs text-slate-500 whitespace-nowrap">
                                {lastClick ? formatArabicDateTime(lastClick) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Clicks Log */}
              {data.analytics.recentEvents.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">سجل النقرات الأخيرة</h2>
                  </div>
                  <div className="divide-y divide-slate-200">
                    {data.analytics.recentEvents.slice(0, 12).map((ev) => {
                      const targetLink = linkTitleById[ev.linkId];
                      return (
                        <div
                          key={ev.id}
                          className="px-6 py-3 flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {targetLink && (
                              <SocialIcon
                                platform={targetLink.platform}
                                className="w-4 h-4 shrink-0 text-slate-600"
                              />
                            )}
                            <span className="font-medium text-slate-900 truncate">
                              {targetLink ? targetLink.title : 'رابط محذوف'}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">
                              {ev.device === 'mobile' ? 'جوال' : 'حاسوب'}
                            </span>
                          </div>
                          <span className="text-slate-500 tabular-nums shrink-0">
                            {formatArabicDateTime(ev.timestamp)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SECURITY & ENCRYPTED PASSWORD */}
          {activeTab === 'security' && (
            <div className="max-w-xl space-y-5">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-2">
                <div className="flex items-center gap-2.5 text-slate-900">
                  <Lock className="w-5 h-5 text-blue-700" />
                  <h2 className="text-base font-bold">حماية وتشفير كلمة المرور</h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  يتم حفظ كلمة مرور الإدارة على الخادم بصيغة مشفرة غير قابلة للعكس باستخدام خوارزمية{' '}
                  <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    Scrypt
                  </span>{' '}
                  مع قيمة عشوائية (Salt) فريدة لكل كلمة مرور، مع مقارنة زمنية ثابتة لمنع هجمات التوقيت.
                </p>
              </div>

              <form
                onSubmit={handleChangePassword}
                className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"
              >
                <h3 className="text-sm font-bold text-slate-900">تغيير كلمة مرور التعديل</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    كلمة المرور الحالية
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    تأكيد كلمة المرور الجديدة
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>

                {passwordStatus && (
                  <div
                    role="alert"
                    className={`text-xs font-medium rounded-xl px-3.5 py-2.5 border ${
                      passwordStatus.type === 'ok'
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : 'text-red-700 bg-red-50 border-red-200'
                    }`}
                  >
                    {passwordStatus.msg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingPassword}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{savingPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور المشفرة'}</span>
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Link Modal */}
      {linkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setLinkModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                {editingLink ? 'تعديل الرابط' : 'إضافة رابط جديد'}
              </h2>
              <button
                type="button"
                onClick={() => setLinkModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-4">
              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  اختر المنصة والأيقونة
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {PLATFORM_LIST.map((plat) => {
                    const selected = formPlatform === plat.id;
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => handlePlatformSelect(plat.id)}
                        title={plat.labelAr}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                          selected
                            ? 'border-blue-700 bg-blue-50 text-blue-800'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <SocialIcon platform={plat.id} className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  عنوان الرابط
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: حسابي على منصة إكس"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  وصف مختصر (اختياري)
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="مثال: أحدث التدوينات والأفكار اليومية"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  الرابط الإلكتروني (URL)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder={PLATFORM_MAP[formPlatform].placeholderUrl}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="w-4 h-4 accent-blue-700 rounded"
                />
                <span>تمييز هذا الرابط باللون الرئيسي في الصفحة العامة</span>
              </label>

              {linkFormError && (
                <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  {linkFormError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingLink}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl cursor-pointer"
                >
                  {savingLink ? 'جاري الحفظ...' : editingLink ? 'حفظ التعديلات' : 'إضافة الرابط'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
