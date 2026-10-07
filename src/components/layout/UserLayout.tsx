import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface PreviewInfo {
  projectId: string;
  projectName: string;
  adminEmail?: string;
  adminName?: string;
}

export const UserLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { switchRole } = useAuth();
  const { isRTL } = useLanguage();
  const navigate = useNavigate();

  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('camps_manager_admin_preview');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const checkPreview = () => {
      try {
        const raw = localStorage.getItem('camps_manager_admin_preview');
        setPreviewInfo(raw ? JSON.parse(raw) : null);
      } catch {
        setPreviewInfo(null);
      }
    };

    window.addEventListener('storage', checkPreview);
    window.addEventListener('camp_auth_user_updated', checkPreview);
    return () => {
      window.removeEventListener('storage', checkPreview);
      window.removeEventListener('camp_auth_user_updated', checkPreview);
    };
  }, []);

  const handleReturnToAdmin = () => {
    localStorage.removeItem('camps_manager_admin_preview');
    // Restore primary admin session
    const adminUser = {
      id: 'usr-admin-1',
      name: 'Admin',
      email: 'admin@zahran.camp',
      mobile: '+966 50 376 3410',
      role: 'SUPER_ADMIN' as const,
      status: 'Active' as const,
      projectId: 'prj-sharq',
      projectName: 'Sharq Camp',
      createdAt: '2025-01-01',
      lastActivity: 'Active',
      reportsCount: 0,
      password: 'Admin@2026!',
    };
    localStorage.setItem('camps_manager_auth_user', JSON.stringify(adminUser));
    switchRole('SUPER_ADMIN');
    navigate('/admin/projects');
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col antialiased">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isAdminPortal={false}
      />

      <div className="flex-1 flex flex-col lg:ms-64 min-w-0 transition-all duration-200">
        {/* Admin Preview Floating Bar */}
        {previewInfo && (
          <div className="bg-neutral-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b-2 border-orange-500 shadow-md sticky top-0 z-40">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-neutral-300 font-medium">
                  {isRTL ? 'وضع المستخدم للمشروع:' : 'Field User Mode Preview:'}
                </span>
                <span className="font-bold text-orange-400 bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                  {previewInfo.projectName}
                </span>
                <span className="text-[11px] text-neutral-400">
                  ({isRTL ? 'معاينة البيانات الحقيقية لهذا المخيم فقط' : 'Scoped to this project real data'})
                </span>
              </div>
            </div>

            <button
              onClick={handleReturnToAdmin}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 shadow-2xs hover:shadow-sm"
              title={isRTL ? 'الرجوع إلى لوحة تحكم الإدارة' : 'Return to Admin Projects'}
            >
              <BackIcon className="w-3.5 h-3.5" />
              <span>{isRTL ? 'الرجوع لإدارة المشاريع' : 'Return to Admin Projects'}</span>
            </button>
          </div>
        )}

        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isAdminPortal={false}
        />

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
