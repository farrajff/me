import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, LogOut, ShieldCheck } from 'lucide-react';
import {
  loginWithPassword,
  setupPassword,
  signInAdminWithGoogle,
  signOutAdminGoogle,
} from '../services/dataClient';

interface AuthGateProps {
  firebaseUser: User | null;
  isConfigured: boolean;
  checkingConfig: boolean;
  onAuthenticated: (token: string) => void;
  onBackToPublic: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  firebaseUser,
  isConfigured,
  checkingConfig,
  onAuthenticated,
  onBackToPublic,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInAdminWithGoogle();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? 'تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.'
          : 'تعذر تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.trim().length < 4) {
      setError('يجب أن تتكون كلمة المرور من 4 أحرف على الأقل.');
      return;
    }

    if (!isConfigured && password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);
    try {
      const token = isConfigured
        ? await loginWithPassword(password)
        : await setupPassword(password);
      onAuthenticated(token);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع.';
      if (msg.includes('Missing or insufficient permissions') || msg.includes('PERMISSION_DENIED')) {
        setError('هذا الحساب غير مصرح له بإدارة هذه الصفحة.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#111315] flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-7 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={onBackToPublic}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للصفحة العامة</span>
          </button>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            {!firebaseUser || isConfigured ? (
              <Lock className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
        </div>

        {!firebaseUser ? (
          <div>
            <h1 className="text-xl font-bold text-slate-900">التحقق من حساب المالك</h1>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              سجّل الدخول بحساب Google المصرّح له للوصول إلى قاعدة البيانات ولوحة التحكم.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-6 w-full inline-flex items-center justify-center gap-2.5 py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'جاري فتح نافذة Google...' : 'تسجيل الدخول عبر Google'}</span>
            </button>
          </div>
        ) : checkingConfig ? (
          <div className="py-8 space-y-3">
            <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2 text-xs text-slate-500">
              <span className="truncate font-mono" dir="ltr">
                {firebaseUser.email}
              </span>
              <button
                type="button"
                onClick={() => void signOutAdminGoogle()}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-red-700 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تبديل الحساب</span>
              </button>
            </div>

            <h1 className="text-xl font-bold text-slate-900">
              {isConfigured ? 'أدخل كلمة مرور التعديل' : 'إعداد كلمة مرور التعديل'}
            </h1>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              {isConfigured
                ? 'أدخل كلمة المرور المشفرة لإدارة الروابط، تخصيص المظهر، ومراجعة إحصائيات النقرات.'
                : 'لحماية لوحة التحكم بكلمة مرور إضافية، قم بتعيين كلمة مرور الآن. يتم تشفيرها بخوارزمية PBKDF2 مع Salt عشوائي وحفظها في قاعدة البيانات.'}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {isConfigured ? 'كلمة المرور' : 'كلمة المرور الجديدة'}
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 pl-10 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {!isConfigured && (
                <div>
                  <label
                    htmlFor="admin-password-confirm"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    تأكيد كلمة المرور
                  </label>
                  <input
                    id="admin-password-confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>
                  {loading
                    ? 'جاري التحقق...'
                    : isConfigured
                      ? 'فتح لوحة التحكم'
                      : 'حفظ كلمة المرور المشفرة والدخول'}
                </span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
