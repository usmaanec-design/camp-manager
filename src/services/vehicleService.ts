import { Vehicle } from '../types';
import { mockVehicles } from '../data/mockData';

let vehiclesStore: Vehicle[] = [...mockVehicles];

export const vehicleService = {
  async getVehicles(params?: { projectId?: string; status?: string; search?: string }): Promise<Vehicle[]> {
    await new Promise((res) => setTimeout(res, 200));
    let result = [...vehiclesStore];

    if (params?.projectId && params.projectId !== 'All') {
      result = result.filter((v) => v.projectId === params.projectId);
    }
    if (params?.status && params.status !== 'All') {
      result = result.filter((v) => v.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (v) =>
          v.vehicleNumber.toLowerCase().includes(q) ||
          v.plateNumber.toLowerCase().includes(q) ||
          v.driverName.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q)
      );
    }
    return result;
  },

  async createVehicle(data: Omit<Vehicle, 'id'>): Promise<Vehicle> {
    await new Promise((res) => setTimeout(res, 250));
    const newVehicle: Vehicle = {
      ...data,
      id: `veh-${Date.now()}`,
    };
    vehiclesStore.unshift(newVehicle);
    return newVehicle;
  },

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    await new Promise((res) => setTimeout(res, 200));
    const idx = vehiclesStore.findIndex((v) => v.id === id);
    if (idx === -1) throw new Error('Vehicle not found');
    vehiclesStore[idx] = { ...vehiclesStore[idx], ...updates };
    return vehiclesStore[idx];
  },

  async deleteVehicle(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 200));
    vehiclesStore = vehiclesStore.filter((v) => v.id !== id);
  },
};
