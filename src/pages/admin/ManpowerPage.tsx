import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Users, Building as BuildingIcon } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { personnelService } from '../../services/personnelService';
import { buildingService } from '../../services/buildingService';
import { projectService } from '../../services/projectService';
import { BuildingPersonnel, Project, Building, FIXED_NATIONALITIES, Nationality } from '../../types';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/modals/Modal';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { getNationalityDef } from '../../utils/nationality';

interface UnifiedPersonnelRow {
  id: string;
  name: string;
  idNumber: string;
  iqamaNumber: string;
  nationality: string;
  projectId: string;
  projectName: string;
  buildingId: string;
  buildingName: string;
  roomNumber: string;
  jobTitle: string;
  status: 'Active' | 'On Leave' | 'Vacated';
}

export const ManpowerPage: React.FC = () => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [personnelList, setPersonnelList] = useState<BuildingPersonnel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active project filter
  const [selectedProjectId, setSelectedProjectId] = useState<string>('All');
  const [nationalityFilter, setNationalityFilter] = useState<string>('All');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPersonnel, setSelectedPersonnel] = useState<UnifiedPersonnelRow | null>(null);

  // Add form data
  const [formData, setFormData] = useState({
    name: '',
    idNumber: '',
    iqamaNumber: '',
    nationality: 'Pakistani' as Nationality,
    jobTitle: 'LABOUR',
    projectId: '',
    buildingId: '',
    roomNumber: 'Room 1',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pData, projData, bldData] = await Promise.all([
        personnelService.getAllPersonnel(),
        projectService.getProjects(),
        buildingService.getBuildings(),
      ]);
      setPersonnelList(pData || []);
      setProjects(projData || []);
      setBuildings(bldData || []);

      if (projData.length > 0 && !formData.projectId) {
        setFormData((prev) => ({
          ...prev,
          projectId: projData[0].id,
          buildingId: bldData.find((b) => b.projectId === projData[0].id)?.id || bldData[0]?.id || '',
        }));
      }
    } catch {
      toastError(isRTL ? 'فشل تحميل بيانات القوى العاملة' : 'Failed to load manpower records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute Project Stats (Total Manpower & Total Living Rooms)
  const projectStats = useMemo(() => {
    const map = new Map<string, { totalManpower: number; totalLivingRooms: number }>();

    // Initialize with 0 for all projects
    projects.forEach((p) => {
      map.set(p.id, { totalManpower: 0, totalLivingRooms: 0 });
    });

    // Sum manpower per project
    personnelList.forEach((person) => {
      if (person.projectId && map.has(person.projectId)) {
        const cur = map.get(person.projectId)!;
        cur.totalManpower += 1;
      }
    });

    // Sum living rooms per project
    buildings.forEach((b) => {
      if (b.projectId && map.has(b.projectId)) {
        const cur = map.get(b.projectId)!;
        cur.totalLivingRooms += b.totalRooms || 0;
      }
    });

    const totalAllManpower = personnelList.length;
    const totalAllLivingRooms = buildings.reduce((acc, b) => acc + (b.totalRooms || 0), 0);

    return {
      byProject: map,
      totalAllManpower,
      totalAllLivingRooms,
    };
  }, [projects, personnelList, buildings]);

  // Unified table data
  const tableData: UnifiedPersonnelRow[] = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const buildingMap = new Map(buildings.map((b) => [b.id, b.name]));

    let rows: UnifiedPersonnelRow[] = personnelList.map((p) => {
      const projName = projectMap.get(p.projectId || '') || p.projectId || 'General Project';
      const bldName = buildingMap.get(p.buildingId || '') || p.buildingId || 'Block 1';
      return {
        id: p.id,
        name: p.name || 'Unnamed',
        idNumber: p.idNumber || p.id,
        iqamaNumber: p.iqamaNumber || '—',
        nationality: p.nationality || 'Pakistani',
        projectId: p.projectId || '',
        projectName: projName,
        buildingId: p.buildingId || '',
        buildingName: bldName,
        roomNumber: p.roomNumber || 'Room 1',
        jobTitle: p.jobTitleId || 'STAFF',
        status: 'Active',
      };
    });

    // Apply Project Filter
    if (selectedProjectId !== 'All') {
      rows = rows.filter((r) => r.projectId === selectedProjectId);
    }

    // Apply Nationality Filter
    if (nationalityFilter !== 'All') {
      rows = rows.filter((r) => {
        const def = getNationalityDef(r.nationality);
        return def.id === nationalityFilter;
      });
    }

    return rows;
  }, [personnelList, projects, buildings, selectedProjectId, nationalityFilter]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      idNumber: `EMP-${Math.floor(3000 + Math.random() * 2000)}`,
      iqamaNumber: `25${Math.floor(10000000 + Math.random() * 90000000)}`,
      nationality: 'Pakistani',
      jobTitle: 'LABOUR',
      projectId: selectedProjectId !== 'All' ? selectedProjectId : projects[0]?.id || '',
      buildingId: buildings[0]?.id || '',
      roomNumber: 'Room 1',
    });
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await personnelService.addPersonnel({
        name: formData.name,
        idNumber: formData.idNumber,
        iqamaNumber: formData.iqamaNumber,
        nationality: formData.nationality,
        jobTitleId: formData.jobTitle as any,
        projectId: formData.projectId,
        buildingId: formData.buildingId,
        campId: 'cmp-01',
        userId: 'admin',
        roomNumber: formData.roomNumber,
      });

      success(isRTL ? 'تم تسجيل الموظف بنجاح' : 'Personnel registered successfully');
      setIsCreateOpen(false);
      loadData();
    } catch {
      toastError(isRTL ? 'فشل إضافة الموظف' : 'Failed to register personnel');
    }
  };

  const handleDelete = (row: UnifiedPersonnelRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPersonnel(row);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedPersonnel) return;
    try {
      await personnelService.deletePersonnel(selectedPersonnel.id);
      success(isRTL ? 'تم حذف سجل الموظف' : `Personnel ${selectedPersonnel.name} removed`);
      setIsDeleteOpen(false);
      loadData();
    } catch {
      toastError(isRTL ? 'فشل حذف الموظف' : 'Failed to delete personnel');
    }
  };

  const columns: Column<UnifiedPersonnelRow>[] = [
    {
      key: 'name',
      header: isRTL ? 'اسم الموظف والرمز' : 'Employee Name & ID',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-neutral-900 block text-xs">{row.name}</span>
          <span className="text-[10px] text-neutral-400 font-mono block">{row.idNumber}</span>
        </div>
      ),
    },
    {
      key: 'iqamaNumber',
      header: isRTL ? 'رقم الإقامة' : 'Iqama Number',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
          {row.iqamaNumber}
        </span>
      ),
    },
    {
      key: 'nationality',
      header: isRTL ? 'الجنسية' : 'Nationality',
      sortable: true,
      render: (row) => {
        const def = getNationalityDef(row.nationality);
        return (
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-800">
            <span className="text-sm">{def.flag}</span>
            <span className="font-medium text-[11px]">{isRTL ? def.labelAr : def.labelEn}</span>
          </div>
        );
      },
    },
    {
      key: 'projectName',
      header: isRTL ? 'اسم المشروع' : 'Project Name',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
          <BuildingIcon className="w-3 h-3 text-orange-500" />
          {row.projectName}
        </span>
      ),
    },
    {
      key: 'buildingName',
      header: isRTL ? 'المبنى والغرفة' : 'Building & Room',
      sortable: true,
      render: (row) => (
        <div className="text-xs">
          <span className="text-neutral-800 font-medium block">{row.buildingName}</span>
          <span className="text-[10px] text-neutral-500 font-mono block">{row.roomNumber}</span>
        </div>
      ),
    },
    {
      key: 'jobTitle',
      header: isRTL ? 'المسمى الوظيفي' : 'Job Title',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-neutral-700 font-medium bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">
          {row.jobTitle}
        </span>
      ),
    },
    {
      key: 'status',
      header: isRTL ? 'الحالة' : 'Status',
      align: 'center',
      sortable: true,
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      header: isRTL ? 'الإجراءات' : 'Actions',
      align: 'right',
      render: (row) => (
        <button
          onClick={(e) => handleDelete(row, e)}
          className="p-1.5 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
          title={isRTL ? 'حذف' : 'Delete'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            {isRTL ? 'سجل القوى العاملة لجميع المشاريع' : 'All Projects Manpower & Personnel'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isRTL
              ? 'القوى العاملة المرفوعة لجميع المشاريع والمخيمات مع بطاقات المشاريع المباشرة'
              : 'Unified manpower uploaded across all camp projects with live occupancy and room allocation'}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenCreate}
        >
          {isRTL ? 'إضافة موظف' : 'Add Personnel'}
        </Button>
      </div>

      {/* Top Small Project Summary Tiles */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 px-0.5">
          <span>{isRTL ? 'ملخص المشاريع والمخيمات' : 'Projects & Camps Summary'}</span>
          <span className="text-[11px] text-neutral-400 font-normal">
            {isRTL ? 'اضغط على بطاقة المشروع للتصفية' : 'Click any card to filter personnel below'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* "All Projects" Tile */}
          <button
            type="button"
            onClick={() => setSelectedProjectId('All')}
            className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              selectedProjectId === 'All'
                ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full mb-1.5">
              <span className="text-xs font-bold text-neutral-900 truncate">
                {isRTL ? 'جميع المشاريع' : 'All Projects'}
              </span>
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-neutral-100">
              <div>
                <span className="text-[10px] text-neutral-400 block">{isRTL ? 'العمالة' : 'Manpower'}</span>
                <span className="font-bold text-neutral-800 text-xs">{projectStats.totalAllManpower}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block">{isRTL ? 'الغرف' : 'Rooms'}</span>
                <span className="font-bold text-neutral-800 text-xs">{projectStats.totalAllLivingRooms}</span>
              </div>
            </div>
          </button>

          {/* Individual Project Tiles */}
          {projects.map((proj) => {
            const isSelected = selectedProjectId === proj.id;
            const stats = projectStats.byProject.get(proj.id) || { totalManpower: 0, totalLivingRooms: 0 };

            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => setSelectedProjectId(proj.id)}
                className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full mb-1.5">
                  <span className="text-xs font-bold text-neutral-900 truncate" title={proj.name}>
                    {proj.name}
                  </span>
                  <Users className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-orange-500' : 'text-neutral-400'}`} />
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] pt-1 border-t border-neutral-100">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">{isRTL ? 'العمالة' : 'Manpower'}</span>
                    <span className="font-bold text-orange-600 text-xs">{stats.totalManpower}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">{isRTL ? 'الغرف' : 'Rooms'}</span>
                    <span className="font-bold text-neutral-700 text-xs">{stats.totalLivingRooms}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Unified Manpower Sheet */}
      <DataTable
        columns={columns}
        data={tableData}
        isLoading={isLoading}
        searchPlaceholder={
          isRTL
            ? 'بحث بالاسم، رقم الإقامة، الرقم الوظيفي، المشروع، الغرفة...'
            : 'Search by employee name, Iqama, badge ID, project, room...'
        }
        filterComponent={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Project Filter */}
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-8 px-2.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium"
            >
              <option value="All">{isRTL ? 'جميع المشاريع' : 'All Projects'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Nationality Filter */}
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value)}
              className="h-8 px-2.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium"
            >
              <option value="All">{isRTL ? 'جميع الجنسيات' : 'All Nationalities'}</option>
              {FIXED_NATIONALITIES.map((nat) => (
                <option key={nat.id} value={nat.id}>
                  {nat.flag} {isRTL ? nat.labelAr : nat.labelEn}
                </option>
              ))}
            </select>

            {/* Record count badge */}
            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded border border-neutral-200">
              {tableData.length} {isRTL ? 'موظف' : 'Records'}
            </span>
          </div>
        }
      />

      {/* Add Personnel Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={isRTL ? 'إضافة موظف جديد' : 'Register New Personnel'}
        subtitle={
          isRTL
            ? 'إضافة بيانات الموظف مع الجنسية ورقم الإقامة والمشروع'
            : 'Add workforce member with nationality, Iqama, and project assignment'
        }
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCreate}>
              {isRTL ? 'حفظ الموظف' : 'Save Record'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCreate} className="space-y-3">
          <Input
            label={isRTL ? 'الاسم الكامل' : 'Full Name'}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Mohammad Khan"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={isRTL ? 'الرقم الوظيفي / الشارة' : 'Employee ID / Badge'}
              required
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
            />
            <Input
              label={isRTL ? 'رقم الإقامة' : 'Iqama Number'}
              required
              value={formData.iqamaNumber}
              onChange={(e) => setFormData({ ...formData, iqamaNumber: e.target.value })}
              placeholder="25XXXXXXXX"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {isRTL ? 'الجنسية (ثابتة)' : 'Nationality (Fixed)'}
              </label>
              <select
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value as Nationality })}
                className="w-full h-9 px-3 bg-white border border-neutral-300 rounded text-xs font-medium focus:ring-1 focus:ring-orange-500"
              >
                {FIXED_NATIONALITIES.map((nat) => (
                  <option key={nat.id} value={nat.id}>
                    {nat.flag} {isRTL ? nat.labelAr : nat.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {isRTL ? 'المسمى الوظيفي' : 'Job Title / Role'}
              </label>
              <select
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="w-full h-9 px-3 bg-white border border-neutral-300 rounded text-xs focus:ring-1 focus:ring-orange-500"
              >
                <option value="LABOUR">LABOUR / عامل</option>
                <option value="SUPERVISOR">SUPERVISOR / مشرف</option>
                <option value="TECHNICIAN">TECHNICIAN / فني</option>
                <option value="FOREMAN">FOREMAN / مراقب</option>
                <option value="CAMP_BOSS">CAMP BOSS / مدير مخيم</option>
                <option value="DISPATCHER">DISPATCHER / مرحل</option>
                <option value="CREWMAN">CREWMAN / طاقم</option>
                <option value="OFFICE_STAFF">OFFICE STAFF / إداري</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {isRTL ? 'المشروع' : 'Project'}
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full h-9 px-3 bg-white border border-neutral-300 rounded text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={isRTL ? 'رقم الغرفة' : 'Room Number'}
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
              placeholder="e.g. Room 12"
            />
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title={isRTL ? 'حذف الموظف' : 'Remove Personnel'}
        message={
          isRTL
            ? 'هل أنت متأكد من حذف هذا الموظف من سجلات القوى العاملة؟'
            : 'Are you sure you want to remove this employee from the camp deployment register?'
        }
        itemIdentifier={`EMPLOYEE: ${selectedPersonnel?.name} (${selectedPersonnel?.idNumber})`}
        confirmLabel={isRTL ? 'تأكيد الحذف' : 'Remove Record'}
      />
    </div>
  );
};
