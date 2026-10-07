import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  AlertTriangle,
  Download,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { excelService } from '../../services/excelService';
import { ExcelImportState } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';

export const AdminExcelPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError, warning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [targetModule, setTargetModule] = useState<ExcelImportState['targetModule']>('projects');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importState, setImportState] = useState<ExcelImportState | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toastError('Please select a valid Excel file (.xlsx or .xls)');
      return;
    }

    setIsProcessing(true);
    setIsConfirmed(false);
    try {
      const parsed = await excelService.parseAndValidateExcel(file, targetModule);
      setImportState(parsed);
      if (parsed.errors.length > 0) {
        warning(`Parsed file with ${parsed.errors.length} validation errors.`);
      } else {
        success('Excel schema validated successfully.');
      }
    } catch {
      toastError('Failed to parse spreadsheet file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!importState) return;
    setIsConfirmed(true);
    success(
      `Successfully imported ${importState.validRows} verified records into ${targetModule} database!`
    );
  };

  const handleDownloadTemplate = () => {
    excelService.generateTemplate(targetModule);
    success(`Downloaded blank template for ${targetModule}`);
  };

  const handleDownloadErrors = () => {
    if (!importState || importState.errors.length === 0) return;
    excelService.downloadErrorReport(importState.errors, importState.fileName);
    success('Downloaded error report');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            {t('excel.title')}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t('excel.subtitle')}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={handleDownloadTemplate}
        >
          {t('excel.downloadTemplate')}
        </Button>
      </div>

      {/* Target Module Selector */}
      <Card className="p-4 bg-white border-neutral-200">
        <label className="block text-xs font-semibold text-neutral-700 mb-2">
          {t('excel.selectTarget')}:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'projects', label: t('nav.projects') },
            { id: 'manpower', label: t('nav.manpower') },
            { id: 'vehicles', label: t('nav.vehicles') },
            { id: 'inventory', label: t('nav.inventory') },
            { id: 'reports', label: t('nav.reports') },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setTargetModule(m.id as any);
                setImportState(null);
                setIsConfirmed(false);
              }}
              className={`p-2.5 rounded-lg border text-xs font-semibold transition text-center ${
                targetModule === m.id
                  ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-2xs'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Upload Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 ${
          isDragging
            ? 'border-orange-500 bg-orange-50/50'
            : 'border-neutral-300 hover:border-orange-400 bg-white'
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

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200">
            {isProcessing ? (
              <RefreshCw className="w-6 h-6 animate-spin text-orange-600" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">
              {t('excel.dragDrop')}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports Microsoft Excel spreadsheets up to 10MB
            </p>
          </div>
          <Button variant="outline" size="sm" type="button">
            {t('excel.browseFiles')}
          </Button>
        </div>
      </div>

      {/* Validation & Preview Section */}
      {importState && (
        <div className="space-y-4 animate-in fade-in">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3 bg-white border-neutral-200">
              <span className="text-[11px] text-neutral-500 block uppercase font-medium">
                File Parsed
              </span>
              <span className="text-xs font-bold text-neutral-900 truncate block mt-0.5">
                {importState.fileName}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">{importState.fileSize}</span>
            </Card>

            <Card className="p-3 bg-white border-neutral-200">
              <span className="text-[11px] text-neutral-500 block uppercase font-medium">
                {t('excel.totalRows')}
              </span>
              <span className="text-lg font-bold text-neutral-900 font-mono mt-0.5 block">
                {importState.totalRows}
              </span>
            </Card>

            <Card className="p-3 bg-white border-neutral-200">
              <span className="text-[11px] text-emerald-700 block uppercase font-medium">
                {t('excel.validRows')}
              </span>
              <span className="text-lg font-bold text-emerald-600 font-mono mt-0.5 block">
                {importState.validRows}
              </span>
            </Card>

            <Card className="p-3 bg-white border-neutral-200">
              <span className="text-[11px] text-rose-700 block uppercase font-medium">
                {t('excel.invalidRows')}
              </span>
              <span className="text-lg font-bold text-rose-600 font-mono mt-0.5 block">
                {importState.invalidRows}
              </span>
            </Card>
          </div>

          {/* Validation Results Error Table (Specification Section 28) */}
          {importState.errors.length > 0 && (
            <Card className="border-rose-200 overflow-hidden">
              <CardHeader
                title={
                  <div className="flex items-center gap-2 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>{t('excel.validationResults')}</span>
                  </div>
                }
                subtitle="The following rows failed validation and must be reviewed"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={handleDownloadErrors}
                  >
                    {t('excel.downloadErrors')}
                  </Button>
                }
              />
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-rose-50/70 border-b border-rose-200 text-rose-900 uppercase text-[11px]">
                      <tr>
                        <th className="py-2 px-3">{t('excel.row')}</th>
                        <th className="py-2 px-3">{t('excel.column')}</th>
                        <th className="py-2 px-3">{t('excel.problem')}</th>
                        <th className="py-2 px-3 text-center">{t('common.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {importState.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-rose-50/40">
                          <td className="py-2 px-3 font-mono font-bold text-neutral-900">{err.row}</td>
                          <td className="py-2 px-3 font-medium text-neutral-800">{err.column}</td>
                          <td className="py-2 px-3 text-rose-700 font-medium">{err.problem}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-300">
                              {err.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Preview Table */}
          {importState.previewData.length > 0 && (
            <Card>
              <CardHeader
                title="Spreadsheet Preview (First 10 Rows)"
                subtitle="Verify fields mapping prior to database commitment"
              />
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                      <tr>
                        {Object.keys(importState.previewData[0]).map((key) => (
                          <th key={key} className="py-2 px-3 font-semibold whitespace-nowrap">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {importState.previewData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50">
                          {Object.values(row).map((val: any, cIdx) => (
                            <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-neutral-800">
                              {String(val || '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirm Import Button / Status */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {isConfirmed ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t('excel.importComplete')}</span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmImport}
                disabled={importState.validRows === 0}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('excel.confirmImport')} ({importState.validRows} Records)
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
