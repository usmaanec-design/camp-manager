import { Project } from '../types';
import { mockProjects } from '../data/mockData';
import { firebaseSyncService } from './firebaseSyncService';

const PROJECTS_STORAGE_KEY = 'camps_manager_projects_v1';

export function getStoredProjects(): Project[] {
  const data = localStorage.getItem(PROJECTS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(mockProjects));
    return mockProjects;
  }
  try {
    return JSON.parse(data);
  } catch {
    return mockProjects;
  }
}

export function saveStoredProjects(projects: Project[]) {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_projects_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export const projectService = {
  async getProjects(params?: { search?: string; status?: string }): Promise<Project[]> {
    await new Promise((res) => setTimeout(res, 80));
    let result = getStoredProjects();

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.managerName.toLowerCase().includes(q)
      );
    }

    if (params?.status && params.status !== 'All') {
      result = result.filter((p) => p.status === params.status);
    }

    return result;
  },

  async getProjectById(id: string): Promise<Project | null> {
    await new Promise((res) => setTimeout(res, 50));
    const projects = getStoredProjects();
    const project = projects.find((p) => p.id === id);
    return project || null;
  },

  async createProject(
    data: Omit<Project, 'id' | 'createdAt' | 'lastActivity' | 'usersCount' | 'reportsCount'>
  ): Promise<Project> {
    await new Promise((res) => setTimeout(res, 120));
    const projects = getStoredProjects();
    const newProject: Project = {
      ...data,
      id: `prj-${Date.now()}`,
      usersCount: 1,
      reportsCount: 0,
      campCapacity: data.campCapacity || 0,
      currentOccupancy: data.currentOccupancy || 0,
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: 'Just created',
    };
    projects.unshift(newProject);
    saveStoredProjects(projects);

    // Sync to Cloud Firestore
    firebaseSyncService.saveProjectToFirestore(newProject);

    return newProject;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    await new Promise((res) => setTimeout(res, 100));
    const projects = getStoredProjects();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Project not found');

    projects[idx] = {
      ...projects[idx],
      ...updates,
      lastActivity: 'Updated just now',
    };
    saveStoredProjects(projects);

    // Sync to Cloud Firestore
    firebaseSyncService.saveProjectToFirestore(projects[idx]);

    return projects[idx];
  },

  async deleteProject(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 100));
    const projects = getStoredProjects().filter((p) => p.id !== id);
    saveStoredProjects(projects);
  },

  async archiveProject(id: string): Promise<Project> {
    return this.updateProject(id, { status: 'Archived' });
  },
};
