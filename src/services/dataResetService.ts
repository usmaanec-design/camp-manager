// Centralized service to clear all mock data and reset the workspace to a fresh real-data state
import { mockProjects, mockUsers, mockCamps } from '../data/mockData';
import { User, Project, Camp } from '../types';

const DATA_KEYS = [
  'camps_manager_buildings_v1',
  'camps_manager_personnel_v2',
  'camps_manager_utility_buildings_v1',
  'camps_manager_water_usage_v1',
  'camps_manager_gas_usage_v1',
  'camps_manager_fuel_usage_v1',
  'camps_manager_building_rooms_v3',
  'camps_manager_inventory_v1',
  'camps_manager_projects_v1',
  'camps_manager_camps_v1',
  'camps_manager_reports_v1',
  'camps_manager_vehicles_v1',
  'camps_manager_operations_v1',
  'camps_manager_manpower_v1',
];

const SANITIZE_REAL_DATA_FLAG = 'camps_manager_real_users_v4';

export const dataResetService = {
  ensureCleanRealDataState(): void {
    if (typeof window === 'undefined') return;
    
    // Always sanitize real users and projects so fake/mock data never re-appears
    this.sanitizeRealUsersAndProjects();
  },

  sanitizeRealUsersAndProjects(): void {
    if (typeof window === 'undefined') return;

    // 1. Sanitize Users Directory
    try {
      const rawUsers = localStorage.getItem('camps_manager_users_v1');
      let users: User[] = rawUsers ? JSON.parse(rawUsers) : [];

      // Filter out any mock/fake accounts (Abdulaziz Al-Saud, Camp Field Officer, demo accounts)
      users = users.filter((u) => {
        const email = (u.email || '').toLowerCase().trim();
        const name = (u.name || '').toLowerCase().trim();
        if (email.includes('campsmanager.com') || email === 'admin@gmail.com') return false;
        if (name.includes('abdulaziz') || name.includes('field officer')) return false;
        if (u.id?.startsWith('usr-demo-')) return false;
        return true;
      });

      // Ensure the Sharq Camp user exists with real properties
      let sharqUser = users.find((u) => (u.email || '').toLowerCase().trim() === 'sharq@zahran.camp');
      if (sharqUser) {
        sharqUser.projectName = 'Sharq Camp';
        sharqUser.projectId = 'prj-sharq';
        sharqUser.role = 'USER';
      } else {
        users.push({ ...mockUsers[1] });
      }

      // Ensure the Admin user exists with real properties
      let adminUser = users.find((u) => (u.email || '').toLowerCase().trim() === 'admin@zahran.camp');
      if (adminUser) {
        adminUser.name = 'Admin';
        adminUser.role = 'SUPER_ADMIN';
        adminUser.projectName = 'Sharq Camp';
        adminUser.projectId = 'prj-sharq';
      } else {
        users.unshift({ ...mockUsers[0] });
      }

      localStorage.setItem('camps_manager_users_v1', JSON.stringify(users));

      // 2. Sanitize Active Auth Session
      const rawAuth = localStorage.getItem('camps_manager_auth_user');
      if (rawAuth) {
        const authUser: User = JSON.parse(rawAuth);
        const authEmail = (authUser.email || '').toLowerCase().trim();
        const authName = (authUser.name || '').toLowerCase().trim();

        if (
          authEmail.includes('campsmanager.com') ||
          authName.includes('abdulaziz') ||
          authName.includes('field officer') ||
          authUser.id?.startsWith('usr-demo-')
        ) {
          // Replace fake admin session with real admin account
          const realAdmin = users.find((u) => (u.email || '').toLowerCase().trim() === 'admin@zahran.camp') || users[0];
          localStorage.setItem('camps_manager_auth_user', JSON.stringify(realAdmin));
        } else if (authEmail === 'sharq@zahran.camp') {
          authUser.projectName = 'Sharq Camp';
          authUser.projectId = 'prj-sharq';
          localStorage.setItem('camps_manager_auth_user', JSON.stringify(authUser));
        }
      } else {
        // Default to real admin account if none is active
        localStorage.setItem('camps_manager_auth_user', JSON.stringify(mockUsers[0]));
      }

      // 3. Sanitize Projects (Remove Olaya Camp, ensure Sharq Camp exists)
      const rawProjects = localStorage.getItem('camps_manager_projects_v1');
      let projects: Project[] = rawProjects ? JSON.parse(rawProjects) : [];
      projects = projects.filter((p) => {
        const pName = (p.name || '').toLowerCase();
        return !pName.includes('olaya') && p.id !== 'prj-olaya';
      });
      if (!projects.some((p) => (p.name || '').toLowerCase().includes('sharq') || p.id === 'prj-sharq')) {
        projects.unshift(mockProjects[0]);
      }
      localStorage.setItem('camps_manager_projects_v1', JSON.stringify(projects));

      // 4. Sanitize Camps (Remove Olaya Camp, ensure Sharq Camp exists)
      const rawCamps = localStorage.getItem('camps_manager_camps_v1');
      let camps: Camp[] = rawCamps ? JSON.parse(rawCamps) : [];
      camps = camps.filter((c) => {
        const cName = (c.campName || '').toLowerCase();
        const pName = (c.projectName || '').toLowerCase();
        return !cName.includes('olaya') && !pName.includes('olaya') && c.id !== 'camp-olaya';
      });
      if (!camps.some((c) => (c.campName || '').toLowerCase().includes('sharq') || c.id === 'camp-sharq')) {
        camps.unshift(mockCamps[0]);
      }
      localStorage.setItem('camps_manager_camps_v1', JSON.stringify(camps));

      localStorage.setItem(SANITIZE_REAL_DATA_FLAG, 'true');
    } catch (err) {
      console.warn('Real data sanitization error:', err);
    }
  },

  clearAllMockData(): void {
    if (typeof window === 'undefined') return;

    DATA_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      localStorage.setItem(key, JSON.stringify([]));
    });

    // Notify all active listeners across the app
    window.dispatchEvent(new CustomEvent('camp_buildings_updated'));
    window.dispatchEvent(new CustomEvent('camp_inventory_updated'));
    window.dispatchEvent(new CustomEvent('camp_personnel_updated'));
    window.dispatchEvent(new CustomEvent('camp_utilities_updated'));
    window.dispatchEvent(new CustomEvent('camp_water_usage_updated'));
    window.dispatchEvent(new CustomEvent('camp_gas_usage_updated'));
    window.dispatchEvent(new CustomEvent('camp_fuel_usage_updated'));
  },

  isCleanSlate(): boolean {
    if (typeof window === 'undefined') return false;
    const personnel = localStorage.getItem('camps_manager_personnel_v2');
    return personnel === '[]';
  },
};
