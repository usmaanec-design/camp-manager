import { FuelUsageRecord } from '../types/utilities';

const STORAGE_KEY = 'camps_manager_fuel_usage_v1';

// Initial realistic demonstration data
const INITIAL_FUEL_RECORDS: FuelUsageRecord[] = [];

function getStoredRecords(): FuelUsageRecord[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FUEL_RECORDS));
    return INITIAL_FUEL_RECORDS;
  }
  try {
    const list: FuelUsageRecord[] = JSON.parse(data);
    const cleaned = list.filter((r) => !r.id.startsWith('fuel-0'));
    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    return list;
  } catch {
    return INITIAL_FUEL_RECORDS;
  }
}

function saveRecords(records: FuelUsageRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_fuel_usage_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export const fuelUsageService = {
  async getRecords(campId?: string): Promise<FuelUsageRecord[]> {
    await new Promise((res) => setTimeout(res, 40));
    let list = getStoredRecords();
    if (campId && campId !== 'All') {
      list = list.filter((r) => !r.campId || r.campId === campId);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async createRecord(
    data: Omit<FuelUsageRecord, 'id' | 'createdAt' | 'updatedAt' | 'costPerLiter'>
  ): Promise<FuelUsageRecord> {
    await new Promise((res) => setTimeout(res, 50));
    const records = getStoredRecords();
    const litersUsed = Math.max(0.1, Number(data.litersUsed) || 1);
    const cost = Math.max(0, Number(data.cost) || 0);
    const costPerLiter = Number((cost / litersUsed).toFixed(3));

    const newRec: FuelUsageRecord = {
      ...data,
      id: `fuel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      litersUsed,
      cost,
      costPerLiter,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    records.unshift(newRec);
    saveRecords(records);
    return newRec;
  },

  async updateRecord(id: string, updates: Partial<FuelUsageRecord>): Promise<FuelUsageRecord> {
    await new Promise((res) => setTimeout(res, 50));
    const records = getStoredRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Fuel record not found');

    const existing = records[idx];
    const litersUsed =
      updates.litersUsed !== undefined ? Math.max(0.1, Number(updates.litersUsed)) : existing.litersUsed;
    const cost = updates.cost !== undefined ? Math.max(0, Number(updates.cost)) : existing.cost;
    const costPerLiter = Number((cost / litersUsed).toFixed(3));

    const updated: FuelUsageRecord = {
      ...existing,
      ...updates,
      litersUsed,
      cost,
      costPerLiter,
      updatedAt: new Date().toISOString(),
    };

    records[idx] = updated;
    saveRecords(records);
    return updated;
  },

  async deleteRecord(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 40));
    const records = getStoredRecords();
    const filtered = records.filter((r) => r.id !== id);
    saveRecords(filtered);
  },
};
