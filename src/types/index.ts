export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type StatusType = 'Active' | 'Inactive' | 'Pending' | 'Completed' | 'Draft' | 'Archived' | 'Maintenance' | 'Low Stock' | 'In Stock' | 'Critical';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  status: 'Active' | 'Inactive';
  projectId?: string;
  projectName?: string;
  createdAt: string;
  lastActivity: string;
  reportsCount: number;
  avatarUrl?: string;
  password?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  status: 'Active' | 'Completed' | 'Pending' | 'Archived';
  usersCount: number;
  reportsCount: number;
  campCapacity: number;
  currentOccupancy: number;
  createdAt: string;
  lastActivity: string;
  description: string;
  managerName: string;
  managerContact: string;
}

export interface Camp {
  id: string;
  projectId: string;
  projectName: string;
  campName: string;
  location: string;
  capacity: number;
  currentOccupancy: number;
  status: 'Active' | 'Maintenance' | 'Inactive';
  managerName: string;
  managerContact: string;
  notes: string;
  roomsCount: number;
  buildingsCount: number;
}

export interface Room {
  id: string;
  campId: string;
  projectId: string;
  roomNumber: string;
  building: string;
  capacity: number;
  occupancy: number;
  status: 'Available' | 'Occupied' | 'Maintenance';
}

export interface Manpower {
  id: string;
  projectId: string;
  projectName: string;
  employeeName: string;
  employeeId: string;
  position: string;
  department: string;
  status: 'Active' | 'On Leave' | 'Transferred' | 'Inactive';
  joinDate: string;
  contactNumber: string;
  nationality?: Nationality | string;
}

export interface Vehicle {
  id: string;
  projectId: string;
  projectName: string;
  vehicleNumber: string;
  type: 'Bus' | 'Pickup' | 'Sedan' | 'Water Tanker' | 'Heavy Equipment' | 'Emergency Vehicle';
  plateNumber: string;
  driverName: string;
  status: 'Active' | 'Maintenance' | 'Out of Service';
  lastInspectionDate: string;
}

export interface InventoryItem {
  id: string;
  projectId: string;
  projectName: string;
  itemName: string;
  category: 'Safety & PPE' | 'Cleaning Supplies' | 'Maintenance' | 'Food & Beverage' | 'Linen & Bedding' | 'Tools & Hardware';
  quantity: number;
  unit: 'pcs' | 'boxes' | 'liters' | 'sets' | 'rolls';
  minimumLevel: number;
  status: 'In Stock' | 'Low Stock' | 'Critical';
  lastRestocked: string;
}

export interface Operation {
  id: string;
  projectId: string;
  projectName: string;
  activityName: string;
  responsiblePerson: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Delayed';
  priority: 'Low' | 'Medium' | 'High';
  date: string;
  notes: string;
}

export interface UtilityRecord {
  id: string;
  projectId: string;
  projectName: string;
  utilityType: 'Water' | 'Gas' | 'Fuel';
  consumption: number;
  unit: 'Gallons' | 'Cubic Meters' | 'Liters' | 'Cylinders';
  cost: number;
  recordDate: string;
  recordedBy: string;
  status: 'Normal' | 'High' | 'Critical';
}

export type ReportType = 
  | 'Daily Camp Operations'
  | 'Maintenance Request'
  | 'HSE Incident / Inspection'
  | 'Inventory Audit'
  | 'Vehicle Inspection'
  | 'Catering & Dining'
  | 'General Notice';

export interface ReportAttachment {
  name: string;
  size: string;
  type: string;
}

export interface Report {
  id: string;
  reportNumber: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  userEmail: string;
  reportType: ReportType;
  title: string;
  description: string;
  notes?: string;
  status: 'Draft' | 'Pending' | 'Completed' | 'Under Review';
  priority: 'Low' | 'Medium' | 'High';
  attachments?: ReportAttachment[];
  createdAt: string;
  updatedAt: string;
}

export type JobTitleId =
  | 'LABOUR'
  | 'SUPERVISOR'
  | 'TECHNICIAN'
  | 'FOREMAN'
  | 'CAMP_BOSS'
  | 'DISPATCHER'
  | 'CREWMAN'
  | 'OFFICE_STAFF';

export interface JobTitleDefinition {
  id: JobTitleId;
  labelEn: string;
  labelAr: string;
  aliases: string[];
}

