import { Manpower } from '../types';
import { mockManpower } from '../data/mockData';

const MANPOWER_STORAGE_KEY = 'camps_manager_manpower_v1';

function getStoredManpower(): Manpower[] {
  const data = localStorage.getItem(MANPOWER_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(MANPOWER_STORAGE_KEY, JSON.stringify(mockManpower));
    return mockManpower;
  }
  try {
    return JSON.parse(data);
  } catch {
    return mockManpower;
  }
}

function saveStoredManpower(list: Manpower[]) {
  localStorage.setItem(MANPOWER_STORAGE_KEY, JSON.stringify(list));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_manpower_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export const manpowerService = {
  async getManpower(params?: { projectId?: string; status?: string; department?: string; search?: string }): Promise<Manpower[]> {
    await new Promise((res) => setTimeout(res, 80));
    let result = getStoredManpower();

    if (params?.projectId && params.projectId !== 'All') {
      result = result.filter((m) => m.projectId === params.projectId);
    }
    if (params?.status && params.status !== 'All') {
      result = result.filter((m) => m.status === params.status);
    }
    if (params?.department && params.department !== 'All') {
      result = result.filter((m) => m.department === params.department);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.employeeName.toLowerCase().includes(q) ||
          m.employeeId.toLowerCase().includes(q) ||
          m.position.toLowerCase().includes(q) ||
          m.department.toLowerCase().includes(q)
      );
    }
    return result;
  },

  async createEmployee(data: Omit<Manpower, 'id'>): Promise<Manpower> {
    await new Promise((res) => setTimeout(res, 120));
    const list = getStoredManpower();
    const newEmployee: Manpower = {
      ...data,
      id: `emp-${Date.now()}`,
    };
    list.unshift(newEmployee);
    saveStoredManpower(list);
    return newEmployee;
  },

  async updateEmployee(id: string, updates: Partial<Manpower>): Promise<Manpower> {
    await new Promise((res) => setTimeout(res, 100));
    const list = getStoredManpower();
    const idx = list.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error('Employee not found');
    list[idx] = { ...list[idx], ...updates };
    saveStoredManpower(list);
    return list[idx];
  },

  async deleteEmployee(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 100));
    const list = getStoredManpower().filter((m) => m.id !== id);
    saveStoredManpower(list);
  },
};
