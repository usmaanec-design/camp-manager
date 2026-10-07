import * as XLSX from 'xlsx';
import {
  UtilityBuilding,
  UtilityBuildingCategory,
  UtilityCategoryItem,
  UtilityInventoryItem,
  UtilityRoom,
  FlatInventoryRecord,
} from '../types';
import { getInventoryCategory } from './roomService';

const STORAGE_KEY = 'camps_manager_utility_buildings_v1';

// Category item suggestions with English & Arabic names and sensible defaults
export const UTILITY_CATEGORY_SUGGESTIONS: Record<UtilityBuildingCategory, UtilityCategoryItem[]> = {
  'Washroom Building': [
    { id: 'w-1', name: 'Water Heater', nameAr: 'سخان مياه', defaultQty: 1, category: 'Washroom Building' },
    { id: 'w-2', name: 'Wash Basin', nameAr: 'مغسلة أيدي', defaultQty: 2, category: 'Washroom Building' },
    { id: 'w-3', name: 'Toilet Seat', nameAr: 'مقعد مرحاض إفرنجي/عربي', defaultQty: 2, category: 'Washroom Building' },
    { id: 'w-4', name: 'Exhaust Fan', nameAr: 'مروحة شفط هواء', defaultQty: 1, category: 'Washroom Building' },
    { id: 'w-5', name: 'Mirror', nameAr: 'مرآة مغسلة', defaultQty: 2, category: 'Washroom Building' },
    { id: 'w-6', name: 'Water Tap', nameAr: 'صنبور خلاط مياه', defaultQty: 2, category: 'Washroom Building' },
    { id: 'w-7', name: 'Shower Head', nameAr: 'دش استحمام', defaultQty: 2, category: 'Washroom Building' },
    { id: 'w-8', name: 'Soap Dispenser', nameAr: 'موزع صابون جداري', defaultQty: 2, category: 'Washroom Building' },
    { id: 'w-9', name: 'Water Tank', nameAr: 'خزان مياه علوي', defaultQty: 1, category: 'Washroom Building' },
    { id: 'w-10', name: 'Water Hose / Shattaf', nameAr: 'شطاف مياه مع خرطوم', defaultQty: 2, category: 'Washroom Building' },
    { id: 'w-11', name: 'Waterproof Light', nameAr: 'إضاءة مقاومة للرطوبة', defaultQty: 2, category: 'Washroom Building' },
    { id: 'w-12', name: 'Drain Trap Grate', nameAr: 'صفاية أرضية ستانلس', defaultQty: 2, category: 'Washroom Building' },
  ],
  'Kitchen Building': [
    { id: 'k-1', name: 'Commercial Gas Stove Double', nameAr: 'موقد غاز تجاري مزدوج', defaultQty: 2, category: 'Kitchen Building' },
    { id: 'k-2', name: 'Gas Cylinder', nameAr: 'اسطوانة غاز مركزية', defaultQty: 4, category: 'Kitchen Building' },
    { id: 'k-3', name: 'Commercial Refrigerator', nameAr: 'ثلاجة تبريد تجارية كبيرة', defaultQty: 1, category: 'Kitchen Building' },
    { id: 'k-4', name: 'Deep Freezer', nameAr: 'فريزر تجميد أرضي', defaultQty: 1, category: 'Kitchen Building' },
    { id: 'k-5', name: 'Stainless Steel Exhaust Hood', nameAr: 'هود شفط دهان وروائح', defaultQty: 1, category: 'Kitchen Building' },
    { id: 'k-6', name: 'Double Sink Stainless Steel', nameAr: 'حوض غسيل أواني مزدوج', defaultQty: 2, category: 'Kitchen Building' },
    { id: 'k-7', name: 'Food Preparation Table', nameAr: 'طاولة تحضير طعام ستانلس', defaultQty: 2, category: 'Kitchen Building' },
    { id: 'k-8', name: 'Water Heater Commercial', nameAr: 'سخان مياه فوري', defaultQty: 1, category: 'Kitchen Building' },
    { id: 'k-9', name: 'Fire Extinguisher (CO2/Dry)', nameAr: 'طفاية حريق بودرة/غاز', defaultQty: 2, category: 'Kitchen Building' },
    { id: 'k-10', name: 'Electric Insect Killer', nameAr: 'صاعق حشرات كهربائي', defaultQty: 1, category: 'Kitchen Building' },
    { id: 'k-11', name: 'Heavy Duty Split AC', nameAr: 'مكيف سبليت تبريد عالي', defaultQty: 2, category: 'Kitchen Building' },
    { id: 'k-12', name: 'Electric Hot Plate / Hitter', nameAr: 'سخان كهربائي (هيتر)', defaultQty: 2, category: 'Kitchen Building' },
  ],
  'Offices Building': [
    { id: 'o-1', name: 'Executive Office Desk', nameAr: 'مكتب إداري رئيسي', defaultQty: 2, category: 'Offices Building' },
    { id: 'o-2', name: 'Ergonomic Office Chair', nameAr: 'كرسي مكتب متحرك مريح', defaultQty: 2, category: 'Offices Building' },
    { id: 'o-3', name: 'Visitor Waiting Chairs', nameAr: 'كراسي انتظار مراجعين', defaultQty: 4, category: 'Offices Building' },
    { id: 'o-4', name: 'Split AC 18000 BTU', nameAr: 'مكيف سبليت 18 وحدة', defaultQty: 1, category: 'Offices Building' },
    { id: 'o-5', name: 'Steel Filing Cabinet', nameAr: 'دولاب ملفات حديدي بقفل', defaultQty: 1, category: 'Offices Building' },
    { id: 'o-6', name: 'Magnetic Whiteboard', nameAr: 'لوح كتابة أبيض مغناطيسي', defaultQty: 1, category: 'Offices Building' },
    { id: 'o-7', name: 'Computer Workstation', nameAr: 'جهاز حاسوب مكتبي', defaultQty: 2, category: 'Offices Building' },
    { id: 'o-8', name: 'Network Multi-Socket Gang', nameAr: 'مشترك كهرباء وشبكة', defaultQty: 3, category: 'Offices Building' },
    { id: 'o-9', name: 'LED Panel Lighting', nameAr: 'لوحات إنارة ليد سقفية', defaultQty: 4, category: 'Offices Building' },
    { id: 'o-10', name: 'Office Paper Shredder', nameAr: 'آلة إتلاف ورق مكتبية', defaultQty: 1, category: 'Offices Building' },
  ],
  'Workshop Building': [
    { id: 'ws-1', name: 'Heavy Duty Steel Workbench', nameAr: 'طاولة ورشة حديدية مع منجلة', defaultQty: 2, category: 'Workshop Building' },
    { id: 'ws-2', name: 'Multi-Drawer Tool Cabinet', nameAr: 'خزانة أدوات ومعدات متعددة', defaultQty: 1, category: 'Workshop Building' },
    { id: 'ws-3', name: 'Air Compressor 100L', nameAr: 'كمبروسر هواء 100 لتر', defaultQty: 1, category: 'Workshop Building' },
    { id: 'ws-4', name: 'Industrial Column Drill', nameAr: 'مثقاب كهربائي عمودي/يدوي', defaultQty: 1, category: 'Workshop Building' },
    { id: 'ws-5', name: 'Electric Welding Machine', nameAr: 'ماكينة لحام كهربائية', defaultQty: 1, category: 'Workshop Building' },
    { id: 'ws-6', name: 'High-Power Exhaust Fan', nameAr: 'مروحة تهوية صناعية', defaultQty: 2, category: 'Workshop Building' },
    { id: 'ws-7', name: 'Fire Extinguisher ABC 6KG', nameAr: 'طفاية حريق بودرة 6 كجم', defaultQty: 2, category: 'Workshop Building' },
    { id: 'ws-8', name: 'Emergency Eye Wash Station', nameAr: 'محطة غسيل عين للطوارئ', defaultQty: 1, category: 'Workshop Building' },
    { id: 'ws-9', name: 'PPE & Safety Gear Locker', nameAr: 'دولاب معدات السلامة الشخصية', defaultQty: 1, category: 'Workshop Building' },
    { id: 'ws-10', name: 'Industrial Angle Grinder', nameAr: 'صاروخ جلخ وقطع كهربائي', defaultQty: 1, category: 'Workshop Building' },
  ],
  'Camp Store Building': [
    { id: 'cs-1', name: 'Safety PPE Kit (Helmets & Vests)', nameAr: 'أطقم سلامة مهنية (خوذ وسترات)', defaultQty: 50, category: 'Camp Store Building' },
    { id: 'cs-2', name: 'Safety Shoes & Steel Toe Boots', nameAr: 'أحذية سلامة صناعية', defaultQty: 30, category: 'Camp Store Building' },
    { id: 'cs-3', name: 'Bed Linen & Blanket Sets', nameAr: 'أطقم شراشف ومفارش وبطانيات', defaultQty: 40, category: 'Camp Store Building' },
    { id: 'cs-4', name: 'Cleaning & Janitorial Chemicals', nameAr: 'مواد تنظيف ومطهرات مركزة', defaultQty: 25, category: 'Camp Store Building' },
    { id: 'cs-5', name: 'Heavy Duty Storage Racks', nameAr: 'رفوف تخزين حديدية ثقيلة للمستودع', defaultQty: 6, category: 'Camp Store Building' },
    { id: 'cs-6', name: 'Manual Pallet Jack 2.5 Ton', nameAr: 'عربة نقل طبالي يدوية (بيلت جاك)', defaultQty: 1, category: 'Camp Store Building' },
    { id: 'cs-7', name: 'Electrical Spares & Cable Rolls', nameAr: 'لفات كابلات وقطع غيار كهرباء', defaultQty: 10, category: 'Camp Store Building' },
    { id: 'cs-8', name: 'Plumbing Fittings & Valves', nameAr: 'قطع ومحابس سباكة نحاسية', defaultQty: 15, category: 'Camp Store Building' },
    { id: 'cs-9', name: 'Hardware & Hand Tools Box', nameAr: 'صندوق عدد ومفكات يدوية للمخزن', defaultQty: 3, category: 'Camp Store Building' },
    { id: 'cs-10', name: 'Industrial Fire Extinguisher 9KG', nameAr: 'طفاية حريق بودرة 9 كجم', defaultQty: 2, category: 'Camp Store Building' },
    { id: 'cs-11', name: 'High-Visibility Work Gloves', nameAr: 'قفازات حماية وأعمال شاقة', defaultQty: 60, category: 'Camp Store Building' },
    { id: 'cs-12', name: 'Warehouse Floodlight LED', nameAr: 'كشافات إنارة للمستودع', defaultQty: 4, category: 'Camp Store Building' },
  ],
};

