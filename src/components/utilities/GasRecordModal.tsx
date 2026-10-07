import React, { useState, useEffect } from 'react';
import { X, Flame, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { GasUsageRecord, GasCylinderType, GasInventoryStatus } from '../../types/utilities';
import { gasUsageService } from '../../services/gasUsageService';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { getTodayDateString } from '../../utils/dateFilter';

interface GasRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultType?: GasCylinderType;
  editingRecord?: GasUsageRecord | null;
}

export const GasRecordModal: React.FC<GasRecordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultType = 'Small Cylinders (12kg)',
  editingRecord = null,
}) => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [cylinderType, setCylinderType] = useState<GasCylinderType>(defaultType);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [cylindersCount, setCylindersCount] = useState<number | string>(5);
  const [costPerCylinder, setCostPerCylinder] = useState<number | string>(22);
  const [kgPerCylinder, setKgPerCylinder] = useState<number | string>(12);
  const [status, setStatus] = useState<GasInventoryStatus>('In Stock');
  const [notes, setNotes] = useState<string>('');
  const [slipName, setSlipName] = useState<string>('');
  const [slipUrl, setSlipUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setCylinderType(editingRecord.cylinderType);
      setDate(editingRecord.date || getTodayDateString());
      setCylindersCount(editingRecord.cylindersCount);
      setCostPerCylinder(editingRecord.costPerCylinder);
      setKgPerCylinder(editingRecord.kgPerCylinder);
      setStatus(editingRecord.status || 'In Stock');
      setNotes(editingRecord.notes || '');
      setSlipName(editingRecord.slipName || '');
      setSlipUrl(editingRecord.slipUrl || '');
    } else {
      setCylinderType(defaultType);
      setDate(getTodayDateString());
      setCylindersCount(defaultType === 'Small Cylinders (12kg)' ? 5 : 2);
      setCostPerCylinder(defaultType === 'Small Cylinders (12kg)' ? 22 : 95);
      setKgPerCylinder(defaultType === 'Small Cylinders (12kg)' ? 12 : 48);
      setStatus('In Stock');
      setNotes('');
      setSlipName('');
      setSlipUrl('');
    }
  }, [editingRecord, defaultType, isOpen]);

  // Real-time calculations:
  // Total Cost = Number of Cylinders * Cost per Cylinder
  // Total Weight = Number of Cylinders * Kg per Cylinder
  const count = Math.max(0, Number(cylindersCount) || 0);
  const cost = Math.max(0, Number(costPerCylinder) || 0);
  const kg = Math.max(0, Number(kgPerCylinder) || 0);
  const totalCost = count * cost;
  const totalWeight = count * kg;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toastError(isRTL ? 'حجم الملف يتجاوز 8 ميجابايت' : 'File size exceeds 8MB limit');
      return;
    }

    setSlipName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSlipUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleTypeChange = (newType: GasCylinderType) => {
    setCylinderType(newType);
    if (!editingRecord) {
      if (newType === 'Small Cylinders (12kg)') {
        setKgPerCylinder(12);
        setCostPerCylinder(22);
      } else {
        setKgPerCylinder(48);
        setCostPerCylinder(95);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toastError(isRTL ? 'يرجى تحديد التاريخ' : 'Date is required');
      return;
    }
    if (count <= 0) {
      toastError(isRTL ? 'عدد الاسطوانات يجب أن يكون أكبر من صفر' : 'Number of cylinders must be greater than 0');
      return;
    }
    if (cost < 0) {
      toastError(isRTL ? 'سعر الاسطوانة لا يمكن أن يكون سالباً' : 'Cost per cylinder cannot be negative');
      return;
    }
    if (kg <= 0) {
      toastError(isRTL ? 'وزن الاسطوانة يجب أن يكون أكبر من صفر' : 'Kg per cylinder must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRecord) {
        await gasUsageService.updateRecord(editingRecord.id, {
          cylinderType,
          date,
          cylindersCount: count,
          costPerCylinder: cost,
          kgPerCylinder: kg,
          totalCost,
          totalWeight,
          status,
          notes: notes.trim(),
          slipName,
          slipUrl,
        });
        success(isRTL ? 'تم تحديث سجل الغاز بنجاح' : 'Gas record updated successfully');
      } else {
        await gasUsageService.createRecord({
          cylinderType,
          date,
          cylindersCount: count,
          costPerCylinder: cost,
          kgPerCylinder: kg,
          status,
          notes: notes.trim(),
          slipName,
          slipUrl,
        });
        success(isRTL ? 'تمت إضافة سجل اسطوانات الغاز بنجاح' : 'Gas cylinder record saved successfully');
      }

      onSuccess();
      onClose();
    } catch {
      toastError(isRTL ? 'فشل حفظ سجل الغاز' : 'Failed to save gas record');
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
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {editingRecord
                  ? isRTL ? 'تعديل سجل اسطوانات الغاز' : 'Edit Gas Cylinder Record'
                  : isRTL ? 'إضافة سجل تعبئة / استخدام اسطوانات الغاز' : 'Record gas cylinder refills and usage.'}
              </h2>
              <p className="text-xs text-neutral-500">
                {isRTL ? 'متابعة اسطوانات الغاز والتكاليف والمخزون' : 'Track gas cylinder inventory, weights, and refill costs'}
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
          {/* Cylinder Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isRTL ? 'نوع الاسطوانة *' : 'Cylinder Type *'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('Small Cylinders (12kg)')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                  cylinderType === 'Small Cylinders (12kg)'
                    ? 'bg-orange-50 border-orange-500 text-orange-800 ring-2 ring-orange-500/20'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {isRTL ? 'اسطوانة صغيرة (12 كجم)' : 'Small Cylinders (12kg)'}
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('Big Cylinders')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center ${
                  cylinderType === 'Big Cylinders'
                    ? 'bg-neutral-800 border-neutral-900 text-white shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {isRTL ? 'اسطوانة كبيرة (مركزية)' : 'Big Cylinders'}
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

          {/* Number of Cylinders & Cost per Cylinder */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'عدد الاسطوانات *' : 'Number of Cylinders *'}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={cylindersCount}
                onChange={(e) => setCylindersCount(e.target.value)}
                placeholder="e.g. 5"
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'سعر الاسطوانة (ر.س) *' : 'Cost per Cylinder (SAR) *'}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={costPerCylinder}
                onChange={(e) => setCostPerCylinder(e.target.value)}
                placeholder="e.g. 22"
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-mono"
              />
            </div>
          </div>

          {/* Kg per Cylinder & Inventory Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'وزن الاسطوانة (كجم) *' : 'Kg per Cylinder (Editable) *'}
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={kgPerCylinder}
                onChange={(e) => setKgPerCylinder(e.target.value)}
                placeholder="e.g. 12"
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'حالة المخزون (اختياري)' : 'Update Inventory Status'}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as GasInventoryStatus)}
                className="w-full h-10 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition cursor-pointer"
              >
                <option value="In Stock">{isRTL ? 'متوفر بالمستودع (In Stock)' : 'In Stock'}</option>
                <option value="In Use">{isRTL ? 'قيد الاستخدام بالمطابخ (In Use)' : 'In Use'}</option>
                <option value="Empty">{isRTL ? 'فارغة جاهزة للتعبئة (Empty)' : 'Empty'}</option>
              </select>
            </div>
          </div>

          {/* Real-time TOTAL COST & TOTAL WEIGHT Banner */}
          <div className="grid grid-cols-2 gap-2 bg-orange-50 border border-orange-200/80 rounded-xl p-3">
            <div>
              <span className="text-[10px] font-bold text-orange-950 uppercase tracking-wider block">
                {isRTL ? 'إجمالي التكلفة:' : 'TOTAL COST:'}
              </span>
              <span className="text-base sm:text-lg font-black text-orange-600 font-mono">
                {totalCost.toLocaleString()} <span className="text-xs font-bold">SAR</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-orange-950 uppercase tracking-wider block">
                {isRTL ? 'إجمالي الوزن:' : 'TOTAL WEIGHT:'}
              </span>
              <span className="text-base sm:text-lg font-black text-neutral-900 font-mono">
                {totalWeight.toLocaleString()} <span className="text-xs font-bold">kg</span>
              </span>
            </div>
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
              placeholder={isRTL ? 'مثال: توريد دفعة جديدة للمطبخ المركزي' : 'e.g. Refill for bakery and central kitchen'}
              className="w-full p-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          {/* Purchase Slip Upload */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {isRTL ? 'سند الشراء (Purchase Slip)' : 'Purchase Slip'}
            </label>
            <div className="border border-dashed border-neutral-300 rounded-xl p-3 bg-neutral-50/50 hover:bg-neutral-50 transition text-center">
              <input
                type="file"
                id="gas-slip-input"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="gas-slip-input"
                className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-orange-600" />
                <span className="text-xs font-semibold text-neutral-700">
                  {slipName ? (
                    <span className="text-orange-700 font-mono font-bold flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {slipName}
                    </span>
                  ) : (
                    <span>{isRTL ? 'اختر ملف سند الشراء (PDF, JPG, PNG)' : 'Upload Purchase Slip (PDF, JPG, PNG)'}</span>
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
