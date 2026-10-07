import { GasUsageRecord } from '../types/utilities';

const STORAGE_KEY = 'camps_manager_gas_usage_v1';

// Initial realistic demonstration data
const INITIAL_GAS_RECORDS: GasUsageRecord[] = [];

function getStoredRecords(): GasUsageRecord[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_GAS_RECORDS));
    return INITIAL_GAS_RECORDS;
  }
  try {
    const list: GasUsageRecord[] = JSON.parse(data);
    const cleaned = list.filter((r) => !r.id.startsWith('gas-0'));
    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    return list;
  } catch {
    return INITIAL_GAS_RECORDS;
  }
}

function saveRecords(records: GasUsageRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_gas_usage_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export const gasUsageService = {
  async getRecords(campId?: string): Promise<GasUsageRecord[]> {
    await new Promise((res) => setTimeout(res, 40));
    let list = getStoredRecords();
    if (campId && campId !== 'All') {
      list = list.filter((r) => !r.campId || r.campId === campId);
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async createRecord(
    data: Omit<GasUsageRecord, 'id' | 'createdAt' | 'updatedAt' | 'totalCost' | 'totalWeight'>
  ): Promise<GasUsageRecord> {
    await new Promise((res) => setTimeout(res, 50));
    const records = getStoredRecords();
    const cylindersCount = Math.max(1, Number(data.cylindersCount) || 1);
    const costPerCylinder = Math.max(0, Number(data.costPerCylinder) || 0);
    const kgPerCylinder = Math.max(0.1, Number(data.kgPerCylinder) || (data.cylinderType === 'Small Cylinders (12kg)' ? 12 : 48));
    const totalCost = cylindersCount * costPerCylinder;
    const totalWeight = cylindersCount * kgPerCylinder;

    const newRec: GasUsageRecord = {
      ...data,
      id: `gas-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cylindersCount,
      costPerCylinder,
      kgPerCylinder,
      totalCost,
      totalWeight,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    records.unshift(newRec);
    saveRecords(records);
    return newRec;
  },

  async updateRecord(id: string, updates: Partial<GasUsageRecord>): Promise<GasUsageRecord> {
    await new Promise((res) => setTimeout(res, 50));
    const records = getStoredRecords();
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Gas record not found');

    const existing = records[idx];
    const cylindersCount =
      updates.cylindersCount !== undefined ? Math.max(1, Number(updates.cylindersCount)) : existing.cylindersCount;
    const costPerCylinder =
      updates.costPerCylinder !== undefined
        ? Math.max(0, Number(updates.costPerCylinder))
        : existing.costPerCylinder;
    const kgPerCylinder =
      updates.kgPerCylinder !== undefined ? Math.max(0.1, Number(updates.kgPerCylinder)) : existing.kgPerCylinder;
    const totalCost = cylindersCount * costPerCylinder;
    const totalWeight = cylindersCount * kgPerCylinder;

    const updated: GasUsageRecord = {
      ...existing,
      ...updates,
      cylindersCount,
      costPerCylinder,
      kgPerCylinder,
      totalCost,
      totalWeight,
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