// Initial sample data (empty for clean real data testing)
const INITIAL_UTILITY_BUILDINGS: UtilityBuilding[] = [];
export const _DEPRECATED_MOCK_UTILITY: UtilityBuilding[] = [
  {
    id: 'ubld-01',
    name: 'Camp Central Kitchen & Mess Annex',
    category: 'Kitchen Building',
    floors: 1,
    roomsCount: 3,
    lengthM: 28,
    widthM: 14,
    status: 'Operational',
    createdAt: '2026-01-20',
    updatedAt: '2026-09-28',
    rooms: [
      {
        id: 'urm-01-1',
        buildingId: 'ubld-01',
        roomNumber: 'Kitchen 1',
        floor: 1,
        inventory: [
          { id: 'uinv-1', name: 'Commercial Gas Stove Double', nameAr: 'موقد غاز تجاري مزدوج', quantity: 2, category: 'Kitchen Building' },
          { id: 'uinv-2', name: 'Gas Cylinder', nameAr: 'اسطوانة غاز مركزية', quantity: 4, category: 'Kitchen Building' },
          { id: 'uinv-3', name: 'Commercial Refrigerator', nameAr: 'ثلاجة تبريد تجارية كبيرة', quantity: 1, category: 'Kitchen Building' },
          { id: 'uinv-4', name: 'Stainless Steel Exhaust Hood', nameAr: 'هود شفط دهان وروائح', quantity: 1, category: 'Kitchen Building' },
          { id: 'uinv-5', name: 'Fire Extinguisher (CO2/Dry)', nameAr: 'طفاية حريق بودرة/غاز', quantity: 2, category: 'Kitchen Building' },
        ],
      },
      {
        id: 'urm-01-2',
        buildingId: 'ubld-01',
        roomNumber: 'Kitchen 2',
        floor: 1,
        inventory: [
          { id: 'uinv-6', name: 'Commercial Gas Stove Double', nameAr: 'موقد غاز تجاري مزدوج', quantity: 2, category: 'Kitchen Building' },
          { id: 'uinv-7', name: 'Gas Cylinder', nameAr: 'اسطوانة غاز مركزية', quantity: 4, category: 'Kitchen Building' },
          { id: 'uinv-8', name: 'Deep Freezer', nameAr: 'فريزر تجميد أرضي', quantity: 1, category: 'Kitchen Building' },
          { id: 'uinv-9', name: 'Double Sink Stainless Steel', nameAr: 'حوض غسيل أواني مزدوج', quantity: 2, category: 'Kitchen Building' },
        ],
      },
      {
        id: 'urm-01-3',
        buildingId: 'ubld-01',
        roomNumber: 'Kitchen 3',
        floor: 1,
        inventory: [
          { id: 'uinv-10', name: 'Food Preparation Table', nameAr: 'طاولة تحضير طعام ستانلس', quantity: 3, category: 'Kitchen Building' },
          { id: 'uinv-11', name: 'Electric Insect Killer', nameAr: 'صاعق حشرات كهربائي', quantity: 2, category: 'Kitchen Building' },
          { id: 'uinv-12', name: 'Heavy Duty Split AC', nameAr: 'مكيف سبليت تبريد عالي', quantity: 2, category: 'Kitchen Building' },
        ],
      },
    ],
  },
  {
    id: 'ubld-02',
    name: 'Sector A Ablution & Washrooms Complex',
    category: 'Washroom Building',
    floors: 2,
    roomsCount: 6,
    lengthM: 20,
    widthM: 10,
    status: 'Operational',
    createdAt: '2026-02-05',
    updatedAt: '2026-09-29',
    rooms: [
      {
        id: 'urm-02-1',
        buildingId: 'ubld-02',
        roomNumber: 'Washroom 1',
        floor: 1,
        inventory: [
          { id: 'uinv-13', name: 'Water Heater', nameAr: 'سخان مياه', quantity: 1, category: 'Washroom Building' },
          { id: 'uinv-14', name: 'Wash Basin', nameAr: 'مغسلة أيدي', quantity: 3, category: 'Washroom Building' },
          { id: 'uinv-15', name: 'Toilet Seat', nameAr: 'مقعد مرحاض إفرنجي/عربي', quantity: 3, category: 'Washroom Building' },
          { id: 'uinv-16', name: 'Exhaust Fan', nameAr: 'مروحة شفط هواء', quantity: 1, category: 'Washroom Building' },
          { id: 'uinv-17', name: 'Shower Head', nameAr: 'دش استحمام', quantity: 2, category: 'Washroom Building' },
        ],
      },
      {
        id: 'urm-02-2',
        buildingId: 'ubld-02',
        roomNumber: 'Washroom 2',
        floor: 1,
        inventory: [
          { id: 'uinv-18', name: 'Water Heater', nameAr: 'سخان مياه', quantity: 1, category: 'Washroom Building' },
          { id: 'uinv-19', name: 'Wash Basin', nameAr: 'مغسلة أيدي', quantity: 3, category: 'Washroom Building' },
          { id: 'uinv-20', name: 'Toilet Seat', nameAr: 'مقعد مرحاض إفرنجي/عربي', quantity: 3, category: 'Washroom Building' },
          { id: 'uinv-21', name: 'Shower Head', nameAr: 'دش استحمام', quantity: 2, category: 'Washroom Building' },
        ],
      },
      {
        id: 'urm-02-3',
        buildingId: 'ubld-02',
        roomNumber: 'Washroom 3',
        floor: 1,
        inventory: [
          { id: 'uinv-22', name: 'Water Heater', nameAr: 'سخان مياه', quantity: 1, category: 'Washroom Building' },
          { id: 'uinv-23', name: 'Wash Basin', nameAr: 'مغسلة أيدي', quantity: 2, category: 'Washroom Building' },
          { id: 'uinv-24', name: 'Water Tap', nameAr: 'صنبور خلاط مياه', quantity: 2, category: 'Washroom Building' },
        ],
      },
      {
        id: 'urm-02-4',
        buildingId: 'ubld-02',
        roomNumber: 'Washroom 4',
        floor: 2,
        inventory: [
          { id: 'uinv-25', name: 'Water Heater', nameAr: 'سخان مياه', quantity: 1, category: 'Washroom Building' },
          { id: 'uinv-26', name: 'Wash Basin', nameAr: 'مغسلة أيدي', quantity: 3, category: 'Washroom Building' },
          { id: 'uinv-27', name: 'Toilet Seat', nameAr: 'مقعد مرحاض إفرنجي/عربي', quantity: 3, category: 'Washroom Building' },
          { id: 'uinv-28', name: 'Exhaust Fan', nameAr: 'مروحة شفط هواء', quantity: 1, category: 'Washroom Building' },
        ],
      },
      {
        id: 'urm-02-5',
        buildingId: 'ubld-02',
        roomNumber: 'Washroom 5',
        floor: 2,
        inventory: [
          { id: 'uinv-29', name: 'Water Heater', nameAr: 'سخان مياه', quantity: 1, category: 'Washroom Building' },
          { id: 'uinv-30', name: 'Wash Basin', nameAr: 'مغسلة أيدي', quantity: 3, category: 'Washroom Building' },
          { id: 'uinv-31', name: 'Shower Head', nameAr: 'دش استحمام', quantity: 2, category: 'Washroom Building' },
        ],
      },
      {
        id: 'urm-02-6',
        buildingId: 'ubld-02',
        roomNumber: 'Washroom 6',
        floor: 2,
        inventory: [
          { id: 'uinv-32', name: 'Water Heater', nameAr: 'سخان مياه', quantity: 1, category: 'Washroom Building' },
          { id: 'uinv-33', name: 'Toilet Seat', nameAr: 'مقعد مرحاض إفرنجي/عربي', quantity: 2, category: 'Washroom Building' },
        ],
      },
    ],
  },
  {
    id: 'ubld-03',
    name: 'Camp Administration & Project Offices',
    category: 'Offices Building',
    floors: 1,
    roomsCount: 4,
    lengthM: 30,
    widthM: 12,
    status: 'Operational',
    createdAt: '2026-01-10',
    updatedAt: '2026-09-25',
    rooms: [
      {
        id: 'urm-03-1',
        buildingId: 'ubld-03',
        roomNumber: 'Office 1',
        floor: 1,
        inventory: [
          { id: 'uinv-34', name: 'Executive Office Desk', nameAr: 'مكتب إداري رئيسي', quantity: 2, category: 'Offices Building' },
          { id: 'uinv-35', name: 'Ergonomic Office Chair', nameAr: 'كرسي مكتب متحرك مريح', quantity: 2, category: 'Offices Building' },
          { id: 'uinv-36', name: 'Split AC 18000 BTU', nameAr: 'مكيف سبليت 18 وحدة', quantity: 1, category: 'Offices Building' },
          { id: 'uinv-37', name: 'Steel Filing Cabinet', nameAr: 'دولاب ملفات حديدي بقفل', quantity: 1, category: 'Offices Building' },
        ],
      },
      {
        id: 'urm-03-2',
        buildingId: 'ubld-03',
        roomNumber: 'Office 2',
        floor: 1,
        inventory: [
          { id: 'uinv-38', name: 'Executive Office Desk', nameAr: 'مكتب إداري رئيسي', quantity: 2, category: 'Offices Building' },
          { id: 'uinv-39', name: 'Visitor Waiting Chairs', nameAr: 'كراسي انتظار مراجعين', quantity: 4, category: 'Offices Building' },
          { id: 'uinv-40', name: 'Split AC 18000 BTU', nameAr: 'مكيف سبليت 18 وحدة', quantity: 1, category: 'Offices Building' },
        ],
      },
      {
        id: 'urm-03-3',
        buildingId: 'ubld-03',
        roomNumber: 'Office 3',
        floor: 1,
        inventory: [
          { id: 'uinv-41', name: 'Computer Workstation', nameAr: 'جهاز حاسوب مكتبي', quantity: 3, category: 'Offices Building' },
          { id: 'uinv-42', name: 'Network Multi-Socket Gang', nameAr: 'مشترك كهرباء وشبكة', quantity: 3, category: 'Offices Building' },
          { id: 'uinv-43', name: 'Magnetic Whiteboard', nameAr: 'لوح كتابة أبيض مغناطيسي', quantity: 1, category: 'Offices Building' },
        ],
      },
      {
        id: 'urm-03-4',
        buildingId: 'ubld-03',
        roomNumber: 'Office 4',
        floor: 1,
        inventory: [
          { id: 'uinv-44', name: 'Executive Office Desk', nameAr: 'مكتب إداري رئيسي', quantity: 1, category: 'Offices Building' },
          { id: 'uinv-45', name: 'LED Panel Lighting', nameAr: 'لوحات إنارة ليد سقفية', quantity: 4, category: 'Offices Building' },
        ],
      },
    ],
  },
  {
    id: 'ubld-04',
    name: 'Mechanical & MEP Maintenance Workshop',
    category: 'Workshop Building',
    floors: 1,
    roomsCount: 2,
    lengthM: 35,
    widthM: 18,
    status: 'Operational',
    createdAt: '2026-03-01',
    updatedAt: '2026-09-27',
    rooms: [
      {
        id: 'urm-04-1',
        buildingId: 'ubld-04',
        roomNumber: 'Workshop 1',
        floor: 1,
        inventory: [
          { id: 'uinv-46', name: 'Heavy Duty Steel Workbench', nameAr: 'طاولة ورشة حديدية مع منجلة', quantity: 2, category: 'Workshop Building' },
          { id: 'uinv-47', name: 'Multi-Drawer Tool Cabinet', nameAr: 'خزانة أدوات ومعدات متعددة', quantity: 1, category: 'Workshop Building' },
          { id: 'uinv-48', name: 'Air Compressor 100L', nameAr: 'كمبروسر هواء 100 لتر', quantity: 1, category: 'Workshop Building' },
          { id: 'uinv-49', name: 'Electric Welding Machine', nameAr: 'ماكينة لحام كهربائية', quantity: 1, category: 'Workshop Building' },
          { id: 'uinv-50', name: 'Fire Extinguisher ABC 6KG', nameAr: 'طفاية حريق بودرة 6 كجم', quantity: 2, category: 'Workshop Building' },
        ],
      },
      {
        id: 'urm-04-2',
        buildingId: 'ubld-04',
        roomNumber: 'Workshop 2',
        floor: 1,
        inventory: [
          { id: 'uinv-51', name: 'Industrial Column Drill', nameAr: 'مثقاب كهربائي عمودي/يدوي', quantity: 1, category: 'Workshop Building' },
          { id: 'uinv-52', name: 'High-Power Exhaust Fan', nameAr: 'مروحة تهوية صناعية', quantity: 2, category: 'Workshop Building' },
          { id: 'uinv-53', name: 'Emergency Eye Wash Station', nameAr: 'محطة غسيل عين للطوارئ', quantity: 1, category: 'Workshop Building' },
          { id: 'uinv-54', name: 'PPE & Safety Gear Locker', nameAr: 'دولاب معدات السلامة الشخصية', quantity: 1, category: 'Workshop Building' },
        ],
      },
    ],
  },
  {
    id: 'ubld-05',
    name: 'Camp Central Supplies & Materials Store',
    category: 'Camp Store Building',
    floors: 1,
    roomsCount: 2,
    lengthM: 32,
    widthM: 16,
    status: 'Operational',
    createdAt: '2026-03-05',
    updatedAt: '2026-09-29',
    rooms: [
      {
        id: 'urm-05-1',
        buildingId: 'ubld-05',
        roomNumber: 'Store 1',
        floor: 1,
        inventory: [
          { id: 'uinv-55', name: 'Safety PPE Kit (Helmets & Vests)', nameAr: 'أطقم سلامة مهنية (خوذ وسترات)', quantity: 50, category: 'Camp Store Building' },
          { id: 'uinv-56', name: 'Safety Shoes & Steel Toe Boots', nameAr: 'أحذية سلامة صناعية', quantity: 30, category: 'Camp Store Building' },
          { id: 'uinv-57', name: 'Heavy Duty Storage Racks', nameAr: 'رفوف تخزين حديدية ثقيلة للمستودع', quantity: 6, category: 'Camp Store Building' },
          { id: 'uinv-58', name: 'Manual Pallet Jack 2.5 Ton', nameAr: 'عربة نقل طبالي يدوية (بيلت جاك)', quantity: 1, category: 'Camp Store Building' },
        ],
      },
      {
        id: 'urm-05-2',
        buildingId: 'ubld-05',
        roomNumber: 'Store 2',
        floor: 1,
        inventory: [
          { id: 'uinv-59', name: 'Bed Linen & Blanket Sets', nameAr: 'أطقم شراشف ومفارش وبطانيات', quantity: 40, category: 'Camp Store Building' },
          { id: 'uinv-60', name: 'Cleaning & Janitorial Chemicals', nameAr: 'مواد تنظيف ومطهرات مركزة', quantity: 25, category: 'Camp Store Building' },
          { id: 'uinv-61', name: 'Industrial Fire Extinguisher 9KG', nameAr: 'طفاية حريق بودرة 9 كجم', quantity: 2, category: 'Camp Store Building' },
        ],
      },
    ],
  },
];

