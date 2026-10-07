import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Building2, AlertTriangle, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { campService } from '../../services/campService';
import { buildingService } from '../../services/buildingService';
import { personnelService } from '../../services/personnelService';
import { roomService } from '../../services/roomService';
import { Camp, Building } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { BuildingCard } from '../../components/camp/BuildingCard';
import { AddBuildingModal } from '../../components/camp/AddBuildingModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

export const MyCampPage: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [camp, setCamp] = useState<Camp | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [personnelCounts, setPersonnelCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAddBuildingOpen, setIsAddBuildingOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCampData = async () => {
    setIsLoading(true);
    try {
      const prjId = user?.projectId || 'prj-sharq';
      const [cData, bData, allPersonnel] = await Promise.all([
        campService.getCampByProjectId(prjId),
        buildingService.getBuildings(undefined, prjId),
        personnelService.getAllPersonnel(prjId),
      ]);

      setCamp(cData);
      setBuildings(bData);

      // Count personnel per building
      const counts: Record<string, number> = {};
      allPersonnel.forEach((p) => {
        counts[p.buildingId] = (counts[p.buildingId] || 0) + 1;
      });
      setPersonnelCounts(counts);
    } catch {
      toastError('Failed to load camp data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCampData();
  }, [user]);

  const handleBuildingSaved = async (savedBuilding: Building) => {
    try {
      if (editingBuilding) {
        await buildingService.updateBuilding(savedBuilding.id, savedBuilding);
        // Sync any newly added facilities and custom facilities to all rooms
        await roomService.syncBuildingInventoryToRooms(savedBuilding);
        success(
          isRTL
            ? `تم تحديث المبنى "${savedBuilding.name}" بنجاح!`
            : `Building "${savedBuilding.name}" updated successfully!`
        );
        setEditingBuilding(null);
      } else {
        await buildingService.createBuilding(savedBuilding);
        // Automatically generate all rooms matching building specs with inventory!
        await roomService.createRoomsForNewBuilding(savedBuilding);
        success(
          isRTL
            ? `تمت إضافة المبنى "${savedBuilding.name}" بنجاح مع كافة الغرف!`
            : `Building "${savedBuilding.name}" added successfully with all rooms!`
        );
        setIsAddBuildingOpen(false);
      }
      await loadCampData();
    } catch (err: any) {
      toastError('Failed to save building');
    }
  };

  const handleConfirmDeleteBuilding = async () => {
    if (!buildingToDelete) return;
    if (deleteConfirmName.trim().toLowerCase() !== buildingToDelete.name.trim().toLowerCase()) {
      toastError(isRTL ? 'اسم المبنى المدخل غير مطابق' : 'Building name does not match');
      return;
    }

    try {
      setIsDeleting(true);
      // 1. Unassign all manpower assigned to this building (workers are NOT deleted!)
      await personnelService.unassignPersonnelForBuilding(buildingToDelete.id);

      // 2. Delete all rooms and their inventory for this building
      await roomService.deleteRoomsForBuilding(buildingToDelete.id);

      // 3. Delete the building record itself
      await buildingService.deleteBuilding(buildingToDelete.id);

      // Notify other views
      window.dispatchEvent(new CustomEvent('camp_inventory_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));

      success(
        isRTL
          ? `تم حذف المبنى "${buildingToDelete.name}" ومخزونه بنجاح، وأصبح العمال غير معينين`
          : `Building "${buildingToDelete.name}" and inventory deleted. Manpower unassigned.`
      );

      setBuildingToDelete(null);
      setDeleteConfirmName('');
      await loadCampData();
    } catch {
      toastError('Failed to delete building');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
          <Skeleton className="h-44 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!camp) return null;

  // Real dynamic calculated metrics from actual registered data
  const totalBedCapacity = buildings.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0);
  const registeredPersonnel = Object.values(personnelCounts).reduce((a, b) => a + b, 0);
  const totalBlocks = buildings.length;
  const totalCampRooms = buildings.reduce(
    (acc, b) => acc + (roomService.getRoomsCountForBuilding(b.id) || Number(b.totalRooms) || 0),
    0
  );
  const occupancyRate = totalBedCapacity > 0 ? Math.round((registeredPersonnel / totalBedCapacity) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Camp Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{camp.campName}</h1>
              <Badge status={camp.status} size="sm" />
            </div>
            <p className="text-xs text-neutral-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
              {camp.location}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-end">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold block">
                {isRTL ? 'إشغال المخيم' : 'Total Occupancy'}
              </span>
              <span className="text-sm font-bold text-neutral-900 font-mono">
                {registeredPersonnel} / {totalBedCapacity}{' '}
                <span className="text-xs text-orange-600 font-semibold">({occupancyRate}%)</span>
              </span>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setIsAddBuildingOpen(true)}
            >
              {isRTL ? '+ إضافة مبنى' : '+ Add Building'}
            </Button>
          </div>
        </div>
      </div>

      {/* Buildings Section Header & Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-orange-600" />
              <span>{isRTL ? 'مباني المخيم والوحدات السكنية' : 'Camp Buildings & Blocks'}</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isRTL
                ? 'انقر على بطاقة أي مبنى للوصول إلى سجل الموظفين وتنزيل واستيراد ملفات الإكسل'
                : 'Click any building card to inspect personnel records, download Excel templates, and upload workforce files.'}
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-neutral-500">
            {buildings.length} {isRTL ? 'مبنى مسجل' : 'Buildings Registered'}
          </span>
        </div>

        {/* Building Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map((b) => (
            <BuildingCard
              key={b.id}
              building={b}
              employeeCount={personnelCounts[b.id] || 0}
              onDelete={(target) => {
                setBuildingToDelete(target);
                setDeleteConfirmName('');
              }}
              onEdit={(target) => setEditingBuilding(target)}
            />
          ))}

          {/* Quick Add Building Card Button */}
          <div
            onClick={() => {
              setEditingBuilding(null);
              setIsAddBuildingOpen(true);
            }}
            className="border-2 border-dashed border-neutral-300 hover:border-orange-500 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-white/50 hover:bg-orange-50/30 group min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-orange-100 text-neutral-400 group-hover:text-orange-600 flex items-center justify-center transition mb-2">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-neutral-800 group-hover:text-orange-600 transition">
              {isRTL ? '+ إضافة مبنى جديد' : '+ Add Another Building'}
            </span>
            <span className="text-[11px] text-neutral-400 mt-0.5">
              {isRTL ? 'تخصيص غرف ومرافق وسعة' : 'Configure blocks, floors, and facilities'}
            </span>
          </div>
        </div>
      </div>

      {/* Real Dynamic Calculated Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border-neutral-200 text-center shadow-2xs">
          <span className="text-[10px] text-neutral-400 block uppercase font-semibold">
            {isRTL ? 'إجمالي سعة الأسرّة' : 'Total Bed Capacity'}
          </span>
          <span className="text-base font-bold text-neutral-900 font-mono mt-0.5 block">
            {totalBedCapacity} Beds
          </span>
        </Card>
        <Card className="p-3.5 bg-white border-neutral-200 text-center shadow-2xs">
          <span className="text-[10px] text-neutral-400 block uppercase font-semibold">
            {isRTL ? 'الموظفين المسجلين' : 'Registered Personnel'}
          </span>
          <span className="text-base font-bold text-neutral-900 font-mono mt-0.5 block">
            {registeredPersonnel}
          </span>
        </Card>
        <Card className="p-3.5 bg-white border-neutral-200 text-center shadow-2xs">
          <span className="text-[10px] text-neutral-400 block uppercase font-semibold">
            {isRTL ? 'إجمالي المباني' : 'Total Blocks'}
          </span>
          <span className="text-base font-bold text-neutral-900 font-mono mt-0.5 block">
            {totalBlocks} Blocks
          </span>
        </Card>
        <Card className="p-3.5 bg-white border-neutral-200 text-center shadow-2xs">
          <span className="text-[10px] text-neutral-400 block uppercase font-semibold">
            {isRTL ? 'إجمالي الغرف' : 'Camp Rooms'}
          </span>
          <span className="text-base font-bold text-neutral-900 font-mono mt-0.5 block">
            {totalCampRooms} Rooms
          </span>
        </Card>
      </div>

      {/* Add / Edit Building Modal */}
      <AddBuildingModal
        isOpen={isAddBuildingOpen || Boolean(editingBuilding)}
        initialBuilding={editingBuilding}
        onClose={() => {
          setIsAddBuildingOpen(false);
          setEditingBuilding(null);
        }}
        onBuildingAdded={handleBuildingSaved}
        campId={camp.id}
        projectId={camp.projectId}
        userId={user?.id}
      />

      {/* Safe Delete Building Confirmation Modal */}
      {buildingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900">
                    {isRTL ? 'تأكيد حذف المبنى' : 'Delete Building Confirmation'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {buildingToDelete.buildingNumber} • {buildingToDelete.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBuildingToDelete(null);
                  setDeleteConfirmName('');
                }}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning details */}
            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg text-xs space-y-1.5 text-rose-900">
              <p className="font-semibold">
                {isRTL
                  ? `تحذير: سيتم حذف هذا المبنى (${buildingToDelete.name}) وجميع الغرف والمخزون التابع له بشكل كامل!`
                  : `Warning: This will delete "${buildingToDelete.name}", all its rooms, and all room inventory permanently.`}
              </p>
              <p className="text-[11px] text-rose-700">
                {isRTL
                  ? 'العمالة المسجلة لن يتم حذفها، بل ستتحول حالتهم إلى (غير معين Unassigned) في كشف القوى العاملة لإعادة توزيعهم.'
                  : 'Manpower personnel will NOT be deleted. They will become "Unassigned" in your Manpower roster so you can reassign them.'}
              </p>
            </div>

            {/* Confirmation Instruction and Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700">
                {isRTL ? (
                  <span>
                    لتأكيد الحذف، يرجى كتابة اسم المبنى الصحيح بالأسفل:{' '}
                    <strong className="text-neutral-900 font-mono bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">
                      {buildingToDelete.name}
                    </strong>
                  </span>
                ) : (
                  <span>
                    To confirm deletion, please type the exact building name:{' '}
                    <strong className="text-neutral-900 font-mono bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-300">
                      {buildingToDelete.name}
                    </strong>
                  </span>
                )}
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={buildingToDelete.name}
                className="w-full h-9 px-3 bg-white border border-neutral-300 focus:border-rose-500 rounded-lg text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBuildingToDelete(null);
                  setDeleteConfirmName('');
                }}
                disabled={isDeleting}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmDeleteBuilding}
                disabled={
                  deleteConfirmName.trim().toLowerCase() !== buildingToDelete.name.trim().toLowerCase() ||
                  isDeleting
                }
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium"
              >
                {isDeleting
                  ? (isRTL ? 'جاري الحذف...' : 'Deleting...')
                  : (isRTL ? 'حذف المبنى نهائياً' : 'Delete Building')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
