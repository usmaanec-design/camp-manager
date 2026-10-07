import { Building } from '../types';

const STORAGE_KEY = 'camps_manager_buildings_v1';

const INITIAL_BUILDINGS: Building[] = [];

function getStoredBuildings(): Building[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BUILDINGS));
    return INITIAL_BUILDINGS;
  }
  try {
    const list: Building[] = JSON.parse(data);
    // Purge legacy mock data if detected (only old mock IDs like bld-01, bld-02)
    const cleaned = list.filter((b) => !b.id.startsWith('bld-01') && !b.id.startsWith('bld-02') && !b.id.startsWith('bld-03'));
    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    return list;
  } catch {
    return INITIAL_BUILDINGS;
  }
}

function saveBuildings(buildings: Building[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
  }
}

export const buildingService = {
  getStoredBuildings(): Building[] {
    return getStoredBuildings();
  },

  async getBuildings(campId?: string, projectId?: string): Promise<Building[]> {
    await new Promise((res) => setTimeout(res, 80));
    let buildings = getStoredBuildings();
    if (campId) {
      buildings = buildings.filter((b) => b.campId === campId);
    }
    if (projectId && projectId !== 'All') {
      return buildings.filter((b) => b.projectId === projectId);
    }
    return buildings;
  },

  async getBuildingById(id: string): Promise<Building | null> {
    await new Promise((res) => setTimeout(res, 80));
    const buildings = getStoredBuildings();
    return buildings.find((b) => b.id === id) || null;
  },

  async createBuilding(data: Omit<Building, 'id' | 'reportsCount' | 'createdAt' | 'updatedAt'>): Promise<Building> {
    await new Promise((res) => setTimeout(res, 150));
    const buildings = getStoredBuildings();
    const newBuilding: Building = {
      ...data,
      id: `bld-${Date.now()}`,
      reportsCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    buildings.unshift(newBuilding);
    saveBuildings(buildings);
    return newBuilding;
  },

  async updateBuilding(id: string, updates: Partial<Building>): Promise<Building> {
    await new Promise((res) => setTimeout(res, 150));
    const buildings = getStoredBuildings();
    const idx = buildings.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Building not found');
    buildings[idx] = {
      ...buildings[idx],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    saveBuildings(buildings);
    return buildings[idx];
  },

  async deleteBuilding(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 100));
    const buildings = getStoredBuildings().filter((b) => b.id !== id);
    saveBuildings(buildings);

    // Clean up rooms associated with this building
    const roomsKey = 'camps_manager_building_rooms_v3';
    const rData = localStorage.getItem(roomsKey);
    if (rData) {
      try {
        const rooms = JSON.parse(rData);
        const filteredRooms = rooms.filter((r: any) => r.buildingId !== id);
        localStorage.setItem(roomsKey, JSON.stringify(filteredRooms));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('camp_inventory_updated'));
        }
      } catch {}
    }
  },
};
