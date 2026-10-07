import React, { useState, useEffect } from 'react';
import { Building2, X, Plus } from 'lucide-react';
import { Building } from '../../types';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';

interface AddBuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBuildingAdded: (newBuilding: Building) => void;
  initialBuilding?: Building | null;
  campId?: string;
  projectId?: string;
  userId?: string;
}

export const DEFAULT_FACILITIES = [
  'AC',
  'fridge',
  'bulb',
  'bed',
  'blanket',
  'pillow',
  'electrical switch',
  'gang socket',
  'gas cylinder',
  'hitter',
  'wall fan small',
  'hittar',
  'gas stove double',
  'wash basin',
  'water tube',
  'wall fan big',
  'window',
];

export const AddBuildingModal: React.FC<AddBuildingModalProps> = ({
  isOpen,
  onClose,
  onBuildingAdded,
  initialBuilding = null,
  campId = '',
  projectId = '',
  userId = '',
}) => {
  const { isRTL } = useLanguage();
  const isEdit = Boolean(initialBuilding);

  const [name, setName] = useState('');
  const [buildingType, setBuildingType] = useState<Building['buildingType']>('Accommodation');
  const [lengthM, setLengthM] = useState<number>(40);
  const [widthM, setWidthM] = useState<number>(15);
  const [floors, setFloors] = useState<number>(3);
  const [totalRooms, setTotalRooms] = useState<number>(50);
  const [capacity, setCapacity] = useState<number>(120);
  const [occupancy, setOccupancy] = useState<number>(0);
  const [status, setStatus] = useState<Building['status']>('Operational');

  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([
    'AC',
    'bulb',
    'blanket',
  ]);

  const [facilityQuantities, setFacilityQuantities] = useState<Record<string, number | ''>>({
    AC: 1,
    bulb: 1,
    blanket: 7,
  });

  const [customFacilityName, setCustomFacilityName] = useState('');
  const [customFacilityQty, setCustomFacilityQty] = useState<number>(1);
  const [customFacilities, setCustomFacilities] = useState<{ name: string; qty: number }[]>([]);

  // Room ranges per floor
  interface FloorRange {
    floor: number;
    start: number;
    end: number;
  }
  const [floorRanges, setFloorRanges] = useState<FloorRange[]>([]);

  const generateFloorRangesFromTotal = (total: number, floorsCount: number): FloorRange[] => {
    const count = Math.max(1, total);
    const fl = Math.max(1, floorsCount);
    const base = Math.floor(count / fl);
    const rem = count % fl;
    const result: FloorRange[] = [];

    for (let f = 1; f <= fl; f++) {
      const floorCount = base + (f <= rem ? 1 : 0);
      const start = f === 1 ? 1 : (f * 100 + 1);
      const end = start + Math.max(1, floorCount) - 1;
      result.push({ floor: f, start, end });
    }
    return result;
  };

  // Prefill or reset on open / initialBuilding change
  useEffect(() => {
    if (!isOpen) return;

    if (initialBuilding) {
      setName(initialBuilding.name || '');
      setBuildingType(initialBuilding.buildingType || 'Accommodation');
      setLengthM(initialBuilding.lengthM || 0);
      setWidthM(initialBuilding.widthM || 0);
      setFloors(initialBuilding.floors || 1);
      setTotalRooms(initialBuilding.totalRooms || 1);
      setCapacity(initialBuilding.capacity || 0);
      setOccupancy(initialBuilding.currentOccupancy || 0);
      setStatus(initialBuilding.status || 'Operational');
      setSelectedFacilities(initialBuilding.facilities || []);
      setFacilityQuantities(initialBuilding.facilityQuantities || {});
      setCustomFacilities(initialBuilding.customFacilities || []);
      setFloorRanges(
        (initialBuilding.roomRanges || []).map((r) => ({
          floor: r.floor,
          start: r.startRoom,
          end: r.endRoom,
        }))
      );
    } else {
      setName('');
      setBuildingType('Accommodation');
      setLengthM(40);
      setWidthM(15);
      setFloors(2);
      setTotalRooms(20);
      setCapacity(80);
      setOccupancy(0);
      setStatus('Operational');
      setSelectedFacilities(['AC', 'bulb', 'blanket']);
      setFacilityQuantities({ AC: 1, bulb: 1, blanket: 7 });
      setCustomFacilities([]);
      setFloorRanges([
        { floor: 1, start: 1, end: 10 },
        { floor: 2, start: 101, end: 110 },
      ]);
    }
  }, [isOpen, initialBuilding]);

  const handleTotalRoomsChange = (newTotal: number) => {
    const t = Math.max(1, newTotal);
    setTotalRooms(t);
    if (!isEdit) {
      setFloorRanges(generateFloorRangesFromTotal(t, floors));
    }
  };

  const handleFloorsChange = (newFloors: number) => {
    const fl = Math.max(1, newFloors);
    setFloors(fl);
    if (!isEdit) {
      setFloorRanges(generateFloorRangesFromTotal(totalRooms, fl));
    }
  };

  const handleRangeChange = (idx: number, field: 'start' | 'end', val: number) => {
    const updated = [...floorRanges];
    updated[idx] = { ...updated[idx], [field]: val };
    setFloorRanges(updated);
    const sum = updated.reduce((acc, r) => acc + Math.max(0, r.end - r.start + 1), 0);
    setTotalRooms(sum);
  };

  if (!isOpen) return null;

  const toggleFacility = (facility: string) => {
    if (selectedFacilities.includes(facility)) {
      setSelectedFacilities(selectedFacilities.filter((f) => f !== facility));
      setFacilityQuantities((prev) => {
        const next = { ...prev };
        delete next[facility];
        return next;
      });
    } else {
      setSelectedFacilities([...selectedFacilities, facility]);
      setFacilityQuantities((prev) => ({
        ...prev,
        [facility]: prev[facility] || 1,
      }));
    }
  };

  const handleFacilityQuantityChange = (facility: string, valStr: string) => {
    if (valStr === '') {
      setFacilityQuantities((prev) => ({ ...prev, [facility]: '' }));
      return;
    }
    const val = parseInt(valStr, 10);
    if (!isNaN(val)) {
      setFacilityQuantities((prev) => ({ ...prev, [facility]: val }));
      if (val > 0 && !selectedFacilities.includes(facility)) {
        setSelectedFacilities((prev) => [...prev, facility]);
      }
    }
  };

  const handleAddCustomFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customFacilityName.trim()) return;
    setCustomFacilities([
      ...customFacilities,
      { name: customFacilityName.trim(), qty: customFacilityQty || 1 },
    ]);
    setCustomFacilityName('');
    setCustomFacilityQty(1);
  };

  const handleRemoveCustomFacility = (idx: number) => {
    setCustomFacilities(customFacilities.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const ranges = floorRanges.map((r) => ({
      floor: r.floor,
      startRoom: r.start,
      endRoom: r.end,
      roomCount: Math.max(0, r.end - r.start + 1),
    }));

    const calculatedRooms = ranges.reduce((acc, r) => acc + r.roomCount, 0);
    const finalTotalRooms = calculatedRooms > 0 ? calculatedRooms : (Number(totalRooms) || 20);

    const cleanedQuantities: Record<string, number> = {};
    selectedFacilities.forEach((f) => {
      cleanedQuantities[f] = Number(facilityQuantities[f]) || 1;
    });

    // Automatically include any pending custom facility in text input!
    const finalCustomFacilities = [...customFacilities];
    if (customFacilityName.trim()) {
      finalCustomFacilities.push({
        name: customFacilityName.trim(),
        qty: Number(customFacilityQty) || 1,
      });
    }

    const targetBuilding: Building = {
      ...(initialBuilding || {}),
      id: initialBuilding?.id || `bld-${Date.now()}`,
      campId: initialBuilding?.campId || campId,
      projectId: initialBuilding?.projectId || projectId,
      userId: initialBuilding?.userId || userId,
      name: name.trim(),
      buildingNumber: initialBuilding?.buildingNumber || `B-0${Math.floor(Math.random() * 90 + 10)}`,
      buildingType,
      lengthM: Number(lengthM) || 0,
      widthM: Number(widthM) || 0,
      floors: isEdit ? initialBuilding!.floors : (Number(floors) || 1),
      totalRooms: isEdit ? initialBuilding!.totalRooms : finalTotalRooms,
      capacity: Number(capacity) || 0,
      currentOccupancy: Number(occupancy) || 0,
      roomRanges: isEdit ? initialBuilding!.roomRanges : ranges,
      status,
      facilities: selectedFacilities,
      facilityQuantities: cleanedQuantities,
      customFacilities: finalCustomFacilities,
      reportsCount: initialBuilding?.reportsCount || 0,
      createdAt: initialBuilding?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onBuildingAdded(targetBuilding);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-neutral-900/40 backdrop-blur-2xs">
      <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-xl my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70 rounded-t-xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                {isEdit ? (isRTL ? 'تعديل بيانات المبنى' : 'Edit Building') : (isRTL ? 'إضافة مبنى جديد' : 'Add New Building')}
              </h2>
              <p className="text-[11px] text-neutral-500">
                {isEdit
                  ? (isRTL ? `تعديل مواصفات ومرافق ${initialBuilding?.name}` : `Update details and inventory for ${initialBuilding?.name}`)
                  : (isRTL ? 'املأ تفاصيل المبنى لإضافته إلى المخيم' : 'Fill in the details below to add a new building to the camp.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* Building Name & Building Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {isRTL ? 'اسم المبنى' : 'Building Name'} <span className="text-orange-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Building Block D"
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                {isRTL ? 'نوع المبنى' : 'Building Type'} <span className="text-orange-600">*</span>
              </label>
              <select
                value={buildingType}
                onChange={(e) => setBuildingType(e.target.value as any)}
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="Accommodation">Accommodation (سكن عمال)</option>
                <option value="Mess Hall / Kitchen">Mess Hall / Kitchen (صالة طعام ومطبخ)</option>
                <option value="Office">Office (مكاتب إدارية)</option>
                <option value="Clinic">Clinic (عيادة طبية)</option>
                <option value="Recreation">Recreation (قاعة ترفيه)</option>
                <option value="Storage">Storage (مستودع)</option>
              </select>
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                {isRTL ? 'الطول (م)' : 'Length (m)'}
              </label>
              <input
                type="number"
                min="0"
                value={lengthM}
                onChange={(e) => setLengthM(Number(e.target.value))}
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                {isRTL ? 'العرض (م)' : 'Width (m)'}
              </label>
              <input
                type="number"
                min="0"
                value={widthM}
                onChange={(e) => setWidthM(Number(e.target.value))}
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Floors, Total Rooms, Capacity, Current Occupancy */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-neutral-700">
                  {isRTL ? 'عدد الطوابق' : 'Floors'}
                </label>
                {isEdit && <span className="text-[10px] text-amber-600 font-mono">(Locked)</span>}
              </div>
              <input
                type="number"
                min="1"
                max="10"
                disabled={isEdit}
                value={floors}
                onChange={(e) => handleFloorsChange(Number(e.target.value))}
                className={`w-full h-8 px-2.5 border rounded-md text-xs text-neutral-900 focus:outline-none ${
                  isEdit
                    ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed'
                    : 'bg-white border-neutral-300 focus:ring-1 focus:ring-orange-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold text-neutral-700">
                  {isRTL ? 'إجمالي الغرف' : 'Total Rooms'}
                </label>
                {isEdit && <span className="text-[10px] text-amber-600 font-mono">(Locked)</span>}
              </div>
              <input
                type="number"
                min="1"
                disabled={isEdit}
                value={totalRooms}
                onChange={(e) => handleTotalRoomsChange(Number(e.target.value))}
                className={`w-full h-8 px-2.5 border rounded-md text-xs text-neutral-900 focus:outline-none ${
                  isEdit
                    ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed'
                    : 'bg-white border-neutral-300 focus:ring-1 focus:ring-orange-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                {isRTL ? 'السعة (أسرّة)' : 'Capacity'}
              </label>
              <input
                type="number"
                min="0"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                {isRTL ? 'الإشغال الحالي' : 'Occupancy'}
              </label>
              <input
                type="number"
                min="0"
                value={occupancy}
                onChange={(e) => setOccupancy(Number(e.target.value))}
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Room Ranges Per Floor */}
          <div className="p-3 bg-neutral-50/80 rounded-lg border border-neutral-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-700 block">
                {isRTL ? 'نطاقات الغرف لكل طابق' : 'Room Ranges Per Floor'}
              </span>
              {isEdit && (
                <span className="text-[10px] text-amber-600 font-mono">
                  {isRTL ? '(الغرف ثابتة لا تعدل)' : '(Locked for existing building)'}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {floorRanges.map((fr, idx) => {
                const count = Math.max(0, fr.end - fr.start + 1);
                return (
                  <div key={fr.floor} className="flex items-center gap-2 text-xs">
                    <span className="w-16 font-medium text-neutral-600">
                      Floor {fr.floor}:
                    </span>
                    <span className="text-neutral-500 text-[11px]">Room</span>
                    <input
                      type="number"
                      disabled={isEdit}
                      value={fr.start}
                      onChange={(e) => handleRangeChange(idx, 'start', Number(e.target.value))}
                      className={`w-16 h-7 px-2 border rounded text-xs text-center ${
                        isEdit ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed' : 'bg-white border-neutral-300'
                      }`}
                    />
                    <span className="text-neutral-500 text-[11px]">to</span>
                    <input
                      type="number"
                      disabled={isEdit}
                      value={fr.end}
                      onChange={(e) => handleRangeChange(idx, 'end', Number(e.target.value))}
                      className={`w-16 h-7 px-2 border rounded text-xs text-center ${
                        isEdit ? 'bg-neutral-100 text-neutral-500 border-neutral-200 cursor-not-allowed' : 'bg-white border-neutral-300'
                      }`}
                    />
                    <span className="text-[11px] text-neutral-500">
                      ({count} {isRTL ? 'غرفة' : 'Rooms'})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              {isRTL ? 'حالة المبنى' : 'Status'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="Operational">Operational (يعمل بكفاءة)</option>
              <option value="Maintenance">Under Maintenance (تحت الصيانة)</option>
              <option value="Under Construction">Under Construction (تحت الإنشاء)</option>
            </select>
          </div>

          {/* Select Facilities */}
          <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200 space-y-3">
            <span className="text-xs font-bold text-neutral-800 block">
              {isRTL ? 'تحديد المرافق المتوفرة بالمبنى' : 'Select Facilities'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {/* Column 1 */}
              <div className="space-y-2">
                {[
                  'AC',
                  'bulb',
                  'blanket',
                  'electrical switch',
                  'gas cylinder',
                  'wall fan small',
                  'gas stove double',
                  'water tube',
                  'window',
                ].map((facility) => {
                  const isSelected = selectedFacilities.includes(facility);
                  const qty = facilityQuantities[facility];
                  return (
                    <div key={facility} className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => toggleFacility(facility)}
                        className="flex items-center gap-2.5 cursor-pointer select-none flex-1 min-w-0"
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500'
                              : 'border-neutral-300 bg-white hover:border-neutral-400'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-xs text-neutral-800 capitalize truncate">
                          {facility}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={qty !== undefined && qty !== null ? qty : (isSelected ? 1 : '')}
                        onChange={(e) => handleFacilityQuantityChange(facility, e.target.value)}
                        className="w-14 sm:w-16 h-7 px-1.5 text-center bg-white border border-neutral-300 rounded text-xs text-neutral-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Column 2 */}
              <div className="space-y-2">
                {[
                  'fridge',
                  'bed',
                  'pillow',
                  'gang socket',
                  'hitter',
                  'hittar',
                  'wash basin',
                  'wall fan big',
                ].map((facility) => {
                  const isSelected = selectedFacilities.includes(facility);
                  const qty = facilityQuantities[facility];
                  return (
                    <div key={facility} className="flex items-center justify-between gap-2">
                      <div
                        onClick={() => toggleFacility(facility)}
                        className="flex items-center gap-2.5 cursor-pointer select-none flex-1 min-w-0"
                      >
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500'
                              : 'border-neutral-300 bg-white hover:border-neutral-400'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <span className="text-xs text-neutral-800 capitalize truncate">
                          {facility}
                        </span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={qty !== undefined && qty !== null ? qty : (isSelected ? 1 : '')}
                        onChange={(e) => handleFacilityQuantityChange(facility, e.target.value)}
                        className="w-14 sm:w-16 h-7 px-1.5 text-center bg-white border border-neutral-300 rounded text-xs text-neutral-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition font-mono"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Facilities tags */}
            {customFacilities.length > 0 && (
              <div className="pt-2 flex flex-wrap gap-1.5">
                {customFacilities.map((cf, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-medium"
                  >
                    <span>{cf.name} (x{cf.qty})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomFacility(idx)}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add Custom Facility Input */}
            <div className="pt-2 border-t border-neutral-200/80">
              <span className="text-[10px] uppercase font-semibold text-neutral-500 block mb-1">
                {isRTL ? 'إضافة مرفق مخصص' : 'Add Custom Facility'}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customFacilityName}
                  onChange={(e) => setCustomFacilityName(e.target.value)}
                  placeholder="Facility Name"
                  className="flex-1 h-7 px-2 bg-white border border-neutral-300 rounded text-xs placeholder-neutral-400"
                />
                <input
                  type="number"
                  min="1"
                  value={customFacilityQty}
                  onChange={(e) => setCustomFacilityQty(Number(e.target.value))}
                  placeholder="Qty"
                  className="w-14 h-7 px-2 bg-white border border-neutral-300 rounded text-xs text-center"
                />
                <button
                  type="button"
                  onClick={handleAddCustomFacility}
                  className="h-7 px-2.5 rounded bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 text-xs font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              {isEdit
                ? (isRTL ? 'حفظ التعديلات' : 'Save Changes')
                : (isRTL ? 'إضافة المبنى' : 'Add Building')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
