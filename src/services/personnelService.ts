import { Building, BuildingPersonnel, JobTitleId } from '../types';
import { matchBuildingForRoom } from '../utils/buildingMatcher';
import { buildingService } from './buildingService';

const STORAGE_KEY = 'camps_manager_personnel_v2';

const INITIAL_PERSONNEL: BuildingPersonnel[] = [];

function getStoredPersonnel(): BuildingPersonnel[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PERSONNEL));
    return INITIAL_PERSONNEL;
  }
  try {
    const list: BuildingPersonnel[] = JSON.parse(data);
    // Purge legacy mock data if detected (only old mock IDs starting with ps-pic-)
    let cleaned = list.filter((p) => !p.id.startsWith('ps-pic-'));
    let modified = cleaned.length !== list.length;

    // Sanitize any corrupt jobTitleId objects from previous faulty uploads
    cleaned.forEach((p: any) => {
      if (typeof p.jobTitleId !== 'string' || !p.jobTitleId) {
        if (p.jobTitleId && typeof p.jobTitleId === 'object' && p.jobTitleId.jobTitleId) {
          p.jobTitleId = p.jobTitleId.jobTitleId;
        } else {
          p.jobTitleId = 'LABOUR';
        }
        modified = true;
      }
    });

    if (modified) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return INITIAL_PERSONNEL;
  }
}

function savePersonnel(records: BuildingPersonnel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_personnel_updated'));
  }
}

export const personnelService = {
  async getPersonnelByBuilding(buildingId: string): Promise<BuildingPersonnel[]> {
    await new Promise((res) => setTimeout(res, 80));
    const list = getStoredPersonnel();
    return list.filter((p) => p.buildingId === buildingId);
  },

  async getAllPersonnel(projectId?: string): Promise<BuildingPersonnel[]> {
    await new Promise((res) => setTimeout(res, 80));
    let list = getStoredPersonnel();
    if (projectId && projectId !== 'All') {
      return list.filter((p) => p.projectId === projectId);
    }
    return list;
  },

  async addPersonnel(
    data: Omit<BuildingPersonnel, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<BuildingPersonnel> {
    await new Promise((res) => setTimeout(res, 120));
    const list = getStoredPersonnel();
    const newRecord: BuildingPersonnel = {
      ...data,
      id: `ps-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    list.unshift(newRecord);
    savePersonnel(list);
    return newRecord;
  },

  async bulkImportPersonnel(
    records: Omit<BuildingPersonnel, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<{ count: number }> {
    await new Promise((res) => setTimeout(res, 200));
    const list = getStoredPersonnel();
    const now = new Date().toISOString().split('T')[0];
    const newRecords: BuildingPersonnel[] = records.map((r, i) => ({
      ...r,
      id: `ps-${Date.now()}-${i}`,
      createdAt: now,
      updatedAt: now,
    }));
    const combined = [...newRecords, ...list];
    savePersonnel(combined);
    return { count: newRecords.length };
  },

  async updatePersonnel(
    id: string,
    updates: Partial<BuildingPersonnel>
  ): Promise<BuildingPersonnel> {
    await new Promise((res) => setTimeout(res, 100));
    const list = getStoredPersonnel();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Personnel record not found');
    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    savePersonnel(list);
    return list[idx];
  },

  async deletePersonnel(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 100));
    const list = getStoredPersonnel().filter((p) => p.id !== id);
    savePersonnel(list);
  },

  async bulkDeletePersonnel(ids: string[]): Promise<number> {
    await new Promise((res) => setTimeout(res, 100));
    const toDeleteSet = new Set(ids);
    const list = getStoredPersonnel().filter((p) => !toDeleteSet.has(p.id));
    savePersonnel(list);
    return ids.length;
  },

  async unassignPersonnelForBuilding(buildingId: string): Promise<number> {
    await new Promise((res) => setTimeout(res, 50));
    const list = getStoredPersonnel();
    let count = 0;
    list.forEach((p) => {
      if (p.buildingId === buildingId) {
        p.buildingId = '';
        p.roomNumber = '';
        p.updatedAt = new Date().toISOString().split('T')[0];
        count++;
      }
    });
    savePersonnel(list);
    return count;
  },

  async unassignPersonnelForRoom(buildingId: string, roomNumber: string): Promise<number> {
    await new Promise((res) => setTimeout(res, 50));
    const list = getStoredPersonnel();
    let count = 0;
    const cleanNum = roomNumber.trim().toLowerCase();
    list.forEach((p) => {
      if (p.buildingId === buildingId && p.roomNumber && p.roomNumber.trim().toLowerCase() === cleanNum) {
        p.roomNumber = '';
        p.updatedAt = new Date().toISOString().split('T')[0];
        count++;
      }
    });
    savePersonnel(list);
    return count;
  },

  calculateBreakdown(personnel: BuildingPersonnel[]): Record<JobTitleId, number> {
    const counts: Record<JobTitleId, number> = {
      LABOUR: 0,
      SUPERVISOR: 0,
      TECHNICIAN: 0,
      FOREMAN: 0,
      CAMP_BOSS: 0,
      DISPATCHER: 0,
      CREWMAN: 0,
      OFFICE_STAFF: 0,
    };
    for (const p of personnel) {
      if (counts[p.jobTitleId] !== undefined) {
        counts[p.jobTitleId]++;
      }
    }
    return counts;
  },

  async reconcileBuildingAssignments(buildings: Building[]): Promise<number> {
    if (!buildings || buildings.length === 0) return 0;
    const list = getStoredPersonnel();
    let updatedCount = 0;

    for (const p of list) {
      if (p.roomNumber) {
        const correctBld = matchBuildingForRoom(p.roomNumber, buildings);
        if (correctBld && correctBld.id !== p.buildingId) {
          p.buildingId = correctBld.id;
          p.campId = correctBld.campId || p.campId;
          p.projectId = correctBld.projectId || p.projectId;
          p.updatedAt = new Date().toISOString().split('T')[0];
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      savePersonnel(list);
      for (const b of buildings) {
        const occ = list.filter((p) => p.buildingId === b.id).length;
        await buildingService.updateBuilding(b.id, { currentOccupancy: occ });
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
        window.dispatchEvent(new CustomEvent('camp_personnel_updated'));
      }
    }

    return updatedCount;
  },
};
