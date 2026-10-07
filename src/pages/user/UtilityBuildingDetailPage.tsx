import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Plus,
  Trash2,
  Minus,
  Bath,
  UtensilsCrossed,
  Briefcase,
  Wrench,
  Warehouse,
  Layers,
  Search,
  Upload,
  X,
  Package,
  AlertTriangle,
} from 'lucide-react';
import {
  UtilityBuilding,
  UtilityBuildingCategory,
} from '../../types';
import {
  utilityBuildingService,
  getCategoryRoomPrefix,
} from '../../services/utilityBuildingService';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { UtilityExcelImportModal } from '../../components/utilities/UtilityExcelImportModal';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

export const UtilityBuildingDetailPage: React.FC = () => {
  const { buildingId } = useParams<{ buildingId: string }>();
  const navigate = useNavigate();
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [building, setBuilding] = useState<UtilityBuilding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedFloor, setSelectedFloor] = useState<number | 'All'>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals / Quick forms
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);

  // Add Item to specific room state: roomId -> boolean
  const [activeAddRoomId, setActiveAddRoomId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemNameAr, setItemNameAr] = useState('');
  const [itemQty, setItemQty] = useState(1);

  // Bulk add item to ALL rooms
  const [isBulkItemModalOpen, setIsBulkItemModalOpen] = useState(false);
  const [bulkItemName, setBulkItemName] = useState('');
  const [bulkItemNameAr, setBulkItemNameAr] = useState('');
  const [bulkItemQty, setBulkItemQty] = useState(1);

  // Delete Building & Room Modal State
  const [isDeleteBuildingOpen, setIsDeleteBuildingOpen] = useState(false);
  const [isDeletingBuilding, setIsDeletingBuilding] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);

  const loadBuildingData = useCallback(async () => {
    if (!buildingId) return;
    try {
      const data = await utilityBuildingService.getUtilityBuildingById(buildingId);
      if (!data) {
        toastError(isRTL ? 'المبنى الخدمي غير موجود' : 'Utility building not found');
        navigate('/app/utilities');
        return;
      }
      setBuilding(data);
    } catch {
      toastError(isRTL ? 'فشل تحميل بيانات المبنى' : 'Failed to load building data');
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, isRTL, navigate, toastError]);

  useEffect(() => {
    loadBuildingData();

    const handleSync = () => {
      loadBuildingData();
    };

    window.addEventListener('camp_utility_buildings_updated', handleSync);
    window.addEventListener('camp_inventory_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('camp_utility_buildings_updated', handleSync);
      window.removeEventListener('camp_inventory_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadBuildingData]);

  const prefix = building ? getCategoryRoomPrefix(building.category) : 'Unit';

  // Distinct floors
  const floorsList = useMemo(() => {
    if (!building) return [];
    return Array.from(new Set(building.rooms.map((r) => r.floor))).sort((a, b) => a - b);
  }, [building]);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    if (!building) return [];
    return building.rooms.filter((r) => {
      const matchesFloor = selectedFloor === 'All' || r.floor === selectedFloor;
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        r.roomNumber.toLowerCase().includes(q) ||
        r.inventory.some((i) => i.name.toLowerCase().includes(q) || (i.nameAr && i.nameAr.includes(q)));
      return matchesFloor && matchesSearch;
    });
  }, [building, selectedFloor, searchTerm]);

  // Category Icon & Badge
  const getCategoryMeta = (cat: UtilityBuildingCategory) => {
    switch (cat) {
      case 'Washroom Building':
        return {
          icon: <Bath className="w-4 h-4 text-sky-600" />,
          badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
          label: isRTL ? 'مبنى دورات مياه' : 'Washroom Building',
        };
      case 'Kitchen Building':
        return {
          icon: <UtensilsCrossed className="w-4 h-4 text-amber-600" />,
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          label: isRTL ? 'مبنى مطابخ' : 'Kitchen Building',
        };
      case 'Offices Building':
        return {
          icon: <Briefcase className="w-4 h-4 text-indigo-600" />,
          badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: isRTL ? 'مبنى مكاتب' : 'Offices Building',
        };
      case 'Workshop Building':
        return {
          icon: <Wrench className="w-4 h-4 text-orange-600" />,
          badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
          label: isRTL ? 'مبنى ورش صيانة' : 'Workshop Building',
        };
      case 'Camp Store Building':
        return {
          icon: <Warehouse className="w-4 h-4 text-emerald-600" />,
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: isRTL ? 'مبنى مستودع المخيم' : 'Camp Store Building',
        };
    }
  };

  const handleUpdateItemQty = async (roomId: string, itemId: string, currentQty: number, delta: number) => {
    if (!building) return;
    const newQty = Math.max(0, currentQty + delta);
    try {
      await utilityBuildingService.updateRoomInventoryQuantity(building.id, roomId, itemId, newQty);
      loadBuildingData();
    } catch {
      toastError('Failed to update quantity');
    }
  };

  const handleDeleteItem = async (roomId: string, itemId: string) => {
    if (!building) return;
    try {
      await utilityBuildingService.deleteItemFromUtilityRoom(building.id, roomId, itemId);
      loadBuildingData();
      success(isRTL ? 'تم حذف الصنف' : 'Item removed');
    } catch {
      toastError('Failed to remove item');
    }
  };

  const handleAddItemToRoom = async (roomId: string) => {
    if (!building || !itemName.trim()) return;
    try {
      await utilityBuildingService.addItemToUtilityRoom(building.id, roomId, {
        name: itemName.trim(),
        nameAr: itemNameAr.trim() || undefined,
        quantity: Math.max(1, Number(itemQty) || 1),
      });
      setActiveAddRoomId(null);
      setItemName('');
      setItemNameAr('');
      setItemQty(1);
      loadBuildingData();
      success(isRTL ? 'تمت إضافة الصنف بنجاح' : 'Item added to unit');
    } catch {
      toastError('Failed to add item');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building || !newRoomNumber.trim()) return;
    try {
      await utilityBuildingService.addUtilityRoom(building.id, {
        roomNumber: newRoomNumber.trim(),
        floor: newRoomFloor,
      });
      setIsAddRoomOpen(false);
      setNewRoomNumber('');
      loadBuildingData();
      success(isRTL ? `تمت إضافة ${prefix} بنجاح` : `${prefix} unit added successfully`);
    } catch {
      toastError('Failed to add unit');
    }
  };

  const handleConfirmDeleteRoom = async () => {
    if (!building || !roomToDelete) return;
    setIsDeletingRoom(true);
    try {
      await utilityBuildingService.deleteUtilityRoom(building.id, roomToDelete.id);
      success(
        isRTL
          ? `تم حذف ${roomToDelete.name} بنجاح`
          : `Unit "${roomToDelete.name}" deleted successfully`
      );
      setRoomToDelete(null);
      await loadBuildingData();
    } catch {
      toastError(isRTL ? 'فشل حذف الوحدة' : 'Failed to delete unit');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  const handleConfirmDeleteBuilding = async () => {
    if (!building) return;
    setIsDeletingBuilding(true);
    try {
      await utilityBuildingService.deleteUtilityBuilding(building.id);
      success(
        isRTL
          ? `تم حذف المبنى "${building.name}" بنجاح`
          : `Building "${building.name}" deleted successfully`
      );
      setIsDeleteBuildingOpen(false);
      navigate('/app/utilities');
    } catch {
      toastError(isRTL ? 'فشل حذف المبنى' : 'Failed to delete building');
    } finally {
      setIsDeletingBuilding(false);
    }
  };

  const handleBulkAddToAllRooms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!building || !bulkItemName.trim()) return;
    try {
      for (const r of building.rooms) {
        await utilityBuildingService.addItemToUtilityRoom(building.id, r.id, {
          name: bulkItemName.trim(),
          nameAr: bulkItemNameAr.trim() || undefined,
          quantity: Math.max(1, Number(bulkItemQty) || 1),
        });
      }
      setIsBulkItemModalOpen(false);
      setBulkItemName('');
      setBulkItemNameAr('');
      setBulkItemQty(1);
      loadBuildingData();
      success(
        isRTL
          ? `تمت إضافة الصنف إلى جميع وحدات الـ (${prefix}) بنجاح`
          : `Item added to all ${building.rooms.length} ${prefix} units`
      );
    } catch {
      toastError('Failed to add item to all rooms');
    }
  };

  if (isLoading || !building) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const meta = getCategoryMeta(building.category);
  const totalItemPieces = building.rooms.reduce(
    (sum, r) => sum + r.inventory.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/utilities"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-orange-600 transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>{isRTL ? 'الرجوع إلى المباني الخدمية' : 'Back to Utility Buildings'}</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            onClick={() => setIsExcelModalOpen(true)}
          >
            {isRTL ? 'استيراد إكسل' : 'Import Excel'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsBulkItemModalOpen(true)}
          >
            {isRTL ? '+ إضافة صنف لكافة الوحدات' : '+ Add Item to All Units'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => {
              setNewRoomNumber(`${prefix} ${building.rooms.length + 1}`);
              setIsAddRoomOpen(true);
            }}
          >
            {isRTL ? `+ إضافة ${prefix}` : `+ Add ${prefix}`}
          </Button>
        </div>
      </div>

      {/* Building Header Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-700 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                {building.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${meta.badgeClass}`}
              >
                {meta.icon}
                {meta.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mt-2 font-mono">
              <span className="flex items-center gap-1 font-medium text-neutral-700">
                <Layers className="w-3.5 h-3.5 text-neutral-400" />
                {building.floors} {isRTL ? 'طوابق' : 'Floors'}
              </span>
              <span>•</span>
              <span className="font-bold text-neutral-900">
                {building.roomsCount} {prefix}s
              </span>
              <span>•</span>
              <span className="font-semibold text-orange-600">
                {totalItemPieces} {isRTL ? 'قطع أصول ومخزون' : 'Total Items & Assets'}
              </span>
              {building.lengthM && building.widthM && (
                <>
                  <span>•</span>
                  <span>
                    {building.lengthM}m × {building.widthM}m
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Delete Building Button */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteBuildingOpen(true)}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
          >
            {isRTL ? 'حذف المبنى' : 'Delete Building'}
          </Button>
        </div>
      </div>

      {/* Inline Add Room Bar */}
      {isAddRoomOpen && (
        <form
          onSubmit={handleAddRoom}
          className="p-4 bg-orange-50/80 rounded-2xl border border-orange-200 flex flex-wrap items-center gap-3 animate-in fade-in"
        >
          <span className="text-xs font-bold text-orange-800">
            {isRTL ? `إضافة وحدة جديدة (${prefix}):` : `Add New ${prefix} Unit:`}
          </span>
          <input
            type="text"
            required
            placeholder={`e.g. ${prefix} 9`}
            value={newRoomNumber}
            onChange={(e) => setNewRoomNumber(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white"
          />
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span>{isRTL ? 'الطابق:' : 'Floor:'}</span>
            <input
              type="number"
              min="1"
              max={building.floors + 1}
              value={newRoomFloor}
              onChange={(e) => setNewRoomFloor(Math.max(1, Number(e.target.value) || 1))}
              className="w-16 px-2.5 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" variant="primary" className="h-8 text-xs">
              {isRTL ? 'حفظ الوحدة' : 'Save Unit'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              onClick={() => setIsAddRoomOpen(false)}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </form>
      )}

      {/* Bulk Add Item to All Rooms Modal */}
      {isBulkItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">
                {isRTL ? `إضافة صنف لكافة وحدات الـ (${prefix})` : `Add Item to All ${prefix} Units`}
              </h3>
              <button onClick={() => setIsBulkItemModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-400 hover:text-neutral-700" />
              </button>
            </div>

            <form onSubmit={handleBulkAddToAllRooms} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Item Description (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Water Heater, Heavy Fan..."
                  value={bulkItemName}
                  onChange={(e) => setBulkItemName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  اسم الصنف (عربي) - اختياري
                </label>
                <input
                  type="text"
                  placeholder="مثال: سخان مياه، مروحة..."
                  value={bulkItemNameAr}
                  onChange={(e) => setBulkItemNameAr(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Quantity per Unit *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={bulkItemQty}
                  onChange={(e) => setBulkItemQty(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsBulkItemModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Add to All {building.rooms.length} Units
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Strip & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Floor Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-neutral-500 me-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            {isRTL ? 'الطابق:' : 'Floor:'}
          </span>
          <button
            type="button"
            onClick={() => setSelectedFloor('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedFloor === 'All'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {isRTL ? 'جميع الطوابق' : 'All Floors'} ({building.rooms.length})
          </button>
          {floorsList.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFloor(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedFloor === f
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {isRTL ? `طابق ${f}` : `Floor ${f}`} (
              {building.rooms.filter((r) => r.floor === f).length})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isRTL ? `بحث برقم الـ ${prefix} أو الصنف...` : `Search ${prefix} or item...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full ps-9 pe-3 py-1.5 text-xs rounded-xl border border-neutral-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
          />
        </div>
      </div>

      {/* Grid of Unit/Room Cards (User requirement: hr washroom k chootay chotay cards hon with inventory detail) */}
      {filteredRooms.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-neutral-200 p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-800">
            {isRTL ? `لا توجد وحدات ${prefix} مطابقة` : `No ${prefix} units found`}
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {isRTL
              ? `أضف وحدات ${prefix} جديدة لهذا المبنى أو قم بتغيير معايير البحث`
              : `Add new ${prefix} units to this building or clear your search filter.`}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setNewRoomNumber(`${prefix} ${building.rooms.length + 1}`);
              setIsAddRoomOpen(true);
            }}
          >
            {isRTL ? `+ إضافة أول ${prefix}` : `+ Add First ${prefix}`}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filteredRooms.map((room) => {
            const totalItemsInRoom = room.inventory.reduce((sum, it) => sum + it.quantity, 0);

            return (
              <div
                key={room.id}
                className="bg-white border border-neutral-200/90 rounded-2xl shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Room Card Header */}
                <div className="p-4 pb-3 border-b border-neutral-100 bg-neutral-50/50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 group-hover:text-orange-600 transition-colors font-mono">
                        {room.roomNumber}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium px-2 py-0.2 rounded bg-neutral-200/70 text-neutral-700">
                          {isRTL ? `طابق ${room.floor}` : `Floor ${room.floor}`}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-mono font-semibold">
                          {room.inventory.length} items • {totalItemsInRoom} pcs
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRoomToDelete({ id: room.id, name: room.roomNumber })}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-neutral-200/70 hover:border-red-200 transition shadow-3xs"
                      title={isRTL ? 'حذف الوحدة' : 'Delete Unit'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Room Inventory Rows List */}
                <div className="p-3 flex-1 overflow-y-auto max-h-56 divide-y divide-neutral-100">
                  {room.inventory.length === 0 ? (
                    <div className="py-6 text-center text-neutral-400 text-xs italic">
                      {isRTL ? 'لا توجد محتويات مسجلة' : 'No items recorded'}
                    </div>
                  ) : (
                    room.inventory.map((item) => (
                      <div
                        key={item.id}
                        className="py-2 px-1 flex items-center justify-between text-xs hover:bg-neutral-50/80 rounded transition"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="font-semibold text-neutral-800 block truncate">
                            {item.name}
                          </span>
                          {item.nameAr && (
                            <span className="text-[10px] text-neutral-400 font-arabic block truncate">
                              {item.nameAr}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Stepper */}
                          <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-3xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(room.id, item.id, item.quantity, -1)}
                              className="px-1.5 py-0.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                            >
                              <Minus className="w-2.5 h-2.5" />
                            </button>
                            <span className="px-2 py-0.5 text-xs font-mono font-bold text-neutral-800 min-w-[28px] text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(room.id, item.id, item.quantity, 1)}
                              className="px-1.5 py-0.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                            >
                              <Plus className="w-2.5 h-2.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(room.id, item.id)}
                            className="p-1 text-neutral-300 hover:text-red-500 rounded transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Inline Add Item Form or Button */}
                <div className="p-3 border-t border-neutral-100 bg-neutral-50/40">
                  {activeAddRoomId === room.id ? (
                    <div className="space-y-2 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Item Name (EN)"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="px-2 py-1 text-xs rounded-lg border border-neutral-300 bg-white"
                        />
                        <input
                          type="text"
                          placeholder="الاسم بالعربي"
                          value={itemNameAr}
                          onChange={(e) => setItemNameAr(e.target.value)}
                          className="px-2 py-1 text-xs rounded-lg border border-neutral-300 bg-white text-right"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={itemQty}
                          onChange={(e) => setItemQty(Math.max(1, Number(e.target.value) || 1))}
                          className="w-16 px-2 py-1 text-xs rounded-lg border border-neutral-300 bg-white"
                        />
                        <Button
                          size="sm"
                          variant="primary"
                          className="h-6 text-[11px] flex-1"
                          onClick={() => handleAddItemToRoom(room.id)}
                        >
                          {isRTL ? 'إدراج' : 'Insert'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px]"
                          onClick={() => setActiveAddRoomId(null)}
                        >
                          {isRTL ? 'إلغاء' : 'Cancel'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAddRoomId(room.id);
                        setItemName('');
                        setItemNameAr('');
                        setItemQty(1);
                      }}
                      className="w-full py-1.5 rounded-lg border border-dashed border-neutral-300 hover:border-orange-400 bg-white hover:bg-orange-50/40 text-neutral-600 hover:text-orange-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-600" />
                      <span>{isRTL ? 'إضافة صنف لهذه الوحدة' : `+ Add Item to ${room.roomNumber}`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Excel Import Modal */}
      <UtilityExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={loadBuildingData}
      />

      {/* Delete Building Confirmation Modal */}
      {isDeleteBuildingOpen && building && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingBuilding && setIsDeleteBuildingOpen(false)}
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
                    ? `هل أنت متأكد من حذف المبنى "${building.name}" نهائياً وجميع وحداته؟`
                    : `Are you sure you want to permanently delete "${building.name}" and all its units?`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteBuildingOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">{isRTL ? 'اسم المبنى:' : 'Building:'}</span>
                <span className="font-bold text-neutral-900">{building.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">{isRTL ? 'إجمالي الوحدات:' : 'Units:'}</span>
                <span className="font-mono font-bold text-orange-600">{building.rooms.length} units</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeletingBuilding}
                onClick={() => setIsDeleteBuildingOpen(false)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isDeletingBuilding}
                onClick={handleConfirmDeleteBuilding}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                {isRTL ? 'تأكيد الحذف' : 'Delete Building'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Room Confirmation Modal */}
      {roomToDelete && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !isDeletingRoom && setRoomToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-neutral-200 p-5 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-neutral-900">
                  {isRTL ? `حذف ${roomToDelete.name}` : `Delete ${roomToDelete.name}`}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isRTL
                    ? 'سيتم حذف هذه الوحدة وجميع أصنافها المسجلة.'
                    : 'This unit and all its registered items will be removed.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDeletingRoom}
                onClick={() => setRoomToDelete(null)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                isLoading={isDeletingRoom}
                onClick={handleConfirmDeleteRoom}
              >
                {isRTL ? 'حذف' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
