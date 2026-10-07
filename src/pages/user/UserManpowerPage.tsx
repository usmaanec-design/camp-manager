import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  CheckCircle2,
  Search,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit2,
  DoorOpen,
  X,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  HardHat,
} from 'lucide-react';
import { Building, BuildingPersonnel, JobTitleId } from '../../types';
import { matchBuildingForRoom, parseBuildingAndRoom } from '../../utils/buildingMatcher';
import { personnelService } from '../../services/personnelService';
import { jobTitleService } from '../../services/jobTitleService';
import { excelService } from '../../services/excelService';
import { buildingService } from '../../services/buildingService';
import { roomService } from '../../services/roomService';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { FIXED_NATIONALITIES, getNationalityLabel, getNationalityFlag } from '../../utils/nationality';

export const UserManpowerPage: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [personnelList, setPersonnelList] = useState<BuildingPersonnel[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [jobTitleFilter, setJobTitleFilter] = useState('All');
  const [roomFilter, setRoomFilter] = useState('All');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Excel Upload state with Progress Bar
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<BuildingPersonnel | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<BuildingPersonnel | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form data for Add / Edit
  const [formData, setFormData] = useState<{
    idNumber: string;
    name: string;
    jobTitleId: JobTitleId;
    iqamaNumber: string;
    buildingId: string;
    roomNumber: string;
    nationality: string;
  }>({
    idNumber: '',
    name: '',
    jobTitleId: 'LABOUR',
    iqamaNumber: '',
    buildingId: '',
    roomNumber: '',
    nationality: 'Pakistani',
  });

  // Rooms available for currently selected building in modal
  const availableRoomsForSelectedBuilding = useMemo(() => {
    if (!formData.buildingId) return [];
    return roomService.getStoredRooms().filter((r) => r.buildingId === formData.buildingId);
  }, [formData.buildingId]);

  const officialTitles = jobTitleService.getJobTitles();

  const loadData = async () => {
    try {
      const prjId = user?.projectId;
      const [, bList] = await Promise.all([
        personnelService.getAllPersonnel(prjId),
        buildingService.getBuildings(undefined, prjId),
      ]);
      // Reconcile building assignments in case previous upload had wrong IDs
      await personnelService.reconcileBuildingAssignments(bList);
      const freshPList = await personnelService.getAllPersonnel(prjId);

      setPersonnelList(freshPList);
      setBuildings(bList);
    } catch {
      toastError('Failed to load manpower data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handlePersonnelSync = async () => {
      const pList = await personnelService.getAllPersonnel(user?.projectId);
      setPersonnelList(pList);
    };
    window.addEventListener('camp_personnel_updated', handlePersonnelSync);
    return () => window.removeEventListener('camp_personnel_updated', handlePersonnelSync);
  }, [user?.projectId]);

  // Filtered Workers
  const filteredPersonnel = useMemo(() => {
    return personnelList.filter((p) => {
      const jobStr = typeof p.jobTitleId === 'string' ? p.jobTitleId : 'LABOUR';
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.idNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.iqamaNumber.includes(searchTerm) ||
        (p.roomNumber && p.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        jobStr.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesJob = jobTitleFilter === 'All' || jobStr === jobTitleFilter;
      const matchesRoom =
        roomFilter === 'All' ||
        (roomFilter === 'Assigned' && Boolean(p.roomNumber?.trim())) ||
        (roomFilter === 'Unassigned' && !p.roomNumber?.trim()) ||
        p.roomNumber === roomFilter;

      return matchesSearch && matchesJob && matchesRoom;
    });
  }, [personnelList, searchTerm, jobTitleFilter, roomFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = personnelList.length;
    const active = total; // All registered workers are active workforce
    const assigned = personnelList.filter((p) => Boolean(p.roomNumber?.trim())).length;
    const unassigned = total - assigned;

    return { total, active, assigned, unassigned };
  }, [personnelList]);

  // Handle Download Excel Template (Matching Image 2 format)
  const handleDownloadTemplate = () => {
    excelService.downloadPersonnelTemplate();
    success(isRTL ? 'تم تنزيل نموذج إكسل القوى العاملة الرسمي' : 'Official Manpower Excel Template downloaded');
  };

  // Trigger File Input
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle Excel File Selected with Animated Progress Bar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(15);

    try {
      // Step 1: parse file
      setUploadProgress(35);
      const parseResult = await excelService.parseAndValidatePersonnelExcel(file);
      setUploadProgress(50);

      if (parseResult.rows.length === 0) {
        toastError('The Excel sheet contains no personnel records');
        setIsUploading(false);
        return;
      }

      // Step 2: Fetch latest buildings for project
      const prjId = user?.projectId || '';
      const allCampBuildings = await buildingService.getBuildings(undefined, prjId);
      const currentBuildings = [...allCampBuildings];

      // Auto-create any missing buildings referenced in the sheet (e.g. "E-30" if only A, B, C, D exist)
      for (const row of parseResult.rows) {
        if (!row.roomNumber?.trim()) continue;
        const { buildingPrefix } = parseBuildingAndRoom(row.roomNumber);
        if (!buildingPrefix) continue;

        let matched = matchBuildingForRoom(row.roomNumber, currentBuildings);
        if (!matched && buildingPrefix.length <= 8) {
          const newBld = await buildingService.createBuilding({
            campId: currentBuildings[0]?.campId || '',
            projectId: prjId || currentBuildings[0]?.projectId || '',
            userId: user?.id || currentBuildings[0]?.userId || '',
            name: buildingPrefix.toUpperCase(),
            buildingNumber: `B-${buildingPrefix.toUpperCase()}`,
            buildingType: 'Accommodation',
            lengthM: 20,
            widthM: 10,
            floors: 1,
            totalRooms: 50,
            capacity: 200,
            currentOccupancy: 0,
            roomRanges: [{ floor: 1, startRoom: 1, endRoom: 50, roomCount: 50 }],
            status: 'Operational',
            facilities: ['AC', 'Lighting', 'Sockets'],
          });
          await roomService.createRoomsForNewBuilding(newBld);
          currentBuildings.push(newBld);
        }
      }

      setUploadProgress(70);

      const defaultBuildingId = currentBuildings[0]?.id || '';
      const defaultCampId = currentBuildings[0]?.campId || '';
      const defaultProjectId = prjId;
      const defaultUserId = user?.id || '';

      const newRecords = parseResult.rows.map((row) => {
        // Normalize job title safely
        let normalizedJob: JobTitleId = 'LABOUR';
        if (row.jobTitleId && typeof row.jobTitleId === 'string') {
          normalizedJob = row.jobTitleId as JobTitleId;
        } else if (row.rawJobTitle) {
          const norm = jobTitleService.normalizeJobTitle(row.rawJobTitle);
          if (norm.recognized && norm.jobTitleId) {
            normalizedJob = norm.jobTitleId;
          }
        }

        // Intelligently match building from room number prefix e.g. "A-1" -> Building A, "B-3" -> Building B, "C-24" -> Building C, "D-6" -> Building D
        const matchedBuilding = matchBuildingForRoom(row.roomNumber, currentBuildings);
        const assignedBuildingId = matchedBuilding?.id || defaultBuildingId;
        const assignedCampId = matchedBuilding?.campId || defaultCampId;
        const assignedProjectId = matchedBuilding?.projectId || defaultProjectId;
        const assignedUserId = matchedBuilding?.userId || defaultUserId;

        return {
          buildingId: assignedBuildingId,
          campId: assignedCampId,
          projectId: assignedProjectId,
          userId: assignedUserId,
          idNumber: row.idNumber || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          name: row.name,
          jobTitleId: normalizedJob as JobTitleId,
          iqamaNumber: row.iqamaNumber,
          roomNumber: row.roomNumber,
          nationality: row.nationality || 'Pakistani',
        };
      });

      setUploadProgress(85);
      await personnelService.bulkImportPersonnel(newRecords);

      // Recalculate & update currentOccupancy on all buildings
      const allPersonnel = await personnelService.getAllPersonnel(prjId);
      for (const bld of currentBuildings) {
        const count = allPersonnel.filter((p) => p.buildingId === bld.id).length;
        await buildingService.updateBuilding(bld.id, { currentOccupancy: count });
      }

      // Dispatch global events so camp page and building details update immediately
      window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));
      window.dispatchEvent(new CustomEvent('camp_inventory_updated'));

      setUploadProgress(100);

      // Refresh local page state
      await loadData();

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        success(
          isRTL
            ? `تم رفع وتعيين ${newRecords.length} موظف بنجاح في مبانيهم وغرفهم المحددة!`
            : `Successfully imported and allocated ${newRecords.length} personnel to their respective buildings and rooms!`
        );
      }, 500);
    } catch {
      setIsUploading(false);
      setUploadProgress(0);
      toastError('Failed to parse or upload Excel file');
    }
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredPersonnel.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPersonnel.map((p) => p.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      idNumber: `EMP-${Math.floor(2000 + Math.random() * 8000)}`,
      name: '',
      jobTitleId: 'LABOUR',
      iqamaNumber: '',
      buildingId: buildings[0]?.id || '',
      roomNumber: '',
      nationality: 'Pakistani',
    });
    setIsAddWorkerOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (worker: BuildingPersonnel) => {
    setEditingWorker(worker);
    setFormData({
      idNumber: worker.idNumber,
      name: worker.name,
      jobTitleId: worker.jobTitleId,
      iqamaNumber: worker.iqamaNumber,
      buildingId: worker.buildingId || '',
      roomNumber: worker.roomNumber || '',
      nationality: (worker.nationality as string) || 'Pakistani',
    });
  };

  // Save Add
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.iqamaNumber.trim()) return;

    try {
      let targetBuildingId = formData.buildingId || buildings[0]?.id || '';
      if (formData.roomNumber) {
        const matched = matchBuildingForRoom(formData.roomNumber, buildings);
        if (matched) targetBuildingId = matched.id;
      }
      const targetBuilding = buildings.find((b) => b.id === targetBuildingId);

      await personnelService.addPersonnel({
        buildingId: targetBuildingId,
        campId: targetBuilding?.campId || '',
        projectId: targetBuilding?.projectId || user?.projectId || '',
        userId: targetBuilding?.userId || user?.id || '',
        idNumber: formData.idNumber.trim(),
        name: formData.name.trim(),
        jobTitleId: formData.jobTitleId,
        iqamaNumber: formData.iqamaNumber.trim(),
        roomNumber: formData.roomNumber.trim(),
        nationality: formData.nationality,
      });

      // Update building occupancy
      const allP = await personnelService.getAllPersonnel(user?.projectId);
      const newCount = allP.filter((p) => p.buildingId === targetBuildingId).length;
      await buildingService.updateBuilding(targetBuildingId, { currentOccupancy: newCount });

      window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));

      success(isRTL ? 'تمت إضافة العامل بنجاح' : 'Worker registered successfully');
      setIsAddWorkerOpen(false);
      await loadData();
    } catch {
      toastError('Failed to add worker');
    }
  };

  // Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker || !formData.name.trim()) return;

    try {
      let targetBuildingId = formData.buildingId || '';
      if (formData.roomNumber) {
        const matched = matchBuildingForRoom(formData.roomNumber, buildings);
        if (matched) targetBuildingId = matched.id;
      }

      await personnelService.updatePersonnel(editingWorker.id, {
        idNumber: formData.idNumber.trim(),
        name: formData.name.trim(),
        jobTitleId: formData.jobTitleId,
        iqamaNumber: formData.iqamaNumber.trim(),
        buildingId: targetBuildingId,
        roomNumber: targetBuildingId ? formData.roomNumber.trim() : '',
        nationality: formData.nationality,
      });

      // Update occupancy on affected buildings
      const allP = await personnelService.getAllPersonnel(user?.projectId);
      for (const bld of buildings) {
        const count = allP.filter((p) => p.buildingId === bld.id).length;
        await buildingService.updateBuilding(bld.id, { currentOccupancy: count });
      }

      window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));
      success(isRTL ? 'تم تحديث بيانات العامل بنجاح' : 'Worker updated successfully');
      setEditingWorker(null);
      await loadData();
    } catch {
      toastError('Failed to update worker');
    }
  };

  // Delete worker trigger
  const handleDeleteWorker = (worker: BuildingPersonnel) => {
    setWorkerToDelete(worker);
  };

  // Confirm Single Delete
  const handleConfirmSingleDelete = async () => {
    if (!workerToDelete) return;

    try {
      setIsDeleting(true);
      const targetId = workerToDelete.id;
      const targetName = workerToDelete.name;

      await personnelService.deletePersonnel(targetId);

      // Immediately remove from React state so UI updates instantly
      setPersonnelList((prev) => prev.filter((p) => p.id !== targetId));
      setSelectedIds((prev) => prev.filter((id) => id !== targetId));
      setWorkerToDelete(null);

      // Update occupancy on all buildings
      const allP = await personnelService.getAllPersonnel(user?.projectId);
      for (const bld of buildings) {
        const count = allP.filter((p) => p.buildingId === bld.id).length;
        await buildingService.updateBuilding(bld.id, { currentOccupancy: count });
      }

      window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));
      success(isRTL ? `تم حذف العامل "${targetName}" بنجاح` : `Worker "${targetName}" deleted successfully`);
      await loadData();
    } catch {
      toastError('Failed to delete worker');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk Delete workers trigger
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  // Confirm Bulk Delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      setIsDeleting(true);
      const count = selectedIds.length;
      const idsToDelete = [...selectedIds];

      await personnelService.bulkDeletePersonnel(idsToDelete);

      // Immediately update local React state so UI reflects the deletion instantly!
      setPersonnelList((prev) => prev.filter((p) => !idsToDelete.includes(p.id)));
      setSelectedIds([]);
      setIsBulkDeleteModalOpen(false);

      // Update occupancy on all buildings
      const allP = await personnelService.getAllPersonnel(user?.projectId);
      for (const bld of buildings) {
        const occ = allP.filter((p) => p.buildingId === bld.id).length;
        await buildingService.updateBuilding(bld.id, { currentOccupancy: occ });
      }

      window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));
      success(
        isRTL
          ? `تم حذف ${count} عامل بنجاح`
          : `Successfully deleted ${count} worker(s)`
      );
      await loadData();
    } catch {
      toastError('Failed to delete selected workers');
    } finally {
      setIsDeleting(false);
    }
  };

  // Distinct rooms for filter
  const distinctRooms = useMemo(() => {
    const set = new Set(personnelList.map((p) => p.roomNumber?.trim()).filter(Boolean));
    return Array.from(set).sort();
  }, [personnelList]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-28 bg-white border border-neutral-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="h-24 bg-white border border-neutral-200 rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-neutral-200 rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-neutral-200 rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-neutral-200 rounded-xl animate-pulse" />
        </div>
        <div className="h-80 bg-white border border-neutral-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                  {isRTL ? 'القوى العاملة (Manpower)' : 'Manpower'}
                </h1>
                <p className="text-xs text-neutral-500">
                  {isRTL
                    ? 'سجل العمال والموظفين مع تعيين الغرف التلقائي واستيراد الإكسل الرسمي'
                    : 'manageWorkforceDesc - Workforce directory, Iqama verification, and automatic room allocation.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Download Template Button */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-3.5 h-3.5" />}
              onClick={handleDownloadTemplate}
            >
              {isRTL ? 'تنزيل النموذج' : 'Download Template'}
            </Button>

            {/* Import Excel Button */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Upload className="w-3.5 h-3.5 text-orange-600" />}
              onClick={handleTriggerUpload}
              disabled={isUploading}
            >
              {isRTL ? 'استيراد إكسل' : 'Import Excel'}
            </Button>

            {/* Bulk Delete Button when items are selected */}
            {selectedIds.length > 0 && (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleBulkDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isRTL ? `حذف المحدد (${selectedIds.length})` : `Delete Selected (${selectedIds.length})`}
              </Button>
            )}

            {/* Add Worker Button */}
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenAdd}
            >
              {isRTL ? '+ إضافة عامل' : '+ Add Worker'}
            </Button>
          </div>
        </div>

        {/* Upload Loading Progress Bar (As requested by user: "LODING BAR CHLY GI") */}
        {isUploading && (
          <div className="mt-4 p-3 rounded-lg bg-orange-50/70 border border-orange-200 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs font-semibold text-orange-900">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-orange-600 animate-bounce" />
                {isRTL ? 'جاري رفع ومعالجة ملف الإكسل وتعيين الغرف...' : 'Uploading Excel & allocating room assignments...'}
              </span>
              <span className="font-mono">{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* METRIC CARDS (Exact match to Image 3 layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Workers */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              {isRTL ? 'إجمالي العمال' : 'totalWorkers'}
            </span>
            <span className="text-xl font-black text-neutral-900 font-mono">
              {stats.total.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 2: Active */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              {isRTL ? 'النشطين' : 'Active'}
            </span>
            <span className="text-xl font-black text-neutral-900 font-mono">
              {stats.active.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 3: Assigned to Rooms */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              {isRTL ? 'معينين بغرف' : 'Assigned to Rooms'}
            </span>
            <span className="text-xl font-black text-neutral-900 font-mono">
              {stats.assigned.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 4: Unassigned */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-11 h-11 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
              {isRTL ? 'غير معينين' : 'Unassigned'}
            </span>
            <span className="text-xl font-black text-neutral-900 font-mono">
              {stats.unassigned.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR (Matching Image 3) */}
      <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input: searchWorkers */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRTL ? 'بحث في العمال (الاسم، الهوية، الإقامة، الغرفة)...' : 'searchWorkers'}
              className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Filter by Job Title */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 h-9">
              <HardHat className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={jobTitleFilter}
                onChange={(e) => setJobTitleFilter(e.target.value)}
                className="bg-transparent text-xs text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="All">{isRTL ? 'كافة المسميات الوظيفية' : 'All Job Titles'}</option>
                {officialTitles.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Room Status */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 h-9">
              <DoorOpen className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={roomFilter}
                onChange={(e) => setRoomFilter(e.target.value)}
                className="bg-transparent text-xs text-neutral-800 focus:outline-none cursor-pointer"
              >
                <option value="All">{isRTL ? 'كافة الغرف' : 'All Rooms'}</option>
                <option value="Assigned">{isRTL ? 'معينين بغرفة' : 'Assigned'}</option>
                <option value="Unassigned">{isRTL ? 'غير معينين' : 'Unassigned'}</option>
                {distinctRooms.map((rm) => (
                  <option key={rm} value={rm}>
                    {rm}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* MANPOWER TABLE (Exact column structure matching Image 3) */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-neutral-900">
              {isRTL ? 'قائمة القوى العاملة' : 'Workforce Roster'}
            </span>
            <span className="text-[11px] font-mono text-neutral-500 bg-neutral-200/70 px-2 py-0.5 rounded-full">
              {filteredPersonnel.length} {isRTL ? 'عامل' : 'Workers'}
            </span>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 ms-2 animate-in fade-in">
                <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  {isRTL ? `${selectedIds.length} محدد` : `${selectedIds.length} selected`}
                </span>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                  title="Bulk Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isRTL ? `حذف المحدد (${selectedIds.length})` : `Bulk Delete (${selectedIds.length})`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[11px] text-neutral-500 hover:text-neutral-700 underline cursor-pointer"
                >
                  {isRTL ? 'إلغاء التحديد' : 'Deselect All'}
                </button>
              </div>
            )}
          </div>
          <span className="text-[11px] text-neutral-500">
            {isRTL ? 'الغرف المعينة تظهر تلقائياً في بطاقات الغرف' : 'Assigned rooms automatically sync to room cards'}
          </span>
        </div>

        {filteredPersonnel.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-neutral-300 stroke-[1.5]" />
            <p className="text-xs font-medium">
              {isRTL ? 'لا توجد سجلات عمالة مطابقة' : 'No personnel match your search criteria'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-neutral-50/90 text-neutral-600 font-semibold border-b border-neutral-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredPersonnel.length > 0 &&
                        selectedIds.length === filteredPersonnel.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-4 text-start">{isRTL ? 'الاسم / الرقم الوظيفي' : 'Name / ID'}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'المسمى الوظيفي' : 'Job Title'}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'رقم الإقامة' : 'Iqama'}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'الجنسية' : 'Nationality'}</th>
                  <th className="py-2.5 px-3 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'الغرفة' : 'Room'}</th>
                  <th className="py-2.5 px-4 text-end">{isRTL ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredPersonnel.map((person) => {
                  const isSelected = selectedIds.includes(person.id);
                  const safeJobId = typeof person.jobTitleId === 'string' ? person.jobTitleId : 'LABOUR';
                  const titleDef = jobTitleService.getJobTitleById(safeJobId);
                  const displayJob = titleDef ? titleDef.labelEn.toUpperCase() : safeJobId;

                  return (
                    <tr
                      key={person.id}
                      className={`hover:bg-neutral-50/70 transition ${isSelected ? 'bg-orange-50/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(person.id)}
                          className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </td>

                      {/* Name / ID (Matching Image 3 layout) */}
                      <td className="py-2.5 px-4">
                        <div>
                          <span className="font-bold text-neutral-900 block truncate">
                            {person.name}
                          </span>
                          <span className="text-[11px] font-mono text-neutral-400 block">
                            {person.idNumber}
                          </span>
                        </div>
                      </td>

                      {/* Job Title */}
                      <td className="py-2.5 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono uppercase bg-neutral-100 text-neutral-800 border border-neutral-200/80">
                          {displayJob}
                        </span>
                      </td>

                      {/* Iqama */}
                      <td className="py-2.5 px-3 font-mono text-neutral-600">
                        {person.iqamaNumber}
                      </td>

                      {/* Nationality */}
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-[11px] font-semibold border border-neutral-200/70">
                          <span>{getNationalityFlag(person.nationality)}</span>
                          <span>{getNationalityLabel(person.nationality, isRTL)}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {person.buildingId && person.roomNumber?.trim() ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            {isRTL ? 'غير معين' : 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Room */}
                      <td className="py-2.5 px-3">
                        {person.roomNumber?.trim() ? (
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-neutral-900">
                            <DoorOpen className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span>{person.roomNumber}</span>
                            {person.buildingId && (
                              <span className="text-[10px] text-neutral-400 font-sans font-normal">
                                ({buildings.find((b) => b.id === person.buildingId)?.name || 'Building'})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            {isRTL ? 'غير معين' : 'Unassigned'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(person)}
                            className="p-1 rounded text-neutral-500 hover:text-orange-600 hover:bg-orange-50 transition"
                            title="Edit Worker"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteWorker(person)}
                            className="p-1 rounded text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete Worker"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD WORKER */}
      {isAddWorkerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {isRTL ? 'إضافة عامل جديد' : 'Add New Worker'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWorkerOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'اسم الموظف' : 'Full Name'} <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Saeed Al-Ghamdi"
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'الرقم الوظيفي' : 'Employee ID'}
                  </label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'رقم الإقامة' : 'Iqama Number'} <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.iqamaNumber}
                    onChange={(e) => setFormData({ ...formData, iqamaNumber: e.target.value })}
                    placeholder="2xxxxxxxx"
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'المسمى الوظيفي (رسمي)' : 'Official Job Title'} <span className="text-orange-600">*</span>
                </label>
                <select
                  value={formData.jobTitleId}
                  onChange={(e) => setFormData({ ...formData, jobTitleId: e.target.value as JobTitleId })}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {officialTitles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.labelEn} ({t.labelAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'الجنسية (ثابتة)' : 'Nationality (Fixed)'}
                </label>
                <select
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {FIXED_NATIONALITIES.map((n: any) => (
                    <option key={n.id} value={n.id}>
                      {n.flag} {isRTL ? n.labelAr : n.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'المبنى' : 'Building'}
                  </label>
                  <select
                    value={formData.buildingId}
                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value, roomNumber: '' })}
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">{isRTL ? '-- غير معين لمبنى (Unassigned) --' : '-- Unassigned to Building --'}</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'تعيين الغرفة' : 'Room Number'}
                  </label>
                  {availableRoomsForSelectedBuilding.length > 0 ? (
                    <select
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                    >
                      <option value="">{isRTL ? '-- غير معين لغرفة --' : '-- Unassigned to Room --'}</option>
                      {availableRoomsForSelectedBuilding.map((r) => (
                        <option key={r.id} value={r.roomNumber}>
                          {r.roomNumber} (Floor {r.floor})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      placeholder={formData.buildingId ? 'e.g. Room 1' : (isRTL ? 'غير معين' : 'Unassigned')}
                      className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                    />
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddWorkerOpen(false)}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {isRTL ? 'تسجيل العامل' : 'Register Worker'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT WORKER */}
      {editingWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {isRTL ? 'تعديل بيانات العامل' : 'Edit Worker Information'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingWorker(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'اسم الموظف' : 'Full Name'} <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'الرقم الوظيفي' : 'Employee ID'}
                  </label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'رقم الإقامة' : 'Iqama Number'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.iqamaNumber}
                    onChange={(e) => setFormData({ ...formData, iqamaNumber: e.target.value })}
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'المسمى الوظيفي' : 'Official Job Title'}
                </label>
                <select
                  value={formData.jobTitleId}
                  onChange={(e) => setFormData({ ...formData, jobTitleId: e.target.value as JobTitleId })}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {officialTitles.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.labelEn} ({t.labelAr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'الجنسية (ثابتة)' : 'Nationality (Fixed)'}
                </label>
                <select
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {FIXED_NATIONALITIES.map((n: any) => (
                    <option key={n.id} value={n.id}>
                      {n.flag} {isRTL ? n.labelAr : n.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'المبنى' : 'Building'}
                  </label>
                  <select
                    value={formData.buildingId}
                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value, roomNumber: '' })}
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">{isRTL ? '-- غير معين لمبنى (Unassigned) --' : '-- Unassigned to Building --'}</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'تعيين الغرفة' : 'Room Number'}
                  </label>
                  {availableRoomsForSelectedBuilding.length > 0 ? (
                    <select
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                    >
                      <option value="">{isRTL ? '-- غير معين لغرفة --' : '-- Unassigned to Room --'}</option>
                      {availableRoomsForSelectedBuilding.map((r) => (
                        <option key={r.id} value={r.roomNumber}>
                          {r.roomNumber} (Floor {r.floor})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      placeholder={formData.buildingId ? 'e.g. Room 1' : (isRTL ? 'غير معين' : 'Unassigned')}
                      className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                    />
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingWorker(null)}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {isRTL ? 'حفظ التعديلات' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM SINGLE WORKER DELETE */}
      {workerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {isRTL ? 'تأكيد حذف العامل' : 'Delete Worker'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {workerToDelete.idNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWorkerToDelete(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-600">
              {isRTL ? (
                <span>
                  هل أنت متأكد من حذف العامل <strong className="text-neutral-900">{workerToDelete.name}</strong> نهائياً؟ سيتم إلغاء تعيينه من الغرفة.
                </span>
              ) : (
                <span>
                  Are you sure you want to permanently delete worker <strong className="text-neutral-900">{workerToDelete.name}</strong>? Their room assignment will be removed.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWorkerToDelete(null)}
                disabled={isDeleting}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmSingleDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isDeleting ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'حذف العامل' : 'Delete Worker')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM BULK DELETE */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {isRTL ? `حذف المحدد (${selectedIds.length})` : `Delete Selected (${selectedIds.length})`}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {isRTL ? `${selectedIds.length} عمال محددين` : `${selectedIds.length} worker(s) selected`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
              {isRTL ? (
                <p>
                  هل أنت متأكد من حذف <strong>{selectedIds.length}</strong> من العمال المحددين نهائياً؟ سيتم حذفهم من النظام وإلغاء تعيينهم من غرف المعسكر.
                </p>
              ) : (
                <p>
                  Are you sure you want to permanently delete <strong>{selectedIds.length}</strong> selected worker(s)? They will be removed from the system and all room assignments.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmBulkDelete}
                disabled={isDeleting}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isDeleting ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? `حذف ${selectedIds.length} عمال` : `Delete ${selectedIds.length} Workers`)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
