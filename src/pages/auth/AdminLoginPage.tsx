import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Globe, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';

export const AdminLoginPage: React.FC = () => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@zahran.camp');
  const [password, setPassword] = useState('Admin@2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await login({ email, password, isAdmin: true });
      success(isRTL ? 'تم تسجيل الدخول كمسؤول' : 'Authenticated as Administrator');
      navigate('/admin/dashboard');
    } catch (err: any) {
      const msg = err.message || (isRTL ? 'فشل تسجيل الدخول كمسؤول' : 'Administrator access denied');
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-neutral-900 flex flex-col justify-between selection:bg-orange-500 selection:text-white px-4 py-6">
      {/* Top Header with Language & Back Link */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isRTL ? 'تسجيل دخول المستخدمين' : 'User Login'}</span>
        </Link>

        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-neutral-200 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition"
        >
          <Globe className="w-3.5 h-3.5 text-orange-600" />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </header>

      {/* Admin Login Card (100% LIGHT THEME) */}
      <main className="w-full max-w-[390px] mx-auto my-auto py-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 sm:p-7 shadow-xs space-y-5">
          {/* Header & Brand Logo */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <img
                src="/logo.jpg"
                alt="Zahran Logo"
                className="h-16 w-auto max-w-[210px] object-contain rounded-xl shadow-xs border border-neutral-200/80 p-0.5 bg-neutral-900"
              />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-neutral-900">
              {isRTL ? 'دخول المسؤول' : 'Admin Login'}
            </h1>
            <p className="text-xs text-neutral-500">
              {isRTL ? 'إدارة العمليات المركزية والرقابة' : 'Central operations & governance access'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@zahran.camp"
                  className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full h-9 text-xs mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {isRTL ? 'دخول المسؤول' : 'Admin Sign In'}
            </Button>
          </form>

          {/* Quick preset helper */}
          <div className="pt-2 text-center">
            <span className="text-[11px] text-neutral-400 block mb-1">
              {isRTL ? 'حساب مسؤول النظام:' : 'System Admin Account:'}
            </span>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@zahran.camp');
                setPassword('Admin@2026!');
              }}
              className="text-[11px] font-mono text-orange-600 hover:underline"
            >
              admin@zahran.camp
            </button>
          </div>
        </div>

        {/* Back to User Login link */}
        <div className="text-center mt-3">
          <Link
            to="/"
            className="text-[11px] text-neutral-400 hover:text-neutral-700 transition"
          >
            &larr; {isRTL ? 'الرجوع إلى تسجيل دخول المستخدمين' : 'Back to User Login'}
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-neutral-400">
        &copy; 2026 Camps Manager Platform &bull; {isRTL ? 'بوابة الإدارة المركزية' : 'Admin Security Portal'}
      </footer>
    </div>
  );
};
