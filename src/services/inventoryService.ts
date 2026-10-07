import { InventoryItem } from '../types';
import { getInventoryCategory, roomService } from './roomService';
import { buildingService } from './buildingService';
import { utilityBuildingService } from './utilityBuildingService';

const INVENTORY_STORAGE_KEY = 'camps_manager_inventory_v1';

function getManualStoredInventory(): InventoryItem[] {
  const data = localStorage.getItem(INVENTORY_STORAGE_KEY);
  if (!data) {
    return [];
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function getAggregatedCampInventory(): InventoryItem[] {
  const items: InventoryItem[] = [];

  // 1. From Accommodation Living Buildings & Rooms (all users, all camps)
  try {
    const buildings = buildingService.getStoredBuildings();
    const allRooms = roomService.getStoredRooms();
    const bMap = new Map<string, any>();
    buildings.forEach((b) => bMap.set(b.id, b));

    allRooms.forEach((room) => {
      const bld = bMap.get(room.buildingId);
      if (!bld) return;

      (room.inventory || []).forEach((inv) => {
        const qty = Number(inv.quantity) || 1;
        const cat = getInventoryCategory(inv.name);
        items.push({
          id: `inv-room-${room.id}-${inv.id}`,
          projectId: bld.projectId || '',
          projectName: bld.projectName || bld.name || 'Main Camp',
          itemName: inv.name,
          category: cat as any,
          quantity: qty,
          unit: 'pcs',
          minimumLevel: 5,
          status: 'In Stock',
          lastRestocked: bld.createdAt || new Date().toISOString().split('T')[0],
        });
      });
    });
  } catch (err) {
    console.error('Error reading living inventory:', err);
  }

  // 2. From Utility Buildings & Units (Kitchen, Washroom, Office, Store, etc. - all users, all camps)
  try {
    const uBuildings = utilityBuildingService.getStoredUtilityBuildings();
    uBuildings.forEach((ub) => {
      (ub.rooms || []).forEach((room) => {
        (room.inventory || []).forEach((inv) => {
          const qty = Number(inv.quantity) || 1;
          const cat = inv.category || getInventoryCategory(inv.name);
          items.push({
            id: `inv-ubld-${ub.id}-${room.id}-${inv.id}`,
            projectId: ub.projectId || '',
            projectName: (ub as any).projectName || ub.name || 'Utility Block',
            itemName: inv.name,
            category: cat as any,
            quantity: qty,
            unit: 'pcs',
            minimumLevel: 5,
            status: 'In Stock',
            lastRestocked: ub.createdAt || new Date().toISOString().split('T')[0],
          });
        });
      });
    });
  } catch (err) {
    console.error('Error reading utility inventory:', err);
  }

  return items;
}

function getStoredInventory(): InventoryItem[] {
  const manual = getManualStoredInventory();
  const aggregated = getAggregatedCampInventory();
  return [...aggregated, ...manual];
}

function saveStoredInventory(list: InventoryItem[]) {
  // Only save items created manually that don't come from live building rooms
  const manualOnly = list.filter((i) => !i.id.startsWith('inv-room-') && !i.id.startsWith('inv-ubld-'));
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(manualOnly));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_inventory_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export const inventoryService = {
  async getInventory(params?: { projectId?: string; category?: string; status?: string; search?: string }): Promise<InventoryItem[]> {
    await new Promise((res) => setTimeout(res, 40));
    let result = getStoredInventory();

    if (params?.projectId && params.projectId !== 'All') {
      result = result.filter((i) => i.projectId === params.projectId);
    }
    if (params?.category && params.category !== 'All') {
      result = result.filter((i) => i.category === params.category);
    }
    if (params?.status && params.status !== 'All') {
      result = result.filter((i) => i.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (i) =>
          i.itemName.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.projectName.toLowerCase().includes(q)
      );
    }
    return result;
  },

  async createItem(data: Omit<InventoryItem, 'id'>): Promise<InventoryItem> {
    await new Promise((res) => setTimeout(res, 80));
    const manualList = getManualStoredInventory();
    const newItem: InventoryItem = {
      ...data,
      id: `inv-${Date.now()}`,
    };
    manualList.unshift(newItem);
    saveStoredInventory(manualList);
    return newItem;
  },

  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    await new Promise((res) => setTimeout(res, 80));
    const manualList = getManualStoredInventory();
    const idx = manualList.findIndex((i) => i.id === id);
    if (idx !== -1) {
      manualList[idx] = { ...manualList[idx], ...updates };
      saveStoredInventory(manualList);
      return manualList[idx];
    }
    return { id, ...updates } as InventoryItem;
  },

  async deleteItem(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 80));
    const manualList = getManualStoredInventory().filter((i) => i.id !== id);
    saveStoredInventory(manualList);
  },
};
