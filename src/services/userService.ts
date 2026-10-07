import { User } from '../types';
import { mockUsers } from '../data/mockData';

const USERS_STORAGE_KEY = 'camps_manager_users_v1';

function getStoredUsers(): User[] {
  const data = localStorage.getItem(USERS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mockUsers));
    return mockUsers;
  }
  try {
    return JSON.parse(data);
  } catch {
    return mockUsers;
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export const userService = {
  async getUsers(params?: {
    search?: string;
    role?: string;
    status?: string;
    projectId?: string;
  }): Promise<User[]> {
    await new Promise((res) => setTimeout(res, 100));
    let result = getStoredUsers();

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.mobile.includes(q) ||
          (u.projectName && u.projectName.toLowerCase().includes(q))
      );
    }

    if (params?.role && params.role !== 'All') {
      result = result.filter((u) => u.role === params.role);
    }

    if (params?.status && params.status !== 'All') {
      result = result.filter((u) => u.status === params.status);
    }

    if (params?.projectId && params.projectId !== 'All') {
      result = result.filter((u) => u.projectId === params.projectId);
    }

    return result;
  },

  async getUserById(id: string): Promise<User | null> {
    await new Promise((res) => setTimeout(res, 80));
    const users = getStoredUsers();
    return users.find((u) => u.id === id) || null;
  },

  async createUser(data: Omit<User, 'id' | 'createdAt' | 'lastActivity' | 'reportsCount'>): Promise<User> {
    await new Promise((res) => setTimeout(res, 150));
    const users = getStoredUsers();
    const newUser: User = {
      ...data,
      id: `usr-${Date.now()}`,
      reportsCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: 'Never',
    };
    users.unshift(newUser);
    saveUsers(users);
    return newUser;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await new Promise((res) => setTimeout(res, 120));
    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    users[idx] = { ...users[idx], ...updates };
    saveUsers(users);
    return users[idx];
  },

  async deleteUser(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 150));
    const users = getStoredUsers().filter((u) => u.id !== id);
    saveUsers(users);
  },

  async toggleUserStatus(id: string): Promise<User> {
    const user = await this.getUserById(id);
    if (!user) throw new Error('User not found');
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    return this.updateUser(id, { status: newStatus });
  },

  async assignProject(userId: string, projectId: string, projectName: string): Promise<User> {
    return this.updateUser(userId, { projectId, projectName });
  },
};
