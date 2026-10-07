import { UtilityRecord } from '../types';
import { mockUtilities } from '../data/mockData';

let utilitiesStore: UtilityRecord[] = [...mockUtilities];

export const utilityService = {
  async getUtilities(params?: { projectId?: string; utilityType?: string }): Promise<UtilityRecord[]> {
    await new Promise((res) => setTimeout(res, 200));
    let result = [...utilitiesStore];

    if (params?.projectId && params.projectId !== 'All') {
      result = result.filter((u) => u.projectId === params.projectId);
    }
    if (params?.utilityType && params.utilityType !== 'All') {
      result = result.filter((u) => u.utilityType === params.utilityType);
    }
    return result;
  },

  async createUtilityRecord(data: Omit<UtilityRecord, 'id'>): Promise<UtilityRecord> {
    await new Promise((res) => setTimeout(res, 250));
    const newRecord: UtilityRecord = {
      ...data,
      id: `utl-${Date.now()}`,
    };
    utilitiesStore.unshift(newRecord);
    return newRecord;
  },

  async getMonthlySummary(): Promise<{ waterTotal: number; fuelTotal: number; gasTotal: number; totalCost: number }> {
    await new Promise((res) => setTimeout(res, 150));
    let waterTotal = 0;
    let fuelTotal = 0;
    let gasTotal = 0;
    let totalCost = 0;

    utilitiesStore.forEach((u) => {
      totalCost += u.cost;
      if (u.utilityType === 'Water') waterTotal += u.consumption;
      if (u.utilityType === 'Fuel') fuelTotal += u.consumption;
      if (u.utilityType === 'Gas') gasTotal += u.consumption;
    });

    return { waterTotal, fuelTotal, gasTotal, totalCost };
  }
};
