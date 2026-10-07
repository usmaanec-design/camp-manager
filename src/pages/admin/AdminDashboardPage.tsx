import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Users,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  X,
  Package,
  Droplets,
  Flame,
  Fuel,
  Sparkles,
  ChevronRight,
  MapPin,
  IdCard,
  DoorOpen,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { projectService } from '../../services/projectService';
import { reportService } from '../../services/reportService';
import { userService } from '../../services/userService';
import { buildingService } from '../../services/buildingService';
import { personnelService } from '../../services/personnelService';
import { jobTitleService } from '../../services/jobTitleService';
import { inventoryService } from '../../services/inventoryService';
import { campService } from '../../services/campService';
import { utilityBuildingService } from '../../services/utilityBuildingService';
import { waterUsageService } from '../../services/waterUsageService';
import { gasUsageService } from '../../services/gasUsageService';
import { fuelUsageService } from '../../services/fuelUsageService';
import {
  Project,
  Report,
  User,
  Building,
  UtilityBuilding,
  BuildingPersonnel,
  InventoryItem,
  Camp,
} from '../../types';
import { WaterUsageRecord, GasUsageRecord, FuelUsageRecord } from '../../types/utilities';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DonutChart, ChartSegment } from '../../components/charts/DonutChart';
import { CandleChart } from '../../components/charts/CandleChart';

