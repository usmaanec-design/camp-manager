import React, { useState, useEffect } from 'react';
import { X, Fuel, CheckCircle2 } from 'lucide-react';
import { FuelUsageRecord, FuelType } from '../../types/utilities';
import { fuelUsageService } from '../../services/fuelUsageService';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { getTodayDateString } from '../../utils/dateFilter';

interface FuelRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: FuelType;
  editingRecord?: FuelUsageRecord | null;
}

export const FuelRecordModal: React.FC<FuelRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'Diesel',
  editingRecord = null,
}) => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [fuelType, setFuelType] = useState<FuelType>(defaultType);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [litersUsed, setLitersUsed] = useState<number | string>(300);
  const [cost, setCost] = useState<number | string>(345);
  const [machineName, setMachineName] = useState<string>('Generator 01');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setFuelType(editingRecord.fuelType);
      setDate(editingRecord.date || getTodayDateString());
      setLitersUsed(editingRecord.litersUsed);
      setCost(editingRecord.cost);
      setMachineName(editingRecord.machineName || 'Generator 01');
      setNotes(editingRecord.notes || '');
    } else {
      setFuelType(defaultType);
      setDate(getTodayDateString());
      setLitersUsed(defaultType === 'Diesel' ? 350 : 50);
      setCost(defaultType === 'Diesel' ? 402.5 : 109);
      setMachineName(defaultType === 'Diesel' ? 'Generator 01' : 'Water Pump 01');
      setNotes('');
    }
  }, [editingRecord, defaultType, isOpen]);

  // Real-time calculation: Cost per Liter = Cost / Liters Used
  const numLiters = Math.max(0, Number(litersUsed) || 0);
  const numCost = Math.max(0, Number(cost) || 0);
  const costPerLiter = numLiters > 0 ? Number((numCost / numLiters).toFixed(3)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toastError(isRTL ? 'يرجى تحديد التاريخ' : 'Date is required');
      return;
    }
    if (!fuelType) {
      toastError(isRTL ? 'يرجى تحديد نوع الوقود' : 'Fuel type is required');
      return;
    }
    if (numLiters <= 0) {
      toastError(isRTL ? 'كمية اللترات يجب أن تكون أكبر من صفر' : 'Liters used must be greater than 0');
      return;
    }
    if (numCost < 0) {
      toastError(isRTL ? 'التكلفة لا يمكن أن تكون سالبة' : 'Cost cannot be negative');
      return;
    }
    if (!machineName.trim()) {
      toastError(isRTL ? 'يرجى إدخال اسم المولد أو المعدة' : 'Generator / Machine name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await fuelUsageService.updateRecord(editingRecord.id, {
          fuelType,
          date,
          litersUsed: numLiters,
          cost: numCost,
          machineName: machineName.trim(),
          notes: notes.trim(),
        });
        success(isRTL ? 'تم تحديث سجل الوقود بنجاح' : 'Fuel record updated successfully');
      } else {
        await fuelUsageService.createRecord({
          fuelType,
          date,
          litersUsed: numLiters,
          cost: numCost,
          machineName: machineName.trim(),
          notes: notes.trim(),
        });
        success(isRTL ? 'تم تسجيل استهلاك الوقود بنجاح' : 'Fuel usage record saved successfully');
      }

      onSuccess();
      onClose();
    } catch {
      toastError(isRTL ? 'فشل حفظ سجل الوقود' : 'Failed to save fuel record');
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
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {editingRecord
                  ? isRTL ? 'تعديل سجل استهلاك الوقود' : 'Edit Fuel Usage Record'
                  : isRTL ? 'تسجيل استهلاك الوقود' : 'Log Fuel Usage'}
              </h2>
              <p className="text-xs text-neutral-500">
                {isRTL ? 'تسجيل استهلاك الوقود للمولدات والمعدات' : 'Record fuel consumption for generators.'}
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
          {/* Fuel Type Selection (Dropdown / Toggle) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isRTL ? 'نوع الوقود *' : 'Fuel Type *'}
            </label>
            <select
              value={fuelType}
              onChange={(e) => {
                const val = e.target.value as FuelType;
                setFuelType(val);
                if (!editingRecord) {
                  if (val === 'Diesel') {
                    setLitersUsed(350);
                    setCost(402.5);
                    setMachineName('Generator 01');
                  } else {
                    setLitersUsed(50);
                    setCost(109);
                    setMachineName('Water Pump 01');
                  }
                }
              }}
              className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition cursor-pointer"
            >
              <option value="Diesel">{isRTL ? 'ديزل (Diesel)' : 'Diesel'}</option>
              <option value="Petrol">{isRTL ? 'بنزين (Petrol)' : 'Petrol'}</option>
            </select>
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

          {/* Generator / Machine Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isRTL ? 'اسم المولد / المعدة *' : 'Generator / Machine Name *'}
            </label>
            <input
              type="text"
              required
              value={machineName}
              onChange={(e) => setMachineName(e.target.value)}
              placeholder="e.g. Generator 01, Water Pump, Machine 01"
              className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          {/* Liters Used & Total Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'كمية اللترات المستهلكة *' : 'Liters Used *'}
              </label>
              <input
                type="number"
                min="0.1"
                step="0.5"
                required
                value={litersUsed}
                onChange={(e) => setLitersUsed(e.target.value)}
                placeholder="e.g. 350"
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'التكلفة الإجمالية (ر.س) *' : 'Cost (SAR) *'}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="e.g. 402.5"
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-mono"
              />
            </div>
          </div>

          {/* Real-time Calculated Cost per Liter Banner */}
          <div className="bg-orange-50 border border-orange-200/80 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
              {isRTL ? 'سعر اللتر المحسوب:' : 'Cost per Liter (Calculated):'}
            </span>
            <span className="text-base font-black text-orange-600 font-mono">
              {costPerLiter.toFixed(3)} <span className="text-xs font-bold">SAR / Liter</span>
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
              placeholder={isRTL ? 'ساعات التشغيل، فحص الزيت، أو أي تفاصيل...' : 'Operating hours, load test, or maintenance details'}
              className="w-full p-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
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
