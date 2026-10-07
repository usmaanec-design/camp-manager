import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  FileText,
  Building2,
  Truck,
  HardHat,
  Boxes,
  CalendarCheck2,
  Zap,
  FileSpreadsheet,
  Settings,
  LogOut,
  X,
  UserCheck,
  Warehouse,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isAdminPortal?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isAdminPortal = false }) => {
  const { t, isRTL } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(isAdminPortal ? '/admin/login' : '/');
  };

  const adminNavItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/admin/projects', icon: FolderKanban, label: t('nav.projects') },
    { to: '/admin/reports', icon: FileText, label: t('nav.reports') },
    { to: '/admin/camps', icon: Building2, label: t('nav.camps') },
    { to: '/admin/vehicles', icon: Truck, label: t('nav.vehicles') },
    { to: '/admin/manpower', icon: HardHat, label: t('nav.manpower') },
    { to: '/admin/inventory', icon: Boxes, label: t('nav.inventory') },
    { to: '/admin/operations', icon: CalendarCheck2, label: t('nav.operations') },
    { to: '/admin/utilities', icon: Zap, label: t('nav.utilities') },
    { to: '/admin/excel', icon: FileSpreadsheet, label: t('nav.excel') },
    { to: '/admin/settings', icon: Settings, label: t('nav.settings') },
  ];

  const userNavItems = [
    { to: '/app', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
    { to: '/app/camp', icon: Building2, label: t('nav.myCamp') },
    { to: '/app/utilities', icon: Zap, label: isRTL ? 'مركز الخدمات' : 'Utility Hub' },
    { to: '/app/utility-buildings', icon: Warehouse, label: isRTL ? 'المباني الخدمية' : 'Utility Buildings' },
    { to: '/app/manpower', icon: Users, label: isRTL ? 'القوى العاملة' : 'Manpower' },
    { to: '/app/inventory', icon: Boxes, label: isRTL ? 'المخزون والأصول' : 'Inventory' },
    { to: '/app/reports', icon: FileText, label: t('nav.myReports') },
    { to: '/app/profile', icon: UserCheck, label: t('nav.profile') },
    { to: '/app/settings', icon: Settings, label: t('nav.settings') },
  ];

  const navItems = isAdminPortal ? adminNavItems : userNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-neutral-900/40 lg:hidden backdrop-blur-2xs transition-opacity"
        />
      )}

      {/* Sidebar Container - 100% LIGHT THEME */}
      <aside
        className={`fixed top-0 bottom-0 z-50 w-64 bg-white text-neutral-800 border-e border-neutral-200 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isRTL
            ? isOpen
              ? 'translate-x-0 right-0'
              : 'translate-x-full right-0'
            : isOpen
            ? 'translate-x-0 left-0'
            : '-translate-x-full left-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.jpg"
              alt="Zahran Logo"
              className="h-9 w-auto max-w-[85px] object-contain rounded-md shadow-2xs border border-neutral-200/80 bg-neutral-900 shrink-0"
            />
            <div className="min-w-0">
              <span className="font-bold text-xs tracking-tight text-neutral-900 block leading-tight truncate">
                Camps Manager
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-orange-600 block truncate">
                {isAdminPortal ? t('nav.adminPortal') : t('nav.userPortal')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {isAdminPortal ? 'Operations Governance' : 'Field Operations'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={Boolean((item as any).end)}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-orange-50 text-orange-700 font-semibold border-e-2 border-orange-500 shadow-2xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-all shrink-0 ${
                        isActive ? 'bg-orange-500 scale-125' : 'bg-transparent group-hover:bg-neutral-300'
                      }`}
                    />
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-orange-600' : 'text-neutral-500 group-hover:text-neutral-800'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>


        {/* Sidebar Footer User Info */}
        <div className="p-3 border-t border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatarUrl || (user as any)?.avatar ? (
              <img
                src={user?.avatarUrl || (user as any)?.avatar}
                alt={user?.name || 'User'}
                className="w-7 h-7 rounded-full object-cover border border-orange-200 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="truncate">
              <p className="text-xs font-semibold text-neutral-900 truncate">{user?.name || 'User'}</p>
              <p className="text-[10px] text-neutral-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title={t('nav.logout')}
            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