export interface Building {
  id: string;
  campId: string;
  projectId: string;
  userId: string;
  name: string;
  buildingNumber: string;
  buildingType: 'Accommodation' | 'Mess Hall / Kitchen' | 'Office' | 'Clinic' | 'Recreation' | 'Storage';
  lengthM: number;
  widthM: number;
  floors: number;
  totalRooms: number;
  capacity: number;
  currentOccupancy: number;
  roomRanges: { floor: number; startRoom: number; endRoom: number; roomCount: number }[];
  status: 'Operational' | 'Maintenance' | 'Under Construction';
  facilities: string[];
  facilityQuantities?: Record<string, number>;
  customFacilities?: { name: string; qty: number }[];
  notes?: string;
  reportsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomInventoryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface FlatInventoryRecord {
  id: string;
  itemId: string;
  name: string;
  nameAr?: string;
  quantity: number;
  roomId: string;
  roomNumber: string;
  floor: number;
  buildingId: string;
  buildingName: string;
  category: string;
  buildingType?: 'Living' | 'Utility';
  buildingCategory?: string;
}

export interface BuildingRoom {
  id: string;
  buildingId: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  inventory: RoomInventoryItem[];
  createdAt?: string;
}

export type Nationality =
  | 'Pakistani'
  | 'Indian'
  | 'Bangladeshi'
  | 'Egyptian'
  | 'Palestinian'
  | 'Sudanese'
  | 'Syrian';

export interface NationalityDefinition {
  id: Nationality;
  labelEn: string;
  labelAr: string;
  flag: string;
}

export const FIXED_NATIONALITIES: NationalityDefinition[] = [
  { id: 'Pakistani', labelEn: 'Pakistani', labelAr: 'باكستاني', flag: '🇵🇰' },
  { id: 'Indian', labelEn: 'Indian', labelAr: 'هندي', flag: '🇮🇳' },
  { id: 'Bangladeshi', labelEn: 'Bangladeshi', labelAr: 'بنغلاديشي', flag: '🇧🇩' },
  { id: 'Egyptian', labelEn: 'Egyptian', labelAr: 'مصري', flag: '🇪🇬' },
  { id: 'Palestinian', labelEn: 'Palestinian', labelAr: 'فلسطيني', flag: '🇵🇸' },
  { id: 'Sudanese', labelEn: 'Sudanese', labelAr: 'سوداني', flag: '🇸🇩' },
  { id: 'Syrian', labelEn: 'Syrian', labelAr: 'سوري', flag: '🇸🇾' },
];

export interface BuildingPersonnel {
  id: string;
  buildingId: string;
  campId: string;
  projectId: string;
  userId: string;
  idNumber: string;
  name: string;
  jobTitleId: JobTitleId;
  iqamaNumber: string;
  roomNumber: string;
  nationality?: Nationality | string;
  createdAt: string;
  updatedAt: string;
}

export interface ExcelValidationError {
  row: number;
  column: string;
  problem: string;
  status: 'Error' | 'Warning';
}

export interface ExcelImportState {
  fileName: string;
  fileSize: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ExcelValidationError[];
  previewData: Record<string, any>[];
  targetModule: 'projects' | 'manpower' | 'vehicles' | 'inventory' | 'reports' | 'personnel' | 'utilities';
}

export type UtilityBuildingCategory =
  | 'Washroom Building'
  | 'Kitchen Building'
  | 'Offices Building'
  | 'Workshop Building'
  | 'Camp Store Building';

export interface UtilityCategoryItem {
  id: string;
  name: string;
  nameAr: string;
  defaultQty: number;
  category: UtilityBuildingCategory;
}

export interface UtilityInventoryItem {
  id: string;
  name: string;
  nameAr?: string;
  quantity: number;
  category?: string;
  isCustom?: boolean;
}

export interface UtilityRoom {
  id: string;
  buildingId: string;
  roomNumber: string;
  floor: number;
  inventory: UtilityInventoryItem[];
  createdAt?: string;
}

export interface UtilityBuilding {
  id: string;
  campId?: string;
  projectId?: string;
  userId?: string;
  name: string;
  category: UtilityBuildingCategory;
  floors: number;
  roomsCount: number;
  lengthM?: number;
  widthM?: number;
  rooms: UtilityRoom[];
  status?: 'Operational' | 'Maintenance' | 'Under Construction';
  createdAt: string;
  updatedAt: string;
}

export * from './utilities';