function getStoredUtilityBuildings(): UtilityBuilding[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_UTILITY_BUILDINGS));
    return INITIAL_UTILITY_BUILDINGS;
  }
  try {
    const list: UtilityBuilding[] = JSON.parse(data);
    const cleaned = list.filter((b) => !b.id.startsWith('ubld-0'));
    if (cleaned.length !== list.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }
    return list;
  } catch {
    return INITIAL_UTILITY_BUILDINGS;
  }
}

function saveUtilityBuildings(buildings: UtilityBuilding[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildings));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('camp_utility_buildings_updated'));
    window.dispatchEvent(new CustomEvent('camp_inventory_updated'));
  }
}

// Prefix for rooms based on category
export const getCategoryRoomPrefix = (cat: UtilityBuildingCategory): string => {
  switch (cat) {
    case 'Washroom Building':
      return 'Washroom';
    case 'Kitchen Building':
      return 'Kitchen';
    case 'Offices Building':
      return 'Office';
    case 'Workshop Building':
      return 'Workshop';
    case 'Camp Store Building':
      return 'Store';
    default:
      return 'Unit';
  }
};

export const utilityBuildingService = {
  getStoredUtilityBuildings(): UtilityBuilding[] {
    return getStoredUtilityBuildings();
  },

  // Get all utility buildings
  async getUtilityBuildings(projectId?: string): Promise<UtilityBuilding[]> {
    await new Promise((res) => setTimeout(res, 50));
    let list = getStoredUtilityBuildings();
    if (projectId && projectId !== 'All') {
      return list.filter((b) => b.projectId === projectId);
    }
    return list;
  },

  async getUtilityBuildingById(id: string): Promise<UtilityBuilding | null> {
    await new Promise((res) => setTimeout(res, 40));
    const list = getStoredUtilityBuildings();
    return list.find((b) => b.id === id) || null;
  },

  // Get suggested inventory items by category
  getSuggestionsByCategory(category: UtilityBuildingCategory): UtilityCategoryItem[] {
    return UTILITY_CATEGORY_SUGGESTIONS[category] || [];
  },

  // Create new Utility Building (Notice: No Capacity field!)
  async createUtilityBuilding(data: {
    name: string;
    category: UtilityBuildingCategory;
    floors: number;
    roomsPerFloor?: number;
    roomNumbers?: string[]; // Custom room numbers if manually specified
    lengthM?: number;
    widthM?: number;
    selectedInventory: Array<{ name: string; nameAr?: string; quantity: number }>;
    projectId?: string;
    campId?: string;
  }): Promise<UtilityBuilding> {
    await new Promise((res) => setTimeout(res, 120));
    const list = getStoredUtilityBuildings();
    const buildingId = `ubld-${Date.now()}`;
    const prefix = getCategoryRoomPrefix(data.category);

    const generatedRooms: UtilityRoom[] = [];
    const floorsCount = Math.max(1, Number(data.floors) || 1);

    // Prepare default inventory copy
    const baseItems: UtilityInventoryItem[] = (data.selectedInventory || []).map((it, idx) => ({
      id: `uinv-${Date.now()}-${idx}`,
      name: it.name.trim(),
      nameAr: it.nameAr?.trim() || '',
      quantity: Math.max(1, Number(it.quantity) || 1),
      category: data.category,
    }));

    if (data.roomNumbers && data.roomNumbers.length > 0) {
      // User entered custom room names/numbers
      const roomsPerFl = Math.ceil(data.roomNumbers.length / floorsCount);
      data.roomNumbers.forEach((rNum, idx) => {
        const floorNum = Math.min(floorsCount, Math.floor(idx / roomsPerFl) + 1);
        generatedRooms.push({
          id: `urm-${buildingId}-${idx + 1}`,
          buildingId,
          roomNumber: rNum.trim(),
          floor: floorNum,
          inventory: JSON.parse(JSON.stringify(baseItems)),
          createdAt: new Date().toISOString().split('T')[0],
        });
      });
    } else {
      // Generate sequentially based on roomsPerFloor
      const rPerFloor = Math.max(1, Number(data.roomsPerFloor) || 2);
      let roomSeq = 1;
      for (let f = 1; f <= floorsCount; f++) {
        for (let r = 1; r <= rPerFloor; r++) {
          generatedRooms.push({
            id: `urm-${buildingId}-${f}-${r}`,
            buildingId,
            roomNumber: `${prefix} ${roomSeq}`,
            floor: f,
            inventory: JSON.parse(JSON.stringify(baseItems)),
            createdAt: new Date().toISOString().split('T')[0],
          });
          roomSeq++;
        }
      }
    }

    const newBuilding: UtilityBuilding = {
      id: buildingId,
      name: data.name.trim(),
      category: data.category,
      floors: floorsCount,
      roomsCount: generatedRooms.length,
      lengthM: data.lengthM ? Number(data.lengthM) : undefined,
      widthM: data.widthM ? Number(data.widthM) : undefined,
      rooms: generatedRooms,
      status: 'Operational',
      projectId: data.projectId || '',
      campId: data.campId || '',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    list.unshift(newBuilding);
    saveUtilityBuildings(list);
    return newBuilding;
  },

  // Update existing utility building metadata
  async updateUtilityBuilding(id: string, updates: Partial<UtilityBuilding>): Promise<UtilityBuilding> {
    await new Promise((res) => setTimeout(res, 80));
    const list = getStoredUtilityBuildings();
    const idx = list.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error('Utility building not found');

    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    saveUtilityBuildings(list);
    return list[idx];
  },

  // Delete utility building
  async deleteUtilityBuilding(id: string): Promise<void> {
    await new Promise((res) => setTimeout(res, 80));
    const list = getStoredUtilityBuildings().filter((b) => b.id !== id);
    saveUtilityBuildings(list);
  },

  // Add a utility room to building
  async addUtilityRoom(
    buildingId: string,
    roomData: { roomNumber: string; floor: number; initialInventory?: UtilityInventoryItem[] }
  ): Promise<UtilityRoom> {
    const list = getStoredUtilityBuildings();
    const b = list.find((item) => item.id === buildingId);
    if (!b) throw new Error('Building not found');

    const newRoom: UtilityRoom = {
      id: `urm-${buildingId}-${Date.now()}`,
      buildingId,
      roomNumber: roomData.roomNumber.trim(),
      floor: Math.max(1, Number(roomData.floor) || 1),
      inventory: roomData.initialInventory || [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    b.rooms.push(newRoom);
    b.roomsCount = b.rooms.length;
    b.floors = Math.max(b.floors, newRoom.floor);
    b.updatedAt = new Date().toISOString().split('T')[0];

    saveUtilityBuildings(list);
    return newRoom;
  },

  // Delete utility room from building
  async deleteUtilityRoom(buildingId: string, roomId: string): Promise<void> {
    const list = getStoredUtilityBuildings();
    const b = list.find((item) => item.id === buildingId);
    if (!b) return;

    b.rooms = b.rooms.filter((r) => r.id !== roomId);
    b.roomsCount = b.rooms.length;
    b.updatedAt = new Date().toISOString().split('T')[0];
    saveUtilityBuildings(list);
  },

  // Update item quantity in room
  async updateRoomInventoryQuantity(
    buildingId: string,
    roomId: string,
    itemId: string,
    quantity: number
  ): Promise<void> {
    const list = getStoredUtilityBuildings();
    const b = list.find((item) => item.id === buildingId);
    if (!b) return;

    const r = b.rooms.find((room) => room.id === roomId);
    if (!r) return;

    const it = r.inventory.find((i) => i.id === itemId);
    if (it) {
      it.quantity = Math.max(0, quantity);
      if (it.quantity === 0) {
        r.inventory = r.inventory.filter((i) => i.id !== itemId);
      }
      b.updatedAt = new Date().toISOString().split('T')[0];
      saveUtilityBuildings(list);
    }
  },

  // Add item to a specific utility room
  async addItemToUtilityRoom(
    buildingId: string,
    roomId: string,
    item: { name: string; nameAr?: string; quantity: number; category?: string }
  ): Promise<void> {
    const list = getStoredUtilityBuildings();
    const b = list.find((bld) => bld.id === buildingId);
    if (!b) return;

    const r = b.rooms.find((rm) => rm.id === roomId);
    if (!r) return;

    const existing = r.inventory.find(
      (it) => it.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );

    if (existing) {
      // Merge quantity instead of duplicate!
      existing.quantity += Math.max(1, Number(item.quantity) || 1);
      if (item.nameAr && !existing.nameAr) {
        existing.nameAr = item.nameAr;
      }
    } else {
      r.inventory.push({
        id: `uinv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: item.name.trim(),
        nameAr: item.nameAr?.trim() || '',
        quantity: Math.max(1, Number(item.quantity) || 1),
        category: item.category || b.category,
      });
    }

    b.updatedAt = new Date().toISOString().split('T')[0];
    saveUtilityBuildings(list);
  },

  // Delete item from room
  async deleteItemFromUtilityRoom(buildingId: string, roomId: string, itemId: string): Promise<void> {
    const list = getStoredUtilityBuildings();
    const b = list.find((bld) => bld.id === buildingId);
    if (!b) return;

    const r = b.rooms.find((rm) => rm.id === roomId);
    if (!r) return;

    r.inventory = r.inventory.filter((it) => it.id !== itemId);
    b.updatedAt = new Date().toISOString().split('T')[0];
    saveUtilityBuildings(list);
  },

  // Get all flattened utility inventory records across all utility buildings & rooms
  getAllUtilityInventory(utilityBuildings?: UtilityBuilding[]): FlatInventoryRecord[] {
    const list = utilityBuildings || getStoredUtilityBuildings();
    const records: FlatInventoryRecord[] = [];
    list.forEach((bld) => {
      bld.rooms.forEach((room) => {
        room.inventory.forEach((item) => {
          records.push({
            id: `${bld.id}_${room.id}_${item.id}`,
            itemId: item.id,
            name: item.name,
            nameAr: item.nameAr,
            quantity: item.quantity,
            roomId: room.id,
            roomNumber: room.roomNumber,
            floor: room.floor,
            buildingId: bld.id,
            buildingName: bld.name,
            category: getInventoryCategory(item.name),
            buildingType: 'Utility',
            buildingCategory: bld.category,
          });
        });
      });
    });
    return records;
  },

  // Update item details (name/quantity) in a specific utility room
  async updateItemInUtilityRoom(
    buildingId: string,
    roomId: string,
    itemId: string,
    updates: { name?: string; nameAr?: string; quantity?: number }
  ): Promise<void> {
    const list = getStoredUtilityBuildings();
    const b = list.find((bld) => bld.id === buildingId);
    if (!b) return;

    const r = b.rooms.find((rm) => rm.id === roomId);
    if (!r) return;

    const it = r.inventory.find((i) => i.id === itemId);
    if (!it) return;

    if (updates.name !== undefined) it.name = updates.name.trim();
    if (updates.nameAr !== undefined) it.nameAr = updates.nameAr.trim();
    if (updates.quantity !== undefined) {
      it.quantity = Math.max(0, updates.quantity);
      if (it.quantity === 0) {
        r.inventory = r.inventory.filter((i) => i.id !== itemId);
      }
    }

    b.updatedAt = new Date().toISOString().split('T')[0];
    saveUtilityBuildings(list);
  },

  // Bulk delete items from utility rooms
  async bulkDeleteUtilityInventory(
    records: Array<{ buildingId: string; roomId: string; itemId: string }>
  ): Promise<void> {
    const list = getStoredUtilityBuildings();
    const map = new Set(records.map((r) => `${r.buildingId}_${r.roomId}_${r.itemId}`));

    list.forEach((b) => {
      b.rooms.forEach((r) => {
        r.inventory = r.inventory.filter(
          (it) => !map.has(`${b.id}_${r.id}_${it.id}`)
        );
      });
      b.updatedAt = new Date().toISOString().split('T')[0];
    });

    saveUtilityBuildings(list);
  },

  // Intelligent Excel Import & Synchronization
  // Architecture: Utility Building -> Floor -> Utility Room -> Inventory
  // Deduplication: If same Building + same Floor + same Room + same Item exists, merge quantity!
  async importUtilityInventoryFromRows(
    rows: Array<{
      building: string;
      floor?: number;
      roomNumber: string;
      category?: string;
      item: string;
      itemAr?: string;
      quantity: number;
    }>
  ): Promise<{ addedCount: number; updatedCount: number; buildingsCreated: number }> {
    const list = getStoredUtilityBuildings();
    let addedCount = 0;
    let updatedCount = 0;
    let buildingsCreated = 0;

    for (const row of rows) {
      const bName = row.building?.trim();
      const rNum = row.roomNumber?.trim();
      const iName = row.item?.trim();
      const qty = Math.max(1, Number(row.quantity) || 1);
      const floor = Math.max(1, Number(row.floor) || 1);

      if (!bName || !rNum || !iName) continue;

      // 1. Find or create Building
      let building = list.find((b) => b.name.toLowerCase() === bName.toLowerCase());
      if (!building) {
        // Detect category from row or name
        let detectedCategory: UtilityBuildingCategory = 'Washroom Building';
        const rawCat = (row.category || '').toLowerCase();
        const rawName = bName.toLowerCase();

        if (rawCat.includes('kitchen') || rawName.includes('kitchen') || rawName.includes('mess')) {
          detectedCategory = 'Kitchen Building';
        } else if (rawCat.includes('office') || rawName.includes('office') || rawName.includes('admin')) {
          detectedCategory = 'Offices Building';
        } else if (rawCat.includes('workshop') || rawName.includes('workshop') || rawName.includes('maint')) {
          detectedCategory = 'Workshop Building';
        } else if (rawCat.includes('store') || rawCat.includes('warehouse') || rawName.includes('store') || rawName.includes('warehouse') || rawName.includes('مستودع') || rawName.includes('مخزن')) {
          detectedCategory = 'Camp Store Building';
        } else if (rawCat.includes('washroom') || rawCat.includes('toilet') || rawCat.includes('bath') || rawName.includes('washroom') || rawName.includes('ablution')) {
          detectedCategory = 'Washroom Building';
        }

        building = {
          id: `ubld-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: bName,
          category: detectedCategory,
          floors: floor,
          roomsCount: 0,
          rooms: [],
          status: 'Operational',
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        };
        list.push(building);
        buildingsCreated++;
      }

      // Update building floors if row floor is higher
      if (floor > building.floors) {
        building.floors = floor;
      }

      // 2. Find or create Room
      let room = building.rooms.find(
        (r) => r.roomNumber.toLowerCase() === rNum.toLowerCase() && r.floor === floor
      );

      if (!room) {
        room = {
          id: `urm-${building.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          buildingId: building.id,
          roomNumber: rNum,
          floor,
          inventory: [],
          createdAt: new Date().toISOString().split('T')[0],
        };
        building.rooms.push(room);
        building.roomsCount = building.rooms.length;
      }

      // 3. Find or create/merge Inventory Item (Deduplication!)
      const existingItem = room.inventory.find(
        (it) => it.name.trim().toLowerCase() === iName.toLowerCase()
      );

      if (existingItem) {
        // Update / merge quantity
        existingItem.quantity += qty;
        if (row.itemAr && !existingItem.nameAr) {
          existingItem.nameAr = row.itemAr.trim();
        }
        updatedCount++;
      } else {
        // Add new item
        room.inventory.push({
          id: `uinv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          name: iName,
          nameAr: row.itemAr?.trim() || '',
          quantity: qty,
          category: row.category || building.category,
        });
        addedCount++;
      }

      building.updatedAt = new Date().toISOString().split('T')[0];
    }

    saveUtilityBuildings(list);
    return { addedCount, updatedCount, buildingsCreated };
  },

  // Generate Excel Template for Utility Buildings & Inventory
  downloadUtilityTemplate(): void {
    const headers = [
      'Building Name',
      'Category',
      'Floor',
      'Room Number',
      'Item Name',
      'Item Name (Arabic)',
      'Quantity',
    ];

    const sampleRows = [
      {
        'Building Name': 'Camp Main Kitchen',
        'Category': 'Kitchen Building',
        'Floor': 1,
        'Room Number': 'Kitchen 1',
        'Item Name': 'Commercial Gas Stove Double',
        'Item Name (Arabic)': 'موقد غاز تجاري مزدوج',
        'Quantity': 2,
      },
      {
        'Building Name': 'Camp Main Kitchen',
        'Category': 'Kitchen Building',
        'Floor': 1,
        'Room Number': 'Kitchen 1',
        'Item Name': 'Gas Cylinder',
        'Item Name (Arabic)': 'اسطوانة غاز',
        'Quantity': 4,
      },
      {
        'Building Name': 'Block A Washrooms',
        'Category': 'Washroom Building',
        'Floor': 1,
        'Room Number': 'Washroom 1',
        'Item Name': 'Water Heater',
        'Item Name (Arabic)': 'سخان مياه',
        'Quantity': 1,
      },
      {
        'Building Name': 'Block A Washrooms',
        'Category': 'Washroom Building',
        'Floor': 1,
        'Room Number': 'Washroom 1',
        'Item Name': 'Wash Basin',
        'Item Name (Arabic)': 'مغسلة أيدي',
        'Quantity': 3,
      },
      {
        'Building Name': 'Camp Administration Block',
        'Category': 'Offices Building',
        'Floor': 1,
        'Room Number': 'Office 1',
        'Item Name': 'Executive Office Desk',
        'Item Name (Arabic)': 'مكتب إداري رئيسي',
        'Quantity': 2,
      },
      {
        'Building Name': 'Field Workshop',
        'Category': 'Workshop Building',
        'Floor': 1,
        'Room Number': 'Workshop 1',
        'Item Name': 'Heavy Duty Steel Workbench',
        'Item Name (Arabic)': 'طاولة ورشة حديدية مع منجلة',
        'Quantity': 2,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });

    // Category Reference Sheet
    const refRows = [
      { 'Allowed Category': 'Washroom Building', 'Sample Rooms': 'Washroom 1, Washroom 2, Washroom 3...' },
      { 'Allowed Category': 'Kitchen Building', 'Sample Rooms': 'Kitchen 1, Kitchen 2, Kitchen 3...' },
      { 'Allowed Category': 'Offices Building', 'Sample Rooms': 'Office 1, Office 2, Office 3...' },
      { 'Allowed Category': 'Workshop Building', 'Sample Rooms': 'Workshop 1, Workshop 2, Workshop 3...' },
      { 'Allowed Category': 'Camp Store Building', 'Sample Rooms': 'Store 1, Store 2, Store 3...' },
    ];
    const wsRef = XLSX.utils.json_to_sheet(refRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utility Inventory');
    XLSX.utils.book_append_sheet(wb, wsRef, 'Category Guidelines');

    XLSX.writeFile(wb, 'Utility_Buildings_Inventory_Template.xlsx');
  },
};
