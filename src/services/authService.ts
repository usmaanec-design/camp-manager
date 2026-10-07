import { User, UserRole } from '../types';
import { mockUsers } from '../data/mockData';
import { projectService } from './projectService';
import { campService } from './campService';
import { firebaseSyncService } from './firebaseSyncService';

export interface LoginCredentials {
  email: string;
  password?: string;
  isAdmin?: boolean;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  mobile?: string;
  projectName: string;
  projectRegion: string;
  avatarUrl?: string;
}

const AUTH_STORAGE_KEY = 'camps_manager_auth_user';
const USERS_STORAGE_KEY = 'camps_manager_users_v1';

export function getStoredUsersList(): User[] {
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

export function saveStoredUsersList(users: User[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_auth_user_updated'));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

export const authService = {
  getCurrentUser(): User | null {
    const data = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!data) {
      return null;
    }
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  async login(credentials: LoginCredentials): Promise<User> {
    await new Promise((res) => setTimeout(res, 200));
    const targetEmail = credentials.email.trim().toLowerCase();
    const targetPassword = credentials.password?.trim() || '';
    const allUsers = getStoredUsersList();

    let found = allUsers.find(
      (u) =>
        u.email.toLowerCase() === targetEmail ||
        (targetEmail === 'admin' && (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'))
    );

    if (found) {
      // Password verification if password is set on user
      if (found.password && targetPassword && found.password !== targetPassword) {
        throw new Error('Incorrect password. Please verify your password and try again.');
      }

      if (credentials.isAdmin && found.role === 'USER') {
        throw new Error('Access denied. Administrator credentials required.');
      }

      found.lastActivity = 'Just now';
      saveStoredUsersList(allUsers);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(found));
      return found;
    }

    throw new Error('Account not found. Please create an account or verify your email.');
  },

  async signup(data: SignupData): Promise<User> {
    await new Promise((res) => setTimeout(res, 250));
    const allUsers = getStoredUsersList();
    const cleanEmail = data.email.trim().toLowerCase();

    // Check if email already registered
    const existing = allUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    // 1. Create a brand new isolated project for this user
    const projectName = data.projectName.trim();
    const projectRegion = data.projectRegion.trim() || 'Eastern Province';
    const userName = data.name.trim();
    const mobile = data.mobile?.trim() || '';

    const newProject = await projectService.createProject({
      name: projectName,
      code: `PRJ-${projectName.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') || '01'}`,
      location: projectRegion,
      status: 'Active',
      description: `Camp project operations managed by ${userName}`,
      managerName: userName,
      managerContact: mobile,
      campCapacity: 0,
      currentOccupancy: 0,
    });

    // 2. Automatically initialize a Camp for this new project
    await campService.createCamp({
      projectId: newProject.id,
      projectName: newProject.name,
      campName: `${projectName} Main Camp`,
      location: projectRegion,
      capacity: 0,
      currentOccupancy: 0,
      status: 'Active',
      managerName: userName,
      managerContact: mobile,
      notes: `Primary operational camp for ${projectName}`,
      roomsCount: 0,
      buildingsCount: 0,
    });

    // 3. Create the user associated with this project
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: userName,
      email: cleanEmail,
      mobile: mobile,
      role: 'USER',
      status: 'Active',
      projectId: newProject.id,
      projectName: newProject.name,
      avatarUrl: data.avatarUrl || undefined,
      password: data.password,
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: 'Just now',
      reportsCount: 0,
    };

    allUsers.unshift(newUser);
    saveStoredUsersList(allUsers);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));

    // Sync to Cloud Firestore
    firebaseSyncService.saveUserToFirestore(newUser);

    return newUser;
  },

  async logout(): Promise<void> {
    await new Promise((res) => setTimeout(res, 50));
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('camp_auth_user_updated'));
    }
  },

  switchRole(role: UserRole): User {
    const allUsers = getStoredUsersList();
    let updated: User;
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      updated = allUsers.find((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') || {
        ...mockUsers[0],
        role,
      };
    } else {
      updated = allUsers.find((u) => u.role === 'USER') || {
        ...mockUsers[1],
        role: 'USER',
      };
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  updateProfile(updates: Partial<User>): User {
    const current = this.getCurrentUser();
    if (!current) throw new Error('No user is currently logged in');

    const allUsers = getStoredUsersList();
    const idx = allUsers.findIndex((u) => u.id === current.id || u.email.toLowerCase() === current.email.toLowerCase());

    const updatedUser: User = {
      ...current,
      ...updates,
      lastActivity: 'Just now',
    };

    if (idx !== -1) {
      allUsers[idx] = updatedUser;
    } else {
      allUsers.push(updatedUser);
    }

    saveStoredUsersList(allUsers);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));

    // Sync to Cloud Firestore
    firebaseSyncService.saveUserToFirestore(updatedUser);

    return updatedUser;
  },
};
