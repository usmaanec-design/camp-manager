import { Building, BuildingRoom, RoomInventoryItem, FlatInventoryRecord } from '../types';

const STORAGE_KEY = 'camps_manager_building_rooms_v3';

// Extract number from room name (e.g. "Room 3" -> 3, "Room 201" -> 201)
export const extractRoomNumber = (str: string): number => {
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
};

export const getInventoryCategory = (itemName: string): string => {
  const n = itemName.trim().toLowerCase();
  if (/bed|blanket|pillow|mattress|quilt|linen/i.test(n)) return 'Bedding & Accommodation';
  if (/ac|air conditioner|split ac|wall fan|cooler|fan/i.test(n)) return 'Climate & Cooling';
  if (/fridge|refrigerator|stove|gas|hitter|hittar|cooker|kitchen|freezer|oven|catering|burner/i.test(n)) return 'Kitchen & Catering';
  if (/switch|socket|bulb|lamp|light|electrical|cable|gang socket/i.test(n)) return 'Electrical & Lighting';
  if (/wash basin|basin|heater|shower|toilet|sink|tap|mirror|drain|plumbing|shattaf/i.test(n)) return 'Sanitary & Utilities';
  if (/ppe|helmet|vest|boot|shoes|safety|chemical|pallet jack|rack|mop|cleaner|detergent|first aid/i.test(n)) return 'Safety & Store Supplies';
  if (/tool|wrench|drill|welding|compressor|grinder|hammer|vise|spanner|work bench|workbench/i.test(n)) return 'Workshop & Tools';
  if (/desk|chair|cabinet|printer|computer|whiteboard|workstation|office/i.test(n)) return 'Office Equipment';
  return 'General Camp Inventory';
};

// Build inventory list from building facilities & custom facilities
export const buildInitialInventoryFromBuilding = (building?: Partial<Building>): RoomInventoryItem[] => {
  const items: RoomInventoryItem[] = [];

  if (building?.facilities && building.facilities.length > 0) {
    building.facilities.forEach((f, idx) => {
      const rawQty = building.facilityQuantities?.[f];
      const qty = rawQty !== undefined && !isNaN(Number(rawQty)) ? Number(rawQty) : 1;
      items.push({
        id: `inv-${Date.now()}-${idx}`,
        name: f.charAt(0).toUpperCase() + f.slice(1),
        quantity: Math.max(1, qty),
      });
    });
  }

  if (building?.customFacilities && building.customFacilities.length > 0) {
    building.customFacilities.forEach((cf, idx) => {
      items.push({
        id: `inv-cust-${Date.now()}-${idx}`,
        name: cf.name,
        quantity: Math.max(1, Number(cf.qty) || 1),
      });
    });
  }

  // Fallback defaults ONLY if facilities were never provided (e.g. legacy buildings)
  const hasExplicitConfig = Boolean(
    building && (Array.isArray(building.facilities) || Array.isArray(building.customFacilities))
  );
  if (items.length === 0 && !hasExplicitConfig) {
    items.push(
      { id: 'inv-def-1', name: 'AC', quantity: 1 },
      { id: 'inv-def-2', name: 'Bed', quantity: 4 },
      { id: 'inv-def-3', name: 'Blanket', quantity: 4 },
      { id: 'inv-def-4', name: 'Pillow', quantity: 4 },
      { id: 'inv-def-5', name: 'Gang Socket', quantity: 2 }
    );
  }

  return items;
};

