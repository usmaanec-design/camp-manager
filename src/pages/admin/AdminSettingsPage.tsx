import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Check, Briefcase, ArrowRight, RotateCcw, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { dataResetService } from '../../services/dataResetService';

export const AdminSettingsPage: React.FC = () => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { user, role, switchRole } = useAuth();

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
        <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Language Preferences Card */}
      <Card className="bg-white border-neutral-200">
        <CardHeader
          title={t('settings.general')}
          subtitle={t('settings.languageDesc')}
        />
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage('en')}
              className={`p-3.5 rounded-lg border text-start flex items-center justify-between transition ${
                language === 'en'
                  ? 'border-orange-500 bg-orange-50/50 text-neutral-900 font-semibold'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold">English (LTR)</p>
                <p className="text-[11px] text-neutral-500">Standard international enterprise layout</p>
              </div>
              {language === 'en' && <Check className="w-4 h-4 text-orange-600" />}
            </button>

            <button
              onClick={() => setLanguage('ar')}
              className={`p-3.5 rounded-lg border text-start flex items-center justify-between transition ${
                language === 'ar'
                  ? 'border-orange-500 bg-orange-50/50 text-neutral-900 font-semibold'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold">العربية (RTL)</p>
                <p className="text-[11px] text-neutral-500">المصطلحات المهنية للمملكة العربية السعودية</p>
              </div>
              {language === 'ar' && <Check className="w-4 h-4 text-orange-600" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Controlled Job Titles Governance Section */}
      <Card className="bg-white border-neutral-200">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-orange-600" />
              <span>{isRTL ? 'قاموس المسميات الوظيفية المعتمدة' : 'Controlled Job Titles & Aliases'}</span>
            </div>
          }
          subtitle={
            isRTL
              ? 'إدارة المسميات الثمانية المعتمدة وتعيين المرادفات الأوتوماتيكية لمنع أخطاء الإكسل'
              : 'Enterprise dictionary of approved positions and accepted aliases to prevent duplicate categories'
          }
          action={
            <Link to="/admin/settings/job-titles">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {isRTL ? 'إدارة القاموس' : 'Manage Job Titles'}
              </Button>
            </Link>
          }
        />
        <CardContent className="pt-0 text-xs text-neutral-600">
          <p className="leading-relaxed">
            Approved internal positions: <strong className="font-mono text-neutral-800">LABOUR, SUPERVISOR, TECHNICIAN, FOREMAN, CAMP_BOSS, DISPATCHER, CREWMAN, OFFICE_STAFF</strong>. All reports and metrics are strictly calculated from these IDs.
          </p>
        </CardContent>
      </Card>

      {/* Theme & Visual Identity Card (100% Light Theme Enforced) */}
      <Card className="bg-white border-neutral-200">
        <CardHeader
          title={t('settings.appearance')}
          subtitle={t('settings.appearanceDesc')}
        />
        <CardContent className="space-y-3 text-xs">
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <div>
                <p className="font-semibold text-xs text-neutral-900">Light Professional Theme Only</p>
                <p className="text-[10px] text-neutral-500">Fixed brand palette: Orange (#F97316), White (#FFFFFF), and Crisp Neutrals. Zero Blue.</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-orange-600 font-mono px-2 py-0.5 rounded bg-orange-50 border border-orange-200">
              Active
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 leading-relaxed">
            Strict enterprise guidelines enforced: Dark mode completely removed, high contrast data tables, subtle shadows, and compact font hierarchies.
          </p>
        </CardContent>
      </Card>

      {/* Role & Access Governance */}
      <Card className="bg-white border-neutral-200">
        <CardHeader
          title={t('settings.security')}
          subtitle="User role configuration & portal access preview"
        />
        <CardContent className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div>
              <p className="font-semibold text-neutral-900">{user?.name}</p>
              <p className="text-[11px] text-neutral-500">{user?.email}</p>
            </div>
            <div className="text-end">
              <span className="text-[11px] text-neutral-500 block mb-0.5">{t('settings.roleBadge')}:</span>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-neutral-900 text-white font-bold">
                {role}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <p className="font-semibold text-neutral-800 mb-1.5">Quick Switch (For Verification):</p>
            <div className="flex items-center gap-2">
              <Button
                variant={role === 'SUPER_ADMIN' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => switchRole('SUPER_ADMIN')}
              >
                SUPER_ADMIN
              </Button>
              <Button
                variant={role === 'ADMIN' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => switchRole('ADMIN')}
              >
                ADMIN
              </Button>
              <Button
                variant={role === 'USER' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => switchRole('USER')}
              >
                USER (Field Officer)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management & Mock Data Reset */}
      <Card className="border-rose-200 bg-rose-50/20">
        <CardHeader
          title={isRTL ? 'إدارة البيانات وبيانات الاختبار' : 'Real Data Mode & Mock Data Management'}
          subtitle={
            isRTL
              ? 'تفريغ البيانات التجريبية والمشاريع الوهمية لبدء إدخال وفحص البيانات الحقيقية'
              : 'Clear mock projects, personnel, inventory, and utility logs to start testing with 100% real camp data'
          }
        />
        <CardContent className="space-y-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-rose-200 flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-neutral-900">
                {isRTL ? 'تفريغ البيانات التجريبية وبدء التشغيل الفعلي' : 'Reset to Clean Slate (Ready for Real Data)'}
              </p>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                {isRTL
                  ? 'سيتم مسح كافة سجلات المشاريع والموظفين والمخازن والوقود والمياه التجريبية المحفوظة في الذاكرة المحلية، مع الحفاظ على حسابات تسجيل الدخول.'
                  : 'This will purge all mock projects, mock personnel, mock inventory, mock reports, and mock utility shipments from local storage. Your login accounts (Admin and User) will remain intact.'}
              </p>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 text-rose-700 hover:bg-rose-50 hover:border-rose-400 font-semibold text-xs"
                  onClick={() => {
                    if (window.confirm(isRTL ? 'هل أنت متأكد من تفريغ جميع البيانات التجريبية والبدء ببيانات جديدة؟' : 'Are you sure you want to purge all mock data and start with clean real data?')) {
                      dataResetService.clearAllMockData();
                      window.location.reload();
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  {isRTL ? 'تفريغ كافة البيانات التجريبية الآن' : 'Purge All Mock Data Now'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Architecture Note */}
      <Card className="border-neutral-200 bg-neutral-50/60">
        <CardContent className="p-4 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-bold text-neutral-900">
            <Database className="w-4 h-4 text-orange-600" />
            <span>Architecture Status: Frontend-First Isolation</span>
          </div>
          <p className="text-neutral-600 leading-relaxed">
            Firebase Authentication and Cloud Firestore are decoupled in this development phase according to strict specification rules. All domain data models and services are ready for direct binding in the backend integration phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
