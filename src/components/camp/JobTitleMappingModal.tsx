import React, { useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';
import { JobTitleId } from '../../types';
import { jobTitleService } from '../../services/jobTitleService';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';

interface JobTitleMappingModalProps {
  unmappedTitles: string[];
  onApplyMapping: (mapping: Record<string, JobTitleId>, rememberAsAlias: boolean) => void;
  onCancel: () => void;
}

export const JobTitleMappingModal: React.FC<JobTitleMappingModalProps> = ({
  unmappedTitles,
  onApplyMapping,
  onCancel,
}) => {
  const { isRTL } = useLanguage();
  const officialTitles = jobTitleService.getJobTitles();

  // Mapping state: unmapped raw string -> chosen JobTitleId
  const [mapping, setMapping] = useState<Record<string, JobTitleId>>(() => {
    const initial: Record<string, JobTitleId> = {};
    unmappedTitles.forEach((t) => {
      // Suggest closest or default to LABOUR
      initial[t] = 'LABOUR';
    });
    return initial;
  });

  const [rememberAlias, setRememberAlias] = useState(true);

  const handleSelectChange = (rawTitle: string, selectedId: JobTitleId) => {
    setMapping((prev) => ({
      ...prev,
      [rawTitle]: selectedId,
    }));
  };

  const handleApply = () => {
    if (rememberAlias) {
      // Save mapped titles as permanent aliases in dictionary
      Object.entries(mapping).forEach(([raw, officialId]) => {
        jobTitleService.addAlias(officialId, raw);
      });
    }
    onApplyMapping(mapping, rememberAlias);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/40 backdrop-blur-2xs">
      <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 duration-150 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              {isRTL ? 'تعيين المسميات الوظيفية غير المعتمدة' : 'Map Unknown Job Titles'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              {isRTL
                ? 'تم العثور على مسميات وظيفية غير قياسية في ملف الإكسل (مثل LBOR أو Labor). الرجاء ربطها بالمسميات الرسمية المعتمدة لضمان دقة التقارير والتصنيف.'
                : 'Unrecognized job titles were detected in your Excel sheet. Map them to official positions to ensure clean classification, accurate reports, and reliable filters.'}
            </p>
          </div>
        </div>

        {/* Mapping List */}
        <div className="space-y-2.5 max-h-60 overflow-y-auto p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs">
          {unmappedTitles.map((rawTitle) => (
            <div
              key={rawTitle}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white border border-neutral-200 rounded-md"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-neutral-400 font-mono text-[11px] uppercase">Uploaded:</span>
                <span className="font-bold text-neutral-900 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs truncate">
                  "{rawTitle}"
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-neutral-400 text-xs">&rarr;</span>
                <select
                  value={mapping[rawTitle] || 'LABOUR'}
                  onChange={(e) => handleSelectChange(rawTitle, e.target.value as JobTitleId)}
                  className="h-8 px-2.5 bg-white border border-neutral-300 rounded text-xs font-medium text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {officialTitles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.labelEn} ({t.labelAr})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Remember alias checkbox */}
        <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberAlias}
            onChange={(e) => setRememberAlias(e.target.checked)}
            className="w-4 h-4 text-orange-600 rounded border-neutral-300 focus:ring-orange-500"
          />
          <span>
            {isRTL
              ? 'حفظ هذا التعيين كمرادف دائم للمستقبل (Auto-resolve in future uploads)'
              : 'Save as accepted alias for future Excel imports'}
          </span>
        </label>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleApply}
            leftIcon={<Check className="w-3.5 h-3.5" />}
          >
            {isRTL ? 'تطبيق التعيين والمتابعة' : 'Apply Mapping & Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};
