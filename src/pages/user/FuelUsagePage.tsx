import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Fuel,
  Plus,
  Search,
  Trash2,
  Edit2,
  AlertTriangle,
  Download,
  Calendar,
  Zap,
  Activity,
  Cpu,
} from 'lucide-react';
import { FuelUsageRecord, FuelType, DateFilterPeriod } from '../../types/utilities';
import { fuelUsageService } from '../../services/fuelUsageService';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { UtilityTopNav } from '../../components/utilities/UtilityTopNav';
import { DateFilterBar } from '../../components/utilities/DateFilterBar';
import { FuelRecordModal } from '../../components/utilities/FuelRecordModal';
import { BarChart, BarDataPoint } from '../../components/charts/BarChart';
import { LineChart, LineDataPoint } from '../../components/charts/LineChart';
import { DonutChart, ChartSegment } from '../../components/charts/DonutChart';
import { isRecordInDatePeriod } from '../../utils/dateFilter';

type FuelTab = 'Overview' | 'Diesel' | 'Petrol' | 'All Records';

export const FuelUsagePage: React.FC = () => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<FuelTab>('Overview');
  const [dateFilter, setDateFilter] = useState<DateFilterPeriod>('Month');
  const [records, setRecords] = useState<FuelUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<FuelType>('Diesel');
  const [editingRecord, setEditingRecord] = useState<FuelUsageRecord | null>(null);

  // Delete Confirmation State
  const [recordToDelete, setRecordToDelete] = useState<FuelUsageRecord | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fuelUsageService.getRecords();
      setRecords(data);
    } catch {
      toastError(isRTL ? 'فشل تحميل سجلات الوقود' : 'Failed to load fuel usage records');
    } finally {
      setIsLoading(false);
    }
  }, [isRTL, toastError]);

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('camp_fuel_usage_updated', handleSync);
    return () => {
      window.removeEventListener('camp_fuel_usage_updated', handleSync);
    };
  }, [loadData]);

  // Filter records by Date Filter
  const dateFilteredRecords = useMemo(() => {
    return records.filter((rec) => isRecordInDatePeriod(rec.date, dateFilter));
  }, [records, dateFilter]);

  // Tab & Search filtered records
  const displayRecords = useMemo(() => {
    let list = dateFilteredRecords;

    if (activeTab === 'Diesel') {
      list = list.filter((r) => r.fuelType === 'Diesel');
    } else if (activeTab === 'Petrol') {
      list = list.filter((r) => r.fuelType === 'Petrol');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.fuelType.toLowerCase().includes(q) ||
          r.machineName.toLowerCase().includes(q) ||
          (r.notes && r.notes.toLowerCase().includes(q)) ||
          r.date.includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dateFilteredRecords, activeTab, searchTerm]);

  // Separate Statistics for Diesel, Petrol, and Combined
  const stats = useMemo(() => {
    const dieselRecords = dateFilteredRecords.filter((r) => r.fuelType === 'Diesel');
    const petrolRecords = dateFilteredRecords.filter((r) => r.fuelType === 'Petrol');

    const dieselLiters = dieselRecords.reduce((sum, r) => sum + (r.litersUsed || 0), 0);
    const dieselCost = dieselRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
    const dieselAvgCostPerLiter = dieselLiters > 0 ? dieselCost / dieselLiters : 0;

    const petrolLiters = petrolRecords.reduce((sum, r) => sum + (r.litersUsed || 0), 0);
    const petrolCost = petrolRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
    const petrolAvgCostPerLiter = petrolLiters > 0 ? petrolCost / petrolLiters : 0;

    const totalLiters = dieselLiters + petrolLiters;
    const totalCost = dieselCost + petrolCost;
    const totalAvgCostPerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;

    return {
      diesel: {
        count: dieselRecords.length,
        liters: dieselLiters,
        cost: dieselCost,
        avgCostPerLiter: dieselAvgCostPerLiter,
      },
      petrol: {
        count: petrolRecords.length,
        liters: petrolLiters,
        cost: petrolCost,
        avgCostPerLiter: petrolAvgCostPerLiter,
      },
      combined: {
        totalRecords: dateFilteredRecords.length,
        totalLiters,
        totalCost,
        avgCostPerLiter: totalAvgCostPerLiter,
      },
    };
  }, [dateFilteredRecords]);

  // Machine breakdown stats
  const machineBreakdown = useMemo(() => {
    const map: Record<string, { liters: number; cost: number; count: number }> = {};
    dateFilteredRecords.forEach((r) => {
      const name = r.machineName || 'Unassigned Machine';
      if (!map[name]) {
        map[name] = { liters: 0, cost: 0, count: 0 };
      }
      map[name].liters += r.litersUsed || 0;
      map[name].cost += r.cost || 0;
      map[name].count += 1;
    });

    return Object.entries(map).map(([name, data]) => ({
      name,
      ...data,
    })).sort((a, b) => b.liters - a.liters);
  }, [dateFilteredRecords]);

  // Chart Data: Liters Used by Date (Diesel vs Petrol)
  const barChartData: BarDataPoint[] = useMemo(() => {
    const dateMap: Record<string, { diesel: number; petrol: number }> = {};

    dateFilteredRecords.forEach((r) => {
      const d = r.date || 'Unknown';
      if (!dateMap[d]) {
        dateMap[d] = { diesel: 0, petrol: 0 };
      }
      if (r.fuelType === 'Diesel') {
        dateMap[d].diesel += r.litersUsed || 0;
      } else {
        dateMap[d].petrol += r.litersUsed || 0;
      }
    });

    const sortedDates = Object.keys(dateMap).sort();
    const displayDates = sortedDates.slice(-8);

    return displayDates.map((dateStr) => {
      const parts = dateStr.split('-');
      const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
      return {
        label,
        seriesA: Math.round(dateMap[dateStr].diesel),
        seriesB: Math.round(dateMap[dateStr].petrol),
      };
    });
  }, [dateFilteredRecords]);

  // Chart Data: Fuel Cost Over Time (Line Chart)
  const lineChartData: LineDataPoint[] = useMemo(() => {
    const dateMap: Record<string, { dieselCost: number; petrolCost: number }> = {};

    dateFilteredRecords.forEach((r) => {
      const d = r.date || 'Unknown';
      if (!dateMap[d]) {
        dateMap[d] = { dieselCost: 0, petrolCost: 0 };
      }
      if (r.fuelType === 'Diesel') {
        dateMap[d].dieselCost += r.cost || 0;
      } else {
        dateMap[d].petrolCost += r.cost || 0;
      }
    });

    const sortedDates = Object.keys(dateMap).sort();
    const displayDates = sortedDates.slice(-10);

    return displayDates.map((dateStr) => {
      const parts = dateStr.split('-');
      const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : dateStr;
      return {
        label,
        seriesA: Math.round(dateMap[dateStr].dieselCost),
        seriesB: Math.round(dateMap[dateStr].petrolCost),
      };
    });
  }, [dateFilteredRecords]);

  // Chart Data: Cost Distribution Donut
  const donutSegments: ChartSegment[] = useMemo(() => {
    if (stats.combined.totalCost === 0) return [];
    return [
      {
        label: isRTL ? 'ديزل' : 'Diesel',
        value: stats.diesel.cost,
        color: '#EA580C',
      },
      {
        label: isRTL ? 'بنزين' : 'Petrol',
        value: stats.petrol.cost,
        color: '#171717',
      },
    ].filter((s) => s.value > 0);
  }, [stats, isRTL]);

  // Handlers
  const handleOpenAddModal = (fuelType: FuelType = 'Diesel') => {
    setEditingRecord(null);
    setModalDefaultType(fuelType);
    setIsModalOpen(true);
  };

  const handleEdit = (record: FuelUsageRecord) => {
    setEditingRecord(record);
    setModalDefaultType(record.fuelType);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    try {
      await fuelUsageService.deleteRecord(recordToDelete.id);
      success(isRTL ? 'تم حذف السجل بنجاح' : 'Fuel record deleted successfully');
      setRecordToDelete(null);
      loadData();
    } catch {
      toastError(isRTL ? 'فشل حذف السجل' : 'Failed to delete fuel record');
    }
  };

  const handleExportCSV = () => {
    if (displayRecords.length === 0) return;
    const headers = [
      'Date',
      'Fuel Type',
      'Liters Used',
      'Total Cost (SAR)',
      'Cost per Liter (SAR)',
      'Generator / Machine',
      'Notes',
    ];

    const rows = displayRecords.map((r) => [
      r.date,
      `"${r.fuelType}"`,
      r.litersUsed,
      r.cost,
      r.costPerLiter || (r.litersUsed > 0 ? (r.cost / r.litersUsed).toFixed(3) : 0),
      `"${r.machineName || ''}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fuel_usage_${dateFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Switcher Navigation */}
      <UtilityTopNav />

      {/* Main Page Header */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
                  {isRTL ? 'استهلاك الوقود للمولدات والمعدات' : 'Fuel Usage'}
                </h1>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {isRTL
                    ? 'تسجيل ومتابعة استهلاك الديزل والبنزين للمولدات والمضخات والمعدات'
                    : 'Record fuel consumption for generators and machines.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={displayRecords.length === 0}
              className="border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {isRTL ? 'تصدير' : 'Export'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenAddModal('Diesel')}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {isRTL ? '+ إضافة سجل وقود' : '+ Add Fuel Usage Record'}
            </Button>
          </div>
        </div>

        {/* Tab Controls & Date Filters */}
        <div className="mt-6 pt-5 border-t border-neutral-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {(['Overview', 'Diesel', 'Petrol', 'All Records'] as FuelTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-neutral-900 text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {tab === 'Overview' && (isRTL ? 'نظرة عامة' : 'Overview')}
                  {tab === 'Diesel' && (isRTL ? 'ديزل' : 'Diesel')}
                  {tab === 'Petrol' && (isRTL ? 'بنزين' : 'Petrol')}
                  {tab === 'All Records' && (isRTL ? 'كل السجلات' : 'All Records')}
                </button>
              );
            })}
          </div>

          {/* Date Filter Bar */}
          <DateFilterBar selectedPeriod={dateFilter} onSelectPeriod={setDateFilter} />
        </div>
      </div>

      {/* OVERVIEW CONTENT */}
      {activeTab === 'Overview' && (
        <div className="space-y-6">
          {/* Top 3 Metric Cards: Combined, Diesel, Petrol - CLICKABLE TILES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Combined Fuel Summary */}
            <div
              onClick={() => setActiveTab('Overview')}
              className="bg-white border-2 border-neutral-900 hover:border-orange-500 rounded-xl p-5 shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition-all group"
              title={isRTL ? 'عرض النظرة العامة' : 'Click to view Overview'}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-base group-hover:text-orange-600 transition-colors">
                      {isRTL ? 'إجمالي الوقود المشترك' : 'Combined Fuel'}
                    </h3>
                    <span className="text-xs text-neutral-600 font-medium">
                      {stats.combined.totalRecords} {isRTL ? 'سجل مسجل' : 'entries logged'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2 py-1 bg-neutral-100 text-neutral-800 rounded border border-neutral-200">
                  {dateFilter}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي اللترات' : 'Total Liters'}</span>
                  <p className="text-2xl font-black text-neutral-900 mt-0.5">
                    {stats.combined.totalLiters.toLocaleString()} <span className="text-xs font-semibold text-neutral-500">L</span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</span>
                  <p className="text-2xl font-black text-orange-600 mt-0.5">
                    {stats.combined.totalCost.toLocaleString()} <span className="text-xs font-semibold text-neutral-500">SAR</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs font-mono font-semibold">
                <span className="text-neutral-600">{isRTL ? 'متوسط السعر لكل لتر:' : 'Avg Cost / Liter:'}</span>
                <span className="font-bold text-neutral-900">
                  {stats.combined.avgCostPerLiter.toFixed(3)} SAR/L
                </span>
              </div>
            </div>

            {/* Diesel Summary */}
            <div
              onClick={() => setActiveTab('Diesel')}
              className="bg-white border-2 border-orange-200 hover:border-orange-500 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              title={isRTL ? 'انقر لعرض سجلات الديزل' : 'Click to view Diesel records'}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-base group-hover:text-orange-600 transition-colors">
                      {isRTL ? 'ديزل (مولدات رئيسية)' : 'Diesel'}
                    </h3>
                    <span className="text-xs text-neutral-500 font-medium">
                      {stats.diesel.count} {isRTL ? 'عملية تزويد' : 'refuelings'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAddModal('Diesel');
                  }}
                  className="text-xs h-7 px-2 border-orange-200 text-orange-700 hover:bg-orange-50 font-bold"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {isRTL ? 'إضافة' : 'Add'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي اللترات' : 'Total Liters'}</span>
                  <p className="text-xl font-bold text-neutral-900 mt-0.5">
                    {stats.diesel.liters.toLocaleString()} <span className="text-xs font-normal text-neutral-500">L</span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</span>
                  <p className="text-xl font-bold text-orange-600 mt-0.5">
                    {stats.diesel.cost.toLocaleString()} <span className="text-xs font-normal text-neutral-500">SAR</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs font-mono font-semibold">
                <span className="text-neutral-600">{isRTL ? 'متوسط سعر اللتر:' : 'Avg Cost / Liter:'}</span>
                <span className="font-semibold text-neutral-900">
                  {stats.diesel.avgCostPerLiter.toFixed(3)} SAR/L
                </span>
              </div>
            </div>

            {/* Petrol Summary */}
            <div
              onClick={() => setActiveTab('Petrol')}
              className="bg-white border-2 border-neutral-200 hover:border-neutral-900 rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              title={isRTL ? 'انقر لعرض سجلات البنزين' : 'Click to view Petrol records'}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-base group-hover:text-orange-600 transition-colors">
                      {isRTL ? 'بنزين (مضخات ومعدات)' : 'Petrol'}
                    </h3>
                    <span className="text-xs text-neutral-500 font-medium">
                      {stats.petrol.count} {isRTL ? 'عملية تزويد' : 'refuelings'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAddModal('Petrol');
                  }}
                  className="text-xs h-7 px-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-bold"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {isRTL ? 'إضافة' : 'Add'}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي اللترات' : 'Total Liters'}</span>
                  <p className="text-xl font-bold text-neutral-900 mt-0.5">
                    {stats.petrol.liters.toLocaleString()} <span className="text-xs font-normal text-neutral-500">L</span>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</span>
                  <p className="text-xl font-bold text-neutral-900 mt-0.5">
                    {stats.petrol.cost.toLocaleString()} <span className="text-xs font-normal text-neutral-500">SAR</span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-200 flex items-center justify-between text-xs font-mono font-semibold">
                <span className="text-neutral-600">{isRTL ? 'متوسط سعر اللتر:' : 'Avg Cost / Liter:'}</span>
                <span className="font-semibold text-neutral-900">
                  {stats.petrol.avgCostPerLiter.toFixed(3)} SAR/L
                </span>
              </div>
            </div>
          </div>

          {/* Visual Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Liters Comparison Bar Chart */}
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="border-b border-neutral-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                  {isRTL ? 'مقارنة استهلاك الوقود باللتر (ديزل مقابل بنزين)' : 'Fuel Usage (Diesel vs Petrol in Liters)'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {isRTL ? 'مقارنة كميات الوقود المستهلكة حسب التواريخ' : 'Liters consumed comparison across dates'}
                </p>
              </div>
              <BarChart
                data={barChartData}
                seriesAName={isRTL ? 'ديزل (لتر)' : 'Diesel (L)'}
                seriesBName={isRTL ? 'بنزين (لتر)' : 'Petrol (L)'}
                seriesAColor="#EA580C"
                seriesBColor="#262626"
                unit="L"
                height={210}
              />
            </div>

            {/* Chart 2: Cost Distribution Donut */}
            <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="border-b border-neutral-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                  {isRTL ? 'توزيع تكلفة الوقود' : 'Fuel Cost Distribution'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {isRTL ? 'نسبة تكلفة الديزل مقابل البنزين' : 'Diesel vs Petrol cost share'}
                </p>
              </div>
              <div className="py-2 flex items-center justify-center">
                <DonutChart
                  data={donutSegments}
                  size={170}
                  centerLabel={isRTL ? 'الإجمالي' : 'Total'}
                  centerValue={`${stats.combined.totalCost.toLocaleString()}`}
                />
              </div>
              <div className="text-[11px] text-neutral-500 text-center font-mono border-t border-neutral-100 pt-2">
                Total Expenses: {stats.combined.totalCost.toLocaleString()} SAR
              </div>
            </div>
          </div>

          {/* Chart 3: Fuel Cost Over Time Line Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-neutral-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
              <div className="border-b border-neutral-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                  {isRTL ? 'تكلفة الوقود عبر الأيام' : 'Fuel Cost Over Time'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {isRTL ? 'تكاليف التزويد بالوقود حسب التواريخ' : 'Refueling expenses across dates'}
                </p>
              </div>
              <LineChart
                data={lineChartData}
                seriesAName={isRTL ? 'تكلفة ديزل' : 'Diesel Cost'}
                seriesBName={isRTL ? 'تكلفة بنزين' : 'Petrol Cost'}
                seriesAColor="#EA580C"
                seriesBColor="#525252"
                unit="SAR"
                height={210}
              />
            </div>

            {/* Top Generators / Machines Table */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-sm text-neutral-900">
                    {isRTL ? 'المولدات والمعدات الأكثر استهلاكاً' : 'Consumption by Machine'}
                  </h3>
                </div>
                <span className="text-xs text-neutral-500 font-medium">
                  {machineBreakdown.length} {isRTL ? 'معدة' : 'machines'}
                </span>
              </div>

              {machineBreakdown.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  {isRTL ? 'لا توجد بيانات للمعدات' : 'No machine consumption data'}
                </div>
              ) : (
                <div className="space-y-3">
                  {machineBreakdown.slice(0, 5).map((m, idx) => {
                    const percent = stats.combined.totalLiters > 0 ? (m.liters / stats.combined.totalLiters) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-neutral-800">{m.name}</span>
                          <span className="font-bold text-neutral-900">{m.liters.toLocaleString()} L</span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-orange-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-neutral-500">
                          <span>{m.count} {isRTL ? 'سجلات' : 'refuels'}</span>
                          <span>{m.cost.toLocaleString()} SAR ({percent.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED DIESEL TAB BANNER */}
      {activeTab === 'Diesel' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 text-lg">
                {isRTL ? 'سجلات الديزل (Diesel Logs)' : 'Diesel Fuel Records'}
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                {isRTL
                  ? 'تسجيل ومتابعة استهلاك الديزل لتشغيل المولدات الكهربائية الرئيسية'
                  : 'Diesel consumption records for heavy power generators and equipment.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-neutral-500 block">{isRTL ? 'إجمالي لترات الديزل' : 'Total Diesel Liters'}</span>
              <span className="font-black text-lg text-neutral-900">
                {stats.diesel.liters.toLocaleString()} L
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenAddModal('Diesel')}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {isRTL ? '+ إضافة سجل ديزل' : '+ Add Diesel Record'}
            </Button>
          </div>
        </div>
      )}

      {/* DEDICATED PETROL TAB BANNER */}
      {activeTab === 'Petrol' && (
        <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-neutral-900 text-lg">
                {isRTL ? 'سجلات البنزين (Petrol Logs)' : 'Petrol Fuel Records'}
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                {isRTL
                  ? 'تسجيل ومتابعة استهلاك البنزين للمضخات ومولدات الطوارئ والمكائن الصغيرة'
                  : 'Petrol consumption records for water pumps, small tools, and backup machinery.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-neutral-500 block">{isRTL ? 'إجمالي لترات البنزين' : 'Total Petrol Liters'}</span>
              <span className="font-black text-lg text-neutral-900">
                {stats.petrol.liters.toLocaleString()} L
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenAddModal('Petrol')}
              className="bg-neutral-900 hover:bg-neutral-800 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {isRTL ? '+ إضافة سجل بنزين' : '+ Add Petrol Record'}
            </Button>
          </div>
        </div>
      )}

      {/* DATA TABLE SECTION */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-base text-neutral-900">
              {activeTab === 'Overview' && (isRTL ? 'سجلات الوقود الأخيرة' : 'Fuel Records')}
              {activeTab === 'Diesel' && (isRTL ? 'سجلات الديزل' : 'Diesel Fuel Records')}
              {activeTab === 'Petrol' && (isRTL ? 'سجلات البنزين' : 'Petrol Fuel Records')}
              {activeTab === 'All Records' && (isRTL ? 'جميع سجلات الوقود' : 'All Fuel Usage Records')}
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full">
              {displayRecords.length} {isRTL ? 'سجل' : 'records'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isRTL ? 'بحث عن معدة، نوع وقود، ملاحظة...' : 'Search machine, notes...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-300 rounded-lg focus:outline-none focus:border-orange-500 focus:bg-white text-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-neutral-500">
            {isRTL ? 'جاري تحميل البيانات...' : 'Loading fuel records...'}
          </div>
        ) : displayRecords.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <Fuel className="w-6 h-6" />
            </div>
            <p className="text-neutral-800 font-semibold text-base">
              {isRTL ? 'لم يتم العثور على سجلات استهلاك الوقود' : 'No fuel usage records found.'}
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {isRTL
                ? 'لا توجد سجلات مسجلة ضمن الفترة المحددة. يمكنك إضافة سجل جديد الآن.'
                : 'There are no records recorded in the selected period. You can add a new record now.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenAddModal(activeTab === 'Petrol' ? 'Petrol' : 'Diesel')}
              className="bg-orange-600 hover:bg-orange-700 text-white mt-2"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              {isRTL ? '+ إضافة سجل جديد' : '+ Add Fuel Record'}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
                  <th className="py-3 px-4">{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className="py-3 px-4">{isRTL ? 'نوع الوقود' : 'Fuel Type'}</th>
                  <th className="py-3 px-4 text-right">{isRTL ? 'اللترات المستخدمة' : 'Liters Used'}</th>
                  <th className="py-3 px-4 text-right">{isRTL ? 'التكلفة الإجمالية' : 'Cost'}</th>
                  <th className="py-3 px-4 text-right">{isRTL ? 'سعر اللتر' : 'Cost/Liter'}</th>
                  <th className="py-3 px-4">{isRTL ? 'المولد / المعدة' : 'Generator / Machine'}</th>
                  <th className="py-3 px-4">{isRTL ? 'الملاحظات' : 'Notes'}</th>
                  <th className="py-3 px-4 text-center">{isRTL ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {displayRecords.map((r) => {
                  const isDiesel = r.fuelType === 'Diesel';
                  const computedCostPerLiter =
                    r.costPerLiter ?? (r.litersUsed > 0 ? Number((r.cost / r.litersUsed).toFixed(3)) : 0);

                  return (
                    <tr key={r.id} className="hover:bg-neutral-50/80 transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 font-medium text-neutral-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{r.date}</span>
                        </div>
                      </td>

                      {/* Fuel Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isDiesel
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : 'bg-neutral-100 text-neutral-800 border border-neutral-300'
                          }`}
                        >
                          {isDiesel ? <Zap className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                          {r.fuelType}
                        </span>
                      </td>

                      {/* Liters Used */}
                      <td className="py-3.5 px-4 text-right font-bold text-neutral-900 whitespace-nowrap">
                        {r.litersUsed.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">L</span>
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 text-right font-bold text-orange-600 whitespace-nowrap">
                        {r.cost.toLocaleString()} <span className="text-[10px] text-neutral-500 font-normal">SAR</span>
                      </td>

                      {/* Cost per Liter */}
                      <td className="py-3.5 px-4 text-right font-semibold text-neutral-700 whitespace-nowrap">
                        {computedCostPerLiter.toFixed(3)}{' '}
                        <span className="text-[10px] text-neutral-400 font-normal">SAR/L</span>
                      </td>

                      {/* Generator / Machine */}
                      <td className="py-3.5 px-4 font-semibold text-neutral-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{r.machineName}</span>
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 text-neutral-500 max-w-xs truncate" title={r.notes || ''}>
                        {r.notes || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(r)}
                            title={isRTL ? 'تعديل' : 'Edit'}
                            className="p-1.5 text-neutral-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRecordToDelete(r)}
                            title={isRTL ? 'حذف' : 'Delete'}
                            className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fuel Record Add/Edit Modal */}
      <FuelRecordModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
          loadData();
        }}
        defaultType={modalDefaultType}
        editingRecord={editingRecord}
      />

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-neutral-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-neutral-900">
                {isRTL ? 'تأكيد الحذف' : 'Confirm Deletion'}
              </h3>
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed mb-6">
              {isRTL
                ? `هل أنت متأكد من رغبتك في حذف سجل الوقود (${recordToDelete.fuelType} - ${recordToDelete.machineName}) بتاريخ ${recordToDelete.date}؟ لا يمكن التراجع عن هذا الإجراء.`
                : `Are you sure you want to delete this fuel record (${recordToDelete.fuelType} - ${recordToDelete.machineName}) on ${recordToDelete.date}? This action cannot be undone.`}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRecordToDelete(null)}
                className="border-neutral-300 text-neutral-700"
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                {isRTL ? 'نعم، حذف' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
