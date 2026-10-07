import React from 'react';
import { Calendar } from 'lucide-react';
import { DateFilterPeriod } from '../../types/utilities';
import { useLanguage } from '../../i18n/LanguageContext';

export interface DateFilterBarProps {
  selectedPeriod?: DateFilterPeriod;
  currentFilter?: DateFilterPeriod;
  onSelectPeriod?: (period: DateFilterPeriod) => void;
  onFilterChange?: (period: DateFilterPeriod) => void;
  className?: string;
}

export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  selectedPeriod,
  currentFilter,
  onSelectPeriod,
  onFilterChange,
  className = '',
}) => {
  const activePeriod = currentFilter || selectedPeriod || 'Month';
  const handlePeriodSelect = (p: DateFilterPeriod) => {
    if (onFilterChange) onFilterChange(p);
    if (onSelectPeriod) onSelectPeriod(p);
  };
  const { isRTL } = useLanguage();

  const periods: { key: DateFilterPeriod; labelEn: string; labelAr: string }[] = [
    { key: 'Day', labelEn: 'Day', labelAr: 'اليوم' },
    { key: 'Week', labelEn: 'Week', labelAr: 'الأسبوع' },
    { key: 'Month', labelEn: 'Month', labelAr: 'الشهر' },
    { key: 'Year', labelEn: 'Year', labelAr: 'السنة' },
    { key: 'All', labelEn: 'All Time', labelAr: 'الكل' },
  ];

  return (
    <div className={`flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs ${className}`}>
      <div className="ps-2 pe-1 text-neutral-400 flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
          {isRTL ? 'الفترة:' : 'Period:'}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {periods.map((p) => {
          const isActive = activePeriod === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePeriodSelect(p.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-orange-600 text-white shadow-xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/80'
              }`}
            >
              {isRTL ? p.labelAr : p.labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
};