// Generate full list of rooms matching building specs (Floors, totalRooms, roomRanges)
export const generateRoomsForBuilding = (building: Building): BuildingRoom[] => {
  const generated: BuildingRoom[] = [];
  const baseInventory = buildInitialInventoryFromBuilding(building);
  const targetCount = Number(building.totalRooms) || 20;
  const avgCapacity = targetCount > 0
    ? Math.max(1, Math.round((Number(building.capacity) || 100) / targetCount))
    : 4;

  const rangeSum = (building.roomRanges || []).reduce(
    (s, r) => s + (Number(r.roomCount) || Math.max(0, r.endRoom - r.startRoom + 1)),
    0
  );

  // Case 1: roomRanges per floor are specified and their sum matches totalRooms
  if (building.roomRanges && building.roomRanges.length > 0 && rangeSum === targetCount) {
    building.roomRanges.forEach((range) => {
      const start = Number(range.startRoom) || 1;
      const end = Number(range.endRoom) || start;
      const floor = Number(range.floor) || 1;

      for (let rn = start; rn <= end; rn++) {
        generated.push({
          id: `rm-${building.id}-${floor}-${rn}`,
          buildingId: building.id,
          roomNumber: `Room ${rn}`,
          floor,
          capacity: avgCapacity,
          inventory: JSON.parse(JSON.stringify(baseInventory)),
        });
      }
    });
  }

  // Case 2: No room ranges or range sum differs from totalRooms: generate exact targetCount rooms
  if (generated.length === 0) {
    const total = targetCount;
    const floorsCount = Math.max(1, Number(building.floors) || 1);
    const roomsPerFloor = Math.ceil(total / floorsCount);

    for (let i = 1; i <= total; i++) {
      const floor = Math.min(floorsCount, Math.floor((i - 1) / roomsPerFloor) + 1);
      generated.push({
        id: `rm-${building.id}-${i}`,
        buildingId: building.id,
        roomNumber: `Room ${i}`,
        floor,
        capacity: avgCapacity,
        inventory: JSON.parse(JSON.stringify(baseInventory)),
      });
    }
  }

  // Sort sequentially by room number
  generated.sort((a, b) => extractRoomNumber(a.roomNumber) - extractRoomNumber(b.roomNumber));
  return generated;
};

const INITIAL_ROOMS: BuildingRoom[] = [];

function getStoredRooms(): BuildingRoom[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ROOMS));
    return INITIAL_ROOMS;
  }
  try {
    const list: BuildingRoom[] = JSON.parse(data);
    // Purge legacy mock rooms
    const cleaned = list.filter(
      (r) => !r.buildingId.startsWith('bld-0') && !r.id.startsWith('rm-bld01')
    );
    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    return list;
  } catch {
    return INITIAL_ROOMS;
  }
}

function saveRooms(rooms: BuildingRoom[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_inventory_updated'));
  }
}

