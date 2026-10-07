import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Bath,
  UtensilsCrossed,
  Briefcase,
  Wrench,
  Warehouse,
  Ruler,
} from 'lucide-react';
import { UtilityBuildingCategory } from '../../types';
import {
  utilityBuildingService,
  getCategoryRoomPrefix,
} from '../../services/utilityBuildingService';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface AddUtilityBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface InventoryDraftItem {
  name: string;
  nameAr?: string;
  quantity: number;
  isSelected: boolean;
  isCustom?: boolean;
}

export const AddUtilityBuildingModal: React.FC<AddUtilityBuildingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [buildingName, setBuildingName] = useState('');
  const [category, setCategory] = useState<UtilityBuildingCategory>('Washroom Building');
  const [floors, setFloors] = useState<number>(1);
  const [roomsPerFloor, setRoomsPerFloor] = useState<number>(2);
  const [customRoomNumbers, setCustomRoomNumbers] = useState<string[]>([]);
  const [isManualRoomMode, setIsManualRoomMode] = useState<boolean>(false);
  const [manualRoomInput, setManualRoomInput] = useState<string>('');

  // Optional Dimensions
  const [lengthM, setLengthM] = useState<string>('');
  const [widthM, setWidthM] = useState<string>('');

  // Dynamic Inventory Items
  const [inventoryList, setInventoryList] = useState<InventoryDraftItem[]>([]);

  // Custom Item Form state
  const [isAddingCustomItem, setIsAddingCustomItem] = useState<boolean>(false);
  const [customName, setCustomName] = useState('');
  const [customNameAr, setCustomNameAr] = useState('');
  const [customQty, setCustomQty] = useState<number>(1);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // When category changes, load dynamic suggestions for that category
  useEffect(() => {
    const suggestions = utilityBuildingService.getSuggestionsByCategory(category);
    setInventoryList(
      suggestions.map((s) => ({
        name: s.name,
        nameAr: s.nameAr,
        quantity: s.defaultQty,
        isSelected: true,
      }))
    );

    // Reset default room naming preview
    const prefix = getCategoryRoomPrefix(category);
    if (!isManualRoomMode) {
      const generated: string[] = [];
      const totalR = floors * roomsPerFloor;
      for (let i = 1; i <= totalR; i++) {
        generated.push(`${prefix} ${i}`);
      }
      setCustomRoomNumbers(generated);
    }
  }, [category, floors, roomsPerFloor, isManualRoomMode]);

  if (!isOpen) return null;

  const handleToggleItem = (index: number) => {
    setInventoryList((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, isSelected: !it.isSelected } : it))
    );
  };

  const handleUpdateItemQty = (index: number, newQty: number) => {
    setInventoryList((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: Math.max(1, newQty) } : it))
    );
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    setInventoryList((prev) => [
      ...prev,
      {
        name: customName.trim(),
        nameAr: customNameAr.trim() || undefined,
        quantity: Math.max(1, Number(customQty) || 1),
        isSelected: true,
        isCustom: true,
      },
    ]);

    setCustomName('');
    setCustomNameAr('');
    setCustomQty(1);
    setIsAddingCustomItem(false);
  };

  const handleRemoveItem = (index: number) => {
    setInventoryList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Add individual manual room
  const handleAddManualRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualRoomInput.trim()) return;
    setCustomRoomNumbers((prev) => [...prev, manualRoomInput.trim()]);
    setManualRoomInput('');
  };

  const handleRemoveManualRoom = (idx: number) => {
    setCustomRoomNumbers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingName.trim()) {
      toastError(isRTL ? 'يرجى إدخال اسم المبنى' : 'Please enter building name');
      return;
    }

    const selectedInv = inventoryList
      .filter((it) => it.isSelected)
      .map((it) => ({
        name: it.name,
        nameAr: it.nameAr,
        quantity: it.quantity,
      }));

    setIsSubmitting(true);
    try {
      await utilityBuildingService.createUtilityBuilding({
        name: buildingName.trim(),
        category,
        floors: Math.max(1, Number(floors) || 1),
        roomsPerFloor: isManualRoomMode ? undefined : roomsPerFloor,
        roomNumbers: isManualRoomMode ? customRoomNumbers : undefined,
        lengthM: lengthM ? Number(lengthM) : undefined,
        widthM: widthM ? Number(widthM) : undefined,
        selectedInventory: selectedInv,
        projectId: user?.projectId,
      });

      success(
        isRTL
          ? `تم إنشاء مبنى الخدمات "${buildingName}" بنجاح`
          : `Utility building "${buildingName}" created successfully`
      );
      onSuccess();
      onClose();
    } catch {
      toastError(isRTL ? 'فشل إنشاء المبنى' : 'Failed to create utility building');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: UtilityBuildingCategory) => {
    switch (cat) {
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
    }
  };

  const roomPrefix = getCategoryRoomPrefix(category);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                {isRTL ? 'إضافة مبنى خدمات جديد' : 'Add New Utility Building'}
              </h2>
              <p className="text-xs text-neutral-500">
                {isRTL
                  ? 'دورات مياه، مطابخ، مكاتب، ورش، أو مستودع المخيم (بدون سعة سكنية)'
                  : 'Washrooms, kitchens, offices, workshops, or camp store (no living capacity)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Building Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'اسم المبنى الخدمي *' : 'Building Name *'}
              </label>
              <input
                type="text"
                required
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder={
                  category === 'Washroom Building'
                    ? 'e.g. Block A Ablution Complex'
                    : category === 'Kitchen Building'
                    ? 'e.g. Central Catering Kitchen'
                    : category === 'Offices Building'
                    ? 'e.g. Site Operations Office'
                    : category === 'Workshop Building'
                    ? 'e.g. Electrical & MEP Workshop'
                    : 'e.g. Central Camp Store & Inventory'
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {isRTL ? 'التصنيف الخدمي (فئة المبنى) *' : 'Building Category *'}
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as UtilityBuildingCategory)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-neutral-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition appearance-none"
                >
                  <option value="Washroom Building">
                    {isRTL ? 'مبنى دورات مياه (Washroom Building)' : 'Washroom Building'}
                  </option>
                  <option value="Kitchen Building">
                    {isRTL ? 'مبنى مطابخ (Kitchen Building)' : 'Kitchen Building'}
                  </option>
                  <option value="Offices Building">
                    {isRTL ? 'مبنى مكاتب (Offices Building)' : 'Offices Building'}
                  </option>
                  <option value="Workshop Building">
                    {isRTL ? 'مبنى ورش صيانة (Workshop Building)' : 'Workshop Building'}
                  </option>
                  <option value="Camp Store Building">
                    {isRTL ? 'مبنى مستودع المخيم (Camp Store Building)' : 'Camp Store Building'}
                  </option>
                </select>
                <div className="absolute inset-y-0 end-3 flex items-center pointer-events-none">
                  {getCategoryIcon(category)}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Floors & Utility Rooms Configuration (NO CAPACITY!) */}
          <div className="p-4 rounded-xl bg-orange-50/40 border border-orange-200/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  {isRTL
                    ? `توزيع وتسمية وحدات الـ (${roomPrefix})`
                    : `Floors & ${roomPrefix} Units Setup`}
                </span>
              </div>
              <span className="text-[11px] font-medium text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-md">
                {isRTL ? 'بدون سعة سكنية (سعة غير مطلوبة)' : 'Zero Living Capacity (Non-Residential)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'عدد الطوابق' : 'Total Floors'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={floors}
                  onChange={(e) => setFloors(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL
                    ? `عدد وحدات الـ ${roomPrefix} لكل طابق`
                    : `${roomPrefix} Units per Floor`}
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  disabled={isManualRoomMode}
                  value={roomsPerFloor}
                  onChange={(e) => setRoomsPerFloor(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-neutral-300 bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
                />
              </div>
            </div>

            {/* Room Numbers preview & manual customize toggle */}
            <div className="pt-2 border-t border-orange-200/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-600 font-medium">
                  {isRTL ? 'معاينة تسميات الوحدات:' : 'Generated Units Preview:'} (
                  <strong className="text-orange-700">
                    {isManualRoomMode ? customRoomNumbers.length : floors * roomsPerFloor} {roomPrefix}s
                  </strong>
                  )
                </span>

                <button
                  type="button"
                  onClick={() => setIsManualRoomMode(!isManualRoomMode)}
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 underline"
                >
                  {isManualRoomMode
                    ? isRTL ? 'الرجوع للتسلسل التلقائي' : 'Switch to Auto Sequence'
                    : isRTL ? 'كتابة أرقام الوحدات يدوياً' : 'Manually Custom Numbers'}
                </button>
              </div>

              {isManualRoomMode ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`e.g. ${roomPrefix} 101, ${roomPrefix} VIP`}
                      value={manualRoomInput}
                      onChange={(e) => setManualRoomInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualRoom(e);
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddManualRoom}
                    >
                      {isRTL ? 'إضافة' : 'Add Unit'}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-white rounded-lg border border-neutral-200">
                    {customRoomNumbers.map((num, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 text-[11px] font-mono text-neutral-800 border border-neutral-200"
                      >
                        {num}
                        <button
                          type="button"
                          onClick={() => handleRemoveManualRoom(i)}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-2 bg-white/80 rounded-lg border border-orange-200/60">
                  {customRoomNumbers.map((num, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-orange-100/60 text-[11px] font-mono font-medium text-orange-800"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Dimensions (Optional) */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <Ruler className="w-4 h-4 text-neutral-500" />
              <span>{isRTL ? 'أبعاد المبنى (اختياري)' : 'Building Dimensions (Optional)'}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">
                  {isRTL ? 'الطول (متر)' : 'Length (meters)'}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 25"
                  value={lengthM}
                  onChange={(e) => setLengthM(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">
                  {isRTL ? 'العرض (متر)' : 'Width (meters)'}
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15"
                  value={widthM}
                  onChange={(e) => setWidthM(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Category-Specific Dynamic Inventory Suggestions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  {isRTL
                    ? `مخزون ومحتويات الـ ${category}`
                    : `${category} Suggested Inventory`}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCustomItem(!isAddingCustomItem)}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {isRTL ? 'إضافة صنف مخصص' : '+ Add Custom Item'}
              </button>
            </div>

            {/* Custom Item Form Dropdown */}
            {isAddingCustomItem && (
              <div className="p-3.5 rounded-xl border border-orange-300 bg-orange-50/50 space-y-3 animate-in fade-in">
                <div className="text-xs font-bold text-orange-800">
                  {isRTL ? 'إضافة صنف يدوي جديد إلى المبنى:' : 'Add Custom Item:'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <input
                      type="text"
                      placeholder="Item Name (English)"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="اسم الصنف (عربي)"
                      value={customNameAr}
                      onChange={(e) => setCustomNameAr(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white text-right"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={customQty}
                      onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value) || 1))}
                      className="w-20 px-2 py-1.5 text-xs rounded-lg border border-neutral-300 bg-white"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={handleAddCustomItem}
                      className="flex-1 text-xs"
                    >
                      {isRTL ? 'إدراج' : 'Insert'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Items Checkable List with Arabic & English names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
              {inventoryList.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                    item.isSelected
                      ? 'border-orange-300 bg-orange-50/20'
                      : 'border-neutral-200 bg-white opacity-60'
                  }`}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.isSelected}
                      onChange={() => handleToggleItem(idx)}
                      className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-neutral-900 truncate">
                        {item.name}
                      </div>
                      {item.nameAr && (
                        <div className="text-[11px] text-neutral-500 font-arabic truncate">
                          {item.nameAr}
                        </div>
                      )}
                    </div>
                  </label>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="1"
                      disabled={!item.isSelected}
                      value={item.quantity}
                      onChange={(e) => handleUpdateItemQty(idx, Number(e.target.value) || 1)}
                      className="w-14 px-2 py-1 text-xs text-center font-mono rounded border border-neutral-300 bg-white disabled:bg-neutral-100"
                    />

                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-neutral-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {isRTL ? 'إنشاء مبنى الخدمات' : 'Create Utility Building'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
