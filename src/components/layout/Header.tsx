import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  Globe,
  Check,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Building,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  isAdminPortal?: boolean;
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isAdminPortal = false, pageTitle }) => {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate(isAdminPortal ? '/admin/login' : '/login');
  };

  const notifications = [
    { id: 1, title: 'Maintenance Alert: Block B Chiller', time: '15m ago', unread: true },
    { id: 2, title: 'Water Tanker delivery recorded: 45k Gal', time: '2h ago', unread: true },
    { id: 3, title: 'Quarterly HSE Safety audit approved', time: '1d ago', unread: false },
  ];

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-neutral-200/90 px-4 flex items-center justify-between shadow-2xs">
      {/* Left side: Hamburger + Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-1.5 text-neutral-600 hover:text-neutral-900 rounded-md hover:bg-neutral-100 transition"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Top Bar Corner Logo */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.jpg"
            alt="Zahran"
            className="h-8 w-auto max-w-[95px] object-contain rounded-md shadow-2xs border border-neutral-200/80 bg-neutral-900"
          />
          <div className="h-5 w-px bg-neutral-200 hidden sm:block" />
        </div>

        <div className="flex items-center gap-2">
          {pageTitle ? (
            <h1 className="text-sm font-semibold text-neutral-900">{pageTitle}</h1>
          ) : (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span className="font-semibold text-neutral-900">
                {isAdminPortal ? t('nav.adminPortal') : t('nav.userPortal')}
              </span>
              {user?.projectName && (
                <>
                  <span className="text-neutral-300">•</span>
                  <span className="inline-flex items-center gap-1 font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                    <Building className="w-3 h-3 text-orange-600" />
                    {user.projectName}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Notifications, Language Switcher, Profile Menu */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => setLangMenuOpen(!langMenuOpen)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-xs font-medium text-neutral-700 transition"
          >
            <Globe className="w-3.5 h-3.5 text-neutral-500" />
            <span>{language === 'ar' ? 'العربية' : 'English'}</span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {langMenuOpen && (
            <div className="absolute end-0 top-10 w-36 bg-white border border-neutral-200 rounded-md shadow-lg py-1 z-40 text-xs animate-in fade-in">
              <button
                onClick={() => {
                  setLanguage('en');
                  setLangMenuOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-neutral-50 text-neutral-800"
              >
                <span>English</span>
                {language === 'en' && <Check className="w-3.5 h-3.5 text-orange-600" />}
              </button>
              <button
                onClick={() => {
                  setLanguage('ar');
                  setLangMenuOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center justify-between text-right hover:bg-neutral-50 text-neutral-800"
              >
                <span>العربية (السعودية)</span>
                {language === 'ar' && <Check className="w-3.5 h-3.5 text-orange-600" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="relative p-2 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 end-1.5 w-2 h-2 rounded-full bg-orange-600 ring-2 ring-white" />
          </button>

          {notifMenuOpen && (
            <div className="absolute end-0 top-10 w-72 bg-white border border-neutral-200 rounded-md shadow-lg py-2 z-40 text-xs animate-in fade-in">
              <div className="px-3 py-1.5 border-b border-neutral-100 font-semibold text-neutral-800 flex items-center justify-between">
                <span>Operational Alerts</span>
                <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                  2 New
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-neutral-50">
                {notifications.map((n) => (
                  <div key={n.id} className="p-2.5 hover:bg-neutral-50 cursor-pointer">
                    <p className={`text-xs ${n.unread ? 'font-semibold text-neutral-900' : 'text-neutral-600'}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-neutral-400 mt-1 block">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-md hover:bg-neutral-100 text-neutral-700 transition"
          >
            <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold overflow-hidden border border-neutral-200">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user?.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                user?.name ? user.name.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            <div className="hidden sm:block text-start">
              <span className="text-xs font-semibold text-neutral-900 block leading-tight">
                {user?.name || 'Staff User'}
              </span>
              <span className="text-[10px] text-neutral-500 block leading-tight">
                {user?.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {profileMenuOpen && (
            <div className="absolute end-0 top-11 w-48 bg-white border border-neutral-200 rounded-md shadow-lg py-1 z-40 text-xs animate-in fade-in">
              <div className="px-3 py-2 border-b border-neutral-100">
                <p className="font-semibold text-neutral-900 truncate">{user?.name}</p>
                <p className="text-[10px] text-neutral-500 truncate">{user?.email}</p>
              </div>

              <Link
                to={isAdminPortal ? '/admin/settings' : '/app/profile'}
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 transition"
              >
                <User className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t('nav.profile')}</span>
              </Link>

              <Link
                to={isAdminPortal ? '/admin/settings' : '/app/settings'}
                onClick={() => setProfileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-neutral-700 hover:bg-neutral-50 transition"
              >
                <Settings className="w-3.5 h-3.5 text-neutral-500" />
                <span>{t('nav.settings')}</span>
              </Link>

              <div className="border-t border-neutral-100 my-1" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 transition text-start"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
