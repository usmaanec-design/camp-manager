import React, { useState, useRef } from 'react';
import { UploadCloud, RefreshCw, CheckCircle2, Download, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { excelService } from '../../services/excelService';
import { ExcelImportState } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { useToast } from '../../contexts/ToastContext';

export const UserExcelPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError, warning } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const parsed = await excelService.parseAndValidateExcel(file, 'reports');
      setImportState(parsed);
      if (parsed.errors.length > 0) {
        warning(`File parsed with ${parsed.errors.length} validation errors.`);
      } else {
        success('Excel report data validated successfully.');
      }
    } catch {
      toastError('Failed to process spreadsheet.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (!importState) return;
    setIsConfirmed(true);
    success(`Successfully imported ${importState.validRows} operational report entries.`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            Field Reports Excel Upload
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Bulk upload daily shift logs and inspection data for {user?.projectName || 'your camp'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={() => excelService.generateTemplate('reports')}
        >
          Download Reports Template
        </Button>
      </div>

      {/* Drag & drop upload area */}
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
              Drag & drop Excel report file (.xlsx, .xls)
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports standardized operational report spreadsheets
            </p>
          </div>
          <Button variant="outline" size="sm" type="button">
            Browse File
          </Button>
        </div>
      </div>

      {/* Import preview & validation results */}
      {importState && (
        <div className="space-y-4 animate-in fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 bg-white border-neutral-200">
              <span className="text-[11px] text-neutral-500 block uppercase">File</span>
              <span className="text-xs font-bold text-neutral-900 truncate block mt-0.5">{importState.fileName}</span>
              <span className="text-[10px] text-neutral-400 font-mono">{importState.fileSize}</span>
            </Card>
            <Card className="p-3 bg-white border-neutral-200">
              <span className="text-[11px] text-neutral-500 block uppercase">Total Rows</span>
              <span className="text-lg font-bold text-neutral-900 font-mono mt-0.5 block">{importState.totalRows}</span>
            </Card>
            <Card className="p-3 bg-white border-neutral-200">
              <span className="text-[11px] text-emerald-700 block uppercase">Valid Rows</span>
              <span className="text-lg font-bold text-emerald-600 font-mono mt-0.5 block">{importState.validRows}</span>
            </Card>
            <Card className="p-3 bg-white border-neutral-200">
              <span className="text-[11px] text-rose-700 block uppercase">Error Rows</span>
              <span className="text-lg font-bold text-rose-600 font-mono mt-0.5 block">{importState.invalidRows}</span>
            </Card>
          </div>

          {importState.errors.length > 0 && (
            <Card className="border-rose-200">
              <CardHeader
                title={
                  <div className="flex items-center gap-2 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Spreadsheet Validation Warnings</span>
                  </div>
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-rose-700 border-rose-300"
                    onClick={() => excelService.downloadErrorReport(importState.errors, importState.fileName)}
                  >
                    Download Error Report
                  </Button>
                }
              />
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-rose-50/70 border-b border-rose-200 text-rose-900 uppercase text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Row</th>
                        <th className="py-2 px-3">Column</th>
                        <th className="py-2 px-3">Problem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 bg-white">
                      {importState.errors.map((err, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-bold">{err.row}</td>
                          <td className="py-2 px-3 font-medium">{err.column}</td>
                          <td className="py-2 px-3 text-rose-700">{err.problem}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {isConfirmed ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Import processed into reports archive.</span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirmImport}
                disabled={importState.validRows === 0}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Confirm & Import Valid Reports ({importState.validRows})
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
