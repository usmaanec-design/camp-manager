import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { utilityBuildingService } from '../../services/utilityBuildingService';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

interface UtilityExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedUtilityRow {
  rowNumber: number;
  building: string;
  category?: string;
  floor: number;
  roomNumber: string;
  item: string;
  itemAr?: string;
  quantity: number;
  isValid: boolean;
  error?: string;
}

export const UtilityExcelImportModal: React.FC<UtilityExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { isRTL } = useLanguage();
  const { success, error: toastError, warning } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedUtilityRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toastError(isRTL ? 'يرجى اختيار ملف إكسل بصيغة .xlsx أو .xls' : 'Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

      const rows: ParsedUtilityRow[] = [];

      rawJson.forEach((row, idx) => {
        const rowNumber = idx + 2;

        const building = String(
          row['Building Name'] || row['Building'] || row['building'] || row['BuildingName'] || row['المبنى'] || ''
        ).trim();

        const category = String(
          row['Category'] || row['Building Category'] || row['category'] || row['التصنيف'] || ''
        ).trim();

        const floorRaw = row['Floor'] || row['floor'] || row['الطابق'] || 1;
        const floor = Math.max(1, Number(floorRaw) || 1);

        const roomNumber = String(
          row['Room Number'] || row['Room'] || row['roomNumber'] || row['Utility Room'] || row['الوحدة'] || row['الغرفة'] || ''
        ).trim();

        const item = String(
          row['Item Name'] || row['Item'] || row['itemName'] || row['الصنف'] || row['المادة'] || ''
        ).trim();

        const itemAr = String(
          row['Item Name (Arabic)'] || row['Item Arabic'] || row['اسم الصنف'] || ''
        ).trim();

        const quantityRaw = row['Quantity'] || row['Qty'] || row['quantity'] || row['الكمية'] || 1;
        const quantity = Math.max(1, Number(quantityRaw) || 1);

        let isValid = true;
        let error = '';

        if (!building) {
          isValid = false;
          error = 'Building name missing';
        } else if (!roomNumber) {
          isValid = false;
          error = 'Room / Unit number missing';
        } else if (!item) {
          isValid = false;
          error = 'Item description missing';
        }

        rows.push({
          rowNumber,
          building,
          category,
          floor,
          roomNumber,
          item,
          itemAr,
          quantity,
          isValid,
          error,
        });
      });

      setParsedRows(rows);

      const invalidCount = rows.filter((r) => !r.isValid).length;
      if (invalidCount > 0) {
        warning(
          isRTL
            ? `تم تحليل ${rows.length} صف، يوجد ${invalidCount} صف به بيانات ناقصة`
            : `Parsed ${rows.length} rows, ${invalidCount} rows have missing fields`
        );
      } else {
        success(
          isRTL
            ? `تم قراءة ${rows.length} صف بنجاح جاهزة للاستيراد`
            : `Successfully parsed ${rows.length} valid rows ready for import`
        );
      }
    } catch {
      toastError(isRTL ? 'فشل معالجة ملف الإكسل' : 'Failed to parse Excel file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toastError(isRTL ? 'لا توجد صفوف صالحة للاستيراد' : 'No valid rows to import');
      return;
    }

    setIsImporting(true);
    try {
      const result = await utilityBuildingService.importUtilityInventoryFromRows(
        validRows.map((r) => ({
          building: r.building,
          category: r.category,
          floor: r.floor,
          roomNumber: r.roomNumber,
          item: r.item,
          itemAr: r.itemAr,
          quantity: r.quantity,
        }))
      );

      success(
        isRTL
          ? `تم الاستيراد بنجاح! أضيف ${result.addedCount} صنف جديد، دمج ${result.updatedCount} صنف مكرر، أنشئ ${result.buildingsCreated} مبنى جديد`
          : `Import completed! ${result.addedCount} new items added, ${result.updatedCount} items merged, ${result.buildingsCreated} buildings created.`
      );
      onSuccess();
      onClose();
    } catch {
      toastError(isRTL ? 'فشل استيراد البيانات' : 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {isRTL
                  ? 'استيراد أصول ومخزون المباني الخدمية عبر الإكسل'
                  : 'Import Utility Buildings & Inventory Excel'}
              </h2>
              <p className="text-xs text-neutral-500">
                {isRTL
                  ? 'ربط تلقائي: المبنى ← الطابق ← الوحدة ← الأصناف مع منع التكرار والدمج الذكي'
                  : 'Auto-sync: Building → Floor → Unit → Items with intelligent deduplication'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={() => utilityBuildingService.downloadUtilityTemplate()}
            >
              {isRTL ? 'تحميل النموذج الرسمي' : 'Download Template'}
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Upload Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 ${
              isDragging
                ? 'border-orange-500 bg-orange-50/50'
                : 'border-neutral-300 hover:border-orange-400 bg-neutral-50/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-2.5">
              <Upload className="w-6 h-6" />
            </div>

            <p className="text-sm font-bold text-neutral-800">
              {isProcessing
                ? isRTL ? 'جاري قراءة وتحليل الملف...' : 'Processing Excel spreadsheet...'
                : fileName ? fileName : isRTL ? 'اضغط لاختيار ملف إكسل أو اسحبه إلى هنا' : 'Click to select Excel file or drag & drop'}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports .xlsx, .xls (Building Name, Floor, Room Number, Item Name, Quantity)
            </p>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-800">
                  {isRTL ? 'معاينة البيانات قبل الاعتماد:' : 'Data Preview Before Import:'}
                </span>

                <div className="flex items-center gap-3 font-mono">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {validCount} {isRTL ? 'سليم' : 'Valid'}
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-amber-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {invalidCount} {isRTL ? 'تحذير/خطأ' : 'Errors'}
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-neutral-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-100/80 text-neutral-600 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Building</th>
                      <th className="py-2 px-3">Floor</th>
                      <th className="py-2 px-3">Room / Unit</th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {parsedRows.slice(0, 100).map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-neutral-50' : 'bg-red-50/40'}>
                        <td className="py-2 px-3 font-mono text-neutral-400">{r.rowNumber}</td>
                        <td className="py-2 px-3 font-medium text-neutral-900">{r.building}</td>
                        <td className="py-2 px-3 font-mono text-neutral-600">{r.floor}</td>
                        <td className="py-2 px-3 font-mono text-orange-700 font-semibold">{r.roomNumber}</td>
                        <td className="py-2 px-3 text-neutral-800">
                          {r.item}
                          {r.itemAr && <span className="text-[10px] text-neutral-400 block font-arabic">{r.itemAr}</span>}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-neutral-900">{r.quantity}</td>
                        <td className="py-2 px-3 text-right">
                          {r.isValid ? (
                            <span className="text-emerald-600 font-medium text-[11px]">Valid</span>
                          ) : (
                            <span className="text-red-500 font-medium text-[11px]">{r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 100 && (
                <div className="text-[11px] text-neutral-400 text-center">
                  Showing first 100 of {parsedRows.length} total rows
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
          <span className="text-xs text-neutral-500">
            {isRTL
              ? 'الدمج الذكي: إذا كان الصنف مسجلاً مسبقاً بنفس الوحدة يتم جمع الكميات تلقائياً'
              : 'Smart Merge: If item exists in the same unit, quantities are merged automatically.'}
          </span>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isImporting}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={validCount === 0 || isImporting}
              isLoading={isImporting}
              onClick={handleConfirmImport}
            >
              {isRTL ? `تأكيد استيراد ${validCount} صف` : `Confirm Import (${validCount} rows)`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
