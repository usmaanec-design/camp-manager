export type WaterType = 'Fresh Water' | 'Waste Water';

export interface WaterUsageRecord {
  id: string;
  userId?: string;
  campId?: string;
  type: WaterType;
  waterType?: WaterType; // Alias for type
  date: string; // YYYY-MM-DD
  trips: number;
  numberOfTrips?: number; // Alias for trips
  costPerTrip: number;
  totalCost: number; // trips * costPerTrip
  notes?: string;
  invoiceName?: string;
  invoiceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type GasCylinderType = 'Small Cylinders (12kg)' | 'Big Cylinders';
export type GasInventoryStatus = 'In Stock' | 'In Use' | 'Empty';

export interface GasUsageRecord {
  id: string;
  userId?: string;
  campId?: string;
  cylinderType: GasCylinderType;
  date: string; // YYYY-MM-DD
  cylindersCount: number;
  numberOfCylinders?: number; // Alias for cylindersCount
  costPerCylinder: number;
  kgPerCylinder: number;
  totalCost: number; // cylindersCount * costPerCylinder
  totalWeight: number; // cylindersCount * kgPerCylinder
  status?: GasInventoryStatus;
  inventoryStatus?: GasInventoryStatus; // Alias for status
  notes?: string;
  slipName?: string;
  slipUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type FuelType = 'Diesel' | 'Petrol';

export interface FuelUsageRecord {
  id: string;
  userId?: string;
  campId?: string;
  fuelType: FuelType;
  date: string; // YYYY-MM-DD
  litersUsed: number;
  cost: number;
  costPerLiter: number; // cost / litersUsed
  machineName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DateFilterPeriod = 'Day' | 'Week' | 'Month' | 'Year' | 'All';
