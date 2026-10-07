import { Operation } from '../types';
import { mockOperations } from '../data/mockData';

let operationsStore: Operation[] = [...mockOperations];

export const operationService = {
  async getOperations(params?: { projectId?: string; status?: string; search?: string }): Promise<Operation[]> {
    await new Promise((res) => setTimeout(res, 200));
    let result = [...operationsStore];

    if (params?.projectId && params.projectId !== 'All') {
      result = result.filter((o) => o.projectId === params.projectId);
    }
    if (params?.status && params.status !== 'All') {
      result = result.filter((o) => o.status === params.status);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (o) =>
          o.activityName.toLowerCase().includes(q) ||
          o.responsiblePerson.toLowerCase().includes(q) ||
          o.notes.toLowerCase().includes(q)
      );
    }
    return result;
  },

  async createOperation(data: Omit<Operation, 'id'>): Promise<Operation> {
    await new Promise((res) => setTimeout(res, 250));
    const newOp: Operation = {
      ...data,
      id: `op-${Date.now()}`,
    };
    operationsStore.unshift(newOp);
    return newOp;
  },

  async updateOperation(id: string, updates: Partial<Operation>): Promise<Operation> {
    await new Promise((res) => setTimeout(res, 200));
    const idx = operationsStore.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error('Operation not found');
    operationsStore[idx] = { ...operationsStore[idx], ...updates };
    return operationsStore[idx];
  },

  async deleteOperation(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 200));
    operationsStore = operationsStore.filter((o) => o.id !== id);
  },
};
