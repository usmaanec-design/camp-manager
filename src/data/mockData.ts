import { User, Project, Camp, Room, Manpower, Vehicle, InventoryItem, Operation, UtilityRecord, Report } from '../types';

// Real operational project for Sharq Camp
export const mockProjects: Project[] = [
  {
    id: 'prj-sharq',
    name: 'Sharq Camp',
    code: 'PRJ-SHARQ',
    location: 'Eastern Province',
    status: 'Active',
    description: 'Sharq Camp Operations & Facility Management',
    managerName: 'Sharq Camp Manager',
    managerContact: '+966 58 376 3410',
    campCapacity: 0,
    currentOccupancy: 0,
    createdAt: '2025-01-01',
    lastActivity: 'Active',
    usersCount: 1,
    reportsCount: 0,
  },
];

// Clean real user accounts for the application: Sharq Camp user and Admin
export const mockUsers: User[] = [
  {
    id: 'usr-admin-1',
    name: 'Admin',
    email: 'admin@zahran.camp',
    mobile: '+966 50 376 3410',
    role: 'SUPER_ADMIN',
    status: 'Active',
    projectId: 'prj-sharq',
    projectName: 'Sharq Camp',
    createdAt: '2025-01-01',
    lastActivity: 'Active',
    reportsCount: 0,
    password: 'Admin@2026!',
  },
  {
    id: 'usr-sharq-1',
    name: 'Sharq Camp',
    email: 'sharq@zahran.camp',
    mobile: '+966 58 376 3410',
    role: 'USER',
    status: 'Active',
    projectId: 'prj-sharq',
    projectName: 'Sharq Camp',
    createdAt: '2025-01-01',
    lastActivity: 'Active',
    reportsCount: 0,
    password: 'User@123456',
  },
];

export const mockCamps: Camp[] = [
  {
    id: 'camp-sharq',
    projectId: 'prj-sharq',
    projectName: 'Sharq Camp',
    campName: 'Sharq Camp',
    location: 'Eastern Province',
    capacity: 0,
    currentOccupancy: 0,
    status: 'Active',
    managerName: 'Sharq Camp Manager',
    managerContact: '+966 58 376 3410',
    notes: 'Primary operations camp for Sharq',
    roomsCount: 0,
    buildingsCount: 0,
  },
];

export const mockRooms: Room[] = [];
export const mockManpower: Manpower[] = [];
export const mockVehicles: Vehicle[] = [];
export const mockInventory: InventoryItem[] = [];
export const mockOperations: Operation[] = [];
export const mockUtilities: UtilityRecord[] = [];
export const mockReports: Report[] = [];
