import { WaterUsageRecord } from '../types/utilities';

const STORAGE_KEY = 'camps_manager_water_usage_v1';

// Initial realistic demonstration data
const INITIAL_WATER_RECORDS: WaterUsageRecord[] = [];

function getStoredRecords(): WaterUsageRecord[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_WATER_RECORDS));
    return INITIAL_WATER_RECORDS;
  }
  try {
    const list: WaterUsageRecord[] = JSON.parse(data);
    const cleaned = list.filter((r) => !r.id.startsWith('wtr-0'));
    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    return list;
  } catch {
    return INITIAL_WATER_RECORDS;
  }
}

function saveRecords(records: WaterUsageRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_water_usage_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export const waterUsageService = {
  async getRecords(campId?: string): Promise<WaterUsageRecord[]> {
    await new Promise((res) => setTimeout(res, 40));
    let list = getStoredRecords();
    if (campId && campId !== 'All') {
      list = list.filter((r) => !r.campId || r.campId === campId);
    }
    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async createRecord(
    data: Omit<WaterUsageRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalCost'>
  ): Promise<WaterUsageRecord> {
    await new Promise((res) => setTimeout(res, 50));
    const records = getStoredRecords();
    const trips = Math.max(1, Number(data.trips) || 1);
    const costPerTrip = Math.max(0, Number(data.costPerTrip) || 0);
    const totalCost = trips * costPerTrip;

    const newRec: WaterUsageRecord = {
      ...data,
      id: `wtr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trips,
      costPerTrip,
      totalCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    records.unshift(newRec);
    saveRecords(records);
    return newRec;
  },

  async updateRecord(id: string, updates: Partial<WaterUsageRecord>): Promise<WaterUsageRecord> {
    await new Promise((res) => setTimeout(res, 50));
    const records = getStoredRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Water record not found');

    const existing = records[idx];
    const trips = updates.trips !== undefined ? Math.max(1, Number(updates.trips)) : existing.trips;
    const costPerTrip =
      updates.costPerTrip !== undefined ? Math.max(0, Number(updates.costPerTrip)) : existing.costPerTrip;
    const totalCost = trips * costPerTrip;

    const updated: WaterUsageRecord = {
      ...existing,
      ...updates,
      trips,
      costPerTrip,
      totalCost,
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
