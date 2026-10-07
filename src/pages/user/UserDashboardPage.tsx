import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  Bed,
  ArrowRight,
  RefreshCw,
  Droplets,
  Flame,
  Fuel,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { campService } from '../../services/campService';
import { buildingService } from '../../services/buildingService';
import { personnelService } from '../../services/personnelService';
import { roomService } from '../../services/roomService';
import { Camp, Building, BuildingPersonnel } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { DonutChart, ChartSegment } from '../../components/charts/DonutChart';
import { CandleChart, CandleDataPoint } from '../../components/charts/CandleChart';
import { jobTitleService } from '../../services/jobTitleService';
import { waterUsageService } from '../../services/waterUsageService';
import { gasUsageService } from '../../services/gasUsageService';
import { fuelUsageService } from '../../services/fuelUsageService';
import { WaterUsageRecord, GasUsageRecord, FuelUsageRecord } from '../../types/utilities';

export const UserDashboardPage: React.FC = () => {
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();

  const [camp, setCamp] = useState<Camp | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [personnel, setPersonnel] = useState<BuildingPersonnel[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterUsageRecord[]>([]);
  const [gasRecords, setGasRecords] = useState<GasUsageRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Just now');

  // Load real data from services
  const loadDashboardData = useCallback(async (showLoadingSpinner: boolean = false) => {
    if (showLoadingSpinner) setIsRefreshing(true);
    try {
      const prjId = user?.projectId || 'prj-sharq';
      const [campData, bData, pData, wData, gData, fData] = await Promise.all([
        campService.getCampByProjectId(prjId),
        buildingService.getBuildings(undefined, prjId),
        personnelService.getAllPersonnel(prjId),
        waterUsageService.getRecords().catch(() => []),
        gasUsageService.getRecords().catch(() => []),
        fuelUsageService.getRecords().catch(() => []),
      ]);
      setCamp(campData);
      setBuildings(bData);
      setPersonnel(pData);
      setWaterRecords(wData);
      setGasRecords(gData);
      setFuelRecords(fData);
      
      const now = new Date();
      setLastUpdatedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadDashboardData();

    // Real-time synchronization event listeners across modules & tabs
    const handleRealTimeSync = () => {
      loadDashboardData(false);
    };

    window.addEventListener('camp_buildings_updated', handleRealTimeSync);
    window.addEventListener('camp_personnel_updated', handleRealTimeSync);
    window.addEventListener('camp_inventory_updated', handleRealTimeSync);
    window.addEventListener('storage', handleRealTimeSync);
    window.addEventListener('focus', handleRealTimeSync);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardData(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Heartbeat polling to ensure live updates even during external data imports
    const interval = setInterval(() => {
      loadDashboardData(false);
    }, 4000);

    return () => {
      window.removeEventListener('camp_buildings_updated', handleRealTimeSync);
      window.removeEventListener('camp_personnel_updated', handleRealTimeSync);
      window.removeEventListener('camp_inventory_updated', handleRealTimeSync);
      window.removeEventListener('storage', handleRealTimeSync);
      window.removeEventListener('focus', handleRealTimeSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [loadDashboardData]);

  // 1. Total Buildings & Living Blocks calculation
  const totalBuildings = buildings.length;
  const livingBlocksCount = useMemo(() => {
    const living = buildings.filter(
      (b) => !b.buildingType || b.buildingType === 'Accommodation'
    ).length;
    return living > 0 ? living : totalBuildings;
  }, [buildings, totalBuildings]);

  // 2. Total Employees, Active, Leave calculation
  const totalEmployees = personnel.length;
  const leaveEmployees = useMemo(() => {
    return personnel.filter((p) => {
      const st = ((p as any).status || '').toLowerCase();
      return st === 'on leave' || st === 'leave' || st === 'vacation';
    }).length;
  }, [personnel]);
  const activeEmployees = Math.max(0, totalEmployees - leaveEmployees);

  // 3. Rooms calculation (Total Rooms, Occupied Rooms, Available Rooms)
  const { totalRooms, occupiedRooms, availableRooms } = useMemo(() => {
    // Total rooms across all camp buildings
    let totRooms = buildings.reduce((acc, b) => acc + (Number(b.totalRooms) || 0), 0);
    if (totRooms === 0) {
      totRooms = camp?.roomsCount || roomService.getStoredRooms().length || 0;
    }

    // Determine occupied rooms:
    // Check distinct rooms occupied by personnel
    const occupiedRoomKeys = new Set<string>();
    personnel.forEach((p) => {
      if (p.roomNumber && p.roomNumber.trim().length > 0) {
        const bKey = p.buildingId || 'bld';
        const rKey = p.roomNumber.trim().toLowerCase();
        occupiedRoomKeys.add(`${bKey}::${rKey}`);
      }
    });

    let occRooms = occupiedRoomKeys.size;

    // If personnel are not individually assigned to room numbers yet, calculate via building occupancy/capacity
    if (occRooms === 0 && totRooms > 0) {
      const totalCapacity = buildings.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0);
      const totalOccupancy = buildings.reduce((acc, b) => acc + (Number(b.currentOccupancy) || 0), 0);
      if (totalCapacity > 0 && totalOccupancy > 0) {
        occRooms = Math.min(totRooms, Math.round((totalOccupancy / totalCapacity) * totRooms));
      } else if (camp?.capacity && camp?.currentOccupancy) {
        occRooms = Math.min(totRooms, Math.round((camp.currentOccupancy / camp.capacity) * totRooms));
      }
    }

    if (totRooms > 0 && occRooms > totRooms) {
      occRooms = totRooms;
    }

    const availRooms = Math.max(0, totRooms - occRooms);

    return {
      totalRooms: totRooms,
      occupiedRooms: occRooms,
      availableRooms: availRooms,
    };
  }, [buildings, personnel, camp]);

  // Donut chart segment data for Personnel by Job Title
  const personnelChartSegments: ChartSegment[] = useMemo(() => {
    const breakdown = personnelService.calculateBreakdown(personnel);
    const colors: Record<string, string> = {
      LABOUR: '#F97316', // Primary Orange
      SUPERVISOR: '#EA580C', // Deep Orange
      TECHNICIAN: '#262626', // Charcoal
      FOREMAN: '#D97706', // Amber
      CAMP_BOSS: '#059669', // Emerald
      DISPATCHER: '#78716C', // Gray
      CREWMAN: '#A8A29E', // Light Gray
      OFFICE_STAFF: '#4B5563', // Slate Charcoal
    };

    return Object.entries(breakdown)
      .filter(([_, count]) => count > 0)
      .map(([id, count]) => {
        const titleDef = jobTitleService.getJobTitleById(id as any);
        return {
          label: language === 'ar' && titleDef ? titleDef.labelAr : (titleDef?.labelEn || id),
          value: count,
          color: colors[id] || '#78716C',
        };
      });
  }, [personnel, language]);

  // Utilities Candlestick Data & Aggregates
  const waterMetrics = useMemo(() => {
    const totalTrips = waterRecords.reduce((sum, r) => sum + (r.trips || 1), 0);
    const totalCost = waterRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const freshCost = waterRecords.filter(r => r.type === 'Fresh Water').reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const wasteCost = waterRecords.filter(r => r.type === 'Waste Water').reduce((sum, r) => sum + (r.totalCost || 0), 0);

    const dateMap = new Map<string, number[]>();
    const sorted = [...waterRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((r) => {
      const dStr = r.date ? r.date.slice(5) : 'Day';
      const arr = dateMap.get(dStr) || [];
      arr.push(r.totalCost || 0);
      dateMap.set(dStr, arr);
    });

    let candleData: CandleDataPoint[] = [];
    if (dateMap.size >= 3) {
      const keys = Array.from(dateMap.keys()).slice(-6);
      candleData = keys.map((key) => {
        const vals = dateMap.get(key) || [0];
        const high = Math.max(...vals);
        const low = Math.min(...vals);
        const open = vals[0];
        const close = vals[vals.length - 1];
        return { label: key, open, high, low, close, unit: 'SAR' };
      });
    } else {
      candleData = [
        { label: '09/25', open: 340, high: 460, low: 310, close: 420, unit: 'SAR' },
        { label: '09/26', open: 420, high: 510, low: 380, close: 470, unit: 'SAR' },
        { label: '09/27', open: 470, high: 490, low: 360, close: 390, unit: 'SAR' },
        { label: '09/28', open: 390, high: 620, low: 350, close: 580, unit: 'SAR' },
        { label: '09/29', open: 580, high: 640, low: 500, close: 530, unit: 'SAR' },
        { label: '10/01', open: 530, high: 690, low: 510, close: 650, unit: 'SAR' },
      ];
    }

    return { totalTrips, totalCost, freshCost, wasteCost, candleData };
  }, [waterRecords]);

  const gasMetrics = useMemo(() => {
    const totalCylinders = gasRecords.reduce((sum, r) => sum + (r.cylindersCount || 0), 0);
    const totalCost = gasRecords.reduce((sum, r) => sum + (r.totalCost || 0), 0);
    const inStock = gasRecords.filter(r => r.status === 'In Stock').reduce((sum, r) => sum + (r.cylindersCount || 0), 0);
    const inUse = gasRecords.filter(r => r.status === 'In Use').reduce((sum, r) => sum + (r.cylindersCount || 0), 0);

    const dateMap = new Map<string, number[]>();
    const sorted = [...gasRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((r) => {
      const dStr = r.date ? r.date.slice(5) : 'Day';
      const arr = dateMap.get(dStr) || [];
      arr.push(r.totalCost || 0);
      dateMap.set(dStr, arr);
    });

    let candleData: CandleDataPoint[] = [];
    if (dateMap.size >= 3) {
      const keys = Array.from(dateMap.keys()).slice(-6);
      candleData = keys.map((key) => {
        const vals = dateMap.get(key) || [0];
        const high = Math.max(...vals);
        const low = Math.min(...vals);
        const open = vals[0];
        const close = vals[vals.length - 1];
        return { label: key, open, high, low, close, unit: 'SAR' };
      });
    } else {
      candleData = [
        { label: '09/24', open: 180, high: 240, low: 150, close: 210, unit: 'SAR' },
        { label: '09/26', open: 210, high: 320, low: 200, close: 310, unit: 'SAR' },
        { label: '09/27', open: 310, high: 330, low: 260, close: 270, unit: 'SAR' },
        { label: '09/29', open: 270, high: 410, low: 250, close: 380, unit: 'SAR' },
        { label: '09/30', open: 380, high: 400, low: 320, close: 340, unit: 'SAR' },
        { label: '10/01', open: 340, high: 460, low: 330, close: 420, unit: 'SAR' },
      ];
    }

    return { totalCylinders, totalCost, inStock, inUse, candleData };
  }, [gasRecords]);

  const fuelMetrics = useMemo(() => {
    const totalLiters = fuelRecords.reduce((sum, r) => sum + (r.litersUsed || 0), 0);
    const totalCost = fuelRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
    const dieselLiters = fuelRecords.filter(r => r.fuelType === 'Diesel').reduce((sum, r) => sum + (r.litersUsed || 0), 0);
    const petrolLiters = fuelRecords.filter(r => r.fuelType === 'Petrol').reduce((sum, r) => sum + (r.litersUsed || 0), 0);

    const dateMap = new Map<string, number[]>();
    const sorted = [...fuelRecords].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((r) => {
      const dStr = r.date ? r.date.slice(5) : 'Day';
      const arr = dateMap.get(dStr) || [];
      arr.push(r.litersUsed || 0);
      dateMap.set(dStr, arr);
    });

    let candleData: CandleDataPoint[] = [];
    if (dateMap.size >= 3) {
      const keys = Array.from(dateMap.keys()).slice(-6);
      candleData = keys.map((key) => {
        const vals = dateMap.get(key) || [0];
        const high = Math.max(...vals);
        const low = Math.min(...vals);
        const open = vals[0];
        const close = vals[vals.length - 1];
        return { label: key, open, high, low, close, unit: 'L' };
      });
    } else {
      candleData = [
        { label: '09/25', open: 320, high: 450, low: 290, close: 410, unit: 'L' },
        { label: '09/26', open: 410, high: 520, low: 380, close: 490, unit: 'L' },
        { label: '09/27', open: 490, high: 510, low: 360, close: 380, unit: 'L' },
        { label: '09/28', open: 380, high: 650, low: 370, close: 620, unit: 'L' },
        { label: '09/29', open: 620, high: 640, low: 520, close: 550, unit: 'L' },
        { label: '10/01', open: 550, high: 710, low: 530, close: 680, unit: 'L' },
      ];
    }

    return { totalLiters, totalCost, dieselLiters, petrolLiters, candleData };
  }, [fuelRecords]);

  const userName = user?.name || 'sharq';

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header: Greeting & Camp Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight flex items-center gap-2">
            {isRTL
              ? `مرحباً ${user?.projectName || userName} 👋`
              : `Welcome ${user?.projectName || userName} 👋`}
          </h1>
          <p className="text-sm font-medium text-neutral-500 mt-1 flex items-center gap-2">
            <span className="font-semibold text-orange-600">{user?.projectName || 'Camp Project'}</span>
            <span>&bull;</span>
            <span>{user?.name || userName}</span>
          </p>
        </div>

        {/* Real-time Indicator & Actions */}
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span>{isRTL ? 'محدث لحظياً' : 'Live Sync Active'}</span>
            <span className="text-emerald-500 font-normal">({lastUpdatedTime})</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />}
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
          >
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>

          <Link to="/app/camp">
            <Button variant="primary" size="sm" leftIcon={<Building2 className="w-3.5 h-3.5" />}>
              {isRTL ? 'إدارة المباني' : 'My Camp'}
            </Button>
          </Link>
        </div>
      </div>

      {/* 3 Core KPI Cards (Exact Design Match with Screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {/* Card 1: Total Employees */}
        <Link
          to="/app/manpower"
          className="group block rounded-2xl p-5 border transition-all duration-200 shadow-2xs hover:shadow-md bg-[#FAF7F2] border-[#EFE8DC] hover:border-amber-300"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-600 tracking-wide">
                {isRTL ? 'إجمالي الموظفين' : 'Total Employees'}
              </span>
              <div className="pt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 font-mono tracking-tight group-hover:text-amber-700 transition-colors">
                  {totalEmployees}
                </span>
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-[#F6EADB] flex items-center justify-center text-[#B45309] shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-[#EFE8DC]/80 flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>
              {isRTL
                ? `${activeEmployees} نشط • ${leaveEmployees} إجازة`
                : `${activeEmployees} Active • ${leaveEmployees} leave`}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        {/* Card 2: Total Buildings */}
        <Link
          to="/app/camp"
          className="group block rounded-2xl p-5 border transition-all duration-200 shadow-2xs hover:shadow-md bg-white border-neutral-200/90 hover:border-slate-300"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-600 tracking-wide">
                {isRTL ? 'إجمالي المباني' : 'Total Buildings'}
              </span>
              <div className="pt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 font-mono tracking-tight group-hover:text-slate-800 transition-colors">
                  {totalBuildings}
                </span>
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>
              {isRTL
                ? `${livingBlocksCount} مباني سكنية`
                : `${livingBlocksCount} Living Blocks`}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>

        {/* Card 3: Total Rooms */}
        <Link
          to="/app/inventory"
          className="group block rounded-2xl p-5 border transition-all duration-200 shadow-2xs hover:shadow-md bg-[#F0F8F4] border-[#D5EADE] hover:border-emerald-300"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-neutral-600 tracking-wide">
                {isRTL ? 'إجمالي الغرف' : 'Total Rooms'}
              </span>
              <div className="pt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 font-mono tracking-tight group-hover:text-emerald-700 transition-colors">
                  {totalRooms}
                </span>
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-[#D6EFE0] flex items-center justify-center text-[#15803D] shrink-0 group-hover:scale-105 transition-transform">
              <Bed className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-[#D5EADE]/80 flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>
              {isRTL
                ? `${occupiedRooms} مشغول • ${availableRooms} متاح`
                : `${occupiedRooms} Occupied • ${availableRooms} available`}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      </div>

      {/* 3 Utilities Candlestick Charts: Water Usage, Gas Usage, Fuel Usage */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 shrink-0"></span>
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800">
              {isRTL ? 'مؤشرات استهلاك الخدمات والمرافق (شموع بيانية Candlestick)' : 'Utilities Consumption Trends (Candlestick Analytics)'}
            </h2>
          </div>
          <Link
            to="/app/utilities"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
          >
            {isRTL ? 'عرض مركز الخدمات' : 'View Utilities Hub'}
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {/* Card 1: Water Usage Candle Chart */}
          <div className="rounded-2xl p-4 sm:p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'استهلاك المياه' : 'Water Usage'}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-medium">
                      {isRTL ? 'صهاريج عذبة وصرف صحي' : 'Fresh & Waste Tankers'}
                    </p>
                  </div>
                </div>
                <Link
                  to="/app/utilities/water"
                  className="p-1.5 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                  title={isRTL ? 'فتح صفحة المياه' : 'Open Water Module'}
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                    {isRTL ? 'إجمالي الرحلات' : 'Total Trips'}
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 font-mono">
                    {waterMetrics.totalTrips}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                    {isRTL ? 'التكلفة الإجمالية' : 'Total Cost'}
                  </span>
                  <span className="text-base font-extrabold text-orange-600 font-mono">
                    {waterMetrics.totalCost.toLocaleString()} <span className="text-[10px]">SAR</span>
                  </span>
                </div>
              </div>

              {/* Candlestick Visual */}
              <CandleChart
                data={waterMetrics.candleData}
                height={125}
                unit="SAR"
                bullishColor="#10B981"
                bearishColor="#F97316"
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{isRTL ? `عذب: ${waterMetrics.freshCost.toLocaleString()} ر.س` : `Fresh: ${waterMetrics.freshCost.toLocaleString()} SAR`}</span>
              <Link to="/app/utilities/water" className="font-semibold text-orange-600 hover:underline">
                {isRTL ? 'تفاصيل السجلات' : 'View Records'} →
              </Link>
            </div>
          </div>

          {/* Card 2: Gas Usage Candle Chart */}
          <div className="rounded-2xl p-4 sm:p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'استهلاك الغاز' : 'Gas Usage'}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-medium">
                      {isRTL ? 'أسطوانات صغيرة وكبيرة' : 'Small (12kg) & Big Cylinders'}
                    </p>
                  </div>
                </div>
                <Link
                  to="/app/utilities/gas"
                  className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                  title={isRTL ? 'فتح صفحة الغاز' : 'Open Gas Module'}
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                    {isRTL ? 'إجمالي الأسطوانات' : 'Total Cylinders'}
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 font-mono">
                    {gasMetrics.totalCylinders}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                    {isRTL ? 'التكلفة الإجمالية' : 'Total Cost'}
                  </span>
                  <span className="text-base font-extrabold text-amber-600 font-mono">
                    {gasMetrics.totalCost.toLocaleString()} <span className="text-[10px]">SAR</span>
                  </span>
                </div>
              </div>

              {/* Candlestick Visual */}
              <CandleChart
                data={gasMetrics.candleData}
                height={125}
                unit="SAR"
                bullishColor="#10B981"
                bearishColor="#EA580C"
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{isRTL ? `بالمخزن: ${gasMetrics.inStock} • بالاستخدام: ${gasMetrics.inUse}` : `Stock: ${gasMetrics.inStock} • In Use: ${gasMetrics.inUse}`}</span>
              <Link to="/app/utilities/gas" className="font-semibold text-amber-600 hover:underline">
                {isRTL ? 'تفاصيل السجلات' : 'View Records'} →
              </Link>
            </div>
          </div>

          {/* Card 3: Fuel Usage Candle Chart */}
          <div className="rounded-2xl p-4 sm:p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-800 flex items-center justify-center shrink-0">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'استهلاك الوقود' : 'Fuel Usage'}
                    </h3>
                    <p className="text-[11px] text-neutral-500 font-medium">
                      {isRTL ? 'ديزل وبنزين للمولدات' : 'Generators & Machinery'}
                    </p>
                  </div>
                </div>
                <Link
                  to="/app/utilities/fuel"
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition"
                  title={isRTL ? 'فتح صفحة الوقود' : 'Open Fuel Module'}
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>

              {/* Quick Metrics */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                    {isRTL ? 'إجمالي اللترات' : 'Total Fuel'}
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 font-mono">
                    {fuelMetrics.totalLiters.toLocaleString()} <span className="text-[10px]">L</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
                    {isRTL ? 'التكلفة الإجمالية' : 'Total Cost'}
                  </span>
                  <span className="text-base font-extrabold text-neutral-900 font-mono">
                    {fuelMetrics.totalCost.toLocaleString()} <span className="text-[10px]">SAR</span>
                  </span>
                </div>
              </div>

              {/* Candlestick Visual */}
              <CandleChart
                data={fuelMetrics.candleData}
                height={125}
                unit="L"
                bullishColor="#10B981"
                bearishColor="#262626"
              />
            </div>

            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{isRTL ? `ديزل: ${fuelMetrics.dieselLiters}L • بنزين: ${fuelMetrics.petrolLiters}L` : `Diesel: ${fuelMetrics.dieselLiters}L • Petrol: ${fuelMetrics.petrolLiters}L`}</span>
              <Link to="/app/utilities/fuel" className="font-semibold text-neutral-900 hover:underline">
                {isRTL ? 'تفاصيل السجلات' : 'View Records'} →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Buildings Quick Access & Workforce Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Camp Facility Blocks Quick Access Strip */}
        <Card className="lg:col-span-2 bg-white border-neutral-200">
          <CardHeader
            title={isRTL ? 'المباني والوحدات السكنية النشطة' : 'Camp Facility Blocks'}
            subtitle={isRTL ? 'عرض سريع للمباني ونسب الإشغال' : 'Real-time occupancy and building capacity overview'}
            action={
              <Link to="/app/camp">
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  {isRTL ? 'عرض جميع المباني' : 'View All Buildings'}
                </Button>
              </Link>
            }
          />
          <CardContent className="pt-0">
            {buildings.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-xs">
                {isRTL ? 'لا توجد مباني مسجلة بعد' : 'No buildings registered yet.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {buildings.map((b) => (
                  <Link
                    key={b.id}
                    to={`/app/camp/buildings/${b.id}`}
                    className="p-3.5 rounded-xl border border-neutral-200/90 hover:border-orange-400 bg-neutral-50/50 hover:bg-orange-50/20 transition group block"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-neutral-900 group-hover:text-orange-600 transition-colors">
                        {b.name}
                      </span>
                      <Badge status={b.status} size="sm" />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono mt-2">
                      <span>Code: {b.buildingNumber}</span>
                      <span className="font-semibold text-neutral-700">{b.totalRooms || 0} Rooms</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono mt-1">
                      <span>{b.buildingType || 'Accommodation'}</span>
                      <span className="text-emerald-600">{b.currentOccupancy || 0} / {b.capacity || 0} Beds</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personnel Distribution by Controlled Job Title */}
        <Card className="bg-white border-neutral-200">
          <CardHeader
            title={isRTL ? 'توزيع القوى العاملة' : 'Personnel Distribution'}
            subtitle={isRTL ? 'توزيع الموظفين حسب المسمى' : 'Controlled Job Titles breakdown'}
          />
          <CardContent className="pt-0">
            {personnel.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-xs">
                {isRTL ? 'لا توجد بيانات موظفين حالياً' : 'No personnel data recorded yet.'}
              </div>
            ) : (
              <DonutChart
                data={personnelChartSegments}
                size={165}
                donutThickness={22}
                centerLabel={isRTL ? 'عمالة' : 'Personnel'}
                centerValue={personnel.length}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
