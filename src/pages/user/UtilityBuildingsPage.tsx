import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Upload,
  Download,
  Bath,
  UtensilsCrossed,
  Briefcase,
  Wrench,
  Warehouse,
  Trash2,
  ArrowRight,
  Layers,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  UtilityBuilding,
  UtilityBuildingCategory,
} from '../../types';
import {
  utilityBuildingService,
  getCategoryRoomPrefix,
} from '../../services/utilityBuildingService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { AddUtilityBuildingModal } from '../../components/utilities/AddUtilityBuildingModal';
import { UtilityExcelImportModal } from '../../components/utilities/UtilityExcelImportModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export const UtilityBuildingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [buildings, setBuildings] = useState<UtilityBuilding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await utilityBuildingService.getUtilityBuildings(user?.projectId);
      setBuildings(data);
    } catch {
      toastError(isRTL ? 'فشل تحميل بيانات المباني الخدمية' : 'Failed to load utility buildings');
    } finally {
      setIsLoading(false);
    }
  }, [isRTL, toastError, user?.projectId]);

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('camp_utility_buildings_updated', handleSync);
    window.addEventListener('camp_inventory_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('camp_utility_buildings_updated', handleSync);
      window.removeEventListener('camp_inventory_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadData]);

  // Filtered Buildings
  const filteredBuildings = useMemo(() => {
    return buildings.filter((b) => {
      const matchesSearch =
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.rooms.some(
          (r) =>
            r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.inventory.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );

      const matchesCat = categoryFilter === 'All' || b.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [buildings, searchTerm, categoryFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = buildings.length;
    const washrooms = buildings.filter((b) => b.category === 'Washroom Building').length;
    const kitchens = buildings.filter((b) => b.category === 'Kitchen Building').length;
    const offices = buildings.filter((b) => b.category === 'Offices Building').length;
    const workshops = buildings.filter((b) => b.category === 'Workshop Building').length;
    const stores = buildings.filter((b) => b.category === 'Camp Store Building').length;

    const totalRooms = buildings.reduce((sum, b) => sum + b.roomsCount, 0);
    const totalItems = buildings.reduce(
      (sum, b) => sum + b.rooms.reduce((rSum, r) => rSum + r.inventory.reduce((iSum, i) => iSum + i.quantity, 0), 0),
      0
    );

    return {
      total,
      washrooms,
      kitchens,
      offices,
      workshops,
      stores,
      totalRooms,
      totalItems,
    };
  }, [buildings]);

  // Delete Modal State
  const [buildingToDelete, setBuildingToDelete] = useState<UtilityBuilding | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (building: UtilityBuilding, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBuildingToDelete(building);
  };

  const handleConfirmDelete = async () => {
    if (!buildingToDelete) return;
    setIsDeleting(true);
    try {
      await utilityBuildingService.deleteUtilityBuilding(buildingToDelete.id);
      success(
        isRTL
          ? `تم حذف المبنى "${buildingToDelete.name}" بنجاح`
          : `Building "${buildingToDelete.name}" deleted successfully`
      );
      setBuildingToDelete(null);
      await loadData();
    } catch {
      toastError(isRTL ? 'فشل حذف المبنى' : 'Failed to delete building');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryMeta = (cat: UtilityBuildingCategory) => {
    switch (cat) {
      case 'Washroom Building':
        return {
          icon: <Bath className="w-4 h-4 text-sky-600" />,
          badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
          cardBorder: 'hover:border-sky-300',
          label: isRTL ? 'مبنى دورات مياه' : 'Washroom Building',
        };
      case 'Kitchen Building':
        return {
          icon: <UtensilsCrossed className="w-4 h-4 text-amber-600" />,
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          cardBorder: 'hover:border-amber-300',
          label: isRTL ? 'مبنى مطابخ' : 'Kitchen Building',
        };
      case 'Offices Building':
        return {
          icon: <Briefcase className="w-4 h-4 text-indigo-600" />,
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          cardBorder: 'hover:border-indigo-300',
          label: isRTL ? 'مبنى مكاتب' : 'Offices Building',
        };
      case 'Workshop Building':
        return {
          icon: <Wrench className="w-4 h-4 text-orange-600" />,
          badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
          cardBorder: 'hover:border-orange-300',
          label: isRTL ? 'مبنى ورش صيانة' : 'Workshop Building',
        };
      case 'Camp Store Building':
        return {
          icon: <Warehouse className="w-4 h-4 text-emerald-600" />,
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          cardBorder: 'hover:border-emerald-300',
          label: isRTL ? 'مبنى مستودع المخيم' : 'Camp Store Building',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
              {isRTL ? 'إدارة المرافق والخدمات' : 'Camp Utility Facilities'}
            </span>
            <span className="text-[11px] text-neutral-400">
              {stats.totalRooms} {isRTL ? 'وحدة خدمة' : 'service units'}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight mt-1 flex items-center gap-2">
            {isRTL ? 'المباني الخدمية (المرافق)' : 'Utility Buildings'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isRTL
              ? 'إدارة مباني دورات المياه والمطابخ والمكاتب والورش ومستودع المخيم ومحتوياتها بدون سعة سكنية'
              : 'Washrooms, kitchens, offices, workshops, and camp store inventory management with dedicated unit cards'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            {isRTL ? 'استيراد إكسل' : 'Import Excel'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => utilityBuildingService.downloadUtilityTemplate()}
          >
            {isRTL ? 'النموذج' : 'Template'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            {isRTL ? '+ إضافة مبنى خدمي' : '+ Add Utility Building'}
          </Button>
        </div>
      </div>

      {/* 5 Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-white border-neutral-200">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isRTL ? 'دورات المياه' : 'Washrooms'}
            </span>
            <Bath className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-lg font-bold text-neutral-900 font-mono">{stats.washrooms} Blocks</div>
          <span className="text-[10px] text-neutral-400 block">Ablution & Baths</span>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isRTL ? 'المطابخ' : 'Kitchens'}
            </span>
            <UtensilsCrossed className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-neutral-900 font-mono">{stats.kitchens} Blocks</div>
          <span className="text-[10px] text-neutral-400 block">Catering & Mess Halls</span>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isRTL ? 'المكاتب' : 'Offices'}
            </span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-neutral-900 font-mono">{stats.offices} Blocks</div>
          <span className="text-[10px] text-neutral-400 block">Admin & Operations</span>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isRTL ? 'الورش' : 'Workshops'}
            </span>
            <Wrench className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-lg font-bold text-neutral-900 font-mono">{stats.workshops} Blocks</div>
          <span className="text-[10px] text-neutral-400 block">Mechanical & MEP</span>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-neutral-400 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isRTL ? 'المستودع' : 'Camp Store'}
            </span>
            <Warehouse className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-neutral-900 font-mono">{stats.stores} Blocks</div>
          <span className="text-[10px] text-neutral-400 block">Tools & Materials</span>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'All', label: isRTL ? 'الكل' : 'All Categories', count: buildings.length },
            { id: 'Washroom Building', label: isRTL ? 'دورات مياه' : 'Washrooms', count: stats.washrooms },
            { id: 'Kitchen Building', label: isRTL ? 'مطابخ' : 'Kitchens', count: stats.kitchens },
            { id: 'Offices Building', label: isRTL ? 'مكاتب' : 'Offices', count: stats.offices },
            { id: 'Workshop Building', label: isRTL ? 'ورش صيانة' : 'Workshops', count: stats.workshops },
            { id: 'Camp Store Building', label: isRTL ? 'مستودع المخيم' : 'Camp Stores', count: stats.stores },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === tab.id
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  categoryFilter === tab.id ? 'bg-orange-700/60 text-white' : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isRTL ? 'بحث بالاسم، الوحدة، الصنف...' : 'Search building, room, item...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-9 pe-3 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
        </div>
      </div>

      {/* Buildings Cards Grid */}
      {filteredBuildings.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200 p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-800">
            {isRTL ? 'لا توجد مباني خدمية مطابقة' : 'No utility buildings found'}
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {isRTL
              ? 'أضف مبنى دورات مياه، مطبخ، مكاتب أو ورشة عمل أو مستودع جديد أو استورد ملف الإكسل'
              : 'Add a washroom building, kitchen, offices, workshop block, or camp store, or import an Excel file.'}
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsAddModalOpen(true)}>
            {isRTL ? '+ إضافة أول مبنى خدمي' : '+ Add First Utility Building'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {filteredBuildings.map((building) => {
            const meta = getCategoryMeta(building.category);
            const prefix = getCategoryRoomPrefix(building.category);

            // Compute total inventory pieces in building
            const totalInventoryPieces = building.rooms.reduce(
              (sum, r) => sum + r.inventory.reduce((iSum, i) => iSum + i.quantity, 0),
              0
            );

            // Extract distinct items for preview
            const itemMap = new Map<string, number>();
            building.rooms.forEach((r) => {
              r.inventory.forEach((it) => {
                itemMap.set(it.name, (itemMap.get(it.name) || 0) + it.quantity);
              });
            });
            const topItems = Array.from(itemMap.entries()).slice(0, 5);

            return (
              <div
                key={building.id}
                onClick={() => navigate(`/app/utilities/${building.id}`)}
                className={`group rounded-2xl border border-neutral-200/90 bg-white p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer ${meta.cardBorder} flex flex-col justify-between`}
              >
                <div>
                  {/* Top Bar: Category badge & Actions */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${meta.badgeClass}`}
                    >
                      {meta.icon}
                      {meta.label}
                    </span>

                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => handleDeleteClick(building, e)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-neutral-200/70 hover:border-red-200 transition-colors shadow-3xs"
                      title={isRTL ? 'حذف المبنى' : 'Delete Building'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Building Name */}
                  <h3 className="text-base font-bold text-neutral-900 group-hover:text-orange-600 transition-colors">
                    {building.name}
                  </h3>

                  {/* Building Specs: Floors, Rooms count, Dimensions */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-2 font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-neutral-400" />
                      {building.floors} {isRTL ? 'طوابق' : 'Floors'}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-neutral-800">
                      {building.roomsCount} {prefix}s
                    </span>
                    {building.lengthM && building.widthM && (
                      <>
                        <span>•</span>
                        <span className="text-neutral-400">
                          {building.lengthM}m × {building.widthM}m
                        </span>
                      </>
                    )}
                  </div>

                  {/* Inventory Summary preview pills */}
                  <div className="mt-3.5 pt-3 border-t border-neutral-100">
                    <div className="flex items-center justify-between mb-2 text-[11px] font-semibold text-neutral-500">
                      <span>{isRTL ? 'ملخص الأصول والمحتويات:' : 'Inventory & Equipment Summary:'}</span>
                      <span className="text-orange-600 font-mono font-bold">
                        {totalInventoryPieces} {isRTL ? 'قطعة' : 'pieces'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {topItems.length === 0 ? (
                        <span className="text-[11px] text-neutral-400 italic">
                          {isRTL ? 'لا توجد محتويات مسجلة' : 'No items added yet'}
                        </span>
                      ) : (
                        topItems.map(([name, qty], idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-neutral-100 text-[11px] text-neutral-700 font-medium"
                          >
                            <span className="truncate max-w-[130px]">{name}</span>
                            <span className="font-mono font-bold text-neutral-900 bg-white px-1 rounded shadow-3xs">
                              ×{qty}
                            </span>
                          </span>
                        ))
                      )}
                      {itemMap.size > 5 && (
                        <span className="text-[11px] text-neutral-400 self-center font-medium">
                          +{itemMap.size - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold text-orange-600 group-hover:text-orange-700">
                  <span>{isRTL ? 'عرض الوحدات والأصناف' : 'Open Units & Inventory'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <AddUtilityBuildingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadData}
      />

      <UtilityExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Delete Building Confirmation Modal */}
      {buildingToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeleting && setBuildingToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-neutral-900">
                  {isRTL ? 'تأكيد حذف المبنى الخدمي' : 'Delete Utility Building'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isRTL
                    ? 'هل أنت متأكد من حذف هذا المبنى؟ سيتم مسح كافة الوحدات والمحتويات المسجلة به.'
                    : 'Are you sure you want to delete this building? All its units and inventory will be permanently deleted.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBuildingToDelete(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">{isRTL ? 'اسم المبنى:' : 'Building Name:'}</span>
                <span className="font-bold text-neutral-900">{buildingToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">{isRTL ? 'الفئة:' : 'Category:'}</span>
                <span className="font-semibold text-neutral-700">{buildingToDelete.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">{isRTL ? 'عدد الوحدات:' : 'Total Units:'}</span>
                <span className="font-mono font-bold text-orange-600">{buildingToDelete.roomsCount} units</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeleting}
                onClick={() => setBuildingToDelete(null)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isDeleting}
                onClick={handleConfirmDelete}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                {isRTL ? 'تأكيد الحذف' : 'Delete Building'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
