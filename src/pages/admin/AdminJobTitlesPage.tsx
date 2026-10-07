import React, { useState } from 'react';
import { Briefcase, Plus, ShieldCheck, X } from 'lucide-react';
import { JobTitleDefinition, JobTitleId } from '../../types';
import { jobTitleService } from '../../services/jobTitleService';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

export const AdminJobTitlesPage: React.FC = () => {
  const { isRTL } = useLanguage();
  const { success } = useToast();

  const [jobTitles, setJobTitles] = useState<JobTitleDefinition[]>(() => jobTitleService.getJobTitles());
  const [newAlias, setNewAlias] = useState('');

  // Add alias to a job title
  const handleAddAlias = (titleId: JobTitleId) => {
    if (!newAlias.trim()) return;
    const clean = newAlias.trim().toLowerCase();
    const updated = jobTitles.map((t) => {
      if (t.id === titleId && !t.aliases.includes(clean)) {
        return {
          ...t,
          aliases: [...t.aliases, clean],
        };
      }
      return t;
    });

    setJobTitles(updated);
    jobTitleService.saveJobTitles(updated);
    setNewAlias('');
    success(`Alias "${clean}" added to ${titleId}`);
  };

  // Remove alias
  const handleRemoveAlias = (titleId: JobTitleId, aliasToRemove: string) => {
    const updated = jobTitles.map((t) => {
      if (t.id === titleId) {
        return {
          ...t,
          aliases: t.aliases.filter((a) => a !== aliasToRemove),
        };
      }
      return t;
    });

    setJobTitles(updated);
    jobTitleService.saveJobTitles(updated);
    success(`Alias removed`);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
              {isRTL ? 'إدارة المسميات الوظيفية وقاموس المرادفات' : 'Official Job Titles & Alias Dictionary'}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isRTL
                ? 'التحكم المركزي في المسميات الوظيفية المعتمدة لمنع ازدواجية البيانات وضمان دقة الفلاتر والتقارير'
                : 'Central governance dictionary preventing arbitrary positions and unifying manpower calculations'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
            8 Official Positions Enforced
          </span>
        </div>
      </div>

      {/* Controlled Governance Notice */}
      <div className="p-3.5 rounded-lg bg-orange-50/60 border border-orange-200/80 text-xs text-neutral-800 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {isRTL
            ? 'تنبيه إداري: المسميات الوظيفية الثمانية التالية معرّفة بمعرفات ثابتة (Internal IDs). عندما يقوم المستخدمون برفع ملفات إكسل تحتوي على أخطاء إملائية (مثل LBOR أو Laborer)، يقوم محرك المطابقة بربطها تلقائياً بالمرادفات المعتمدة أدناه.'
            : 'Operational Guardrail: All workforce aggregations, filters, and reports use these 8 normalized Job Title IDs. When users upload Excel sheets with variations or typos, the engine checks these accepted aliases.'}
        </p>
      </div>

      {/* Job Titles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {jobTitles.map((title) => (
          <Card key={title.id} className="bg-white border-neutral-200">
            <CardHeader
              title={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                      {title.id}
                    </span>
                    <span className="text-xs font-semibold text-neutral-800">
                      {title.labelEn} &bull; {title.labelAr}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </div>
              }
              subtitle={`Normalized internal ID: ${title.id}`}
            />
            <CardContent className="space-y-3 pt-0 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-neutral-600 block mb-1">
                  Accepted Excel Aliases & Auto-Resolutions ({title.aliases.length}):
                </span>
                <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                  {title.aliases.map((alias) => (
                    <span
                      key={alias}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-[11px] font-mono"
                    >
                      <span>"{alias}"</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAlias(title.id, alias)}
                        className="text-neutral-400 hover:text-rose-600 ml-0.5"
                        title="Remove alias"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Add Alias Input */}
              <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add accepted typo/alias (e.g. worker)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAlias(title.id);
                    }
                  }}
                  onChange={(e) => setNewAlias(e.target.value)}
                  className="flex-1 h-7 px-2 bg-white border border-neutral-200 rounded text-xs placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={() => handleAddAlias(title.id)}
                >
                  <Plus className="w-3 h-3 me-1" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
