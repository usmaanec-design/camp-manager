import { Camp, Room } from '../types';
import { mockCamps, mockRooms } from '../data/mockData';
import { getStoredProjects } from './projectService';

const CAMPS_STORAGE_KEY = 'camps_manager_camps_v1';
const ROOMS_STORAGE_KEY = 'camps_manager_rooms_v1';

export function getStoredCamps(): Camp[] {
  const data = localStorage.getItem(CAMPS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(CAMPS_STORAGE_KEY, JSON.stringify(mockCamps));
    return mockCamps;
  }
  try {
    return JSON.parse(data);
  } catch {
    return mockCamps;
  }
}

export function saveStoredCamps(camps: Camp[]) {
  localStorage.setItem(CAMPS_STORAGE_KEY, JSON.stringify(camps));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_camps_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export function getStoredRooms(): Room[] {
  const data = localStorage.getItem(ROOMS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(mockRooms));
    return mockRooms;
  }
  try {
    return JSON.parse(data);
  } catch {
    return mockRooms;
  }
}

export function saveStoredRooms(rooms: Room[]) {
  localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_rooms_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export const campService = {
  async getCamps(projectId?: string): Promise<Camp[]> {
    await new Promise((res) => setTimeout(res, 80));
    const list = getStoredCamps();
    if (projectId && projectId !== 'All') {
      return list.filter((c) => c.projectId === projectId);
    }
    return list;
  },

  async getCampById(id: string): Promise<Camp | null> {
    await new Promise((res) => setTimeout(res, 50));
    const list = getStoredCamps();
    return list.find((c) => c.id === id) || null;
  },

  async getCampByProjectId(projectId: string): Promise<Camp | null> {
    await new Promise((res) => setTimeout(res, 50));
    const list = getStoredCamps();
    const found = list.find((c) => c.projectId === projectId);
    if (found) return found;

    // If no camp exists for this project yet, auto-create one
    const projects = getStoredProjects();
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      const newCamp: Camp = {
        id: `cmp-${Date.now()}`,
        projectId: project.id,
        projectName: project.name,
        campName: `${project.name} Main Camp`,
        location: project.location || 'Eastern Province',
        capacity: 0,
        currentOccupancy: 0,
        status: 'Active',
        managerName: project.managerName || 'Operations Manager',
        managerContact: project.managerContact || '',
        notes: `Main operational camp for ${project.name}`,
        roomsCount: 0,
        buildingsCount: 0,
      };
      list.unshift(newCamp);
      saveStoredCamps(list);
      return newCamp;
    }

    return null;
  },

  async createCamp(data: Omit<Camp, 'id'>): Promise<Camp> {
    await new Promise((res) => setTimeout(res, 100));
    const list = getStoredCamps();
    const newCamp: Camp = {
      ...data,
      id: `cmp-${Date.now()}`,
    };
    list.unshift(newCamp);
    saveStoredCamps(list);
    return newCamp;
  },

  async updateCamp(id: string, updates: Partial<Camp>): Promise<Camp> {
    await new Promise((res) => setTimeout(res, 80));
    const list = getStoredCamps();
    const idx = list.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Camp not found');
    list[idx] = { ...list[idx], ...updates };
    saveStoredCamps(list);
    return list[idx];
  },

  async getRooms(campId?: string, projectId?: string): Promise<Room[]> {
    await new Promise((res) => setTimeout(res, 80));
    let result = getStoredRooms();
    if (campId) result = result.filter((r) => r.campId === campId);
    if (projectId && projectId !== 'All') result = result.filter((r) => r.projectId === projectId);
    return result;
  },

  async updateRoomStatus(roomId: string, status: Room['status'], occupancy?: number): Promise<Room> {
    await new Promise((res) => setTimeout(res, 80));
    const rooms = getStoredRooms();
    const idx = rooms.findIndex((r) => r.id === roomId);
    if (idx === -1) throw new Error('Room not found');
    rooms[idx] = {
      ...rooms[idx],
      status,
      occupancy: occupancy !== undefined ? occupancy : rooms[idx].occupancy,
    };
    saveStoredRooms(rooms);
    return rooms[idx];
  },
};
