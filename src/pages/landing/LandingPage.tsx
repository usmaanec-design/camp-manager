import React from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Layers,
  BarChart3,
  HardHat,
  ArrowRight,
  Globe,
  Lock,
  Building2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Button } from '../../components/ui/Button';

export const LandingPage: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 border-b border-neutral-800 px-6 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Zahran Logo"
            className="h-10 w-auto rounded-lg object-contain border border-neutral-700 bg-neutral-950 p-0.5 shadow-sm"
          />
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              Zahran • Camps Manager
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-500 block">
              Operations Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-700 bg-neutral-800 text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-600 transition"
          >
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            <span>{language === 'en' ? 'العربية' : 'English'}</span>
          </button>
          <Link to="/login">
            <Button variant="outline" size="sm" className="bg-transparent text-white border-neutral-700 hover:bg-neutral-800 hover:text-white">
              {t('auth.signIn')}
            </Button>
          </Link>
          <Link to="/admin/login">
            <Button variant="primary" size="sm">
              {t('nav.adminPortal')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Hero & Portals */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Enterprise Multi-Camp Governance System</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Camps Manager
          </h1>
          <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
            {t('app.tagline')}
          </p>
        </div>

        {/* Portal Access Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {/* User Portal Access */}
          <div className="bg-[#181818] border border-neutral-800 hover:border-neutral-700 rounded-xl p-6 flex flex-col justify-between transition-all group shadow-lg">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 text-orange-500 flex items-center justify-center">
                <HardHat className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t('auth.userLoginTitle')}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {t('auth.userLoginSubtitle')}
              </p>
              <div className="pt-2 text-xs text-neutral-500 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Daily operational reports & incidents</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Assigned camp facility view & Excel uploads</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-800 mt-6 flex items-center justify-between">
              <Link to="/login" className="w-full">
                <Button variant="primary" size="md" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Access User Portal
                </Button>
              </Link>
            </div>
          </div>

          {/* Admin Portal Access */}
          <div className="bg-[#141414] border border-neutral-800 hover:border-neutral-700 rounded-xl p-6 flex flex-col justify-between transition-all group shadow-lg">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {t('auth.adminLoginTitle')}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {t('auth.adminLoginSubtitle')}
              </p>
              <div className="pt-2 text-xs text-neutral-500 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Cross-project KPIs, camps & personnel</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span>Fleet logistics, inventory & utilities audit</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-800 mt-6 flex items-center justify-between">
              <Link to="/admin/login" className="w-full">
                <Button variant="secondary" size="md" className="w-full bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Access Admin Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Feature summary highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-4xl mx-auto w-full pt-8 border-t border-neutral-800/80">
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-white">4 Enterprise Camps</p>
              <p className="text-[10px] text-neutral-500">Active regional operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-white">3,600+ Capacity</p>
              <p className="text-[10px] text-neutral-500">High-density accommodation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-white">Utility Governance</p>
              <p className="text-[10px] text-neutral-500">Water, Gas & Diesel logs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-orange-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-white">Field Isolation</p>
              <p className="text-[10px] text-neutral-500">Strict project separation</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-neutral-800/80 px-6 flex items-center justify-between max-w-7xl w-full mx-auto text-xs text-neutral-500">
        <div>&copy; 2026 Camps Manager. All rights reserved.</div>
        <div className="flex items-center gap-4 text-neutral-400">
          <span>Enterprise Operations System</span>
        </div>
      </footer>
    </div>
  );
};
