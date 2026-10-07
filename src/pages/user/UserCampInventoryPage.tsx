import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Building2,
  Trash2,
  Edit2,
  Filter,
  Minus,
  DoorOpen,
  CheckCircle2,
  X,
  PackageCheck,
  Layers,
  ChevronDown,
  ChevronRight,
  Upload,
  Bath,
  UtensilsCrossed,
  Briefcase,
  Wrench,
  Warehouse,
  AlertTriangle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Building, FlatInventoryRecord, UtilityBuilding } from '../../types';
import { buildingService } from '../../services/buildingService';
import { roomService, getInventoryCategory } from '../../services/roomService';
import { utilityBuildingService } from '../../services/utilityBuildingService';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { UtilityExcelImportModal } from '../../components/utilities/UtilityExcelImportModal';
import { Button } from '../../components/ui/Button';

interface GroupedInventoryItem {
  name: string;
  category: string;
  totalQuantity: number;
  roomsCount: number;
  buildingsCount: number;
  hasLiving: boolean;
  hasUtility: boolean;
  distribution: FlatInventoryRecord[];
}

export const UserCampInventoryPage: React.FC = () => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [utilityBuildings, setUtilityBuildings] = useState<UtilityBuilding[]>([]);
  const [inventoryList, setInventoryList] = useState<FlatInventoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Expanded items state: Set of item names that are currently open
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Multi-selection for bulk delete: Set of FlatInventoryRecord id
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  // Multi-selection of buildings to filter & combine inventory (Empty Set = All Buildings)
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<string>>(new Set());
  const [buildingTypeFilter, setBuildingTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Add Item Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [targetRoomOption, setTargetRoomOption] = useState<string>('ALL'); // 'ALL' or specific roomId
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [buildingRooms, setBuildingRooms] = useState<{ id: string; roomNumber: string }[]>([]);

  // Edit Item Modal state
  const [editingItem, setEditingItem] = useState<FlatInventoryRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editQty, setEditQty] = useState(1);

  // Single Item Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<FlatInventoryRecord | null>(null);

  // Bulk Delete Confirmation Modal
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<{
    title: string;
    items: FlatInventoryRecord[];
  } | null>(null);

  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);

  // Data Loading: Combined Living Buildings and Utility Buildings Inventory (scoped to project)
  const loadData = useCallback(async () => {
    try {
      const prjId = user?.projectId;
      const [bData, uData] = await Promise.all([
        buildingService.getBuildings(undefined, prjId),
        utilityBuildingService.getUtilityBuildings(prjId),
      ]);
      setBuildings(bData);
      setUtilityBuildings(uData);

      const livingInv = await roomService.getAllCampInventory(bData);
      const utilityInv = utilityBuildingService.getAllUtilityInventory(uData);

      setInventoryList([...livingInv, ...utilityInv]);
    } catch {
      toastError(isRTL ? 'فشل تحميل بيانات المخزون' : 'Failed to load inventory');
    } finally {
      setIsLoading(false);
    }
  }, [isRTL, toastError, user?.projectId]);

  useEffect(() => {
    loadData();

    // Listen for cross-view real-time updates from living and utility operations
    const handleSync = () => {
      loadData();
    };

    window.addEventListener('camp_inventory_updated', handleSync);
    window.addEventListener('camp_utility_buildings_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('camp_inventory_updated', handleSync);
      window.removeEventListener('camp_utility_buildings_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadData]);

  // When selected building changes in Add Modal, load its rooms/units
  useEffect(() => {
    if (!selectedBuildingId) {
      setBuildingRooms([]);
      return;
    }

    const isLiving = buildings.some((b) => b.id === selectedBuildingId);
    if (isLiving) {
      const allRooms = roomService.getStoredRooms().filter((r) => r.buildingId === selectedBuildingId);
      setBuildingRooms(allRooms.map((r) => ({ id: r.id, roomNumber: r.roomNumber })));
    } else {
      const uBld = utilityBuildings.find((ub) => ub.id === selectedBuildingId);
      if (uBld) {
        setBuildingRooms(uBld.rooms.map((r) => ({ id: r.id, roomNumber: r.roomNumber })));
      } else {
        setBuildingRooms([]);
      }
    }
  }, [selectedBuildingId, buildings, utilityBuildings]);

  // Grouped & Deduplicated Inventory Items
  // Items with the exact same name are consolidated into one row with total quantity and distribution
  const groupedInventory = useMemo<GroupedInventoryItem[]>(() => {
    // 1. Filter raw items first
    const filtered = inventoryList.filter((item) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        item.name.toLowerCase().includes(q) ||
        (item.nameAr && item.nameAr.toLowerCase().includes(q)) ||
        item.buildingName.toLowerCase().includes(q) ||
        item.roomNumber.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesBuilding =
        selectedBuildingIds.size === 0 ||
        selectedBuildingIds.has(item.buildingId);

      const matchesBuildingType =
        buildingTypeFilter === 'All' ||
        (buildingTypeFilter === 'Living' && item.buildingType === 'Living') ||
        (buildingTypeFilter === 'Utility' && item.buildingType === 'Utility') ||
        item.buildingCategory === buildingTypeFilter;

      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

      return matchesSearch && matchesBuilding && matchesBuildingType && matchesCategory;
    });

    // 2. Group by canonical lowercased item name
    const map = new Map<string, GroupedInventoryItem>();

    filtered.forEach((rec) => {
      const key = rec.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: rec.name.trim(),
          category: rec.category,
          totalQuantity: 0,
          roomsCount: 0,
          buildingsCount: 0,
          hasLiving: false,
          hasUtility: false,
          distribution: [],
        });
      }

      const grp = map.get(key)!;
      grp.totalQuantity += rec.quantity;
      if (rec.buildingType === 'Utility') {
        grp.hasUtility = true;
      } else {
        grp.hasLiving = true;
      }
      grp.distribution.push(rec);
    });

    // 3. Compute distinct room & building counts per item
    const result = Array.from(map.values()).map((grp) => {
      const distinctRooms = new Set(grp.distribution.map((d) => d.roomId)).size;
      const distinctBuildings = new Set(grp.distribution.map((d) => d.buildingId)).size;
      return {
        ...grp,
        roomsCount: distinctRooms,
        buildingsCount: distinctBuildings,
      };
    });

    // Sort alphabetically by item name
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [inventoryList, searchTerm, selectedBuildingIds, buildingTypeFilter, categoryFilter]);

  // Overall Dynamic Statistics
  const stats = useMemo(() => {
    const totalPieces = inventoryList.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const uniqueItemNames = new Set(inventoryList.map((i) => i.name.toLowerCase())).size;
    const coveredRooms = new Set(inventoryList.map((i) => i.roomId)).size;

    const livingItems = inventoryList.filter((i) => i.buildingType === 'Living');
    const utilityItems = inventoryList.filter((i) => i.buildingType === 'Utility');

    const livingPieces = livingItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const utilityPieces = utilityItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const utilityRooms = new Set(utilityItems.map((i) => i.roomId)).size;

    const categoryCounts: Record<string, number> = {};
    inventoryList.forEach((it) => {
      categoryCounts[it.category] = (categoryCounts[it.category] || 0) + it.quantity;
    });

    return {
      totalPieces,
      uniqueItemNames,
      coveredRooms,
      livingPieces,
      utilityPieces,
      utilityRooms,
      categoryCounts,
    };
  }, [inventoryList]);

  // Detailed inventory stats per building (total pieces, unique items, units count)
  const buildingStatsMap = useMemo(() => {
    const map: Record<string, { totalQty: number; uniqueItems: number; unitCount: number }> = {};

    buildings.forEach((b) => {
      map[b.id] = { totalQty: 0, uniqueItems: 0, unitCount: b.totalRooms || 0 };
    });

    utilityBuildings.forEach((ub) => {
      map[ub.id] = {
        totalQty: 0,
        uniqueItems: 0,
        unitCount: ub.roomsCount || ub.rooms?.length || 0,
      };
    });

    const buildingItemNames: Record<string, Set<string>> = {};

    inventoryList.forEach((item) => {
      if (!map[item.buildingId]) {
        map[item.buildingId] = { totalQty: 0, uniqueItems: 0, unitCount: 0 };
      }
      map[item.buildingId].totalQty += item.quantity || 0;

      if (!buildingItemNames[item.buildingId]) {
        buildingItemNames[item.buildingId] = new Set();
      }
      buildingItemNames[item.buildingId].add(item.name.trim().toLowerCase());
    });

    Object.keys(buildingItemNames).forEach((bId) => {
      if (map[bId]) {
        map[bId].uniqueItems = buildingItemNames[bId].size;
      }
    });

    return map;
  }, [buildings, utilityBuildings, inventoryList]);

  // Total quantity for currently selected/combined buildings
  const selectedTotalPieces = useMemo(() => {
    if (selectedBuildingIds.size === 0) {
      return stats.totalPieces;
    }
    return inventoryList
      .filter((item) => selectedBuildingIds.has(item.buildingId))
      .reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [selectedBuildingIds, stats.totalPieces, inventoryList]);

  const isAllSelected = selectedBuildingIds.size === 0;

  const toggleBuildingSelection = (id: string) => {
    setSelectedBuildingIds((prev) => {
      // If currently all buildings are selected, clicking one isolates to this building
      if (prev.size === 0) {
        return new Set([id]);
      }

      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // If empty, reverts naturally to All Buildings
        return next;
      } else {
        next.add(id);
        const totalBuildingsCount = buildings.length + utilityBuildings.length;
        if (next.size >= totalBuildingsCount) {
          return new Set();
        }
        return next;
      }
    });
  };

  const isAllLivingSelected = useMemo(() => {
    if (buildings.length === 0 || selectedBuildingIds.size !== buildings.length) return false;
    return buildings.every((b) => selectedBuildingIds.has(b.id));
  }, [buildings, selectedBuildingIds]);

  const isAllUtilitySelected = useMemo(() => {
    if (utilityBuildings.length === 0 || selectedBuildingIds.size !== utilityBuildings.length) return false;
    return utilityBuildings.every((ub) => selectedBuildingIds.has(ub.id));
  }, [utilityBuildings, selectedBuildingIds]);

  const handleSelectAllLiving = () => {
    if (isAllLivingSelected) {
      setSelectedBuildingIds(new Set());
    } else {
      setSelectedBuildingIds(new Set(buildings.map((b) => b.id)));
    }
  };

  const handleSelectAllUtility = () => {
    if (isAllUtilitySelected) {
      setSelectedBuildingIds(new Set());
    } else {
      setSelectedBuildingIds(new Set(utilityBuildings.map((ub) => ub.id)));
    }
  };

  const getUtilityBuildingIcon = (category?: string) => {
    switch (category) {
      case 'Washroom Building':
        return <Bath className="w-4 h-4 text-sky-600" />;
      case 'Kitchen Building':
        return <UtensilsCrossed className="w-4 h-4 text-amber-600" />;
      case 'Offices Building':
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      case 'Workshop Building':
        return <Wrench className="w-4 h-4 text-orange-600" />;
      case 'Camp Store Building':
        return <Warehouse className="w-4 h-4 text-emerald-600" />;
      default:
        return <Layers className="w-4 h-4 text-neutral-600" />;
    }
  };

  // Toggle item accordion expansion
  const toggleExpand = (name: string) => {
    const key = name.trim().toLowerCase();
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedItems(new Set(groupedInventory.map((g) => g.name.trim().toLowerCase())));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  // Toggle record selection for bulk delete
  const toggleSelectRecord = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectGroup = (group: GroupedInventoryItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const groupIds = group.distribution.map((d) => d.id);
    const allSelected = groupIds.every((id) => selectedRecordIds.has(id));

    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        groupIds.forEach((id) => next.delete(id));
      } else {
        groupIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // In-place live stepper update (0ms latency, applies to both Living & Utility)
  const handleUpdateQuantity = async (record: FlatInventoryRecord, delta: number) => {
    const newQty = Math.max(0, record.quantity + delta);

    // Optimistic UI update
    setInventoryList((prev) =>
      prev
        .map((r) => (r.id === record.id ? { ...r, quantity: newQty } : r))
        .filter((r) => r.quantity > 0)
    );

    try {
      if (record.buildingType === 'Utility') {
        await utilityBuildingService.updateRoomInventoryQuantity(
          record.buildingId,
          record.roomId,
          record.itemId,
          newQty
        );
      } else {
        await roomService.updateCampInventoryItem(
          record.roomId,
          record.itemId,
          record.name,
          newQty
        );
      }
    } catch {
      toastError(isRTL ? 'فشل تحديث الكمية' : 'Failed to update quantity');
    }
  };

  // Delete single item confirmation
  const handleConfirmSingleDelete = async () => {
    if (!itemToDelete) return;
    const record = itemToDelete;

    setInventoryList((prev) => prev.filter((r) => r.id !== record.id));
    setItemToDelete(null);

    try {
      if (record.buildingType === 'Utility') {
        await utilityBuildingService.deleteItemFromUtilityRoom(
          record.buildingId,
          record.roomId,
          record.itemId
        );
      } else {
        await roomService.deleteCampInventoryItem(record.roomId, record.itemId);
      }
      success(isRTL ? 'تم حذف العنصر بنجاح' : 'Item deleted successfully');
    } catch {
      toastError(isRTL ? 'فشل حذف العنصر' : 'Failed to delete item');
    }
  };

  // Bulk Delete confirmed
  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteTarget || bulkDeleteTarget.items.length === 0) return;
    const itemsToDelete = bulkDeleteTarget.items;

    const livingItems = itemsToDelete.filter((i) => i.buildingType !== 'Utility');
    const utilityItems = itemsToDelete.filter((i) => i.buildingType === 'Utility');

    const idsSet = new Set(itemsToDelete.map((i) => i.id));
    setInventoryList((prev) => prev.filter((r) => !idsSet.has(r.id)));
    setSelectedRecordIds((prev) => {
      const next = new Set(prev);
      idsSet.forEach((id) => next.delete(id));
      return next;
    });
    setBulkDeleteTarget(null);

    try {
      const promises: Promise<void>[] = [];
      if (livingItems.length > 0) {
        promises.push(
          roomService.bulkDeleteCampInventory(
            livingItems.map((i) => ({ roomId: i.roomId, itemId: i.itemId }))
          )
        );
      }
      if (utilityItems.length > 0) {
        promises.push(
          utilityBuildingService.bulkDeleteUtilityInventory(
            utilityItems.map((i) => ({
              buildingId: i.buildingId,
              roomId: i.roomId,
              itemId: i.itemId,
            }))
          )
        );
      }

      await Promise.all(promises);
      success(
        isRTL
          ? `تم حذف ${itemsToDelete.length} عنصر بنجاح`
          : `Successfully deleted ${itemsToDelete.length} item allocation(s)`
      );
      await loadData();
    } catch {
      toastError(isRTL ? 'فشل الحذف الجماعي' : 'Failed to bulk delete items');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (record: FlatInventoryRecord) => {
    setEditingItem(record);
    setEditName(record.name);
    setEditQty(record.quantity);
  };

  // Save Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const trimmedName = editName.trim() || editingItem.name;
    const qty = Math.max(0, Number(editQty));

    setInventoryList((prev) =>
      prev
        .map((r) =>
          r.id === editingItem.id
            ? {
                ...r,
                name: trimmedName,
                quantity: qty,
                category: getInventoryCategory(trimmedName),
              }
            : r
        )
        .filter((r) => r.quantity > 0)
    );

    try {
      if (editingItem.buildingType === 'Utility') {
        await utilityBuildingService.updateItemInUtilityRoom(
          editingItem.buildingId,
          editingItem.roomId,
          editingItem.itemId,
          { name: trimmedName, quantity: qty }
        );
      } else {
        await roomService.updateCampInventoryItem(
          editingItem.roomId,
          editingItem.itemId,
          trimmedName,
          qty
        );
      }
      success(isRTL ? 'تم تحديث بيانات العنصر' : 'Item updated');
      setEditingItem(null);
    } catch {
      toastError(isRTL ? 'فشل تحديث بيانات العنصر' : 'Failed to update item');
    }
  };

  // Save Add Item Modal
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuildingId || !newItemName.trim()) return;

    const trimmedName = newItemName.trim();
    const qty = Math.max(1, Number(newItemQty) || 1);

    try {
      const isUtility = utilityBuildings.some((ub) => ub.id === selectedBuildingId);
      if (isUtility) {
        const uBld = utilityBuildings.find((ub) => ub.id === selectedBuildingId);
        if (targetRoomOption === 'ALL') {
          if (uBld) {
            for (const rm of uBld.rooms) {
              await utilityBuildingService.addItemToUtilityRoom(selectedBuildingId, rm.id, {
                name: trimmedName,
                quantity: qty,
              });
            }
          }
        } else {
          await utilityBuildingService.addItemToUtilityRoom(selectedBuildingId, targetRoomOption, {
            name: trimmedName,
            quantity: qty,
          });
        }
      } else {
        await roomService.addCampInventoryItem(
          selectedBuildingId,
          targetRoomOption,
          trimmedName,
          qty
        );
      }

      success(
        targetRoomOption === 'ALL'
          ? (isRTL ? 'تمت إضافة العنصر لكافة غرف/وحدات المبنى' : 'Item added to all units in building')
          : (isRTL ? 'تمت إضافة العنصر للغرفة/الوحدة المحددة' : 'Item added to selected unit')
      );
      setIsAddModalOpen(false);
      setNewItemName('');
      setNewItemQty(1);
      await loadData();
    } catch {
      toastError(isRTL ? 'فشل إضافة العنصر' : 'Failed to add item');
    }
  };

  // Helper icon for building category
  const getRecordIcon = (rec: FlatInventoryRecord) => {
    if (rec.buildingType === 'Utility') {
      switch (rec.buildingCategory) {
        case 'Washroom Building':
          return <Bath className="w-3.5 h-3.5 text-sky-600 shrink-0" />;
        case 'Kitchen Building':
          return <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
        case 'Offices Building':
          return <Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
        case 'Workshop Building':
          return <Wrench className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
        case 'Camp Store Building':
          return <Warehouse className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
        default:
          return <Layers className="w-3.5 h-3.5 text-neutral-500 shrink-0" />;
      }
    }
    return <DoorOpen className="w-3.5 h-3.5 text-orange-600 shrink-0" />;
  };

  const quickPresets = [
    'AC',
    'Bed',
    'Blanket',
    'Pillow',
    'Water Heater',
    'Wash Basin',
    'Toilet Seat',
    'Exhaust Fan',
    'Gas Cylinder',
    'Commercial Gas Stove',
    'Executive Office Desk',
    'Office Chair',
    'Heavy Tool Kit',
    'Air Compressor',
    'Safety PPE Kit',
    'Storage Rack',
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-28 bg-white border border-neutral-200 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-32 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
          <div className="h-32 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
        </div>
        <div className="p-4 bg-white border border-neutral-200 rounded-2xl space-y-3">
          <div className="h-6 w-48 bg-neutral-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-neutral-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
        <div className="h-80 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                  {isRTL ? 'إدارة مخزون وأصول المخيم الشاملة' : 'Camp Consolidated Inventory & Assets'}
                </h1>
                <p className="text-xs text-neutral-500">
                  {isRTL
                    ? 'جرد مجمع وشامل للمباني السكنية ومباني الخدمات (دورات المياه، المطابخ، المكاتب، الورش، المستودع) بدون تكرار'
                    : 'Unified inventory across Residential and Utility Buildings (Washrooms, Kitchens, Offices, Workshops, Camp Store).'}
                </p>
              </div>
            </div>
          </div>

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
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setSelectedBuildingId(buildings[0]?.id || utilityBuildings[0]?.id || '');
                setTargetRoomOption('ALL');
                setIsAddModalOpen(true);
              }}
            >
              {isRTL ? '+ إضافة عنصر مخزون' : '+ Add Inventory Item'}
            </Button>
          </div>
        </div>
      </div>

      {/* CAMP OVERVIEW SUMMARY: Living & Utility Facilities Macro Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Living Buildings Macro Card */}
        <div
          onClick={handleSelectAllLiving}
          className={`bg-white rounded-2xl p-5 shadow-xs border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between select-none ${
            isAllLivingSelected
              ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-sm bg-orange-50/20'
              : 'border-neutral-200 hover:border-neutral-400 hover:shadow-sm'
          }`}
          title={isRTL ? 'انقر لتحديد أو إلغاء تحديد كافة المباني السكنية' : 'Click to filter all living buildings'}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center">
                <DoorOpen className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                {isRTL ? 'مخزون المباني السكنية' : 'Living Buildings'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isAllLivingSelected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  {isRTL ? '✓ محدد' : '✓ Active'}
                </span>
              )}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 font-mono text-neutral-700 border border-neutral-200">
                {buildings.length} {isRTL ? 'مبنى' : 'Blocks'}
              </span>
            </div>
          </div>

          <div className="my-3.5">
            <span className="text-3xl font-black text-neutral-900 font-mono tracking-tight">
              {stats.livingPieces.toLocaleString()}{' '}
              <span className="text-xs font-normal text-neutral-500">pcs</span>
            </span>
            <p className="text-xs text-neutral-600 mt-1 font-medium">
              {isRTL ? 'أصول وغرف سكن العمال والمشرفين' : 'Residential accommodation assets'}
            </p>
          </div>

          <div className="pt-2.5 border-t border-neutral-200 text-xs text-neutral-600 flex items-center justify-between font-semibold">
            <span>{isRTL ? 'غرف سكنية مغطاة:' : 'Rooms Covered:'}</span>
            <span className="font-mono font-bold text-neutral-900">
              {stats.coveredRooms - stats.utilityRooms} rooms
            </span>
          </div>
        </div>

        {/* Utility Buildings Macro Card */}
        <div
          onClick={handleSelectAllUtility}
          className={`bg-white rounded-2xl p-5 shadow-xs border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between select-none ${
            isAllUtilitySelected
              ? 'border-orange-500 ring-2 ring-orange-500/20 shadow-sm bg-orange-50/20'
              : 'border-neutral-200 hover:border-neutral-400 hover:shadow-sm'
          }`}
          title={isRTL ? 'انقر لتحديد أو إلغاء تحديد كافة المباني الخدمية' : 'Click to filter all utility facilities'}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-orange-700">
                {isRTL ? 'مخزون المباني الخدمية' : 'Utility Facilities'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isAllUtilitySelected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  {isRTL ? '✓ محدد' : '✓ Active'}
                </span>
              )}
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 font-mono text-neutral-700 border border-neutral-200">
                {utilityBuildings.length} {isRTL ? 'مبنى خدمي' : 'Blocks'}
              </span>
            </div>
          </div>

          <div className="my-3.5">
            <span className="text-3xl font-black text-orange-600 font-mono tracking-tight">
              {stats.utilityPieces.toLocaleString()}{' '}
              <span className="text-xs font-normal text-neutral-500">pcs</span>
            </span>
            <p className="text-xs text-neutral-600 mt-1 font-medium">
              {isRTL ? 'دورات مياه، مطابخ، ورش، مكاتب، مستودع المخيم' : 'Washrooms, kitchens, offices, store, workshops'}
            </p>
          </div>

          <div className="pt-2.5 border-t border-neutral-200 text-xs text-neutral-600 flex items-center justify-between font-semibold">
            <span>{isRTL ? 'وحدات ومرافق مغطاة:' : 'Utility Units Covered:'}</span>
            <span className="font-mono font-bold text-orange-600">{stats.utilityRooms} units</span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE BUILDING SELECTION TILES: Clickable Tiles with Inventory Counts & Multi-Combine Support */}
      <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-neutral-900">
                {isRTL ? 'مخزون المباني (انقر على أي مبنى للدمج والعرض أدناه)' : 'Building Inventory Tiles (Click to Combine)'}
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 font-mono">
                {isAllSelected
                  ? isRTL ? 'كافة المباني معروضة' : 'All Buildings Selected'
                  : isRTL ? `${selectedBuildingIds.size} مبنى مدمج` : `${selectedBuildingIds.size} Building(s) Combined`}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {isRTL
                ? 'انقر على بطاقات المباني لاختيار مبنى واحد أو دمج عدة مباني لعرض المخزون المجمع لها معاً بدون تكرار'
                : 'Click tiles to select one or multiple buildings to combine and view their unified inventory below.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isAllSelected && (
              <button
                type="button"
                onClick={() => setSelectedBuildingIds(new Set())}
                className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isRTL ? 'عرض كافة المباني' : 'Reset to All Buildings'}</span>
              </button>
            )}
          </div>
        </div>

        {/* TILES GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* 1. ALL BUILDINGS TILE */}
          <div
            onClick={() => setSelectedBuildingIds(new Set())}
            className={`group p-4 rounded-2xl flex flex-col justify-between min-h-[125px] transition-all cursor-pointer relative border select-none ${
              isAllSelected
                ? 'border-2 border-orange-600 bg-orange-600 text-white shadow-md shadow-orange-500/20'
                : 'border border-neutral-200 bg-white text-neutral-900 hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isAllSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-orange-50 text-orange-600 border border-orange-200'
                }`}
              >
                <Boxes className="w-4 h-4" />
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-mono ${
                  isAllSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {isAllSelected ? (isRTL ? '✓ نشط' : '✓ Active') : (isRTL ? 'الكل' : 'All')}
              </span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${isAllSelected ? 'text-white' : 'text-neutral-900'}`}>
                  {stats.totalPieces.toLocaleString()}
                </span>
                <span className={`text-xs font-bold uppercase ${isAllSelected ? 'text-orange-100' : 'text-neutral-500'}`}>
                  pcs
                </span>
              </div>
            </div>

            <div>
              <span className={`text-xs font-black block truncate ${isAllSelected ? 'text-white' : 'text-neutral-900'}`}>
                {isRTL ? 'كافة المباني' : 'All Buildings'}
              </span>
              <span className={`text-[11px] block truncate ${isAllSelected ? 'text-orange-100' : 'text-neutral-500'}`}>
                {buildings.length + utilityBuildings.length} {isRTL ? 'مبنى إجمالي' : 'Total Blocks'}
              </span>
            </div>
          </div>

          {/* 2. LIVING BUILDINGS TILES */}
          {buildings.map((b) => {
            const isSelected = selectedBuildingIds.has(b.id);
            const qty = buildingStatsMap[b.id]?.totalQty || 0;

            return (
              <div
                key={b.id}
                onClick={() => toggleBuildingSelection(b.id)}
                className={`group p-4 rounded-2xl flex flex-col justify-between min-h-[125px] transition-all cursor-pointer relative border select-none ${
                  isSelected
                    ? 'border-2 border-orange-500 bg-orange-50 shadow-md ring-2 ring-orange-500/15'
                    : 'border border-neutral-200 bg-white text-neutral-900 hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center">
                    <DoorOpen className="w-4 h-4" />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBuildingIds(new Set([b.id]));
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-orange-700 hover:text-orange-900 bg-white/90 px-1.5 py-0.5 rounded border border-orange-300 transition"
                      title={isRTL ? 'عرض هذا المبنى فقط' : 'View only this building'}
                    >
                      {isRTL ? 'فقط' : 'Only'}
                    </button>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        {isRTL ? 'سكني' : 'Living'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-neutral-900">
                      {qty.toLocaleString()}
                    </span>
                    <span className={`text-xs uppercase font-bold ${isSelected ? 'text-orange-700' : 'text-neutral-500'}`}>
                      pcs
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-extrabold text-neutral-900 block truncate" title={b.name}>
                    {b.name}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-medium block truncate">
                    {b.totalRooms || 0} {isRTL ? 'غرفة' : 'Rooms'}
                  </span>
                </div>
              </div>
            );
          })}

          {/* 3. UTILITY BUILDINGS TILES */}
          {utilityBuildings.map((ub) => {
            const isSelected = selectedBuildingIds.has(ub.id);
            const qty = buildingStatsMap[ub.id]?.totalQty || 0;

            return (
              <div
                key={ub.id}
                onClick={() => toggleBuildingSelection(ub.id)}
                className={`group p-4 rounded-2xl flex flex-col justify-between min-h-[125px] transition-all cursor-pointer relative border select-none ${
                  isSelected
                    ? 'border-2 border-orange-500 bg-orange-50 shadow-md ring-2 ring-orange-500/15'
                    : 'border border-neutral-200 bg-white text-neutral-900 hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
                    {getUtilityBuildingIcon(ub.category)}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBuildingIds(new Set([ub.id]));
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-orange-700 hover:text-orange-900 bg-white/90 px-1.5 py-0.5 rounded border border-orange-300 transition"
                      title={isRTL ? 'عرض هذا المبنى فقط' : 'View only this building'}
                    >
                      {isRTL ? 'فقط' : 'Only'}
                    </button>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded truncate max-w-[70px]">
                        {ub.category.replace(' Building', '')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-neutral-900">
                      {qty.toLocaleString()}
                    </span>
                    <span className={`text-xs uppercase font-bold ${isSelected ? 'text-orange-700' : 'text-neutral-500'}`}>
                      pcs
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-extrabold text-neutral-900 block truncate" title={ub.name}>
                    {ub.name}
                  </span>
                  <span className="text-[11px] text-neutral-500 font-medium block truncate">
                    {ub.roomsCount || ub.rooms?.length || 0} {isRTL ? 'وحدة خدمية' : 'Units'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* COMBINED SELECTION ACTIVE STATUS BANNER */}
        {!isAllSelected && (
          <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2.5 text-xs bg-orange-50/50 p-3 rounded-xl border border-orange-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-neutral-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-orange-600" />
                {isRTL ? 'المخزون المجمع للمباني المحددة:' : 'Showing Combined Inventory For:'}
              </span>
              {Array.from(selectedBuildingIds).map((bId) => {
                const bObj = buildings.find((b) => b.id === bId) || utilityBuildings.find((ub) => ub.id === bId);
                const bQty = buildingStatsMap[bId]?.totalQty || 0;
                return (
                  <span
                    key={bId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-orange-300 font-bold text-neutral-900 text-xs shadow-2xs"
                  >
                    <span>{bObj?.name || bId}</span>
                    <span className="text-[11px] font-mono text-orange-600 font-black">
                      {bQty.toLocaleString()} pcs
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBuildingSelection(bId);
                      }}
                      className="text-neutral-400 hover:text-red-500 transition ms-0.5"
                      title={isRTL ? 'إزالة هذا المبنى' : 'Remove from combined view'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
              <span className="font-mono font-black text-orange-900 bg-orange-200/70 px-2.5 py-1 rounded-lg border border-orange-300">
                {isRTL ? 'الإجمالي المجمع:' : 'Combined Total:'} {selectedTotalPieces.toLocaleString()} pcs
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBuildingIds(new Set())}
              className="text-xs font-bold text-orange-700 hover:text-orange-900 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>{isRTL ? 'إلغاء التحديد وعرض كافة المباني' : 'Reset to All Buildings'}</span>
            </button>
          </div>
        )}
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isRTL
                  ? 'بحث باسم المادة، المبنى، رقم الغرفة/الوحدة، الصنف...'
                  : 'Search by item name, building, room/unit, category...'
              }
              className="w-full h-9.5 ps-9 pe-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
            />
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between lg:justify-end">
            {/* Filter 1: Building Category / Type (Living vs Utility vs All) */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 h-9.5">
              <Layers className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={buildingTypeFilter}
                onChange={(e) => setBuildingTypeFilter(e.target.value)}
                className="bg-transparent text-xs text-neutral-800 focus:outline-hidden cursor-pointer"
              >
                <option value="All">{isRTL ? 'كافة الفئات (سكني + خدمي)' : 'All Types (Living + Utility)'}</option>
                <option value="Living">{isRTL ? 'المباني السكنية فقط' : 'Living Buildings Only'}</option>
                <option value="Utility">{isRTL ? 'كافة المباني الخدمية' : 'All Utility Facilities'}</option>
                <option value="Washroom Building">{isRTL ? 'دورات مياه (Washrooms)' : 'Washroom Buildings'}</option>
                <option value="Kitchen Building">{isRTL ? 'مطابخ (Kitchens)' : 'Kitchen Buildings'}</option>
                <option value="Offices Building">{isRTL ? 'مكاتب (Offices)' : 'Offices Buildings'}</option>
                <option value="Workshop Building">{isRTL ? 'ورش صيانة (Workshops)' : 'Workshop Buildings'}</option>
                <option value="Camp Store Building">{isRTL ? 'مستودع المخيم (Camp Store)' : 'Camp Store Buildings'}</option>
              </select>
            </div>

            {/* Filter 2: Specific Building */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 h-9.5 max-w-[210px]">
              <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={
                  selectedBuildingIds.size === 0
                    ? 'All'
                    : selectedBuildingIds.size === 1
                    ? Array.from(selectedBuildingIds)[0]
                    : 'MULTIPLE'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'All') {
                    setSelectedBuildingIds(new Set());
                  } else {
                    setSelectedBuildingIds(new Set([val]));
                  }
                }}
                className="bg-transparent text-xs text-neutral-800 focus:outline-hidden cursor-pointer truncate"
              >
                <option value="All">{isRTL ? 'كافة المباني' : 'All Buildings'}</option>
                {selectedBuildingIds.size > 1 && (
                  <option value="MULTIPLE" disabled>
                    {isRTL
                      ? `محدد (${selectedBuildingIds.size} مبنى مدمج)`
                      : `Combined (${selectedBuildingIds.size} Buildings)`}
                  </option>
                )}
                <optgroup label={isRTL ? 'المباني السكنية' : 'Living Buildings'}>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={isRTL ? 'المباني الخدمية' : 'Utility Facilities'}>
                  {utilityBuildings.map((ub) => (
                    <option key={ub.id} value={ub.id}>
                      {ub.name} ({ub.category.replace(' Building', '')})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Filter 3: Item Category */}
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 h-9.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-xs text-neutral-800 focus:outline-hidden cursor-pointer"
              >
                <option value="All">{isRTL ? 'كافة أصناف المواد' : 'All Item Categories'}</option>
                <option value="Bedding & Accommodation">Bedding & Accommodation</option>
                <option value="Climate & Cooling">Climate & Cooling</option>
                <option value="Kitchen & Catering">Kitchen & Catering</option>
                <option value="Electrical & Lighting">Electrical & Lighting</option>
                <option value="Sanitary & Utilities">Sanitary & Utilities</option>
                <option value="Safety & Store Supplies">Safety & Store Supplies</option>
                <option value="Workshop & Tools">Workshop & Tools</option>
                <option value="Office Equipment">Office Equipment</option>
              </select>
            </div>

            {/* Expand / Collapse All buttons */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-white transition"
              >
                {isRTL ? 'توسيع الكل' : 'Expand All'}
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-white transition"
              >
                {isRTL ? 'طي الكل' : 'Collapse All'}
              </button>
            </div>
          </div>
        </div>

        {/* Global Multi-Select Actions Bar */}
        {selectedRecordIds.size > 0 && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-900">
              <CheckSquare className="w-4 h-4 text-orange-600" />
              <span>
                {isRTL
                  ? `تم تحديد ${selectedRecordIds.size} عنصر للحذف الجماعي`
                  : `${selectedRecordIds.size} items selected for bulk deletion`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRecordIds(new Set())}
                className="px-2.5 py-1 text-xs text-neutral-600 hover:text-neutral-900"
              >
                {isRTL ? 'إلغاء التحديد' : 'Clear Selection'}
              </button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  const targetItems = inventoryList.filter((r) => selectedRecordIds.has(r.id));
                  setBulkDeleteTarget({
                    title: isRTL
                      ? `حذف العناصر المحددة (${selectedRecordIds.size} عنصر)`
                      : `Delete Selected Items (${selectedRecordIds.size} allocations)`,
                    items: targetItems,
                  });
                }}
              >
                {isRTL ? 'حذف المحدد' : 'Delete Selected'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* DEDUPLICATED GROUPED INVENTORY LIST WITH ACCORDION DISTRIBUTION */}
      <div className="space-y-3">
        {groupedInventory.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400 space-y-2 shadow-2xs">
            <Boxes className="w-8 h-8 mx-auto text-neutral-300 stroke-[1.5]" />
            <p className="text-xs font-medium">
              {isRTL ? 'لا توجد عناصر مخزون مطابقة' : 'No inventory items match your filter'}
            </p>
          </div>
        ) : (
          groupedInventory.map((group) => {
            const isExpanded = expandedItems.has(group.name.trim().toLowerCase());
            const groupIds = group.distribution.map((d) => d.id);
            const allGroupSelected = groupIds.length > 0 && groupIds.every((id) => selectedRecordIds.has(id));

            return (
              <div
                key={group.name}
                className="bg-white border border-neutral-200/90 rounded-2xl overflow-hidden shadow-2xs transition hover:border-neutral-300"
              >
                {/* PRIMARY CONSOLIDATED ROW */}
                <div
                  onClick={() => toggleExpand(group.name)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-neutral-50/70 transition"
                >
                  {/* Left: Checkbox, Accordion Icon, Item Name & Badges */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => toggleSelectGroup(group, e)}
                      className="text-neutral-400 hover:text-orange-600 transition"
                      title={allGroupSelected ? 'Deselect Group' : 'Select Group'}
                    >
                      {allGroupSelected ? (
                        <CheckSquare className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Square className="w-4 h-4 text-neutral-300 hover:text-neutral-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0 hover:bg-orange-50 hover:text-orange-600 transition"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-orange-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                      <PackageCheck className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-neutral-900 tracking-tight">
                          {group.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700">
                          {group.category}
                        </span>

                        {/* Origin Source Badges */}
                        {group.hasLiving && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {isRTL ? 'مباني سكنية' : 'Living'}
                          </span>
                        )}
                        {group.hasUtility && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {isRTL ? 'مباني خدمات' : 'Utility'}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5 font-mono">
                        <span>
                          {group.roomsCount} {isRTL ? 'غرفة/وحدة مسجل بها' : 'Units Covered'}
                        </span>
                        <span>•</span>
                        <span>
                          {group.buildingsCount} {isRTL ? 'مبنى' : 'Building(s)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Consolidated Total Quantity, Quick Delete All, and View Rooms Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="bg-orange-50/80 border border-orange-200 rounded-xl px-3.5 py-1.5 text-center">
                      <span className="text-[10px] uppercase font-bold text-orange-600 block">
                        {isRTL ? 'إجمالي الكمية' : 'Total Stock'}
                      </span>
                      <span className="text-sm font-black text-neutral-900 font-mono">
                        {group.totalQuantity}{' '}
                        <span className="text-xs font-medium text-neutral-500">Pcs</span>
                      </span>
                    </div>

                    {/* Delete All Button for this Item Group */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBulkDeleteTarget({
                          title: isRTL
                            ? `حذف جميع قطع "${group.name}" في المخيم (${group.totalQuantity} قطعة)`
                            : `Delete all "${group.name}" across Camp (${group.totalQuantity} pcs)`,
                          items: group.distribution,
                        });
                      }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-neutral-200/70 hover:border-red-200 transition"
                      title={isRTL ? 'حذف كافة قطع هذه المادة' : 'Delete all allocations across camp'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(group.name);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-neutral-300 text-xs font-semibold text-neutral-700 bg-neutral-50 hover:bg-neutral-100 flex items-center gap-1.5 transition"
                    >
                      <span>
                        {isExpanded
                          ? isRTL
                            ? 'إخفاء الوحدات'
                            : 'Hide Units'
                          : isRTL
                          ? `عرض التفاصيل (${group.distribution.length})`
                          : `View Units (${group.distribution.length})`}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-orange-600" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ACCORDION DROPDOWN: Room / Unit Allocations Breakdown */}
                {isExpanded && (
                  <div className="border-t border-neutral-200 bg-neutral-50/50 p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>
                          {isRTL
                            ? `توزيع وتواجد ${group.name} في مباني وغرف المخيم:`
                            : `Distribution & Allocations for ${group.name}:`}
                        </span>
                      </span>
                      <span className="font-mono text-neutral-400">
                        {group.distribution.length} {isRTL ? 'غرفة/وحدة مسجلة' : 'active unit allocations'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {group.distribution.map((record) => {
                        const isSelected = selectedRecordIds.has(record.id);

                        return (
                          <div
                            key={record.id}
                            className={`bg-white border rounded-xl p-3 flex items-center justify-between gap-2 shadow-2xs transition ${
                              isSelected
                                ? 'border-orange-500 bg-orange-50/20 ring-1 ring-orange-500/30'
                                : 'border-neutral-200/90 hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => toggleSelectRecord(record.id, e)}
                                className="text-neutral-300 hover:text-orange-600 shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-orange-600" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 truncate">
                                  {getRecordIcon(record)}
                                  <span className="truncate">{record.roomNumber}</span>
                                  <span className="text-[10px] text-neutral-400 font-normal font-mono">
                                    (Floor {record.floor})
                                  </span>
                                </div>
                                <div className="text-[11px] text-neutral-500 truncate flex items-center gap-1 mt-0.5">
                                  <Building2 className="w-3 h-3 text-neutral-400 shrink-0" />
                                  <span className="truncate">{record.buildingName}</span>
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                                      record.buildingType === 'Utility'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-blue-50 text-blue-700'
                                    }`}
                                  >
                                    {record.buildingType === 'Utility'
                                      ? record.buildingCategory?.replace(' Building', '') || 'Utility'
                                      : 'Living'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Stepper & Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="flex items-center bg-white border border-neutral-200 rounded-lg shadow-3xs overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(record, -1)}
                                  className="px-1.5 py-0.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                                  title="Decrease"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="px-2 py-0.5 text-center font-mono text-xs font-bold text-neutral-900 min-w-[24px]">
                                  {record.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantity(record, 1)}
                                  className="px-1.5 py-0.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                                  title="Increase"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(record)}
                                className="p-1 rounded text-neutral-400 hover:text-orange-600 hover:bg-orange-50 transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setItemToDelete(record)}
                                className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: ADD INVENTORY ITEM (Supports both Living and Utility Buildings) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {isRTL ? 'إضافة مادة / أصل جديد' : 'Add Inventory Item'}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {isRTL
                      ? 'مباني سكنية أو مباني خدمات (دورات مياه، مطابخ، ورش، مكاتب، مستودع)'
                      : 'Living accommodation or utility facility buildings'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'المبنى (سكني أو خدمي)' : 'Select Building (Living or Utility)'} <span className="text-orange-600">*</span>
                </label>
                <select
                  required
                  value={selectedBuildingId}
                  onChange={(e) => {
                    setSelectedBuildingId(e.target.value);
                    setTargetRoomOption('ALL');
                  }}
                  className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <optgroup label={isRTL ? 'المباني السكنية (Residential)' : 'Living Buildings (Residential)'}>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.buildingNumber})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={isRTL ? 'المباني الخدمية (Facilities)' : 'Utility Facilities (Non-residential)'}>
                    {utilityBuildings.map((ub) => (
                      <option key={ub.id} value={ub.id}>
                        {ub.name} — [{ub.category.replace(' Building', '')}]
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'نطاق التطبيق (الغرفة أو الوحدة الخدمية)' : 'Unit / Room Assignment'} <span className="text-orange-600">*</span>
                </label>
                <select
                  value={targetRoomOption}
                  onChange={(e) => setTargetRoomOption(e.target.value)}
                  className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                >
                  <option value="ALL">
                    {isRTL ? '★ كافة غرف / وحدات هذا المبنى' : '★ All Rooms / Units in this Building'}
                  </option>
                  {buildingRooms.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.roomNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'اسم المادة' : 'Item Name'} <span className="text-orange-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. AC, Bed, Water Heater, Safety PPE..."
                  className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />

                <div className="pt-2 flex flex-wrap gap-1">
                  {quickPresets.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewItemName(preset)}
                      className="px-2 py-0.5 rounded-lg bg-neutral-100 hover:bg-orange-50 hover:text-orange-700 text-[10px] text-neutral-600 font-medium transition"
                    >
                      +{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'الكمية لكل غرفة / وحدة' : 'Quantity per Unit'} <span className="text-orange-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value)))}
                  className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {isRTL ? 'إضافة إلى المخزون' : 'Add to Inventory'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT INVENTORY ITEM */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
          <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                  <Edit2 className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {isRTL ? 'تعديل عنصر المخزون' : 'Edit Inventory Item'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-4 space-y-3.5 text-xs">
              <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 space-y-0.5 text-[11px] text-neutral-600">
                <div className="font-semibold text-neutral-800 flex items-center justify-between">
                  <span>{editingItem.buildingName}</span>
                  <span className="text-[10px] text-orange-600 font-mono">
                    {editingItem.buildingType === 'Utility' ? editingItem.buildingCategory : 'Living Building'}
                  </span>
                </div>
                <div className="font-mono text-neutral-500">
                  {editingItem.roomNumber} (Floor {editingItem.floor})
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'اسم المادة' : 'Item Name'}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'الكمية' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editQty}
                  onChange={(e) => setEditQty(Number(e.target.value))}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingItem(null)}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SINGLE ITEM DELETE CONFIRMATION */}
      {itemToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs"
          onClick={() => setItemToDelete(null)}
        >
          <div
            className="bg-white border border-neutral-200 rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-3.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-neutral-900">
                  {isRTL ? 'تأكيد حذف العنصر' : 'Delete Inventory Item'}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isRTL
                    ? `هل أنت متأكد من حذف "${itemToDelete.name}" (${itemToDelete.quantity} قطعة) من ${itemToDelete.buildingName} - ${itemToDelete.roomNumber}؟`
                    : `Delete "${itemToDelete.name}" (${itemToDelete.quantity} pcs) from ${itemToDelete.buildingName} - ${itemToDelete.roomNumber}?`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemToDelete(null)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmSingleDelete}
              >
                {isRTL ? 'حذف' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK DELETE CONFIRMATION */}
      {bulkDeleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs"
          onClick={() => setBulkDeleteTarget(null)}
        >
          <div
            className="bg-white border border-neutral-200 rounded-2xl w-full max-w-md shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-neutral-900">
                  {isRTL ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Deletion'}
                </h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {bulkDeleteTarget.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkDeleteTarget(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">{isRTL ? 'عدد المواقع/الغرف المتأثرة:' : 'Total Allocations:'}</span>
                <span className="font-bold text-neutral-900 font-mono">{bulkDeleteTarget.items.length} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{isRTL ? 'إجمالي القطع المراد حذفها:' : 'Total Pieces to Remove:'}</span>
                <span className="font-bold text-red-600 font-mono">
                  {bulkDeleteTarget.items.reduce((s, i) => s + (i.quantity || 0), 0)} pcs
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteTarget(null)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmBulkDelete}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                {isRTL ? 'تأكيد الحذف الجماعي' : 'Confirm Delete All'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal for Building & Utility Inventory */}
      <UtilityExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};
