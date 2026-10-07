import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Button } from '../../components/ui/Button';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex flex-col justify-between selection:bg-orange-500 selection:text-white p-4">
      <div className="max-w-md w-full mx-auto pt-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-xs text-neutral-600 hover:text-neutral-900 transition">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('auth.backToLogin')}</span>
        </Link>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-8">
        <div className="bg-white border border-neutral-200/90 rounded-xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-1">
              <img
                src="/logo.jpg"
                alt="Zahran Logo"
                className="h-16 w-auto max-w-[210px] object-contain rounded-xl shadow-xs border border-neutral-200/80 p-0.5 bg-neutral-900"
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              {t('auth.resetPassword')}
            </h1>
            <p className="text-xs text-neutral-500">
              {t('auth.resetInstructions')}
            </p>
          </div>

          {isSubmitted ? (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="font-semibold">Reset instructions dispatched</p>
              <p className="text-emerald-700">
                If an account exists for <strong>{email}</strong>, you will receive password reset instructions shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="name@zahran.camp"
                    className="w-full h-10 ps-9 pe-3 bg-white border border-neutral-300 rounded-md text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full h-10 text-sm mt-2"
                isLoading={isLoading}
              >
                Send Recovery Email
              </Button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link to="/login" className="text-xs text-neutral-600 hover:text-neutral-900 font-medium">
              &larr; {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center pb-4 text-xs text-neutral-500">
        &copy; 2026 Camps Manager Platform
      </div>
    </div>
  );
};
