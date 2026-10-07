import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Users,
  UserPlus,
  Package,
  X,
  CheckCircle2,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { Building, BuildingPersonnel, BuildingRoom, JobTitleId } from '../../types';
import { extractRoomNumber, roomService } from '../../services/roomService';
import { personnelService } from '../../services/personnelService';
import { jobTitleService } from '../../services/jobTitleService';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { Button } from '../ui/Button';

interface BuildingRoomsViewProps {
  building: Building;
  rooms: BuildingRoom[];
  personnelList: BuildingPersonnel[];
  onDataChanged: () => Promise<void>;
}

export const BuildingRoomsView: React.FC<BuildingRoomsViewProps> = ({
  building,
  rooms,
  personnelList,
  onDataChanged,
}) => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [localRooms, setLocalRooms] = useState<BuildingRoom[]>(rooms);

  React.useEffect(() => {
    setLocalRooms(rooms);
  }, [rooms]);

  React.useEffect(() => {
    const handleInvUpdated = () => {
      const stored = roomService.getStoredRooms().filter((r) => r.buildingId === building.id);
      setLocalRooms(stored);
    };
    window.addEventListener('camp_inventory_updated', handleInvUpdated);
    return () => window.removeEventListener('camp_inventory_updated', handleInvUpdated);
  }, [building.id]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | 'All'>('All');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);

  // Room card active tab: Record<roomId, 'members' | 'inventory'>
  const [activeTabs, setActiveTabs] = useState<Record<string, 'members' | 'inventory'>>({});

  // Modals state
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<{ id: string; roomNumber: string } | null>(null);
  const [isBulkRoomDeleteOpen, setIsBulkRoomDeleteOpen] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomCapacity, setNewRoomCapacity] = useState(5);

  const [assignModalRoom, setAssignModalRoom] = useState<BuildingRoom | null>(null);
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingPersonnelId, setSelectedExistingPersonnelId] = useState('');
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    iqamaNumber: '',
    idNumber: '',
    jobTitleId: 'LABOUR' as JobTitleId,
  });

  const [addItemRoom, setAddItemRoom] = useState<BuildingRoom | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);

  const officialJobTitles = jobTitleService.getJobTitles();

  // Distinct floors
  const floors = Array.from(new Set(localRooms.map((r) => r.floor))).sort((a, b) => a - b);

  React.useEffect(() => {
    const handlePersonnelUpdated = async () => {
      await onDataChanged();
    };
    window.addEventListener('camp_personnel_updated', handlePersonnelUpdated);
    return () => window.removeEventListener('camp_personnel_updated', handlePersonnelUpdated);
  }, [onDataChanged]);

  // Helper to get members of a room (matches "Room 1", "1", "A-101", "101", etc.)
  const getRoomMembers = (room: BuildingRoom): BuildingPersonnel[] => {
    const rRaw = room.roomNumber.toLowerCase().trim();
    const rClean = rRaw.replace(/room/i, '').trim();
    const rDigits = (rRaw.match(/\d+/) || [''])[0];

    return personnelList.filter((p) => {
      if (!p.roomNumber) return false;
      const pRaw = p.roomNumber.toLowerCase().trim();
      const pClean = pRaw.replace(/room/i, '').trim();
      const pDigits = (pRaw.match(/\d+/) || [''])[0];

      if (pRaw === rRaw || pClean === rClean) return true;
      if (rDigits && pDigits && rDigits === pDigits) {
        if (!p.buildingId || p.buildingId === room.buildingId) return true;
      }
      return false;
    });
  };

  // Filtered & sequentially sorted rooms
  const filteredRooms = React.useMemo(() => {
    const list = localRooms.filter((room) => {
      const members = getRoomMembers(room);
      const matchesSearch =
        room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `floor ${room.floor}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        members.some(
          (m) =>
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.iqamaNumber.includes(searchTerm) ||
            m.jobTitleId.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesFloor = selectedFloor === 'All' || room.floor === selectedFloor;
      return matchesSearch && matchesFloor;
    });

    list.sort((a, b) => extractRoomNumber(a.roomNumber) - extractRoomNumber(b.roomNumber));
    return list;
  }, [localRooms, searchTerm, selectedFloor, personnelList]);

  // Select all toggle
  const handleToggleSelectAll = () => {
    if (selectedRoomIds.length === filteredRooms.length) {
      setSelectedRoomIds([]);
    } else {
      setSelectedRoomIds(filteredRooms.map((r) => r.id));
    }
  };

  const handleToggleSelectRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    );
  };

  // Trigger single room delete modal
  const handleDeleteRoom = (roomId: string, roomNum: string) => {
    setRoomToDelete({ id: roomId, roomNumber: roomNum });
  };

  // Confirm single room deletion
  const handleConfirmDeleteSingleRoom = async () => {
    if (!roomToDelete) return;

    try {
      setIsDeletingRoom(true);
      const { id: roomId, roomNumber: roomNum } = roomToDelete;

      // 1. Unassign manpower in this room so they are NOT deleted
      await personnelService.unassignPersonnelForRoom(building.id, roomNum);

      // 2. Delete room and its inventory (resequence = false so existing room names stay intact)
      await roomService.deleteRoom(roomId, false);

      // 3. Immediately update local state so card disappears instantly
      setLocalRooms((prev) => prev.filter((r) => r.id !== roomId));
      setSelectedRoomIds((prev) => prev.filter((id) => id !== roomId));

      // Notify cross-view updates
      window.dispatchEvent(new CustomEvent('camp_inventory_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));

      success(
        isRTL
          ? `تم حذف ${roomNum} ومخزونها بنجاح، وأصبح العمال غير معينين`
          : `${roomNum} and its inventory deleted. Manpower unassigned successfully.`
      );
      setRoomToDelete(null);
      await onDataChanged();
    } catch {
      toastError('Failed to delete room');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  // Trigger bulk delete rooms modal
  const handleBulkDeleteRooms = () => {
    if (selectedRoomIds.length === 0) return;
    setIsBulkRoomDeleteOpen(true);
  };

  // Confirm bulk rooms deletion
  const handleConfirmBulkDeleteRooms = async () => {
    if (selectedRoomIds.length === 0) return;

    try {
      setIsDeletingRoom(true);
      const count = selectedRoomIds.length;
      const targetRooms = localRooms.filter((r) => selectedRoomIds.includes(r.id));
      for (const tr of targetRooms) {
        await personnelService.unassignPersonnelForRoom(building.id, tr.roomNumber);
        await roomService.deleteRoom(tr.id, false);
      }

      setLocalRooms((prev) => prev.filter((r) => !selectedRoomIds.includes(r.id)));
      setSelectedRoomIds([]);

      window.dispatchEvent(new CustomEvent('camp_inventory_updated'));
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));

      success(
        isRTL
          ? `تم حذف ${count} غرفة بنجاح وإلغاء تعيين العمالة المرتبطة بها`
          : `${count} rooms deleted successfully. Manpower unassigned.`
      );
      setIsBulkRoomDeleteOpen(false);
      await onDataChanged();
    } catch {
      toastError('Failed to delete selected rooms');
    } finally {
      setIsDeletingRoom(false);
    }
  };

  // Add Room
  const handleAddRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;

    try {
      const defaultInventory = (building.facilities || ['AC', 'bed', 'blanket', 'pillow', 'gang socket']).map(
        (f, idx) => ({
          id: `inv-${Date.now()}-${idx}`,
          name: f.charAt(0).toUpperCase() + f.slice(1),
          quantity: building.facilityQuantities?.[f] || 1,
        })
      );

      await roomService.addRoom({
        buildingId: building.id,
        roomNumber: newRoomNumber.trim().startsWith('Room') ? newRoomNumber.trim() : `Room ${newRoomNumber.trim()}`,
        floor: newRoomFloor,
        capacity: newRoomCapacity,
        inventory: defaultInventory,
      });

      success(isRTL ? 'تمت إضافة الغرفة بنجاح' : `Room added successfully`);
      setIsAddRoomOpen(false);
      setNewRoomNumber('');
      await onDataChanged();
    } catch {
      toastError('Failed to add room');
    }
  };

  // Assign Member Submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalRoom) return;

    try {
      if (assignMode === 'existing') {
        if (!selectedExistingPersonnelId) {
          toastError('Please select a personnel');
          return;
        }
        await personnelService.updatePersonnel(selectedExistingPersonnelId, {
          buildingId: building.id,
          roomNumber: assignModalRoom.roomNumber,
        });
      } else {
        if (!newMemberForm.name.trim() || !newMemberForm.iqamaNumber.trim()) {
          toastError('Name and Iqama Number are required');
          return;
        }
        await personnelService.addPersonnel({
          buildingId: building.id,
          campId: building.campId,
          projectId: building.projectId,
          userId: building.userId,
          idNumber: newMemberForm.idNumber.trim() || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          name: newMemberForm.name.trim(),
          jobTitleId: newMemberForm.jobTitleId,
          iqamaNumber: newMemberForm.iqamaNumber.trim(),
          roomNumber: assignModalRoom.roomNumber,
        });
      }

      success(isRTL ? 'تم تعيين الموظف للغرفة بنجاح' : 'Member assigned successfully');
      setAssignModalRoom(null);
      setSelectedExistingPersonnelId('');
      setNewMemberForm({
        name: '',
        iqamaNumber: '',
        idNumber: '',
        jobTitleId: 'LABOUR',
      });
      await onDataChanged();
    } catch {
      toastError('Failed to assign member');
    }
  };

  // Unassign Member from Room (direct without blocking confirm)
  const handleUnassignMember = async (personnelId: string, memberName: string) => {
    try {
      await personnelService.updatePersonnel(personnelId, { roomNumber: '' });
      success(isRTL ? `تم إلغاء تعيين ${memberName}` : `${memberName} removed from room`);
      window.dispatchEvent(new CustomEvent('camp_personnel_updated'));
      await onDataChanged();
    } catch {
      toastError('Failed to unassign member');
    }
  };

  // Inventory Stepper (Instant in-place update, zero screen refresh!)
  const handleUpdateInventoryQty = async (roomId: string, itemId: string, delta: number) => {
    // 1. Optimistic instant UI update
    setLocalRooms((prev) =>
      prev.map((rm) => {
        if (rm.id !== roomId) return rm;
        return {
          ...rm,
          inventory: rm.inventory
            .map((it) => (it.id === itemId ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it))
            .filter((it) => it.quantity > 0),
        };
      })
    );

    // 2. Persist to storage in background
    try {
      await roomService.updateInventoryQuantity(roomId, itemId, delta);
    } catch {
      toastError('Failed to update quantity');
    }
  };

  // Delete Inventory Item (Instant in-place update)
  const handleDeleteInventoryItem = async (roomId: string, itemId: string) => {
    setLocalRooms((prev) =>
      prev.map((rm) => {
        if (rm.id !== roomId) return rm;
        return {
          ...rm,
          inventory: rm.inventory.filter((it) => it.id !== itemId),
        };
      })
    );

    try {
      await roomService.deleteInventoryItem(roomId, itemId);
    } catch {
      toastError('Failed to remove item');
    }
  };

  // Add Inventory Item Submit
  const handleAddInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addItemRoom || !newItemName.trim()) return;

    try {
      const updated = await roomService.addInventoryItem(
        addItemRoom.id,
        newItemName.trim(),
        Number(newItemQty) || 1
      );
      setLocalRooms((prev) => prev.map((rm) => (rm.id === updated.id ? updated : rm)));
      success(isRTL ? 'تمت إضافة العنصر بنجاح' : 'Item added to inventory');
      setAddItemRoom(null);
      setNewItemName('');
      setNewItemQty(1);
    } catch {
      toastError('Failed to add inventory item');
    }
  };

  // Common quick items for inventory modal
  const commonInventoryPresets = [
    'AC',
    'Bed',
    'Blanket',
    'Pillow',
    'Gang Socket',
    'Fridge',
    'Bulb',
    'Electrical Switch',
    'Wall Fan Small',
    'Window',
    'Wash Basin',
    'Hitter',
  ];

  return (
    <div className="space-y-4">
      {/* Search, Filter and Actions Bar (Exact style matching Screenshot 4 & 5) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRTL ? 'بحث في الغرف...' : 'searchRooms'}
            className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-lg text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition"
          />
        </div>

        {/* Floor Filters & Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-between sm:justify-end">
          {floors.length > 1 && (
            <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setSelectedFloor('All')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  selectedFloor === 'All'
                    ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All
              </button>
              {floors.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSelectedFloor(f)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                    selectedFloor === f
                      ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Floor {f}
                </button>
              ))}
            </div>
          )}

          {/* Bulk Delete Selected Rooms Button */}
          {selectedRoomIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDeleteRooms}
              className="h-9 px-3.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-700 flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isRTL ? `حذف الغرف المحددة (${selectedRoomIds.length})` : `Delete Selected (${selectedRoomIds.length})`}</span>
            </button>
          )}

          {/* Select All Button */}
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="h-9 px-3.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 flex items-center gap-1.5 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" />
            <span>{isRTL ? 'تحديد الكل' : 'Select All'}</span>
          </button>

          {/* + addRoom Button */}
          <button
            type="button"
            onClick={() => setIsAddRoomOpen(true)}
            className="h-9 px-4 rounded-lg bg-white border border-neutral-300 hover:bg-neutral-50 text-xs font-semibold text-neutral-900 flex items-center gap-1.5 transition shadow-2xs"
          >
            <Plus className="w-4 h-4 text-neutral-700" />
            <span>{isRTL ? '+ إضافة غرفة' : '+ addRoom'}</span>
          </button>
        </div>
      </div>

      {/* Rooms Grid (Exact Layout from Image 3, 4, 5) */}
      {filteredRooms.length === 0 ? (
        <div className="p-12 text-center bg-white border border-neutral-200 rounded-xl">
          <p className="text-xs text-neutral-500">
            {searchTerm
              ? (isRTL ? 'لم يتم العثور على غرف مطابقة' : 'No rooms matching your search')
              : (isRTL ? 'لا توجد غرف مضافة في هذا المبنى بعد' : 'No rooms found in this building')}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddRoomOpen(true)}
            className="mt-3 text-xs"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            {isRTL ? 'إضافة أول غرفة' : 'Add First Room'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRooms.map((room) => {
            const members = getRoomMembers(room);
            const currentTab = activeTabs[room.id] || 'members';
            const isSelected = selectedRoomIds.includes(room.id);
            const isFull = members.length >= room.capacity;
            const hasOccupants = members.length > 0;

            return (
              <div
                key={room.id}
                className="bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-sm transition-all duration-150 flex flex-col justify-between overflow-hidden"
              >
                {/* Room Header */}
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    {/* Left: Radio/Checkbox circle & Room Number */}
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectRoom(room.id)}
                        className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500'
                            : 'border-amber-400/90 bg-white hover:border-amber-500'
                        }`}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>

                      <div>
                        <h3 className="text-base font-bold text-neutral-900 tracking-tight leading-tight">
                          {room.roomNumber}
                        </h3>
                        <span className="text-[11px] text-neutral-400 font-medium block">
                          Floor {room.floor}
                        </span>
                      </div>
                    </div>

                    {/* Right: Capacity Badge & Delete Button */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono border ${
                          isFull
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : hasOccupants
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-emerald-50/60 text-emerald-700 border-emerald-200/80'
                        }`}
                      >
                        {members.length}/{room.capacity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                        className="text-neutral-400 hover:text-rose-600 p-0.5 rounded transition"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Two Segmented Tabs: Members & Inventory */}
                  <div className="mt-3.5 p-1 bg-neutral-100/90 rounded-lg flex items-center text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTabs((prev) => ({ ...prev, [room.id]: 'members' }))
                      }
                      className={`flex-1 py-1 text-center rounded-md font-medium transition ${
                        currentTab === 'members'
                          ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      {isRTL ? 'الأعضاء' : 'Members'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTabs((prev) => ({ ...prev, [room.id]: 'inventory' }))
                      }
                      className={`flex-1 py-1 text-center rounded-md font-medium transition ${
                        currentTab === 'inventory'
                          ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      {isRTL ? 'المخزون' : 'Inventory'}
                    </button>
                  </div>
                </div>

                {/* Tab Content Body */}
                <div className="px-4 pb-4 flex-1 flex flex-col justify-between">
                  {currentTab === 'members' ? (
                    /* TAB 1: MEMBERS */
                    <div className="space-y-2 flex-1 flex flex-col justify-between">
                      {members.length === 0 ? (
                        /* Empty state matching Image 4 */
                        <div className="py-7 flex flex-col items-center justify-center text-neutral-400 space-y-1">
                          <Users className="w-6 h-6 stroke-[1.5] text-neutral-300" />
                          <span className="text-xs text-neutral-400 font-medium">
                            {isRTL ? 'لا يوجد أعضاء معينين' : 'No members assigned'}
                          </span>
                        </div>
                      ) : (
                        /* Member cards matching Image 4 */
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                          {members.map((member) => {
                            const titleDef = jobTitleService.getJobTitleById(member.jobTitleId);
                            const roleLabel = titleDef ? titleDef.labelEn.toUpperCase() : member.jobTitleId;

                            return (
                              <div
                                key={member.id}
                                className="bg-white border border-neutral-200/90 rounded-lg p-2.5 relative group hover:border-neutral-300 transition"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleUnassignMember(member.id, member.name)}
                                  className="absolute top-2 end-2 text-neutral-300 hover:text-rose-600 transition"
                                  title="Unassign"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>

                                <div className="pe-5">
                                  <div className="text-xs font-bold text-neutral-900 tracking-tight truncate">
                                    {member.name}
                                  </div>
                                  <div className="text-[11px] text-neutral-600 font-mono mt-0.5 flex items-center gap-2">
                                    <span>{member.iqamaNumber}</span>
                                    <span className="text-neutral-700 font-semibold">{roleLabel}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* assignMember Button matching Image 4 */}
                      <button
                        type="button"
                        onClick={() => {
                          setAssignModalRoom(room);
                          setAssignMode('existing');
                          setSelectedExistingPersonnelId('');
                        }}
                        className="w-full mt-2 py-2 rounded-lg bg-neutral-50/80 hover:bg-neutral-100/90 border border-neutral-200/90 text-neutral-700 hover:text-neutral-900 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{isRTL ? 'تعيين عضو' : 'assignMember'}</span>
                      </button>
                    </div>
                  ) : (
                    /* TAB 2: INVENTORY (Matching Image 5) */
                    <div className="space-y-2 flex-1 flex flex-col justify-between">
                      {room.inventory && room.inventory.length > 0 ? (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                          {room.inventory.map((item) => (
                            <div
                              key={item.id}
                              className="bg-white border border-neutral-200/90 rounded-lg px-3 py-2 flex items-center justify-between gap-2"
                            >
                              <span className="text-xs font-semibold text-neutral-800 truncate">
                                {item.name}
                              </span>

                              {/* Stepper + Red Delete Trash Button (Exact layout from Image 5) */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="flex items-center bg-neutral-50 border border-neutral-200 rounded-md">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleUpdateInventoryQty(room.id, item.id, -1);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 rounded-s transition"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-7 text-center font-mono text-xs font-bold text-neutral-900">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleUpdateInventoryQty(room.id, item.id, 1);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 rounded-e transition"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    handleDeleteInventoryItem(room.id, item.id);
                                  }}
                                  className="w-6 h-6 rounded bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition shadow-2xs"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-7 flex flex-col items-center justify-center text-neutral-400 space-y-1">
                          <Package className="w-6 h-6 stroke-[1.5] text-neutral-300" />
                          <span className="text-xs text-neutral-400 font-medium">
                            {isRTL ? 'لا يوجد مخزون مسجل' : 'No inventory items in room'}
                          </span>
                        </div>
                      )}

                      {/* + Add Item Button matching Image 5 */}
                      <button
                        type="button"
                        onClick={() => {
                          setAddItemRoom(room);
                          setNewItemName('');
                          setNewItemQty(1);
                        }}
                        className="w-full mt-2 py-2 rounded-lg bg-neutral-50/80 hover:bg-neutral-100/90 border border-neutral-200/90 text-neutral-700 hover:text-neutral-900 text-xs font-medium flex items-center justify-center gap-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{isRTL ? '+ إضافة عنصر' : '+ Add Item'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add Room Modal */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-900/40 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-sm shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">
                {isRTL ? 'إضافة غرفة جديدة' : 'Add New Room'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRoomOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddRoomSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'رقم / اسم الغرفة' : 'Room Number / Identifier'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 40 or 40"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'الطابق' : 'Floor'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'السعة (أسرّة)' : 'Capacity (Beds)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newRoomCapacity}
                    onChange={(e) => setNewRoomCapacity(Number(e.target.value))}
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsAddRoomOpen(false)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {isRTL ? 'إضافة الغرفة' : 'Add Room'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Assign Member Modal */}
      {assignModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-900/40 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-md shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {isRTL ? `تعيين موظف إلى ${assignModalRoom.roomNumber}` : `Assign Member to ${assignModalRoom.roomNumber}`}
                </h3>
                <span className="text-[11px] text-neutral-500">
                  Floor {assignModalRoom.floor} &bull; Capacity: {assignModalRoom.capacity} Beds
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalRoom(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Mode: Choose Existing vs Add New */}
            <div className="flex rounded-lg bg-neutral-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAssignMode('existing')}
                className={`flex-1 py-1.5 rounded-md font-medium text-center transition ${
                  assignMode === 'existing'
                    ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {isRTL ? 'اختر من المسجلين' : 'Choose Existing Personnel'}
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('new')}
                className={`flex-1 py-1.5 rounded-md font-medium text-center transition ${
                  assignMode === 'new'
                    ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {isRTL ? '+ موظف جديد' : '+ Quick Add Member'}
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-3 text-xs">
              {assignMode === 'existing' ? (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    {isRTL ? 'حدد الموظف' : 'Select Personnel'} *
                  </label>
                  <select
                    value={selectedExistingPersonnelId}
                    onChange={(e) => setSelectedExistingPersonnelId(e.target.value)}
                    required
                    className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="">-- Choose employee --</option>
                    {personnelList.map((p) => {
                      const titleDef = jobTitleService.getJobTitleById(p.jobTitleId);
                      const title = titleDef ? titleDef.labelEn : p.jobTitleId;
                      const currentRm = p.roomNumber ? ` (Currently in ${p.roomNumber})` : ' (Unassigned)';
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} - {p.iqamaNumber} [{title}]{currentRm}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      {isRTL ? 'الاسم الكامل' : 'Full Name'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newMemberForm.name}
                      onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                      placeholder="e.g. MD NAZMUL - HASAN"
                      className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        {isRTL ? 'رقم الإقامة' : 'Iqama Number'} *
                      </label>
                      <input
                        type="text"
                        required
                        value={newMemberForm.iqamaNumber}
                        onChange={(e) =>
                          setNewMemberForm({ ...newMemberForm, iqamaNumber: e.target.value })
                        }
                        placeholder="2587608700"
                        className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        {isRTL ? 'الرقم الوظيفي' : 'Employee ID'}
                      </label>
                      <input
                        type="text"
                        value={newMemberForm.idNumber}
                        onChange={(e) => setNewMemberForm({ ...newMemberForm, idNumber: e.target.value })}
                        placeholder="EMP-3010"
                        className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 font-mono focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      {isRTL ? 'المسمى الوظيفي' : 'Controlled Position / Job Title'}
                    </label>
                    <select
                      value={newMemberForm.jobTitleId}
                      onChange={(e) =>
                        setNewMemberForm({
                          ...newMemberForm,
                          jobTitleId: e.target.value as JobTitleId,
                        })
                      }
                      className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {officialJobTitles.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.labelEn} ({t.labelAr})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setAssignModalRoom(null)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {isRTL ? 'تعيين الآن' : 'Assign to Room'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Inventory Item to Room */}
      {addItemRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-neutral-900/40 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-sm shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-sm font-bold text-neutral-900">
                {isRTL ? `إضافة مخزون إلى ${addItemRoom.roomNumber}` : `Add Item to ${addItemRoom.roomNumber}`}
              </h3>
              <button
                type="button"
                onClick={() => setAddItemRoom(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddInventorySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'اسم العنصر' : 'Item Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AC, Bed, Blanket, Pillow"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase block">
                  Quick Select:
                </span>
                <div className="flex flex-wrap gap-1">
                  {commonInventoryPresets.slice(0, 8).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewItemName(preset)}
                      className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-[10px] text-neutral-700 font-medium transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  {isRTL ? 'الكمية' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(Math.max(1, Number(e.target.value)))}
                  className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddItemRoom(null)}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  {isRTL ? 'إضافة العنصر' : 'Add Item'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM SINGLE ROOM DELETE */}
      {roomToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {isRTL ? 'تأكيد حذف الغرفة' : 'Delete Room'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {roomToDelete.roomNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoomToDelete(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1.5 text-rose-900">
              <p className="font-semibold">
                {isRTL
                  ? `هل أنت متأكد من حذف ${roomToDelete.roomNumber}؟`
                  : `Are you sure you want to delete ${roomToDelete.roomNumber}?`}
              </p>
              <p className="text-[11px] text-rose-700">
                {isRTL
                  ? 'سيتم حذف مخزون هذه الغرفة فقط، والعمال المعينون بها لن يتم حذفهم بل سيتحولون إلى (غير معينين).'
                  : 'This room inventory will be subtracted. Assigned workers will NOT be deleted, they will become unassigned.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRoomToDelete(null)}
                disabled={isDeletingRoom}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmDeleteSingleRoom}
                disabled={isDeletingRoom}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isDeletingRoom ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? 'حذف الغرفة' : 'Delete Room')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM BULK ROOMS DELETE */}
      {isBulkRoomDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    {isRTL ? `حذف ${selectedRoomIds.length} غرف محددة` : `Delete ${selectedRoomIds.length} Rooms`}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {building.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkRoomDeleteOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1.5 text-rose-900">
              <p className="font-semibold">
                {isRTL
                  ? `هل أنت متأكد من حذف ${selectedRoomIds.length} غرف محددة؟`
                  : `Are you sure you want to delete ${selectedRoomIds.length} selected rooms?`}
              </p>
              <p className="text-[11px] text-rose-700">
                {isRTL
                  ? 'سيتم حذف مخزون هذه الغرف، وسيتم تحويل العمال إلى غير معينين دون حذفهم.'
                  : 'Rooms and their inventory will be removed. All personnel inside them will become unassigned.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkRoomDeleteOpen(false)}
                disabled={isDeletingRoom}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmBulkDeleteRooms}
                disabled={isDeletingRoom}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {isDeletingRoom ? (isRTL ? 'جاري الحذف...' : 'Deleting...') : (isRTL ? `حذف ${selectedRoomIds.length} غرف` : `Delete ${selectedRoomIds.length} Rooms`)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
