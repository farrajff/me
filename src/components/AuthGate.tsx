import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react';

interface AuthGateProps {
  isConfigured: boolean;
  onAuthenticated: (token: string) => void;
  onBackToPublic: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  isConfigured,
  onAuthenticated,
  onBackToPublic,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const endpoint = isConfigured ? '/api/auth/login' : '/api/auth/setup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setError(data.error || 'تعذر التحقق من كلمة المرور.');
        return;
      }
      onAuthenticated(data.token);
    } catch {
      setError('حدث خطأ في الاتصال بالخادم.');
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
            {isConfigured ? <Lock className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900">
          {isConfigured ? 'تسجيل الدخول للوحة التحكم' : 'إعداد كلمة مرور التعديل'}
        </h1>
        <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
          {isConfigured
            ? 'أدخل كلمة المرور لإدارة الروابط، تخصيص المظهر، ومراجعة إحصائيات النقرات.'
            : 'لحماية صفحتك من أي تعديل غير مصرح به، قم بتعيين كلمة مرور الآن. يتم تشفيرها على الخادم بخوارزمية Scrypt.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-password" className="block text-xs font-medium text-slate-700 mb-1.5">
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
              <label htmlFor="admin-password-confirm" className="block text-xs font-medium text-slate-700 mb-1.5">
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
      </div>
    </div>
  );
};