export const roomService = {
  getStoredRooms(): BuildingRoom[] {
    return getStoredRooms();
  },

  getRoomsCountForBuilding(buildingId: string): number {
    return getStoredRooms().filter((r) => r.buildingId === buildingId).length;
  },

  async getRoomsByBuilding(building: Building): Promise<BuildingRoom[]> {
    await new Promise((res) => setTimeout(res, 50));
    const allRooms = getStoredRooms();
    let buildingRooms = allRooms.filter((r) => r.buildingId === building.id);

    // Only generate rooms if building has NO rooms at all (brand new building)
    if (buildingRooms.length === 0) {
      const generated = generateRoomsForBuilding(building);
      const otherRooms = allRooms.filter((r) => r.buildingId !== building.id);
      const updated = [...otherRooms, ...generated];
      saveRooms(updated);
      buildingRooms = generated;
    }

    // Ensure rooms have initial inventory if empty
    const baseInventory = buildInitialInventoryFromBuilding(building);
    let inventoryModified = false;
    buildingRooms.forEach((rm) => {
      if (!rm.inventory || rm.inventory.length === 0) {
        rm.inventory = baseInventory.map((baseItem, idx) => ({
          id: `inv-${rm.id}-${idx}`,
          name: baseItem.name,
          quantity: baseItem.quantity,
        }));
        inventoryModified = true;
      }
    });

    if (inventoryModified) {
      saveRooms(allRooms);
    }

    // Sort sequentially by number
    buildingRooms.sort((a, b) => extractRoomNumber(a.roomNumber) - extractRoomNumber(b.roomNumber));
    return buildingRooms;
  },

  async createRoomsForNewBuilding(building: Building): Promise<BuildingRoom[]> {
    const allRooms = getStoredRooms();
    const generated = generateRoomsForBuilding(building);
    const otherRooms = allRooms.filter((r) => r.buildingId !== building.id);
    const updated = [...otherRooms, ...generated];
    saveRooms(updated);
    return generated;
  },

  // Propagate updated building facilities/custom facilities to all rooms in this building
  async syncBuildingInventoryToRooms(building: Building): Promise<void> {
    const allRooms = getStoredRooms();
    const baseInventory = buildInitialInventoryFromBuilding(building);

    allRooms.forEach((room) => {
      if (room.buildingId === building.id) {
        // Fully synchronize room inventory: unselected items removed, selected items updated with exact quantities
        room.inventory = baseInventory.map((baseItem, idx) => ({
          id: `inv-${room.id}-${idx}`,
          name: baseItem.name,
          quantity: baseItem.quantity,
        }));
      }
    });

    saveRooms(allRooms);
  },

  async addRoom(roomData: Omit<BuildingRoom, 'id'>): Promise<BuildingRoom> {
    await new Promise((res) => setTimeout(res, 60));
    const allRooms = getStoredRooms();
    const newRoom: BuildingRoom = {
      ...roomData,
      id: `rm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    allRooms.push(newRoom);
    saveRooms(allRooms);
    return newRoom;
  },

  async updateRoom(roomId: string, updates: Partial<BuildingRoom>): Promise<BuildingRoom> {
    const allRooms = getStoredRooms();
    const idx = allRooms.findIndex((r) => r.id === roomId);
    if (idx === -1) throw new Error('Room not found');
    allRooms[idx] = { ...allRooms[idx], ...updates };
    saveRooms(allRooms);
    return allRooms[idx];
  },

  // Delete room without mutating/renaming other rooms
  async deleteRoom(roomId: string, resequence: boolean = false): Promise<void> {
    await new Promise((res) => setTimeout(res, 50));
    const allRooms = getStoredRooms();
    const targetRoom = allRooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    const buildingId = targetRoom.buildingId;
    let buildingRooms = allRooms.filter((r) => r.buildingId === buildingId && r.id !== roomId);
    const otherRooms = allRooms.filter((r) => r.buildingId !== buildingId);

    // Only resequence if explicitly requested
    if (resequence && buildingRooms.length > 0) {
      const isSequential = buildingRooms.some((r) => /^Room \d+$/i.test(r.roomNumber));
      if (isSequential) {
        buildingRooms = buildingRooms.map((r, idx) => ({
          ...r,
          roomNumber: `Room ${idx + 1}`,
        }));
      }
    }

    const updated = [...otherRooms, ...buildingRooms];
    saveRooms(updated);

    // Update building's totalRooms count in storage so building card and counts stay accurate
    try {
      const bKey = 'camps_manager_buildings_v1';
      const bData = localStorage.getItem(bKey);
      if (bData) {
        const bList = JSON.parse(bData);
        const bIdx = bList.findIndex((b: any) => b.id === buildingId);
        if (bIdx !== -1) {
          bList[bIdx].totalRooms = buildingRooms.length;
          localStorage.setItem(bKey, JSON.stringify(bList));
        }
      }
    } catch {}
  },

  async bulkDeleteRooms(roomIds: string[]): Promise<void> {
    await new Promise((res) => setTimeout(res, 50));
    const allRooms = getStoredRooms();
    const toDeleteSet = new Set(roomIds);
    const remaining = allRooms.filter((r) => !toDeleteSet.has(r.id));
    saveRooms(remaining);
  },

  // Update quantity of an inventory item within a specific room
  async updateInventoryQuantity(roomId: string, itemId: string, delta: number): Promise<BuildingRoom> {
    const allRooms = getStoredRooms();
    const room = allRooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const item = room.inventory.find((i) => i.id === itemId);
    if (item) {
      item.quantity = Math.max(0, item.quantity + delta);
      if (item.quantity === 0) {
        room.inventory = room.inventory.filter((i) => i.id !== itemId);
      }
    }
    saveRooms(allRooms);
    return room;
  },

  // Add inventory item to a specific room only
  async addInventoryItem(roomId: string, name: string, quantity: number): Promise<BuildingRoom> {
    const allRooms = getStoredRooms();
    const room = allRooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const existing = room.inventory.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      existing.quantity += quantity;
    } else {
      room.inventory.push({
        id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name,
        quantity: Math.max(1, quantity),
      });
    }
    saveRooms(allRooms);
    return room;
  },

  // Delete inventory item from a specific room only
  async deleteInventoryItem(roomId: string, itemId: string): Promise<BuildingRoom> {
    const allRooms = getStoredRooms();
    const room = allRooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');
    room.inventory = room.inventory.filter((i) => i.id !== itemId);
    saveRooms(allRooms);
    return room;
  },

  // Get all flattened camp inventory across all buildings & rooms
  async getAllCampInventory(buildings: Building[]): Promise<FlatInventoryRecord[]> {
    const allRooms = getStoredRooms();
    const validBuildingIds = new Set(buildings.map((b) => b.id));
    const bMap = new Map<string, string>();
    buildings.forEach((b) => bMap.set(b.id, b.name));

    const records: FlatInventoryRecord[] = [];
    allRooms.forEach((room) => {
      // Strictly skip any room that does not belong to the current buildings list!
      if (!validBuildingIds.has(room.buildingId)) {
        return;
      }
      const bName = bMap.get(room.buildingId) || `Building ${room.buildingId}`;
      room.inventory.forEach((item) => {
        records.push({
          id: `${room.id}_${item.id}`,
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          roomId: room.id,
          roomNumber: room.roomNumber,
          floor: room.floor,
          buildingId: room.buildingId,
          buildingName: bName,
          category: getInventoryCategory(item.name),
          buildingType: 'Living',
          buildingCategory: 'Living Building',
        });
      });
    });

    return records;
  },

  async deleteRoomsForBuilding(buildingId: string): Promise<void> {
    const allRooms = getStoredRooms();
    const filtered = allRooms.filter((r) => r.buildingId !== buildingId);
    saveRooms(filtered);
  },

  // Bulk delete multiple items from rooms
  async bulkDeleteCampInventory(
    records: Array<{ roomId: string; itemId: string }>
  ): Promise<void> {
    const allRooms = getStoredRooms();
    const targetSet = new Set(records.map((r) => `${r.roomId}_${r.itemId}`));

    allRooms.forEach((rm) => {
      rm.inventory = rm.inventory.filter((it) => !targetSet.has(`${rm.id}_${it.id}`));
    });

    saveRooms(allRooms);
  },

  // Update item details (name/quantity) from camp inventory page
  async updateCampInventoryItem(roomId: string, itemId: string, newName: string, newQty: number): Promise<void> {
    const allRooms = getStoredRooms();
    const room = allRooms.find((r) => r.id === roomId);
    if (!room) return;
    const item = room.inventory.find((i) => i.id === itemId);
    if (!item) return;
    if (newName) item.name = newName.trim();
    if (!isNaN(newQty)) item.quantity = Math.max(0, newQty);
    if (item.quantity === 0) {
      room.inventory = room.inventory.filter((i) => i.id !== itemId);
    }
    saveRooms(allRooms);
  },

  // Delete item from camp inventory page
  async deleteCampInventoryItem(roomId: string, itemId: string): Promise<void> {
    const allRooms = getStoredRooms();
    const room = allRooms.find((r) => r.id === roomId);
    if (!room) return;
    room.inventory = room.inventory.filter((i) => i.id !== itemId);
    saveRooms(allRooms);
  },

  // Add item from camp inventory page (to specific room or all rooms in building)
  async addCampInventoryItem(
    buildingId: string,
    targetRoomId: string | 'ALL',
    name: string,
    quantity: number
  ): Promise<void> {
    const allRooms = getStoredRooms();
    const roomsToUpdate =
      targetRoomId === 'ALL'
        ? allRooms.filter((r) => r.buildingId === buildingId)
        : allRooms.filter((r) => r.id === targetRoomId);

    roomsToUpdate.forEach((room) => {
      const existing = room.inventory.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
      if (existing) {
        existing.quantity += quantity;
      } else {
        room.inventory.push({
          id: `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name: name.trim(),
          quantity: Math.max(1, quantity),
        });
      }
    });

    saveRooms(allRooms);
  },
};
