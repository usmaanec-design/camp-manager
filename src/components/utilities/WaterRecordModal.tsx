import React, { useState, useEffect } from 'react';
import { X, Droplets, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { WaterUsageRecord, WaterType } from '../../types/utilities';
import { waterUsageService } from '../../services/waterUsageService';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { getTodayDateString } from '../../utils/dateFilter';

interface WaterRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: WaterType;
  editingRecord?: WaterUsageRecord | null;
}

export const WaterRecordModal: React.FC<WaterRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'Fresh Water',
  editingRecord = null,
}) => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [type, setType] = useState<WaterType>(defaultType);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [trips, setTrips] = useState<number | string>(1);
  const [costPerTrip, setCostPerTrip] = useState<number | string>(220);
  const [notes, setNotes] = useState<string>('');
  const [invoiceName, setInvoiceName] = useState<string>('');
  const [invoiceUrl, setInvoiceUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setType(editingRecord.type);
      setDate(editingRecord.date || getTodayDateString());
      setTrips(editingRecord.trips);
      setCostPerTrip(editingRecord.costPerTrip);
      setNotes(editingRecord.notes || '');
      setInvoiceName(editingRecord.invoiceName || '');
      setInvoiceUrl(editingRecord.invoiceUrl || '');
    } else {
      setType(defaultType);
      setDate(getTodayDateString());
      setTrips(1);
      setCostPerTrip(defaultType === 'Fresh Water' ? 220 : 150);
      setNotes('');
      setInvoiceName('');
      setInvoiceUrl('');
    }
  }, [editingRecord, defaultType, isOpen]);

  // Real-time calculation: Total Cost = Trips * CostPerTrip
  const numTrips = Math.max(0, Number(trips) || 0);
  const numCostPerTrip = Math.max(0, Number(costPerTrip) || 0);
  const totalCost = numTrips * numCostPerTrip;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toastError(isRTL ? 'حجم الملف يتجاوز 8 ميجابايت' : 'File size exceeds 8MB limit');
      return;
    }

    setInvoiceName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setInvoiceUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toastError(isRTL ? 'يرجى تحديد التاريخ' : 'Date is required');
      return;
    }
    if (numTrips <= 0) {
      toastError(isRTL ? 'عدد النقلات يجب أن يكون أكبر من صفر' : 'Number of trips must be greater than 0');
      return;
    }
    if (numCostPerTrip < 0) {
      toastError(isRTL ? 'التكلفة لكل نقلة يجب أن تكون 0 أو أكثر' : 'Cost per trip cannot be negative');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await waterUsageService.updateRecord(editingRecord.id, {
          type,
          date,
          trips: numTrips,
          costPerTrip: numCostPerTrip,
          totalCost,
          notes: notes.trim(),
          invoiceName,
          invoiceUrl,
        });
        success(isRTL ? 'تم تحديث سجل استهلاك المياه بنجاح' : 'Water usage record updated successfully');
      } else {
        await waterUsageService.createRecord({
          type,
          date,
          trips: numTrips,
          costPerTrip: numCostPerTrip,
          notes: notes.trim(),
          invoiceName,
          invoiceUrl,
        });
        success(isRTL ? 'تمت إضافة سجل استهلاك المياه بنجاح' : 'Water usage record saved successfully');
      }

      onSuccess();
      onClose();
    } catch {
      toastError(isRTL ? 'فشل حفظ سجل المياه' : 'Failed to save water record');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {editingRecord
                  ? isRTL ? 'تعديل سجل استهلاك المياه' : 'Edit Water Record'
                  : type === 'Fresh Water'
                  ? isRTL ? 'إضافة نقلة مياه نقية' : 'Add Fresh Water Record'
                  : isRTL ? 'إضافة نقلة صرف صحي' : 'Add Waste Water Record'}
              </h2>
              <p className="text-xs text-neutral-500">
                {isRTL ? 'تسجيل صهاريج وتكاليف المياه في المخيم' : 'Log water tanker trips and service costs'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Water Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isRTL ? 'نوع المياه *' : 'Water Type *'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('Fresh Water');
                  if (!editingRecord) setCostPerTrip(220);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                  type === 'Fresh Water'
                    ? 'bg-orange-50 border-orange-500 text-orange-800 ring-2 ring-orange-500/20'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {isRTL ? 'مياه نقية (Fresh Water)' : 'Fresh Water'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('Waste Water');
                  if (!editingRecord) setCostPerTrip(150);
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                  type === 'Waste Water'
                    ? 'bg-neutral-800 border-neutral-900 text-white shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {isRTL ? 'صرف صحي (Waste Water)' : 'Waste Water'}
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isRTL ? 'التاريخ *' : 'Date *'}
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          {/* Number of Trips & Cost per Trip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'عدد النقلات (الردود) *' : 'Number of Trips *'}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={trips}
                onChange={(e) => setTrips(e.target.value)}
                placeholder="e.g. 2"
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'سعر النقلة الواحدة (ر.س) *' : 'Cost per Trip (SAR) *'}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={costPerTrip}
                onChange={(e) => setCostPerTrip(e.target.value)}
                placeholder="e.g. 220"
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-mono"
              />
            </div>
          </div>

          {/* Real-time Total Cost Display Banner */}
          <div className="bg-orange-50 border border-orange-200/80 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
              {isRTL ? 'إجمالي التكلفة:' : 'TOTAL COST:'}
            </span>
            <span className="text-lg font-black text-orange-600 font-mono">
              {totalCost.toLocaleString()} <span className="text-xs font-bold">SAR</span>
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isRTL ? 'اكتب أي ملاحظات خاصة بالنقلة...' : 'e.g. Tanker capacity 5,000 Gallons, Refilled Tank B'}
              className="w-full p-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          {/* Upload Invoice / Purchase Slip */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isRTL ? 'فاتورة / سند الشراء (Invoice / Purchase Slip)' : 'Invoice / Purchase Slip'}
            </label>
            <div className="border border-dashed border-neutral-300 rounded-xl p-3 bg-neutral-50/50 hover:bg-neutral-50 transition text-center">
              <input
                type="file"
                id="water-invoice-input"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="water-invoice-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-orange-600" />
                <span className="text-xs font-semibold text-neutral-700">
                  {invoiceName ? (
                    <span className="text-orange-700 font-mono font-bold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {invoiceName}
                    </span>
                  ) : (
                    <span>{isRTL ? 'اختر ملف الفاتورة (PDF, JPG, PNG)' : 'Upload Invoice File (PDF, JPG, PNG)'}</span>
                  )}
                </span>
                <span className="text-[10px] text-neutral-400">Max size: 8MB</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {editingRecord
                ? isRTL ? 'تحديث السجل' : 'Update Record'
                : isRTL ? 'حفظ السجل' : 'Save Record'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
