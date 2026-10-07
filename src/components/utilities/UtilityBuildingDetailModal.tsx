import React, { useState } from 'react';
import {
  X,
  Building2,
  Plus,
  Trash2,
  Minus,
  Bath,
  UtensilsCrossed,
  Briefcase,
  Wrench,
  Layers,
} from 'lucide-react';
import { UtilityBuilding, UtilityBuildingCategory } from '../../types';
import {
  utilityBuildingService,
  getCategoryRoomPrefix,
} from '../../services/utilityBuildingService';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';

interface UtilityBuildingDetailModalProps {
  building: UtilityBuilding | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const UtilityBuildingDetailModal: React.FC<UtilityBuildingDetailModalProps> = ({
  building,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [selectedFloor, setSelectedFloor] = useState<number | 'All'>('All');
  const [addingItemRoomId, setAddingItemRoomId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemNameAr, setNewItemNameAr] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  // New room state
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);

  if (!isOpen || !building) return null;

  const prefix = getCategoryRoomPrefix(building.category);

  // Floors list
  const floorsList = Array.from(new Set(building.rooms.map((r) => r.floor))).sort((a, b) => a - b);

  const filteredRooms = building.rooms.filter(
    (r) => selectedFloor === 'All' || r.floor === selectedFloor
  );

  const getCategoryBadge = (cat: UtilityBuildingCategory) => {
    switch (cat) {
      case 'Washroom Building':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Bath className="w-3.5 h-3.5" />
            {isRTL ? 'مبنى دورات مياه' : 'Washroom Building'}
          </span>
        );
      case 'Kitchen Building':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            {isRTL ? 'مبنى مطابخ' : 'Kitchen Building'}
          </span>
        );
      case 'Offices Building':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Briefcase className="w-3.5 h-3.5" />
            {isRTL ? 'مبنى مكاتب' : 'Offices Building'}
          </span>
        );
      case 'Workshop Building':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <Wrench className="w-3.5 h-3.5" />
            {isRTL ? 'مبنى ورش صيانة' : 'Workshop Building'}
          </span>
        );
    }
  };

  const handleUpdateQty = async (roomId: string, itemId: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      await utilityBuildingService.updateRoomInventoryQuantity(building.id, roomId, itemId, newQty);
      onRefresh();
    } catch {
      toastError('Failed to update quantity');
    }
  };

  const handleDeleteItem = async (roomId: string, itemId: string) => {
    try {
      await utilityBuildingService.deleteItemFromUtilityRoom(building.id, roomId, itemId);
      onRefresh();
      success(isRTL ? 'تم حذف العنصر' : 'Item removed');
    } catch {
      toastError('Failed to remove item');
    }
  };

  const handleAddItemToRoom = async (roomId: string) => {
    if (!newItemName.trim()) return;
    try {
      await utilityBuildingService.addItemToUtilityRoom(building.id, roomId, {
        name: newItemName.trim(),
        nameAr: newItemNameAr.trim() || undefined,
        quantity: Math.max(1, Number(newItemQty) || 1),
      });
      setAddingItemRoomId(null);
      setNewItemName('');
      setNewItemNameAr('');
      setNewItemQty(1);
      onRefresh();
      success(isRTL ? 'تمت إضافة الصنف إلى الوحدة' : 'Item added to unit');
    } catch {
      toastError('Failed to add item');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;
    try {
      await utilityBuildingService.addUtilityRoom(building.id, {
        roomNumber: newRoomNumber.trim(),
        floor: newRoomFloor,
      });
      setIsAddingRoom(false);
      setNewRoomNumber('');
      onRefresh();
      success(isRTL ? 'تمت إضافة الوحدة بنجاح' : `${prefix} unit added`);
    } catch {
      toastError('Failed to add unit');
    }
  };

  const handleDeleteRoom = async (roomId: string, rNum: string) => {
    if (!confirm(isRTL ? `هل أنت متأكد من حذف ${rNum}؟` : `Delete ${rNum}?`)) return;
    try {
      await utilityBuildingService.deleteUtilityRoom(building.id, roomId);
      onRefresh();
      success(isRTL ? 'تم حذف الوحدة' : 'Unit deleted');
    } catch {
      toastError('Failed to delete unit');
    }
  };

  // Total inventory items across building
  const totalItemPieces = building.rooms.reduce(
    (sum, r) => sum + r.inventory.reduce((iSum, i) => iSum + i.quantity, 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900">{building.name}</h2>
                {getCategoryBadge(building.category)}
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1 font-mono">
                <span>
                  {building.floors} {isRTL ? 'طوابق' : 'Floors'}
                </span>
                <span>•</span>
                <span>
                  {building.roomsCount} {prefix}s
                </span>
                <span>•</span>
                <span className="text-orange-600 font-semibold">
                  {totalItemPieces} {isRTL ? 'قطع أصول ومخزون' : 'Total Items'}
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

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setNewRoomNumber(`${prefix} ${building.rooms.length + 1}`);
                setIsAddingRoom(true);
              }}
            >
              {isRTL ? `+ إضافة ${prefix}` : `+ Add ${prefix}`}
            </Button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floor Filter Strip & Add Room bar */}
        <div className="px-6 py-3 border-b border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-semibold text-neutral-500 me-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {isRTL ? 'الطابق:' : 'Floor:'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedFloor('All')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                selectedFloor === 'All'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {isRTL ? 'الكل' : 'All Floors'} ({building.rooms.length})
            </button>
            {floorsList.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedFloor(f)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedFloor === f
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {isRTL ? `طابق ${f}` : `Floor ${f}`} (
                {building.rooms.filter((r) => r.floor === f).length})
              </button>
            ))}
          </div>
        </div>

        {/* Add Room Bar (Inline) */}
        {isAddingRoom && (
          <form
            onSubmit={handleAddRoom}
            className="px-6 py-3 bg-orange-50/80 border-b border-orange-200 flex flex-wrap items-center gap-3 animate-in fade-in"
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
              className="px-3 py-1 text-xs rounded-lg border border-neutral-300 bg-white"
            />
            <div className="flex items-center gap-1.5 text-xs text-neutral-600">
              <span>{isRTL ? 'الطابق:' : 'Floor:'}</span>
              <input
                type="number"
                min="1"
                max={building.floors}
                value={newRoomFloor}
                onChange={(e) => setNewRoomFloor(Math.max(1, Number(e.target.value) || 1))}
                className="w-14 px-2 py-1 text-xs rounded-lg border border-neutral-300 bg-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" variant="primary" className="h-7 text-xs">
                {isRTL ? 'حفظ الوحدة' : 'Save Unit'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setIsAddingRoom(false)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </form>
        )}

        {/* Main Content: Rooms & Inventory in Row Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredRooms.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-xs">
              {isRTL ? 'لا توجد وحدات في هذا الطابق' : 'No units on this floor.'}
            </div>
          ) : (
            filteredRooms.map((room) => {
              const totalItemsInRoom = room.inventory.reduce((sum, it) => sum + it.quantity, 0);

              return (
                <div
                  key={room.id}
                  className="rounded-xl border border-neutral-200/90 bg-white overflow-hidden shadow-2xs"
                >
                  {/* Room Card Title Bar */}
                  <div className="px-4 py-3 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-neutral-900">
                        {room.roomNumber}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-neutral-200/60 text-neutral-700">
                        {isRTL ? `طابق ${room.floor}` : `Floor ${room.floor}`}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {totalItemsInRoom} {isRTL ? 'عنصر' : 'items'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAddingItemRoomId(room.id);
                          setNewItemName('');
                          setNewItemNameAr('');
                          setNewItemQty(1);
                        }}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-orange-50 transition"
                      >
                        <Plus className="w-3 h-3" />
                        {isRTL ? 'إضافة صنف' : 'Add Item'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                        className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                        title={isRTL ? 'حذف الوحدة' : 'Delete Unit'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Add Item to Room Form */}
                  {addingItemRoomId === room.id && (
                    <div className="p-3 bg-orange-50/60 border-b border-orange-200/80 flex flex-wrap items-center gap-2.5 animate-in fade-in">
                      <input
                        type="text"
                        placeholder="Item Name (English)"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className="px-3 py-1 text-xs rounded-lg border border-neutral-300 bg-white"
                      />
                      <input
                        type="text"
                        placeholder="اسم الصنف (عربي)"
                        value={newItemNameAr}
                        onChange={(e) => setNewItemNameAr(e.target.value)}
                        className="px-3 py-1 text-xs rounded-lg border border-neutral-300 bg-white text-right"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value) || 1))}
                        className="w-16 px-2 py-1 text-xs rounded-lg border border-neutral-300 bg-white"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-xs"
                        onClick={() => handleAddItemToRoom(room.id)}
                      >
                        {isRTL ? 'إضافة' : 'Add'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setAddingItemRoomId(null)}
                      >
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </Button>
                    </div>
                  )}

                  {/* Inventory Items in Row Form */}
                  {room.inventory.length === 0 ? (
                    <div className="py-6 text-center text-neutral-400 text-xs">
                      {isRTL
                        ? 'لا توجد أصناف مسجلة في هذه الوحدة بعد'
                        : 'No items recorded in this unit yet.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {room.inventory.map((item) => (
                        <div
                          key={item.id}
                          className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-neutral-50/60 transition"
                        >
                          <div className="flex-1 min-w-0 pr-4">
                            <span className="font-semibold text-neutral-800 block truncate">
                              {item.name}
                            </span>
                            {item.nameAr && (
                              <span className="text-[11px] text-neutral-400 font-arabic block truncate">
                                {item.nameAr}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Quantity Stepper */}
                            <div className="flex items-center border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-3xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(room.id, item.id, item.quantity, -1)}
                                className="px-2 py-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2.5 py-1 text-xs font-mono font-bold text-neutral-800 min-w-[32px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(room.id, item.id, item.quantity, 1)}
                                className="px-2 py-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Delete Item */}
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(room.id, item.id)}
                              className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                              title="Delete Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50/60 flex items-center justify-between text-xs text-neutral-500">
          <span>
            {isRTL ? 'البيانات تحفظ تلقائياً ومحدثة لحظياً' : 'Data is saved automatically in real-time'}
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            {isRTL ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
};
