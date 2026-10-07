import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Droplets,
  Plus,
  Search,
  Trash2,
  Edit2,
  FileText,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { WaterUsageRecord, WaterType, DateFilterPeriod } from '../../types/utilities';
import { waterUsageService } from '../../services/waterUsageService';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { UtilityTopNav } from '../../components/utilities/UtilityTopNav';
import { DateFilterBar } from '../../components/utilities/DateFilterBar';
import { WaterRecordModal } from '../../components/utilities/WaterRecordModal';
import { BarChart, BarDataPoint } from '../../components/charts/BarChart';
import { LineChart, LineDataPoint } from '../../components/charts/LineChart';
import { DonutChart, ChartSegment } from '../../components/charts/DonutChart';
import { isRecordInDatePeriod } from '../../utils/dateFilter';

type WaterTab = 'Overview' | 'Fresh Water' | 'Waste Water';

export const WaterUsagePage: React.FC = () => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<WaterTab>('Overview');
  const [dateFilter, setDateFilter] = useState<DateFilterPeriod>('Month');
  const [records, setRecords] = useState<WaterUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<WaterType>('Fresh Water');
  const [editingRecord, setEditingRecord] = useState<WaterUsageRecord | null>(null);

  // Delete Confirmation State
  const [recordToDelete, setRecordToDelete] = useState<WaterUsageRecord | null>(null);

  // File Preview State
  const [previewInvoice, setPreviewInvoice] = useState<{ name: string; url: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await waterUsageService.getRecords();
      setRecords(data);
    } catch {
      toastError(isRTL ? 'فشل تحميل بيانات استهلاك المياه' : 'Failed to load water usage records');
    } finally {
      setIsLoading(false);
    }
  }, [isRTL, toastError]);

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('camp_water_usage_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('camp_water_usage_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadData]);

  // Filter records by Date Period and Tab and Search
  const dateFilteredRecords = useMemo(() => {
    return records.filter((r) => isRecordInDatePeriod(r.date, dateFilter));
  }, [records, dateFilter]);

  const displayedRecords = useMemo(() => {
    return dateFilteredRecords.filter((r) => {
      const matchesTab =
        activeTab === 'Overview' ||
        (activeTab === 'Fresh Water' && r.type === 'Fresh Water') ||
        (activeTab === 'Waste Water' && r.type === 'Waste Water');

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        r.type.toLowerCase().includes(q) ||
        r.date.includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        (r.invoiceName && r.invoiceName.toLowerCase().includes(q));

      return matchesTab && matchesSearch;
    });
  }, [dateFilteredRecords, activeTab, searchTerm]);

  // Statistics calculated from dateFilteredRecords
  const stats = useMemo(() => {
    const fresh = dateFilteredRecords.filter((r) => r.type === 'Fresh Water');
    const waste = dateFilteredRecords.filter((r) => r.type === 'Waste Water');

    const freshTrips = fresh.reduce((sum, r) => sum + r.trips, 0);
    const freshCost = fresh.reduce((sum, r) => sum + r.totalCost, 0);
    const freshAvg = freshTrips > 0 ? Math.round(freshCost / freshTrips) : 0;

    const wasteTrips = waste.reduce((sum, r) => sum + r.trips, 0);
    const wasteCost = waste.reduce((sum, r) => sum + r.totalCost, 0);
    const wasteAvg = wasteTrips > 0 ? Math.round(wasteCost / wasteTrips) : 0;

    const totalTrips = freshTrips + wasteTrips;
    const totalCost = freshCost + wasteCost;

    return {
      freshTrips,
      freshCost,
      freshAvg,
      wasteTrips,
      wasteCost,
      wasteAvg,
      totalTrips,
      totalCost,
    };
  }, [dateFilteredRecords]);

  // Chart Data: Group by Date
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; freshCost: number; wasteCost: number; freshTrips: number; wasteTrips: number }> = {};

    dateFilteredRecords.forEach((r) => {
      const dKey = r.date;
      if (!map[dKey]) {
        map[dKey] = { date: dKey, freshCost: 0, wasteCost: 0, freshTrips: 0, wasteTrips: 0 };
      }
      if (r.type === 'Fresh Water') {
        map[dKey].freshCost += r.totalCost;
        map[dKey].freshTrips += r.trips;
      } else {
        map[dKey].wasteCost += r.totalCost;
        map[dKey].wasteTrips += r.trips;
      }
    });

    const sorted = Object.values(map).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const costBarData: BarDataPoint[] = sorted.map((s) => ({
      label: s.date.length >= 10 ? s.date.substring(5) : s.date,
      seriesA: s.freshCost,
      seriesB: s.wasteCost,
    }));

    const tripsBarData: BarDataPoint[] = sorted.map((s) => ({
      label: s.date.length >= 10 ? s.date.substring(5) : s.date,
      seriesA: s.freshTrips,
      seriesB: s.wasteTrips,
    }));

    const lineCostData: LineDataPoint[] = sorted.map((s) => ({
      label: s.date.length >= 10 ? s.date.substring(5) : s.date,
      seriesA: s.freshCost,
      seriesB: s.wasteCost,
    }));

    return { costBarData, tripsBarData, lineCostData };
  }, [dateFilteredRecords]);

  // Donut Chart Segment Data
  const donutSegments: ChartSegment[] = useMemo(() => {
    return [
      { label: 'Fresh Water', value: stats.freshCost, color: '#EA580C' },
      { label: 'Waste Water', value: stats.wasteCost, color: '#262626' },
    ];
  }, [stats.freshCost, stats.wasteCost]);

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await waterUsageService.deleteRecord(recordToDelete.id);
      success(isRTL ? 'تم حذف السجل بنجاح' : 'Record deleted successfully');
      setRecordToDelete(null);
      await loadData();
    } catch {
      toastError(isRTL ? 'فشل حذف السجل' : 'Failed to delete record');
    }
  };

  const handleOpenAdd = (type: WaterType = 'Fresh Water') => {
    setEditingRecord(null);
    setModalDefaultType(type);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: WaterUsageRecord) => {
    setEditingRecord(rec);
    setModalDefaultType(rec.type);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
        <div className="h-32 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-28 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
          <div className="h-28 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
          <div className="h-28 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Universal Utilities Module Navigation Switcher */}
      <UtilityTopNav />

      {/* 2. Page Header Banner with Module Tabs & Action Buttons */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                {isRTL ? 'إدارة استهلاك المياه (Water Usage)' : 'Water Usage Management'}
              </h1>
              <p className="text-xs text-neutral-500">
                {isRTL
                  ? 'متابعة صهاريج المياه الصالحة للشرب ونزح مياه الصرف الصحي والتكاليف'
                  : 'Monitor fresh potable water supply & wastewater suction tanker trips and expenses'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenAdd('Waste Water')}
            >
              {isRTL ? '+ نقلة صرف صحي' : '+ Add Waste Water'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenAdd('Fresh Water')}
            >
              {isRTL ? '+ نقلة مياه نقية' : '+ Add Fresh Water Record'}
            </Button>
          </div>
        </div>

        {/* 3 Tabs & Date Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/80">
            {(['Overview', 'Fresh Water', 'Waste Water'] as WaterTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-orange-700 shadow-2xs font-extrabold'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                {tab === 'Overview' && (isRTL ? 'لوحة المتابعة (Overview)' : 'Overview')}
                {tab === 'Fresh Water' && (isRTL ? 'المياه النقية (Fresh)' : 'Fresh Water')}
                {tab === 'Waste Water' && (isRTL ? 'الصرف الصحي (Waste)' : 'Waste Water')}
              </button>
            ))}
          </div>

          {/* Date Filter Bar */}
          <DateFilterBar selectedPeriod={dateFilter} onSelectPeriod={setDateFilter} />
        </div>
      </div>

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'Overview' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* STATS CARDS: Fresh Water, Waste Water, and Combined Totals - CLICKABLE TILES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fresh Water Card */}
            <div
              onClick={() => setActiveTab('Fresh Water')}
              className="bg-white border-2 border-orange-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-orange-600 transition-all group"
              title={isRTL ? 'انقر لعرض سجلات المياه النقية' : 'Click to view Fresh Water records'}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-orange-900 group-hover:text-orange-600 transition-colors">
                  {isRTL ? 'مياه نقية صالحة للشرب' : 'Fresh Water'}
                </span>
                <span className="text-[11px] font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {stats.freshTrips} {isRTL ? 'نقلات' : 'Trips'}
                </span>
              </div>
              <div className="my-3">
                <span className="text-2xl sm:text-3xl font-black text-orange-700 font-mono tracking-tight">
                  {stats.freshCost.toLocaleString()}{' '}
                  <span className="text-xs font-bold text-neutral-500 uppercase">SAR</span>
                </span>
                <p className="text-[11px] text-neutral-600 mt-1 font-medium">
                  {isRTL ? 'إجمالي تكلفة المياه النقية الموردة' : 'Total fresh water tanker procurement cost'}
                </p>
              </div>
              <div className="pt-2 border-t border-orange-200 text-xs text-neutral-700 flex items-center justify-between font-mono">
                <span>{isRTL ? 'متوسط سعر النقلة:' : 'Avg Cost / Trip:'}</span>
                <span className="font-bold text-orange-800">{stats.freshAvg.toLocaleString()} SAR</span>
              </div>
            </div>

            {/* Waste Water Card */}
            <div
              onClick={() => setActiveTab('Waste Water')}
              className="bg-white border-2 border-neutral-300 hover:border-neutral-900 rounded-2xl p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
              title={isRTL ? 'انقر لعرض سجلات الصرف الصحي' : 'Click to view Waste Water records'}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 group-hover:text-orange-600 transition-colors">
                  {isRTL ? 'نزح الصرف الصحي' : 'Waste Water'}
                </span>
                <span className="text-[11px] font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                  {stats.wasteTrips} {isRTL ? 'نقلات' : 'Trips'}
                </span>
              </div>
              <div className="my-3">
                <span className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono tracking-tight">
                  {stats.wasteCost.toLocaleString()}{' '}
                  <span className="text-xs font-bold text-neutral-500 uppercase">SAR</span>
                </span>
                <p className="text-[11px] text-neutral-600 mt-1 font-medium">
                  {isRTL ? 'تكلفة صهاريج كسح الصرف الصحي' : 'Total sewage disposal service costs'}
                </p>
              </div>
              <div className="pt-2 border-t border-neutral-200 text-xs text-neutral-700 flex items-center justify-between font-mono">
                <span>{isRTL ? 'متوسط سعر النقلة:' : 'Avg Cost / Trip:'}</span>
                <span className="font-bold text-neutral-900">{stats.wasteAvg.toLocaleString()} SAR</span>
              </div>
            </div>

            {/* Combined Water Card - 100% Solid High Contrast, Clickable */}
            <div
              onClick={() => setActiveTab('Overview')}
              className="bg-white border-2 border-neutral-900 hover:border-orange-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
              title={isRTL ? 'عرض النظرة العامة' : 'Click to view Overview'}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-900 group-hover:text-orange-600 transition-colors">
                  {isRTL ? 'إجمالي المياه المجمعة' : 'Combined Water Totals'}
                </span>
                <span className="text-[11px] font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                  {stats.totalTrips} {isRTL ? 'إجمالي النقلات' : 'Total Trips'}
                </span>
              </div>
              <div className="my-3">
                <span className="text-2xl sm:text-3xl font-black text-orange-600 font-mono tracking-tight">
                  {stats.totalCost.toLocaleString()}{' '}
                  <span className="text-xs font-bold text-neutral-500 uppercase">SAR</span>
                </span>
                <p className="text-[11px] text-neutral-600 mt-1 font-medium">
                  {isRTL ? 'مجموع تكاليف المياه العذبة ومياه الصرف' : 'Combined fresh and wastewater expenditure'}
                </p>
              </div>
              <div className="pt-2 border-t border-neutral-200 text-xs text-neutral-700 flex items-center justify-between font-mono font-semibold">
                <span>
                  Fresh: <strong className="text-orange-600 font-bold">{stats.freshCost.toLocaleString()} SAR</strong>
                </span>
                <span className="text-neutral-300">•</span>
                <span>
                  Waste: <strong className="text-neutral-900 font-bold">{stats.wasteCost.toLocaleString()} SAR</strong>
                </span>
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart 1: Water Cost Comparison Over Time */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                    {isRTL ? 'مقارنة تكلفة المياه الصالحة والكسح (ر.س)' : 'Water Cost Comparison Over Time (SAR)'}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {isRTL ? 'مقارنة التكاليف حسب التواريخ المحددة' : 'Fresh Water vs Waste Water expenses comparison'}
                  </p>
                </div>
              </div>

              <BarChart
                data={chartData.costBarData}
                seriesAName={isRTL ? 'مياه نقية' : 'Fresh Water'}
                seriesBName={isRTL ? 'صرف صحي' : 'Waste Water'}
                seriesAColor="#EA580C"
                seriesBColor="#262626"
                unit="SAR"
                height={210}
              />
            </div>

            {/* Chart 2: Cost Breakdown Donut Chart */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="border-b border-neutral-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                  {isRTL ? 'توزيع تكاليف المياه' : 'Water Cost Distribution'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {isRTL ? 'نسبة استهلاك النقي مقابل الصرف' : 'Fresh vs Waste water percentage'}
                </p>
              </div>

              <div className="py-2 flex items-center justify-center">
                <DonutChart
                  data={donutSegments}
                  size={170}
                  centerLabel={isRTL ? 'الإجمالي' : 'Total'}
                  centerValue={`${stats.totalCost.toLocaleString()}`}
                />
              </div>

              <div className="text-[11px] text-neutral-500 text-center font-mono border-t border-neutral-100 pt-2">
                Total Expenses: {stats.totalCost.toLocaleString()} SAR
              </div>
            </div>

            {/* Chart 3: Trips Comparison Over Time */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 lg:col-span-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                    {isRTL ? 'معدل النقلات (الردود) حسب التاريخ' : 'Water Tanker Trips Over Time'}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {isRTL ? 'عدد ردود المياه النقية مقابل ردود الصرف الصحي' : 'Tanker trips frequency & logistics distribution'}
                  </p>
                </div>
              </div>

              <LineChart
                data={chartData.tripsBarData.map((d) => ({
                  label: d.label,
                  seriesA: d.seriesA,
                  seriesB: d.seriesB,
                }))}
                seriesAName={isRTL ? 'نقلات المياه النقية' : 'Fresh Water Trips'}
                seriesBName={isRTL ? 'نقلات الصرف الصحي' : 'Waste Water Trips'}
                seriesAColor="#EA580C"
                seriesBColor="#525252"
                unit="Trips"
                height={200}
              />
            </div>
          </div>
        </div>
      )}

      {/* DATA TABLE SECTION: Shared across tabs with tab-specific filtering */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Table Top Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-900">
              {activeTab === 'Fresh Water'
                ? isRTL ? 'سجلات المياه النقية' : 'Fresh Water Records'
                : activeTab === 'Waste Water'
                ? isRTL ? 'سجلات الصرف الصحي' : 'Waste Water Records'
                : isRTL ? 'كافة سجلات المياه' : 'All Water Usage Records'}
            </h3>
            <span className="text-xs font-mono font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
              {displayedRecords.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isRTL ? 'بحث بالتاريخ أو الملاحظات...' : 'Search by date, notes, slip...'}
                className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>

            {/* Quick Add Button if in specific tab */}
            {activeTab === 'Fresh Water' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => handleOpenAdd('Fresh Water')}
              >
                {isRTL ? '+ إضافة نقلة' : '+ Add Record'}
              </Button>
            )}
            {activeTab === 'Waste Water' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => handleOpenAdd('Waste Water')}
              >
                {isRTL ? '+ إضافة نقلة' : '+ Add Record'}
              </Button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {displayedRecords.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-3">
            <Droplets className="w-9 h-9 mx-auto text-neutral-300 stroke-[1.5]" />
            <p className="text-xs font-medium">
              {isRTL ? 'لا توجد سجلات استهلاك مياه مطابقة' : 'No water usage records found.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenAdd(activeTab === 'Waste Water' ? 'Waste Water' : 'Fresh Water')}
            >
              {isRTL ? '+ إضافة سجل جديد' : '+ Add Record'}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500 font-bold bg-neutral-50/70">
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'النوع' : 'Water Type'}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? 'النقلات' : 'Trips'}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? 'سعر النقلة' : 'Cost/Trip'}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? 'التكلفة الإجمالية' : 'Total Cost'}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'الملاحظات' : 'Notes'}</th>
                  <th className="py-2.5 px-3 text-center">{isRTL ? 'الفاتورة' : 'Invoice'}</th>
                  <th className="py-2.5 px-3 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/80">
                {displayedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-neutral-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-semibold text-neutral-800 whitespace-nowrap">
                      {record.date}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          record.type === 'Fresh Water'
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            record.type === 'Fresh Water' ? 'bg-orange-500' : 'bg-neutral-800'
                          }`}
                        />
                        {record.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-bold text-neutral-900">
                      {record.trips}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono text-neutral-700">
                      {record.costPerTrip.toLocaleString()} SAR
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-black text-orange-700">
                      {record.totalCost.toLocaleString()} SAR
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600 max-w-xs truncate" title={record.notes}>
                      {record.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {record.invoiceName ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewInvoice({
                              name: record.invoiceName || 'Invoice',
                              url: record.invoiceUrl || '',
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="max-w-[80px] truncate">{record.invoiceName}</span>
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(record)}
                          className="p-1.5 text-neutral-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                          title={isRTL ? 'تعديل' : 'Edit'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordToDelete(record)}
                          className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title={isRTL ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Water Modal */}
      <WaterRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        defaultType={modalDefaultType}
        editingRecord={editingRecord}
      />

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  {isRTL ? 'تأكيد حذف سجل المياه' : 'Confirm Delete Record'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {isRTL
                    ? `هل أنت متأكد من حذف نقلة ${recordToDelete.type} بتاريخ ${recordToDelete.date}؟`
                    : `Are you sure you want to delete this ${recordToDelete.type} record dated ${recordToDelete.date}?`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <Button variant="outline" size="sm" onClick={() => setRecordToDelete(null)}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
                {isRTL ? 'حذف السجل' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice File Preview Modal */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-neutral-900 truncate max-w-xs">{previewInvoice.name}</h3>
              </div>
              <button
                onClick={() => setPreviewInvoice(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl text-center">
              {previewInvoice.url ? (
                previewInvoice.url.startsWith('data:image') ? (
                  <img
                    src={previewInvoice.url}
                    alt={previewInvoice.name}
                    className="max-h-72 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="space-y-2 py-4">
                    <FileText className="w-12 h-12 text-orange-600 mx-auto" />
                    <p className="text-xs text-neutral-700 font-mono">{previewInvoice.name}</p>
                    <a
                      href={previewInvoice.url}
                      download={previewInvoice.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isRTL ? 'تحميل الملف' : 'Download Document'}
                    </a>
                  </div>
                )
              ) : (
                <div className="py-6 text-xs text-neutral-500">
                  {isRTL ? 'ملف الفاتورة المسجل:' : 'Attached Invoice:'} {previewInvoice.name}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewInvoice(null)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