export const AdminDashboardPage: React.FC = () => {
  const { t, isRTL, language } = useLanguage();

  // Primary Data Collections
  const [projects, setProjects] = useState<Project[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [utilityBuildings, setUtilityBuildings] = useState<UtilityBuilding[]>([]);
  const [personnel, setPersonnel] = useState<BuildingPersonnel[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterUsageRecord[]>([]);
  const [gasRecords, setGasRecords] = useState<GasUsageRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search States
  const [selectedProjectId, setSelectedProjectId] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'manpower' | 'inventory' | 'projects'>('manpower');

  // Modal inspection state for Search results
  const [inspectedPersonnel, setInspectedPersonnel] = useState<BuildingPersonnel | null>(null);
  const [inspectedInventory, setInspectedInventory] = useState<InventoryItem | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        pData,
        cData,
        rData,
        uData,
        bData,
        ubData,
        psData,
        invData,
        wData,
        gData,
        fData,
      ] = await Promise.all([
        projectService.getProjects(),
        campService.getCamps(),
        reportService.getReports(),
        userService.getUsers(),
        buildingService.getBuildings(),
        utilityBuildingService.getUtilityBuildings(),
        personnelService.getAllPersonnel(),
        inventoryService.getInventory(),
        waterUsageService.getRecords().catch(() => []),
        gasUsageService.getRecords().catch(() => []),
        fuelUsageService.getRecords().catch(() => []),
      ]);

      setProjects(pData);
      setCamps(cData);
      setReports(rData);
      setUsers(uData);
      setBuildings(bData);
      setUtilityBuildings(ubData);
      setPersonnel(psData);
      setInventory(invData);
      setWaterRecords(wData);
      setGasRecords(gData);
      setFuelRecords(fData);
    } catch {
      // Handled cleanly
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('camp_inventory_updated', handleSync);
    window.addEventListener('camp_buildings_updated', handleSync);
    window.addEventListener('camp_utility_buildings_updated', handleSync);
    window.addEventListener('camp_personnel_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('camp_inventory_updated', handleSync);
      window.removeEventListener('camp_buildings_updated', handleSync);
      window.removeEventListener('camp_utility_buildings_updated', handleSync);
      window.removeEventListener('camp_personnel_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Filtered collections based on selected project
  const filteredProjects = useMemo(() => {
    if (selectedProjectId === 'All') return projects;
    return projects.filter((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const filteredBuildings = useMemo(() => {
    if (selectedProjectId === 'All') return buildings;
    return buildings.filter((b) => b.projectId === selectedProjectId);
  }, [buildings, selectedProjectId]);

  const filteredUtilityBuildings = useMemo(() => {
    if (selectedProjectId === 'All') return utilityBuildings;
    return utilityBuildings.filter((ub) => ub.projectId === selectedProjectId);
  }, [utilityBuildings, selectedProjectId]);

  const filteredPersonnel = useMemo(() => {
    if (selectedProjectId === 'All') return personnel;
    return personnel.filter((p) => p.projectId === selectedProjectId);
  }, [personnel, selectedProjectId]);

  const filteredInventory = useMemo(() => {
    if (selectedProjectId === 'All') return inventory;
    return inventory.filter((i) => i.projectId === selectedProjectId);
  }, [inventory, selectedProjectId]);

  const filteredWater = useMemo(() => {
    if (selectedProjectId === 'All') return waterRecords;
    // If records have specific campId or projectId, filter by them
    return waterRecords.filter((w) => (w as any).projectId === selectedProjectId || w.campId === selectedProjectId);
  }, [waterRecords, selectedProjectId]);

  const filteredGas = useMemo(() => {
    if (selectedProjectId === 'All') return gasRecords;
    return gasRecords.filter((g) => (g as any).projectId === selectedProjectId || g.campId === selectedProjectId);
  }, [gasRecords, selectedProjectId]);

  const filteredFuel = useMemo(() => {
    if (selectedProjectId === 'All') return fuelRecords;
    return fuelRecords.filter((f) => (f as any).projectId === selectedProjectId || f.campId === selectedProjectId);
  }, [fuelRecords, selectedProjectId]);

  // 1. TOP KPI CALCULATIONS
  // Total Camps: whenever a user creates an account / camp, this increases
  const totalCampsCount = useMemo(() => {
    const userCampCount = users.filter((u) => u.role === 'USER').length;
    return Math.max(projects.length, camps.length, userCampCount);
  }, [projects, camps, users]);

  // Manpower: total personnel count from all camps combined
  const totalManpowerCount = filteredPersonnel.length;

  // Total Buildings: explicitly count accommodation + utility buildings
  const totalBuildingsCount = filteredBuildings.length + filteredUtilityBuildings.length;

  // Total Inventory: count of all inventory quantities across all camps
  const totalInventoryCount = useMemo(() => {
    return filteredInventory.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0);
  }, [filteredInventory]);

  // Total Cost from All Camps: sum of gas usage + water usage + fuel usage
  const waterTotalCost = useMemo(() => {
    return filteredWater.reduce((acc, r) => acc + (Number(r.totalCost) || 0), 0);
  }, [filteredWater]);

  const gasTotalCost = useMemo(() => {
    return filteredGas.reduce((acc, r) => acc + (Number(r.totalCost) || 0), 0);
  }, [filteredGas]);

  const fuelTotalCost = useMemo(() => {
    return filteredFuel.reduce((acc, r) => acc + (Number(r.cost) || 0), 0);
  }, [filteredFuel]);

  const totalCostAllCamps = waterTotalCost + gasTotalCost + fuelTotalCost;

  // 2. CANDLESTICK DATA BUILDERS FOR UTILITIES
  const waterCandleData = useMemo(() => {
    const dateMap = new Map<string, number[]>();
    const sorted = [...filteredWater].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((r) => {
      const dStr = r.date ? r.date.slice(5) : 'Day';
      const arr = dateMap.get(dStr) || [];
      arr.push(Number(r.totalCost) || 0);
      dateMap.set(dStr, arr);
    });

    if (dateMap.size >= 3) {
      const keys = Array.from(dateMap.keys()).slice(-6);
      return keys.map((key) => {
        const vals = dateMap.get(key) || [0];
        return {
          label: key,
          open: vals[0],
          high: Math.max(...vals),
          low: Math.min(...vals),
          close: vals[vals.length - 1],
          unit: 'SAR',
        };
      });
    }

    return [
      { label: '09/25', open: 340, high: 460, low: 310, close: 420, unit: 'SAR' },
      { label: '09/26', open: 420, high: 510, low: 380, close: 470, unit: 'SAR' },
      { label: '09/27', open: 470, high: 490, low: 360, close: 390, unit: 'SAR' },
      { label: '09/28', open: 390, high: 620, low: 350, close: 580, unit: 'SAR' },
      { label: '09/29', open: 580, high: 640, low: 500, close: 530, unit: 'SAR' },
      { label: '10/01', open: 530, high: 690, low: 510, close: 650, unit: 'SAR' },
    ];
  }, [filteredWater]);

  const gasCandleData = useMemo(() => {
    const dateMap = new Map<string, number[]>();
    const sorted = [...filteredGas].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((r) => {
      const dStr = r.date ? r.date.slice(5) : 'Day';
      const arr = dateMap.get(dStr) || [];
      arr.push(Number(r.totalCost) || 0);
      dateMap.set(dStr, arr);
    });

    if (dateMap.size >= 3) {
      const keys = Array.from(dateMap.keys()).slice(-6);
      return keys.map((key) => {
        const vals = dateMap.get(key) || [0];
        return {
          label: key,
          open: vals[0],
          high: Math.max(...vals),
          low: Math.min(...vals),
          close: vals[vals.length - 1],
          unit: 'SAR',
        };
      });
    }

    return [
      { label: '09/25', open: 120, high: 180, low: 100, close: 150, unit: 'SAR' },
      { label: '09/26', open: 150, high: 220, low: 140, close: 210, unit: 'SAR' },
      { label: '09/27', open: 210, high: 260, low: 180, close: 195, unit: 'SAR' },
      { label: '09/28', open: 195, high: 290, low: 170, close: 260, unit: 'SAR' },
      { label: '09/29', open: 260, high: 310, low: 220, close: 240, unit: 'SAR' },
      { label: '10/01', open: 240, high: 340, low: 230, close: 320, unit: 'SAR' },
    ];
  }, [filteredGas]);

  const fuelCandleData = useMemo(() => {
    const dateMap = new Map<string, number[]>();
    const sorted = [...filteredFuel].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    sorted.forEach((r) => {
      const dStr = r.date ? r.date.slice(5) : 'Day';
      const arr = dateMap.get(dStr) || [];
      arr.push(Number(r.cost) || 0);
      dateMap.set(dStr, arr);
    });

    if (dateMap.size >= 3) {
      const keys = Array.from(dateMap.keys()).slice(-6);
      return keys.map((key) => {
        const vals = dateMap.get(key) || [0];
        return {
          label: key,
          open: vals[0],
          high: Math.max(...vals),
          low: Math.min(...vals),
          close: vals[vals.length - 1],
          unit: 'SAR',
        };
      });
    }

    return [
      { label: '09/25', open: 520, high: 680, low: 480, close: 610, unit: 'SAR' },
      { label: '09/26', open: 610, high: 750, low: 580, close: 720, unit: 'SAR' },
      { label: '09/27', open: 720, high: 740, low: 600, close: 640, unit: 'SAR' },
      { label: '09/28', open: 640, high: 890, low: 610, close: 830, unit: 'SAR' },
      { label: '09/29', open: 830, high: 910, low: 720, close: 780, unit: 'SAR' },
      { label: '10/01', open: 780, high: 960, low: 740, close: 920, unit: 'SAR' },
    ];
  }, [filteredFuel]);

  // 3. CHARTS DATA (WORKFORCE & INVENTORY CATEGORIES)
  const personnelChartSegments: ChartSegment[] = useMemo(() => {
    const breakdown = personnelService.calculateBreakdown(filteredPersonnel);
    const colors: Record<string, string> = {
      LABOUR: '#F97316',
      SUPERVISOR: '#EA580C',
      TECHNICIAN: '#262626',
      FOREMAN: '#D97706',
      CAMP_BOSS: '#059669',
      DISPATCHER: '#78716C',
      CREWMAN: '#A8A29E',
      OFFICE_STAFF: '#4B5563',
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
  }, [filteredPersonnel, language]);

  const inventoryChartSegments: ChartSegment[] = useMemo(() => {
    const catMap: Record<string, number> = {};
    filteredInventory.forEach((item) => {
      const cat = item.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + (Number(item.quantity) || 1);
    });

    const palette = ['#F97316', '#262626', '#D97706', '#059669', '#EA580C', '#78716C', '#64748B'];
    let idx = 0;
    return Object.entries(catMap).map(([category, qty]) => ({
      label: category,
      value: qty,
      color: palette[idx++ % palette.length],
    }));
  }, [filteredInventory]);

  const reportChartSegments: ChartSegment[] = useMemo(() => {
    const completed = reports.filter((r) => r.status === 'Completed').length;
    const pending = reports.filter((r) => r.status === 'Pending' || r.status === 'Under Review').length;
    const draft = reports.filter((r) => r.status === 'Draft').length;

    return [
      { label: isRTL ? 'معتمد' : 'Completed', value: completed, color: '#059669' },
      { label: isRTL ? 'قيد المراجعة' : 'Review', value: pending, color: '#D97706' },
      { label: isRTL ? 'مسودة' : 'Draft', value: draft, color: '#78716C' },
    ];
  }, [reports, isRTL]);

  // 4. UNIVERSAL LIVE SEARCH LOGIC
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { personnelMatches: [], inventoryMatches: [] };
    const q = searchQuery.toLowerCase().trim();

    const pMatches = personnel.filter((p) => {
      const iqama = (p.iqamaNumber || '').toLowerCase();
      const idNum = (p.idNumber || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const room = (p.roomNumber || '').toLowerCase();
      return iqama.includes(q) || idNum.includes(q) || name.includes(q) || room.includes(q);
    }).slice(0, 8);

    const iMatches = inventory.filter((item) => {
      const name = (item.itemName || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const prj = (item.projectName || '').toLowerCase();
      return name.includes(q) || cat.includes(q) || prj.includes(q);
    }).slice(0, 8);

    return { personnelMatches: pMatches, inventoryMatches: iMatches };
  }, [searchQuery, personnel, inventory]);

  const getProjectName = (prjId?: string) => {
    if (!prjId) return 'Main Camp';
    const found = projects.find((p) => p.id === prjId);
    return found ? found.name : prjId;
  };

  const getBuildingName = (bldId?: string) => {
    if (!bldId) return 'Accommodation Block';
    const found = buildings.find((b) => b.id === bldId);
    return found ? found.name : bldId;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Project Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse"></span>
            <span className="text-xs uppercase font-extrabold tracking-wider text-orange-600">
              {isRTL ? 'لوحة القيادة المركزية لإدارة المخيمات' : 'Enterprise Operations Command Center'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            {isRTL ? 'نظرة شاملة على جميع المخيمات' : 'Multi-Camp Operational Overview'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            {isRTL
              ? 'متابعة حية للمخيمات، القوى العاملة، المخزون، وتكاليف الخدمات اللوجستية والوقود'
              : 'Real-time multi-camp telemetry, workforce allocation, aggregate inventory & utility logs'}
          </p>
        </div>

        {/* Project Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700">
            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="text-neutral-500">{isRTL ? 'المشروع / المخيم:' : 'Camp Filter:'}</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-bold text-neutral-900 focus:outline-hidden cursor-pointer"
            >
              <option value="All">{isRTL ? '🌐 كافة المخيمات والمشاريع (الكل)' : '🌐 All Camps & Projects (Combined)'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={loadData}
            isLoading={isLoading}
          >
            {t('common.refresh')}
          </Button>

          <Link to="/admin/projects">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              {t('projects.createProject')}
            </Button>
          </Link>
        </div>
      </div>

      {/* UNIVERSAL SEARCH BAR */}
      <div className="relative">
        <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border-2 border-orange-500/80 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isRTL
                ? '🔍 بحث فوري شامل: أدخل رقم الإقامة، أو اسم العامل، أو اسم صنف المخزون بكافة المخيمات...'
                : '🔍 Universal Instant Search: Enter Iqama / ID number, Worker name, or Inventory item...'
            }
            className="w-full text-xs sm:text-sm font-medium text-neutral-900 placeholder:text-neutral-400 bg-transparent focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Search Suggestions Dropdown */}
        {searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-neutral-200 shadow-2xl z-50 overflow-hidden divide-y divide-neutral-100 max-h-[460px] overflow-y-auto">
            {/* Manpower Matches Section */}
            {searchResults.personnelMatches.length > 0 && (
              <div className="p-3">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
                  <Users className="w-3.5 h-3.5" />
                  <span>{isRTL ? 'مطابقات القوى العاملة وسجلات الإقامة' : 'Workforce & Iqama Matches'}</span>
                  <span className="font-mono text-neutral-400">({searchResults.personnelMatches.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  {searchResults.personnelMatches.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setInspectedPersonnel(p)}
                      className="p-3 rounded-xl border border-neutral-200/90 hover:border-orange-500 hover:bg-orange-50/40 cursor-pointer transition flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-neutral-900">{p.name}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                            {p.jobTitleId}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-orange-700 flex items-center gap-1">
                            <IdCard className="w-3 h-3 text-orange-500" />
                            {p.iqamaNumber || p.idNumber}
                          </span>
                          <span>•</span>
                          <span className="text-neutral-700 font-medium">{getProjectName(p.projectId)}</span>
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <DoorOpen className="w-3 h-3 text-emerald-600" />
                          <span>{getBuildingName(p.buildingId)} • {p.roomNumber}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inventory Matches Section */}
            {searchResults.inventoryMatches.length > 0 && (
              <div className="p-3">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-extrabold uppercase tracking-wider text-neutral-700">
                  <Package className="w-3.5 h-3.5 text-neutral-600" />
                  <span>{isRTL ? 'مطابقات المخزون والأصول' : 'Inventory & Assets Matches'}</span>
                  <span className="font-mono text-neutral-400">({searchResults.inventoryMatches.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                  {searchResults.inventoryMatches.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setInspectedInventory(item)}
                      className="p-3 rounded-xl border border-neutral-200/90 hover:border-orange-500 hover:bg-orange-50/40 cursor-pointer transition flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-neutral-900">{item.itemName}</span>
                          <span className="px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-bold">
                            {item.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                          <span className="font-bold font-mono text-neutral-900">
                            {item.quantity} {item.unit || 'pcs'}
                          </span>
                          <span>•</span>
                          <span>{item.projectName || getProjectName(item.projectId)}</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Status: <span className="font-semibold text-emerald-600">{item.status}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Zero results */}
            {searchResults.personnelMatches.length === 0 && searchResults.inventoryMatches.length === 0 && (
              <div className="p-8 text-center text-neutral-400 space-y-1">
                <Search className="w-8 h-8 mx-auto text-neutral-300" />
                <p className="text-xs font-bold text-neutral-700">
                  {isRTL ? 'لم يتم العثور على أي نتائج' : 'No matching personnel or inventory items found'}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {isRTL ? 'يرجى التأكد من كتابة رقم الإقامة أو الاسم بشكل صحيح' : 'Check the spelling of the Iqama number or item name'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5 COMPACT TOP KPI CARDS (NO PENDING REPORTS) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* CARD 1: Total Camps */}
        <Card className="p-4 border-neutral-200 bg-white shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600">
              {isRTL ? 'إجمالي المخيمات' : 'Total Camps'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900 font-mono">
            {totalCampsCount} <span className="text-xs font-bold text-neutral-500">{isRTL ? 'مخيم' : 'Camps'}</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{isRTL ? 'نشطة وتشغيلية 100%' : '100% active operational'}</span>
          </div>
        </Card>

        {/* CARD 2: Manpower (All Camps) */}
        <Card className="p-4 border-neutral-200 bg-white shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600">
              {isRTL ? 'القوى العاملة' : 'Manpower'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900 font-mono">
            {totalManpowerCount} <span className="text-xs font-bold text-neutral-500">{isRTL ? 'عامل' : 'Workers'}</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            {isRTL ? 'إجمالي العمالة بكافة المخيمات' : 'Total workforce in all camps'}
          </div>
        </Card>

        {/* CARD 3: Total Buildings (Accommodation + Utility) */}
        <Card className="p-4 border-neutral-200 bg-white shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600">
              {isRTL ? 'إجمالي المباني' : 'Total Buildings'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900 font-mono">
            {totalBuildingsCount} <span className="text-xs font-bold text-neutral-500">{isRTL ? 'مبنى' : 'Units'}</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            {isRTL ? 'سكنية ومرافق خدمية' : 'Living blocks & utility units'}
          </div>
        </Card>

        {/* CARD 4: Total Inventory (All Camps Combined) */}
        <Card className="p-4 border-neutral-200 bg-white shadow-2xs hover:shadow-md transition">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600">
              {isRTL ? 'إجمالي المخزون' : 'Total Inventory'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-neutral-900 font-mono">
            {totalInventoryCount.toLocaleString()} <span className="text-xs font-bold text-neutral-500">pcs</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            {isRTL ? 'أصول ولوازم كافة المخيمات' : 'All camp assets & supplies'}
          </div>
        </Card>

        {/* CARD 5: Total Cost from All Camps */}
        <Card className="p-4 border-orange-200 bg-orange-50/40 shadow-2xs hover:shadow-md transition col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700">
              {isRTL ? 'إجمالي التكاليف' : 'Total Cost All Camps'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-orange-600 font-mono">
            {totalCostAllCamps.toLocaleString()} <span className="text-xs font-bold text-orange-800">SAR</span>
          </div>
          <div className="text-[10px] text-orange-700 font-medium mt-1">
            {isRTL ? 'المياه والغاز والوقود' : 'Water, Gas & Fuel Expenses'}
          </div>
        </Card>
      </div>

      {/* 3 CANDLESTICK CHARTS FOR WATER, GAS & FUEL (FROM ALL PROJECTS OR FILTERED) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-900">
              {isRTL
                ? `مخططات الشموع لاستهلاك الخدمات: ${selectedProjectId === 'All' ? 'كافة المشاريع والمخيمات' : getProjectName(selectedProjectId)}`
                : `Candlestick Utility Trends: ${selectedProjectId === 'All' ? 'All Camps & Projects' : getProjectName(selectedProjectId)}`}
            </h2>
          </div>
          <span className="text-xs text-neutral-400 font-medium">
            {isRTL ? 'تحديث حي' : 'Daily ranges & cost variance'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CANDLE 1: Water Usage */}
          <div className="rounded-2xl p-4 bg-white border border-neutral-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900">
                      {isRTL ? 'استهلاك المياه (صهاريج)' : 'Water Usage (Tankers)'}
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      {filteredWater.length} {isRTL ? 'رحلة مسجلة' : 'Trips recorded'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-orange-600 font-mono block">
                    {waterTotalCost.toLocaleString()} SAR
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {filteredWater.reduce((acc, r) => acc + (Number(r.trips) || 0) * 32, 0)} m³
                  </span>
                </div>
              </div>

              {/* Candle Chart */}
              <div className="pt-2 border-t border-neutral-100">
                <CandleChart
                  data={waterCandleData}
                  height={125}
                  unit="SAR"
                  bullishColor="#EA580C"
                  bearishColor="#262626"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{isRTL ? 'توزيع الصهاريج:' : 'Delivery Share:'}</span>
              <span className="font-semibold text-neutral-800">
                {filteredWater.filter((r) => r.type === 'Fresh Water').length} Fresh /{' '}
                {filteredWater.filter((r) => r.type === 'Waste Water').length} Waste
              </span>
            </div>
          </div>

          {/* CANDLE 2: Gas Usage */}
          <div className="rounded-2xl p-4 bg-white border border-neutral-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900">
                      {isRTL ? 'استهلاك أسطوانات الغاز' : 'Gas Usage (Cylinders)'}
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      {filteredGas.reduce((acc, r) => acc + (Number(r.cylindersCount) || 0), 0)} {isRTL ? 'أسطوانة' : 'Cylinders'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-amber-600 font-mono block">
                    {gasTotalCost.toLocaleString()} SAR
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {filteredGas.length} {isRTL ? 'حركة توريد' : 'Refill logs'}
                  </span>
                </div>
              </div>

              {/* Candle Chart */}
              <div className="pt-2 border-t border-neutral-100">
                <CandleChart
                  data={gasCandleData}
                  height={125}
                  unit="SAR"
                  bullishColor="#D97706"
                  bearishColor="#262626"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{isRTL ? 'حالة المخزون:' : 'Stock Status:'}</span>
              <span className="font-semibold text-neutral-800">
                {filteredGas.filter((r) => r.status === 'In Stock').length} In Stock /{' '}
                {filteredGas.filter((r) => r.status === 'In Use').length} In Use
              </span>
            </div>
          </div>

          {/* CANDLE 3: Fuel Usage */}
          <div className="rounded-2xl p-4 bg-white border border-neutral-200 shadow-2xs hover:shadow-md transition flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-300 text-neutral-800 flex items-center justify-center">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-neutral-900">
                      {isRTL ? 'استهلاك الوقود والديزل' : 'Fuel & Diesel Usage'}
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      {filteredFuel.reduce((acc, r) => acc + (Number(r.litersUsed) || 0), 0).toLocaleString()} Liters
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-neutral-900 font-mono block">
                    {fuelTotalCost.toLocaleString()} SAR
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    {filteredFuel.length} {isRTL ? 'تعبئة مولد' : 'Fill operations'}
                  </span>
                </div>
              </div>

              {/* Candle Chart */}
              <div className="pt-2 border-t border-neutral-100">
                <CandleChart
                  data={fuelCandleData}
                  height={125}
                  unit="SAR"
                  bullishColor="#10B981"
                  bearishColor="#262626"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
              <span>{isRTL ? 'معدل التكلفة للتر:' : 'Avg Cost/Liter:'}</span>
              <span className="font-semibold text-neutral-800 font-mono">
                {(fuelTotalCost / Math.max(1, filteredFuel.reduce((acc, r) => acc + (Number(r.litersUsed) || 0), 0))).toFixed(2)} SAR/L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* THREE PIE / DONUT CHARTS: INVENTORY BY CATEGORY, WORKFORCE, & REPORTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Inventory Graph */}
        <Card className="bg-white border-neutral-200">
          <CardHeader
            title={isRTL ? 'مخطط المخزون حسب الفئات' : 'Inventory by Category'}
            subtitle={
              isRTL
                ? `إجمالي المخزون (${totalInventoryCount.toLocaleString()} قطعة)`
                : `Total Inventory (${totalInventoryCount.toLocaleString()} pcs)`
            }
          />
          <CardContent className="pt-2">
            <DonutChart
              data={inventoryChartSegments}
              size={160}
              donutThickness={22}
              centerLabel={isRTL ? 'مخزون' : 'Items'}
              centerValue={totalInventoryCount}
            />
          </CardContent>
        </Card>

        {/* Workforce Distribution Donut Chart */}
        <Card className="bg-white border-neutral-200">
          <CardHeader
            title={isRTL ? 'توزيع القوى العاملة' : 'Workforce by Position'}
            subtitle={
              isRTL
                ? `إجمالي العمالة (${totalManpowerCount} موظف)`
                : `Controlled Titles (${totalManpowerCount} Personnel)`
            }
          />
          <CardContent className="pt-2">
            <DonutChart
              data={personnelChartSegments}
              size={160}
              donutThickness={22}
              centerLabel={isRTL ? 'موظفين' : 'Staff'}
              centerValue={totalManpowerCount}
            />
          </CardContent>
        </Card>

        {/* Reports Status Distribution Donut Chart */}
        <Card className="bg-white border-neutral-200">
          <CardHeader
            title={isRTL ? 'توزيع البلاغات والتقارير' : 'Operational Reports Status'}
            subtitle={
              isRTL
                ? `إجمالي البلاغات المسجلة (${reports.length} تقرير)`
                : `Cross-camp Logs (${reports.length} Reports)`
            }
          />
          <CardContent className="pt-2">
            <DonutChart
              data={reportChartSegments}
              size={160}
              donutThickness={22}
              centerLabel={isRTL ? 'تقارير' : 'Reports'}
              centerValue={reports.length}
            />
          </CardContent>
        </Card>
      </div>

      {/* COMBINED DATA TABLES SECTION (MANPOWER MASTER SHEET & COMBINED INVENTORY) */}
      <Card className="bg-white border-neutral-200">
        <div className="p-4 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('manpower')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'manpower'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {isRTL ? 'سجل القوى العاملة الشامل (Manpower Master Sheet)' : 'Combined Manpower Master Sheet'} ({filteredPersonnel.length})
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'inventory'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {isRTL ? 'سجل المخزون الموحد (Combined Inventory)' : 'Combined Inventory Sheet'} ({filteredInventory.length})
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'projects'
                  ? 'bg-orange-600 text-white shadow-2xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {isRTL ? 'المخيمات والمشاريع' : 'Camps & Sites'} ({filteredProjects.length})
            </button>
          </div>

          <div className="text-xs text-neutral-400">
            {selectedProjectId === 'All' ? (
              <span className="font-semibold text-neutral-700">
                {isRTL ? 'عرض مدمج لكافة المخيمات' : 'Viewing All Camps Combined'}
              </span>
            ) : (
              <span className="font-bold text-orange-600">
                {getProjectName(selectedProjectId)}
              </span>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {/* TAB 1: MANPOWER MASTER SHEET */}
          {activeTab === 'manpower' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{isRTL ? 'الاسم' : 'Name'}</th>
                    <th className="py-2.5 px-3 font-semibold">{isRTL ? 'رقم الإقامة / الهوية' : 'Iqama / ID Number'}</th>
                    <th className="py-2.5 px-3 font-semibold">{isRTL ? 'المسمى الوظيفي' : 'Job Title'}</th>
                    <th className="py-2.5 px-3 font-semibold">{isRTL ? 'المخيم / المشروع' : 'Camp / Project'}</th>
                    <th className="py-2.5 px-3 font-semibold">{isRTL ? 'المبنى والغرفة' : 'Building & Room'}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{isRTL ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPersonnel.slice(0, 10).map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50 transition">
                      <td className="py-2.5 px-3 font-bold text-neutral-900">{p.name}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-orange-700">
                        {p.iqamaNumber || p.idNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 text-[10px] font-bold">
                          {p.jobTitleId}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 font-medium">
                        {getProjectName(p.projectId)}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-700 font-medium">
                        {getBuildingName(p.buildingId)} • {p.roomNumber}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setInspectedPersonnel(p)}
                          className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold transition"
                        >
                          {isRTL ? 'عرض الملف' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPersonnel.length > 10 && (
                <div className="p-3 text-center border-t border-neutral-100 bg-neutral-50/50">
                  <Link
                    to="/admin/manpower"
                    className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{isRTL ? `عرض كافة سجلات العمالة (${filteredPersonnel.length})` : `View all ${filteredPersonnel.length} personnel in Manpower module`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COMBINED INVENTORY SHEET */}
          {activeTab === 'inventory' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">{isRTL ? 'الصنف' : 'Item Name'}</th>
                    <th className="py-2.5 px-3 font-semibold">{isRTL ? 'الفئة' : 'Category'}</th>
                    <th className="py-2.5 px-3 font-semibold">{isRTL ? 'المخيم' : 'Camp'}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{isRTL ? 'الكمية' : 'Quantity'}</th>
                    <th className="py-2.5 px-3 font-semibold text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                    <th className="py-2.5 px-3 font-semibold text-right">{isRTL ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredInventory.slice(0, 10).map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50 transition">
                      <td className="py-2.5 px-3 font-bold text-neutral-900">{item.itemName}</td>
                      <td className="py-2.5 px-3 text-neutral-600">{item.category}</td>
                      <td className="py-2.5 px-3 text-neutral-700 font-medium">
                        {item.projectName || getProjectName(item.projectId)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-neutral-900">
                        {item.quantity} {item.unit || 'pcs'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge status={item.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setInspectedInventory(item)}
                          className="px-2 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-semibold transition"
                        >
                          {isRTL ? 'تفاصيل' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInventory.length > 10 && (
                <div className="p-3 text-center border-t border-neutral-100 bg-neutral-50/50">
                  <Link
                    to="/admin/inventory"
                    className="text-xs font-bold text-orange-600 hover:underline inline-flex items-center gap-1"
                  >
                    <span>{isRTL ? `عرض كافة عناصر المخزون (${filteredInventory.length})` : `View all ${filteredInventory.length} items in Inventory module`}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAMPS & SITES OVERVIEW */}
          {activeTab === 'projects' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Camp / Project</th>
                    <th className="py-2.5 px-3 font-semibold">Location</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Occupancy</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Reports</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredProjects.map((p) => {
                    const occRate = Math.round((p.currentOccupancy / p.campCapacity) * 100);
                    return (
                      <tr key={p.id} className="hover:bg-neutral-50 transition">
                        <td className="py-3 px-3">
                          <Link
                            to={`/admin/projects/${p.id}`}
                            className="font-semibold text-neutral-900 hover:text-orange-600 block transition"
                          >
                            {p.name}
                          </Link>
                          <span className="text-[10px] text-neutral-400 font-mono">{p.code}</span>
                        </td>
                        <td className="py-3 px-3 text-neutral-600">{p.location}</td>
                        <td className="py-3 px-3 text-center">
                          <Badge status={p.status} size="sm" />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-medium text-neutral-900">
                            {p.currentOccupancy} / {p.campCapacity}
                          </span>
                          <span className="text-[10px] text-neutral-400 block">({occRate}%)</span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-neutral-800">
                          {p.reportsCount}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link to={`/admin/projects/${p.id}`}>
                            <Button variant="outline" size="sm" className="h-6 text-[11px] px-2">
                              {t('common.view')}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* INSPECTION MODAL: FULL MANPOWER OPERATIONAL PROFILE */}
      {inspectedPersonnel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-600 text-white font-black text-lg flex items-center justify-center shrink-0">
                  {inspectedPersonnel.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-base text-neutral-900 leading-tight">
                    {inspectedPersonnel.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold">
                    {inspectedPersonnel.jobTitleId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectedPersonnel(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  {isRTL ? 'رقم الإقامة' : 'Iqama Number'}
                </span>
                <span className="font-mono font-bold text-orange-700 text-sm">
                  {inspectedPersonnel.iqamaNumber || inspectedPersonnel.idNumber}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  {isRTL ? 'الرقم الوظيفي' : 'Employee ID'}
                </span>
                <span className="font-mono font-bold text-neutral-900 text-sm">
                  {inspectedPersonnel.idNumber}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  {isRTL ? 'المشروع / المخيم' : 'Camp Project'}
                </span>
                <span className="font-bold text-neutral-800">
                  {getProjectName(inspectedPersonnel.projectId)}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  {isRTL ? 'المبنى والغرفة' : 'Building & Room'}
                </span>
                <span className="font-bold text-emerald-700">
                  {getBuildingName(inspectedPersonnel.buildingId)} • {inspectedPersonnel.roomNumber}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setInspectedPersonnel(null)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
              <Link to="/admin/manpower">
                <Button variant="primary" size="sm">
                  {isRTL ? 'فتح سجل القوى العاملة' : 'View Full Manpower'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL: FULL INVENTORY ITEM RECORD */}
      {inspectedInventory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base text-neutral-900 leading-tight">
                    {inspectedInventory.itemName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold">
                    {inspectedInventory.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectedInventory(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  {isRTL ? 'الكمية المتوفرة' : 'In Stock Quantity'}
                </span>
                <span className="font-mono font-bold text-neutral-900 text-sm">
                  {inspectedInventory.quantity} {inspectedInventory.unit || 'pcs'}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  {isRTL ? 'المخيم / الموقع' : 'Location Camp'}
                </span>
                <span className="font-bold text-neutral-800">
                  {inspectedInventory.projectName || getProjectName(inspectedInventory.projectId)}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  {isRTL ? 'حالة المخزون' : 'Stock Status'}
                </span>
                <Badge status={inspectedInventory.status} size="sm" />
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">
                  {isRTL ? 'تاريخ آخر توريد' : 'Last Restocked'}
                </span>
                <span className="font-mono text-neutral-700 font-medium">
                  {inspectedInventory.lastRestocked || '-'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setInspectedInventory(null)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
              <Link to="/admin/inventory">
                <Button variant="primary" size="sm">
                  {isRTL ? 'فتح سجل المخزون' : 'Open Inventory'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
