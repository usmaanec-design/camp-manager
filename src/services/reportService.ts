import { Report, ReportType } from '../types';
import { mockReports } from '../data/mockData';

const REPORTS_STORAGE_KEY = 'camps_manager_reports_v1';

function getStoredReports(): Report[] {
  const data = localStorage.getItem(REPORTS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(mockReports));
    return mockReports;
  }
  try {
    return JSON.parse(data);
  } catch {
    return mockReports;
  }
}

function saveStoredReports(list: Report[]) {
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(list));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_reports_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export interface ReportFilterParams {
  search?: string;
  userId?: string;
  projectId?: string;
  reportType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  priority?: string;
}

export const reportService = {
  async getReports(params?: ReportFilterParams): Promise<Report[]> {
    await new Promise((res) => setTimeout(res, 80));
    let result = getStoredReports();

    if (params?.userId) {
      result = result.filter((r) => r.userId === params.userId);
    }

    if (params?.projectId && params.projectId !== 'All') {
      result = result.filter((r) => r.projectId === params.projectId);
    }

    if (params?.reportType && params.reportType !== 'All') {
      result = result.filter((r) => r.reportType === params.reportType);
    }

    if (params?.status && params.status !== 'All') {
      result = result.filter((r) => r.status === params.status);
    }

    if (params?.priority && params.priority !== 'All') {
      result = result.filter((r) => r.priority === params.priority);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.reportNumber.toLowerCase().includes(q) ||
          r.userName.toLowerCase().includes(q) ||
          r.projectName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }

    if (params?.startDate) {
      result = result.filter((r) => r.createdAt >= params.startDate!);
    }

    if (params?.endDate) {
      result = result.filter((r) => r.createdAt <= params.endDate! + ' 23:59');
    }

    return result;
  },

  async getReportById(id: string): Promise<Report | null> {
    await new Promise((res) => setTimeout(res, 50));
    const list = getStoredReports();
    return list.find((r) => r.id === id) || null;
  },

  async createReport(
    data: Omit<Report, 'id' | 'reportNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<Report> {
    await new Promise((res) => setTimeout(res, 120));
    const list = getStoredReports();
    const nextNum = 100 + list.length + 1;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const newReport: Report = {
      ...data,
      id: `rep-${Date.now()}`,
      reportNumber: `RPT-2026-0${nextNum}`,
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(newReport);
    saveStoredReports(list);
    return newReport;
  },

  async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    await new Promise((res) => setTimeout(res, 100));
    const list = getStoredReports();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Report not found');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: now,
    };
    saveStoredReports(list);
    return list[idx];
  },

  async deleteReport(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 100));
    const list = getStoredReports().filter((r) => r.id !== id);
    saveStoredReports(list);
  },

  async getRecentReports(limit = 5): Promise<Report[]> {
    await new Promise((res) => setTimeout(res, 50));
    const list = getStoredReports();
    return list.slice(0, limit);
  },

  getReportTypes(): ReportType[] {
    return [
      'Daily Camp Operations',
      'Maintenance Request',
      'HSE Incident / Inspection',
      'Inventory Audit',
      'Vehicle Inspection',
      'Catering & Dining',
      'General Notice',
    ];
  },
};
