import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Save, UploadCloud, X, FileText } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../services/reportService';
import { ReportType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';

export const AddReportPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    reportType: 'Daily Camp Operations' as ReportType,
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    description: '',
    notes: '',
  });

  const [attachments, setAttachments] = useState<{ name: string; size: string; type: string }[]>([
    { name: 'Shift_Inspection_Checklist.pdf', size: '1.2 MB', type: 'application/pdf' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Report title is required';
    if (!formData.description.trim()) errs.description = 'Detailed operational description is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (isDraft = false) => {
    if (!validate() && !isDraft) return;
    setIsSubmitting(true);

    try {
      await reportService.createReport({
        projectId: user?.projectId || 'prj-sharq',
        projectName: user?.projectName || 'Sharq Camp',
        userId: user?.id || 'usr-sharq-1',
        userName: user?.name || 'Sharq Camp Officer',
        userEmail: user?.email || 'sharq@zahran.camp',
        reportType: formData.reportType,
        title: formData.title,
        description: formData.description,
        notes: formData.notes,
        priority: formData.priority,
        status: isDraft ? 'Draft' : 'Pending',
        attachments,
      });

      success(isDraft ? 'Report saved as Draft' : 'Report submitted successfully for supervisor review');
      navigate('/app/reports');
    } catch {
      toastError('Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachments((prev) => [
        ...prev,
        {
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          type: file.type || 'application/octet-stream',
        },
      ]);
      success(`Attached ${file.name}`);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/reports"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Reports</span>
        </Link>
      </div>

      {/* Main Report Form Card */}
      <Card>
        <CardHeader
          title={t('nav.addReport')}
          subtitle={`Reporting for assigned facility: ${user?.projectName || 'Sharq Camp'}`}
        />
        <CardContent className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(false);
            }}
            className="space-y-4"
          >
            {/* Project / Camp Context (Readonly for field users) */}
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-500 block">Assigned Project / Camp:</span>
                <span className="font-bold text-neutral-900">{user?.projectName || 'Sharq Camp'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Reporting Officer:</span>
                <span className="font-semibold text-neutral-900">{user?.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label={t('reports.reportType')}
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value as any })}
                options={reportService.getReportTypes()}
              />

              <Select
                label={t('reports.priority')}
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                options={['Low', 'Medium', 'High']}
              />
            </div>

            <div>
              <Input
                label="Report Title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Block B AC Pressure Anomaly & Filter Replacement"
                error={errors.title}
              />
            </div>

            <div>
              <Textarea
                label={t('reports.description')}
                required
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detail observations, affected camp blocks, personnel involved, and actions taken..."
                error={errors.description}
              />
            </div>

            <div>
              <Textarea
                label="Supervisor Notes / Next Steps (Optional)"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Specific recommendations, follow-up inspection dates, or material requisitions"
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-neutral-700">
                Attachments & Inspection Evidence (Photos, PDFs, Sheets)
              </label>

              <div className="border border-neutral-300 rounded-lg p-3 bg-neutral-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-neutral-600">
                  <UploadCloud className="w-4 h-4 text-orange-600" />
                  <span>Attach inspection checklists or photo evidence</span>
                </div>
                <label className="cursor-pointer">
                  <span className="px-2.5 py-1 rounded bg-white border border-neutral-300 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition shadow-2xs">
                    Choose File
                  </span>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1 pt-1">
                  {attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-white border border-neutral-200 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="font-medium text-neutral-800 truncate">{att.name}</span>
                        <span className="text-neutral-400 text-[11px] font-mono shrink-0">({att.size})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="text-neutral-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Action Buttons */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => navigate('/app/reports')}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                leftIcon={<Save className="w-3.5 h-3.5" />}
                onClick={() => handleSave(true)}
                isLoading={isSubmitting}
              >
                {t('common.saveDraft')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                leftIcon={<Send className="w-3.5 h-3.5" />}
                isLoading={isSubmitting}
              >
                {t('common.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
