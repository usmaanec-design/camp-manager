import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Upload,
  Plus,
  Search,
  Users,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import {
  Building,
  BuildingPersonnel,
  BuildingRoom,
  JobTitleId,
} from '../../types';
import { buildingService } from '../../services/buildingService';
import { personnelService } from '../../services/personnelService';
import { jobTitleService } from '../../services/jobTitleService';
import { roomService } from '../../services/roomService';
import { excelService, PersonnelExcelParseResult } from '../../services/excelService';
import { matchBuildingForRoom } from '../../utils/buildingMatcher';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { JobTitleMappingModal } from '../../components/camp/JobTitleMappingModal';
import { BuildingRoomsView } from '../../components/camp/BuildingRoomsView';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../i18n/LanguageContext';

export const BuildingDetailPage: React.FC = () => {
  const { buildingId } = useParams<{ buildingId: string }>();
  const { isRTL, language } = useLanguage();
  const { success, error: toastError } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [building, setBuilding] = useState<Building | null>(null);
  const [personnelList, setPersonnelList] = useState<BuildingPersonnel[]>([]);
  const [rooms, setRooms] = useState<BuildingRoom[]>([]);
  const [viewMode, setViewMode] = useState<'rooms' | 'directory'>('rooms');
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>('All');
  const [selectedRoom, setSelectedRoom] = useState<string>('All');

  // Excel Upload Preview State
  const [parseResult, setParseResult] = useState<PersonnelExcelParseResult | null>(null);
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Manual Add Personnel Modal State
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState<BuildingPersonnel | null>(null);
  const [isDeletingPersonnel, setIsDeletingPersonnel] = useState(false);
  const [manualForm, setManualForm] = useState({
    idNumber: '',
    name: '',
    jobTitleId: 'LABOUR' as JobTitleId,
    iqamaNumber: '',
    roomNumber: 'A-101',
  });

  const officialJobTitles = jobTitleService.getJobTitles();

  const loadBuildingData = async (opts?: { silent?: boolean }) => {
    if (!buildingId) return;
    if (!opts?.silent) setIsLoading(true);
    try {
      const [bData, pData] = await Promise.all([
        buildingService.getBuildingById(buildingId),
        personnelService.getPersonnelByBuilding(buildingId),
      ]);
      setBuilding(bData);
      setPersonnelList(pData);

      if (bData) {
        const rData = await roomService.getRoomsByBuilding(bData);
        setRooms(rData);
      }
    } catch (err: any) {
      toastError('Failed to load building data');
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBuildingData();
  }, [buildingId]);

  // Breakdown calculation strictly using normalized JobTitleId
  const jobTitleBreakdown = useMemo(() => {
    return personnelService.calculateBreakdown(personnelList);
  }, [personnelList]);

  // Filtered personnel records
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.iqamaNumber.includes(searchTerm) ||
        p.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesJob = selectedJobTitle === 'All' || p.jobTitleId === selectedJobTitle;
      const matchesRoom = selectedRoom === 'All' || p.roomNumber === selectedRoom;

      return matchesSearch && matchesJob && matchesRoom;
    });
  }, [personnelList, searchTerm, selectedJobTitle, selectedRoom]);

  // Distinct rooms for filter
  const roomOptions = useMemo(() => {
    const set = new Set(personnelList.map((p) => p.roomNumber));
    return Array.from(set).sort();
  }, [personnelList]);

  // Handle Download Excel Template
  const handleDownloadTemplate = () => {
    excelService.downloadPersonnelTemplate();
    success(isRTL ? 'تم تنزيل نموذج الإكسل الرسمي' : 'Official Excel Template downloaded');
  };

  // Handle Excel File Selected
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await excelService.parseAndValidatePersonnelExcel(file);
      setParseResult(result);
      if (result.unmappedTitles.length > 0) {
        setIsMappingModalOpen(true);
      }
    } catch (err: any) {
      toastError('Error parsing Excel spreadsheet');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Apply Job Title Mapping to Preview Rows
  const handleApplyMapping = (mapping: Record<string, JobTitleId>) => {
    if (!parseResult) return;

    const updatedRows = parseResult.rows.map((row) => {
      if (row.status === 'Needs Mapping' && mapping[row.rawJobTitle]) {
        return {
          ...row,
          jobTitleId: mapping[row.rawJobTitle],
          status: 'Valid' as const,
          errorMessage: undefined,
        };
      }
      return row;
    });

    const validRows = updatedRows.filter((r) => r.status === 'Valid').length;
    const errorRows = updatedRows.filter((r) => r.status === 'Error').length;
    const needsMappingRows = updatedRows.filter((r) => r.status === 'Needs Mapping').length;

    setParseResult({
      ...parseResult,
      rows: updatedRows,
      validRows,
      errorRows,
      needsMappingRows,
      unmappedTitles: [],
    });

    setIsMappingModalOpen(false);
    success(isRTL ? 'تم تعيين وتوحيد المسميات الوظيفية بنجاح' : 'Job titles normalized successfully');
  };

  // Execute Import into Building
  const handleExecuteImport = async () => {
    if (!parseResult || !buildingId || !building) return;

    const validRows = parseResult.rows.filter((r) => r.status === 'Valid' && r.jobTitleId);
    if (validRows.length === 0) {
      toastError('No valid records to import');
      return;
    }

    setIsImporting(true);
    try {
      const allBuildings = await buildingService.getBuildings(undefined, building.projectId);

      const recordsToImport = validRows.map((r) => {
        const matched = matchBuildingForRoom(r.roomNumber, allBuildings);
        const targetBld = matched || building;

        return {
          buildingId: targetBld.id,
          campId: targetBld.campId || building.campId,
          projectId: targetBld.projectId || building.projectId,
          userId: targetBld.userId || building.userId,
          idNumber: r.idNumber,
          name: r.name,
          jobTitleId: r.jobTitleId!,
          iqamaNumber: r.iqamaNumber,
          roomNumber: r.roomNumber,
        };
      });

      await personnelService.bulkImportPersonnel(recordsToImport);

      // Update occupancy on all buildings
      const allPersonnel = await personnelService.getAllPersonnel(building.projectId);
      for (const b of allBuildings) {
        const occ = allPersonnel.filter((p) => p.buildingId === b.id).length;
        await buildingService.updateBuilding(b.id, { currentOccupancy: occ });
      }

      window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));

      success(
        isRTL
          ? `تم استيراد وتوزيع ${recordsToImport.length} موظف بنجاح حسب مبانيهم وغرفهم`
          : `Successfully imported ${recordsToImport.length} personnel allocated to their buildings & rooms`
      );

      setParseResult(null);
      await loadBuildingData();
    } catch (err: any) {
      toastError('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Add Single Personnel Manually
  const handleAddManualPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building || !buildingId) return;

    try {
      await personnelService.addPersonnel({
        buildingId,
        campId: building.campId,
        projectId: building.projectId,
        userId: building.userId,
        idNumber: manualForm.idNumber.trim(),
        name: manualForm.name.trim(),
        jobTitleId: manualForm.jobTitleId,
        iqamaNumber: manualForm.iqamaNumber.trim(),
        roomNumber: manualForm.roomNumber.trim(),
      });

      await buildingService.updateBuilding(buildingId, {
        currentOccupancy: personnelList.length + 1,
      });

      success(isRTL ? 'تمت إضافة الموظف بنجاح' : 'Personnel added successfully');
      setIsAddManualOpen(false);
      setManualForm({
        idNumber: '',
        name: '',
        jobTitleId: 'LABOUR',
        iqamaNumber: '',
        roomNumber: 'A-101',
      });
      await loadBuildingData();
    } catch (err: any) {
      toastError('Failed to add personnel');
    }
  };

  // Confirm Delete Personnel Record
  const handleConfirmDeletePersonnel = async () => {
    if (!personnelToDelete) return;
    try {
      setIsDeletingPersonnel(true);
      const targetId = personnelToDelete.id;
      const targetName = personnelToDelete.name;

      await personnelService.deletePersonnel(targetId);
      if (buildingId && building) {
        await buildingService.updateBuilding(buildingId, {
          currentOccupancy: Math.max(0, personnelList.length - 1),
        });
      }
      setPersonnelList((prev) => prev.filter((p) => p.id !== targetId));
      setPersonnelToDelete(null);
      success(isRTL ? `تم حذف الموظف "${targetName}" بنجاح` : `Personnel "${targetName}" deleted successfully`);
      await loadBuildingData({ silent: true });
    } catch {
      toastError('Failed to delete personnel');
    } finally {
      setIsDeletingPersonnel(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!building) {
    return (
      <div className="p-8 text-center bg-white border border-neutral-200 rounded-lg">
        <p className="text-sm text-neutral-500">Building not found.</p>
        <Link to="/app/camp" className="mt-3 inline-block text-xs text-orange-600 font-semibold">
          &larr; Back to My Camp
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            to="/app/camp"
            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{isRTL ? 'العودة للمباني' : 'backToBuildings'}</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                {building.name} - Rooms
              </h1>
              <Badge status={building.status} size="sm" />
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Building Code: <strong className="text-neutral-800 font-mono">{building.buildingNumber}</strong> &bull; {building.buildingType} &bull; {rooms.length} Rooms
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Excel Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* View Mode Tabs */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setViewMode('rooms')}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
                viewMode === 'rooms'
                  ? 'bg-white text-neutral-900 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {isRTL ? 'عرض الغرف (Rooms)' : 'Rooms Cards'}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('directory')}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition ${
                viewMode === 'directory'
                  ? 'bg-white text-neutral-900 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {isRTL ? 'دليل الموظفين وإكسل' : 'Personnel & Excel'}
            </button>
          </div>

          {viewMode === 'directory' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                {isRTL ? 'تحميل نموذج' : 'Template'}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                {isRTL ? 'استيراد' : 'Import Excel'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main View: Rooms Cards (Default) vs Personnel Directory */}
      {viewMode === 'rooms' ? (
        <BuildingRoomsView
          building={building}
          rooms={rooms}
          personnelList={personnelList}
          onDataChanged={() => loadBuildingData({ silent: true })}
        />
      ) : (
        <div className="space-y-5">

      {/* Building Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border-neutral-200">
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
            {isRTL ? 'إجمالي السعة' : 'Total Capacity'}
          </span>
          <div className="text-xl font-bold text-neutral-900 font-mono mt-0.5">
            {building.capacity} <span className="text-xs text-neutral-500 font-normal">Beds</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
            {isRTL ? 'الموظفين المقيمين' : 'Current Residents'}
          </span>
          <div className="text-xl font-bold text-neutral-900 font-mono mt-0.5">
            {personnelList.length} <span className="text-xs text-neutral-500 font-normal">Persons</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
            {isRTL ? 'الطوابق والغرف' : 'Floors & Rooms'}
          </span>
          <div className="text-xl font-bold text-neutral-900 font-mono mt-0.5">
            {building.floors} <span className="text-xs text-neutral-500 font-normal">F / {building.totalRooms} R</span>
          </div>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
            {isRTL ? 'الأبعاد والمساحة' : 'Dimensions'}
          </span>
          <div className="text-xl font-bold text-neutral-900 font-mono mt-0.5">
            {building.lengthM}m &times; {building.widthM}m
          </div>
        </Card>
      </div>

      {/* Section 29: Controlled Personnel Breakdown by Job Title */}
      <Card className="bg-white border-neutral-200">
        <CardHeader
          title={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                {isRTL ? 'توزيع القوى العاملة حسب المسمى الوظيفي المعتمد' : 'Controlled Workforce Distribution'}
              </span>
              <span className="text-xs font-mono font-semibold text-orange-600">
                {personnelList.length} Total Workforce
              </span>
            </div>
          }
          subtitle={
            isRTL
              ? 'يتم حساب الإحصائيات بدقة استناداً إلى المعرفات الرسمية الموحدة (Normalized Job Title IDs)'
              : 'Normalized calculations based on stable internal Job Title IDs (zero duplicate categories)'
          }
        />
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {officialJobTitles.map((title) => {
              const count = jobTitleBreakdown[title.id] || 0;
              const isSelected = selectedJobTitle === title.id;
              return (
                <button
                  key={title.id}
                  type="button"
                  onClick={() => setSelectedJobTitle(isSelected ? 'All' : title.id)}
                  className={`p-2.5 rounded-lg border text-center transition ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50/80 shadow-2xs'
                      : 'border-neutral-200 bg-neutral-50/50 hover:bg-neutral-100/70'
                  }`}
                >
                  <span className="text-[10px] text-neutral-500 font-medium block truncate">
                    {language === 'ar' ? title.labelAr : title.labelEn}
                  </span>
                  <span className="text-base font-bold text-neutral-900 font-mono mt-0.5 block">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 28: Excel Import Preview Card (If a file was just parsed) */}
      {parseResult && (
        <Card className="border-orange-300 bg-orange-50/20">
          <CardHeader
            title={
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-neutral-900">
                  {isRTL ? 'معاينة استيراد ملف الإكسل' : 'Excel Import Preview'} &bull; {parseResult.fileName}
                </span>
              </div>
            }
            subtitle={
              <span>
                Total Rows: <strong className="text-neutral-900 font-mono">{parseResult.totalRows}</strong> | Valid: <strong className="text-emerald-700 font-mono">{parseResult.validRows}</strong> | Needs Mapping: <strong className="text-amber-700 font-mono">{parseResult.needsMappingRows}</strong> | Errors: <strong className="text-rose-700 font-mono">{parseResult.errorRows}</strong>
              </span>
            }
            action={
              <div className="flex items-center gap-2">
                {parseResult.unmappedTitles.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                    onClick={() => setIsMappingModalOpen(true)}
                  >
                    Fix Job Titles ({parseResult.unmappedTitles.length})
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-neutral-500"
                  onClick={() => setParseResult(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-7 text-xs"
                  isLoading={isImporting}
                  disabled={parseResult.validRows === 0}
                  onClick={handleExecuteImport}
                >
                  Import {parseResult.validRows} Valid Records
                </Button>
              </div>
            }
          />
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-64 border-t border-neutral-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-100 text-neutral-600 uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2 px-3">Row</th>
                    <th className="py-2 px-3">ID Number</th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3">Job Title (Uploaded)</th>
                    <th className="py-2 px-3">Normalized Position</th>
                    <th className="py-2 px-3">Iqama</th>
                    <th className="py-2 px-3">Room</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {parseResult.rows.map((r) => (
                    <tr key={r.rowNumber} className="hover:bg-neutral-50">
                      <td className="py-1.5 px-3 font-mono text-neutral-500">{r.rowNumber}</td>
                      <td className="py-1.5 px-3 font-mono font-medium text-neutral-900">{r.idNumber || '-'}</td>
                      <td className="py-1.5 px-3 font-medium text-neutral-900">{r.name || '-'}</td>
                      <td className="py-1.5 px-3 text-neutral-700 font-mono text-[11px]">{r.rawJobTitle || '-'}</td>
                      <td className="py-1.5 px-3">
                        {r.jobTitleId ? (
                          <span className="font-semibold text-neutral-900 font-mono text-[11px] bg-neutral-100 px-1.5 py-0.5 rounded">
                            {r.jobTitleId}
                          </span>
                        ) : (
                          <span className="text-amber-600 italic text-[11px]">Unmapped</span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 font-mono text-neutral-600">{r.iqamaNumber || '-'}</td>
                      <td className="py-1.5 px-3 font-mono text-neutral-600">{r.roomNumber || '-'}</td>
                      <td className="py-1.5 px-3 text-center">
                        {r.status === 'Valid' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Valid
                          </span>
                        )}
                        {r.status === 'Needs Mapping' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Needs Mapping
                          </span>
                        )}
                        {r.status === 'Error' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200" title={r.errorMessage}>
                            Error
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 30: Personnel Table */}
      <Card className="bg-white border-neutral-200">
        <CardHeader
          title={
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <span>{isRTL ? 'قائمة موظفي المبنى' : 'Building Personnel Directory'}</span>
            </div>
          }
          subtitle={`Displaying ${filteredPersonnel.length} of ${personnelList.length} registered personnel`}
          action={
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddManualOpen(true)}
            >
              {isRTL ? 'إضافة موظف يدوياً' : '+ Add Employee'}
            </Button>
          }
        />

        {/* Filter & Search Bar */}
        <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, Iqama, room..."
              className="w-full h-8 ps-8 pe-3 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-neutral-500 font-medium">Position:</span>
              <select
                value={selectedJobTitle}
                onChange={(e) => setSelectedJobTitle(e.target.value)}
                className="h-8 px-2 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="All">All Positions (الكل)</option>
                {officialJobTitles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelEn} ({t.labelAr})
                  </option>
                ))}
              </select>
            </div>

            {roomOptions.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-neutral-500 font-medium">Room:</span>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="h-8 px-2 bg-white border border-neutral-200 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="All">All Rooms</option>
                  {roomOptions.map((rm) => (
                    <option key={rm} value={rm}>
                      {rm}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Table Content */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">ID #</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Controlled Position</th>
                  <th className="py-2.5 px-3">Iqama Number</th>
                  <th className="py-2.5 px-3 text-center">Room #</th>
                  <th className="py-2.5 px-3">Registered Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400">
                      No personnel found in this building matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPersonnel.map((p) => {
                    const titleDef = jobTitleService.getJobTitleById(p.jobTitleId);
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50 transition">
                        <td className="py-2.5 px-3 font-mono font-medium text-neutral-900">
                          {p.idNumber}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-neutral-900">{p.name}</td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200 font-mono">
                            {titleDef ? `${titleDef.labelEn} (${titleDef.labelAr})` : p.jobTitleId}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-neutral-600">{p.iqamaNumber}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-neutral-900">
                          {p.roomNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-neutral-400 text-[11px]">
                          {p.createdAt}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPersonnelToDelete(p)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

        </div>
      )}

      {/* Job Title Mapping Modal */}
      {isMappingModalOpen && parseResult && parseResult.unmappedTitles.length > 0 && (
        <JobTitleMappingModal
          unmappedTitles={parseResult.unmappedTitles}
          onApplyMapping={handleApplyMapping}
          onCancel={() => setIsMappingModalOpen(false)}
        />
      )}

      {/* Manual Add Personnel Modal */}
      {isAddManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-900/40 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">
                {isRTL ? 'إضافة موظف جديد' : 'Add Employee to Building'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddManualOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddManualPersonnel} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  ID Number *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.idNumber}
                  onChange={(e) => setManualForm({ ...manualForm, idNumber: e.target.value })}
                  placeholder="EMP-3001"
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  placeholder="e.g. Saeed Al-Amri"
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Official Position (Job Title) *
                </label>
                <select
                  value={manualForm.jobTitleId}
                  onChange={(e) => setManualForm({ ...manualForm, jobTitleId: e.target.value as JobTitleId })}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-orange-500"
                >
                  {officialJobTitles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.labelEn} ({t.labelAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Iqama Number *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.iqamaNumber}
                  onChange={(e) => setManualForm({ ...manualForm, iqamaNumber: e.target.value })}
                  placeholder="2498172635"
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Room Number *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.roomNumber}
                  onChange={(e) => setManualForm({ ...manualForm, roomNumber: e.target.value })}
                  placeholder="A-101"
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddManualOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Save Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Personnel Record */}
      {personnelToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {isRTL ? 'حذف الموظف' : 'Delete Employee Record'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {personnelToDelete.idNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPersonnelToDelete(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              {isRTL ? (
                <span>
                  هل أنت متأكد من حذف الموظف <strong className="text-neutral-900">{personnelToDelete.name}</strong> نهائياً من المبنى؟
                </span>
              ) : (
                <span>
                  Are you sure you want to permanently delete employee <strong className="text-neutral-900">{personnelToDelete.name}</strong> from this building?
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPersonnelToDelete(null)}
                disabled={isDeletingPersonnel}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmDeletePersonnel}
                disabled={isDeletingPersonnel}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isDeletingPersonnel ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'حذف الموظف' : 'Delete Record')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
