import React from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';

export const UserSettingsPage: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Language Preferences */}
      <Card>
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
                  ? 'border-orange-500 bg-orange-50/50 text-neutral-900'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold">English (LTR)</p>
                <p className="text-[11px] text-neutral-500">Standard English interface</p>
              </div>
              {language === 'en' && <Check className="w-4 h-4 text-orange-600" />}
            </button>

            <button
              onClick={() => setLanguage('ar')}
              className={`p-3.5 rounded-lg border text-start flex items-center justify-between transition ${
                language === 'ar'
                  ? 'border-orange-500 bg-orange-50/50 text-neutral-900'
                  : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700'
              }`}
            >
              <div>
                <p className="text-xs font-bold">العربية (RTL)</p>
                <p className="text-[11px] text-neutral-500">اللغة العربية الرسمية للمملكة</p>
              </div>
              {language === 'ar' && <Check className="w-4 h-4 text-orange-600" />}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Theme information */}
      <Card>
        <CardHeader
          title={t('settings.appearance')}
          subtitle={t('settings.appearanceDesc')}
        />
        <CardContent className="text-xs text-neutral-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-neutral-900">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Black & Orange Enterprise Operational System</span>
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-500">
            The visual theme is optimized for field clarity, high contrast readability, and operational durability.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
