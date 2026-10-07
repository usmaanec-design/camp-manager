import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  Plus,
  Search,
  Trash2,
  Edit2,
  FileText,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { GasUsageRecord, GasCylinderType, DateFilterPeriod } from '../../types/utilities';
import { gasUsageService } from '../../services/gasUsageService';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { UtilityTopNav } from '../../components/utilities/UtilityTopNav';
import { DateFilterBar } from '../../components/utilities/DateFilterBar';
import { GasRecordModal } from '../../components/utilities/GasRecordModal';
import { BarChart, BarDataPoint } from '../../components/charts/BarChart';
import { LineChart } from '../../components/charts/LineChart';
import { DonutChart, ChartSegment } from '../../components/charts/DonutChart';
import { isRecordInDatePeriod } from '../../utils/dateFilter';

type GasTab = 'Overview' | 'Small Cylinders' | 'Big Cylinders';

export const GasUsagePage: React.FC = () => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<GasTab>('Overview');
  const [dateFilter, setDateFilter] = useState<DateFilterPeriod>('Month');
  const [records, setRecords] = useState<GasUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<GasCylinderType>('Small Cylinders (12kg)');
  const [editingRecord, setEditingRecord] = useState<GasUsageRecord | null>(null);

  // Delete Confirmation State
  const [recordToDelete, setRecordToDelete] = useState<GasUsageRecord | null>(null);

  // Slip Preview State
  const [previewSlip, setPreviewSlip] = useState<{ name: string; url: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await gasUsageService.getRecords();
      setRecords(data);
    } catch {
      toastError(isRTL ? 'فشل تحميل بيانات استهلاك الغاز' : 'Failed to load gas usage records');
    } finally {
      setIsLoading(false);
    }
  }, [isRTL, toastError]);

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    window.addEventListener('camp_gas_usage_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('camp_gas_usage_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadData]);

  // Filter records by Date Period
  const dateFilteredRecords = useMemo(() => {
    return records.filter((r) => isRecordInDatePeriod(r.date, dateFilter));
  }, [records, dateFilter]);

  const displayedRecords = useMemo(() => {
    return dateFilteredRecords.filter((r) => {
      const matchesTab =
        activeTab === 'Overview' ||
        (activeTab === 'Small Cylinders' && r.cylinderType === 'Small Cylinders (12kg)') ||
        (activeTab === 'Big Cylinders' && r.cylinderType === 'Big Cylinders');

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        r.cylinderType.toLowerCase().includes(q) ||
        r.date.includes(q) ||
        (r.status && r.status.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q)) ||
        (r.slipName && r.slipName.toLowerCase().includes(q));

      return matchesTab && matchesSearch;
    });
  }, [dateFilteredRecords, activeTab, searchTerm]);

  // Statistics calculation for Small, Big, and Combined
  const stats = useMemo(() => {
    const small = dateFilteredRecords.filter((r) => r.cylinderType === 'Small Cylinders (12kg)');
    const big = dateFilteredRecords.filter((r) => r.cylinderType === 'Big Cylinders');

    const smallCount = small.reduce((sum, r) => sum + r.cylindersCount, 0);
    const smallCost = small.reduce((sum, r) => sum + r.totalCost, 0);
    const smallWeight = small.reduce((sum, r) => sum + r.totalWeight, 0);
    const smallInStock = small.filter((r) => r.status === 'In Stock').reduce((sum, r) => sum + r.cylindersCount, 0);
    const smallInUse = small.filter((r) => r.status === 'In Use').reduce((sum, r) => sum + r.cylindersCount, 0);
    const smallEmpty = small.filter((r) => r.status === 'Empty').reduce((sum, r) => sum + r.cylindersCount, 0);

    const bigCount = big.reduce((sum, r) => sum + r.cylindersCount, 0);
    const bigCost = big.reduce((sum, r) => sum + r.totalCost, 0);
    const bigWeight = big.reduce((sum, r) => sum + r.totalWeight, 0);
    const bigInStock = big.filter((r) => r.status === 'In Stock').reduce((sum, r) => sum + r.cylindersCount, 0);
    const bigInUse = big.filter((r) => r.status === 'In Use').reduce((sum, r) => sum + r.cylindersCount, 0);
    const bigEmpty = big.filter((r) => r.status === 'Empty').reduce((sum, r) => sum + r.cylindersCount, 0);

    const totalCount = smallCount + bigCount;
    const totalCost = smallCost + bigCost;
    const totalWeight = smallWeight + bigWeight;

    return {
      smallCount,
      smallCost,
      smallWeight,
      smallInStock,
      smallInUse,
      smallEmpty,
      bigCount,
      bigCost,
      bigWeight,
      bigInStock,
      bigInUse,
      bigEmpty,
      totalCount,
      totalCost,
      totalWeight,
    };
  }, [dateFilteredRecords]);

  // Chart Data: Group by Date
  const chartData = useMemo(() => {
    const map: Record<string, { date: string; smallCost: number; bigCost: number; smallQty: number; bigQty: number }> = {};

    dateFilteredRecords.forEach((r) => {
      const dKey = r.date;
      if (!map[dKey]) {
        map[dKey] = { date: dKey, smallCost: 0, bigCost: 0, smallQty: 0, bigQty: 0 };
      }
      if (r.cylinderType === 'Small Cylinders (12kg)') {
        map[dKey].smallCost += r.totalCost;
        map[dKey].smallQty += r.cylindersCount;
      } else {
        map[dKey].bigCost += r.totalCost;
        map[dKey].bigQty += r.cylindersCount;
      }
    });

    const sorted = Object.values(map).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const costBarData: BarDataPoint[] = sorted.map((s) => ({
      label: s.date.length >= 10 ? s.date.substring(5) : s.date,
      seriesA: s.smallCost,
      seriesB: s.bigCost,
    }));

    const countBarData: BarDataPoint[] = sorted.map((s) => ({
      label: s.date.length >= 10 ? s.date.substring(5) : s.date,
      seriesA: s.smallQty,
      seriesB: s.bigQty,
    }));

    return { costBarData, countBarData };
  }, [dateFilteredRecords]);

  // Donut Chart Segment Data
  const donutSegments: ChartSegment[] = useMemo(() => {
    return [
      { label: 'Small (12kg)', value: stats.smallCost, color: '#EA580C' },
      { label: 'Big Cylinders', value: stats.bigCost, color: '#262626' },
    ];
  }, [stats.smallCost, stats.bigCost]);

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await gasUsageService.deleteRecord(recordToDelete.id);
      success(isRTL ? 'تم حذف السجل بنجاح' : 'Record deleted successfully');
      setRecordToDelete(null);
      await loadData();
    } catch {
      toastError(isRTL ? 'فشل حذف السجل' : 'Failed to delete record');
    }
  };

  const handleOpenAdd = (type: GasCylinderType = 'Small Cylinders (12kg)') => {
    setEditingRecord(null);
    setModalDefaultType(type);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: GasUsageRecord) => {
    setEditingRecord(rec);
    setModalDefaultType(rec.cylinderType);
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

      {/* 2. Page Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                {isRTL ? 'إدارة استهلاك الغاز (Gas Usage)' : 'Gas Usage Management'}
              </h1>
              <p className="text-xs text-neutral-500">
                {isRTL
                  ? 'متابعة اسطوانات الغاز الصغيرة (12كجم) والكبيرة وتكاليف وأوزان التعبئة'
                  : 'Track small & big gas cylinder refills, total weights, costs, and inventory status'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenAdd('Big Cylinders')}
            >
              {isRTL ? '+ اسطوانة كبيرة' : '+ Add Big Cylinder'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenAdd('Small Cylinders (12kg)')}
            >
              {isRTL ? '+ اسطوانة صغيرة 12كجم' : '+ Add Gas Cylinder Record'}
            </Button>
          </div>
        </div>

        {/* 3 Tabs & Date Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-100">
          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/80">
            {(['Overview', 'Small Cylinders', 'Big Cylinders'] as GasTab[]).map((tab) => (
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
                {tab === 'Small Cylinders' && (isRTL ? 'اسطوانات صغيرة (12kg)' : 'Small Cylinders')}
                {tab === 'Big Cylinders' && (isRTL ? 'اسطوانات كبيرة (Big)' : 'Big Cylinders')}
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
          {/* STATS CARDS: Small, Big, and Combined Totals - CLICKABLE TILES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Small Cylinders Card */}
            <div
              onClick={() => setActiveTab('Small Cylinders')}
              className="bg-white border-2 border-orange-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-orange-600 transition-all group"
              title={isRTL ? 'انقر لعرض سجلات الاسطوانات الصغيرة' : 'Click to view Small Cylinders records'}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-orange-900 group-hover:text-orange-600 transition-colors">
                  {isRTL ? 'اسطوانات صغيرة (12 كجم)' : 'Small Cylinders (12kg)'}
                </span>
                <span className="text-[11px] font-mono font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {stats.smallCount} {isRTL ? 'اسطوانة' : 'Cylinders'}
                </span>
              </div>
              <div className="my-3">
                <span className="text-2xl sm:text-3xl font-black text-orange-700 font-mono tracking-tight">
                  {stats.smallCost.toLocaleString()}{' '}
                  <span className="text-xs font-bold text-neutral-500 uppercase">SAR</span>
                </span>
                <div className="text-[11px] text-neutral-700 mt-1 font-mono flex items-center gap-2 font-medium">
                  <span>
                    Total Weight: <strong className="text-neutral-900">{stats.smallWeight.toLocaleString()} kg</strong>
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-orange-200 text-[11px] text-neutral-700 flex items-center justify-between font-mono font-semibold">
                <span>In Stock: <strong className="text-neutral-900">{stats.smallInStock}</strong></span>
                <span>•</span>
                <span>In Use: <strong className="text-orange-700">{stats.smallInUse}</strong></span>
                <span>•</span>
                <span>Empty: <strong className="text-neutral-500">{stats.smallEmpty}</strong></span>
              </div>
            </div>

            {/* Big Cylinders Card */}
            <div
              onClick={() => setActiveTab('Big Cylinders')}
              className="bg-white border-2 border-neutral-300 hover:border-neutral-900 rounded-2xl p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
              title={isRTL ? 'انقر لعرض سجلات الاسطوانات الكبيرة' : 'Click to view Big Cylinders records'}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 group-hover:text-orange-600 transition-colors">
                  {isRTL ? 'اسطوانات كبيرة (مركزية)' : 'Big Cylinders'}
                </span>
                <span className="text-[11px] font-mono font-bold text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                  {stats.bigCount} {isRTL ? 'اسطوانة' : 'Cylinders'}
                </span>
              </div>
              <div className="my-3">
                <span className="text-2xl sm:text-3xl font-black text-neutral-900 font-mono tracking-tight">
                  {stats.bigCost.toLocaleString()}{' '}
                  <span className="text-xs font-bold text-neutral-500 uppercase">SAR</span>
                </span>
                <div className="text-[11px] text-neutral-700 mt-1 font-mono flex items-center gap-2 font-medium">
                  <span>
                    Total Weight: <strong className="text-neutral-900">{stats.bigWeight.toLocaleString()} kg</strong>
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-200 text-[11px] text-neutral-700 flex items-center justify-between font-mono font-semibold">
                <span>In Stock: <strong className="text-neutral-900">{stats.bigInStock}</strong></span>
                <span>•</span>
                <span>In Use: <strong className="text-orange-700">{stats.bigInUse}</strong></span>
                <span>•</span>
                <span>Empty: <strong className="text-neutral-500">{stats.bigEmpty}</strong></span>
              </div>
            </div>

            {/* Combined Gas Card - 100% Solid High Contrast, Clickable */}
            <div
              onClick={() => setActiveTab('Overview')}
              className="bg-white border-2 border-neutral-900 hover:border-orange-500 rounded-2xl p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-all group"
              title={isRTL ? 'عرض النظرة العامة' : 'Click to view Overview'}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-900 group-hover:text-orange-600 transition-colors">
                  {isRTL ? 'إجمالي الغاز المجمع' : 'Combined Gas Totals'}
                </span>
                <span className="text-[11px] font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                  {stats.totalCount} {isRTL ? 'اسطوانة' : 'Cylinders'}
                </span>
              </div>
              <div className="my-3">
                <span className="text-2xl sm:text-3xl font-black text-orange-600 font-mono tracking-tight">
                  {stats.totalCost.toLocaleString()}{' '}
                  <span className="text-xs font-bold text-neutral-500 uppercase">SAR</span>
                </span>
                <div className="text-[11px] text-neutral-700 mt-1 font-mono font-medium">
                  Combined Weight: <strong className="text-neutral-900">{stats.totalWeight.toLocaleString()} kg</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-200 text-[11px] text-neutral-700 flex items-center justify-between font-mono font-semibold">
                <span>
                  Small: <strong className="text-orange-600">{stats.smallCost.toLocaleString()} SAR</strong>
                </span>
                <span>•</span>
                <span>
                  Big: <strong className="text-neutral-900">{stats.bigCost.toLocaleString()} SAR</strong>
                </span>
              </div>
            </div>
          </div>

          {/* CHARTS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Chart 1: Gas Cost Over Time */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                    {isRTL ? 'مقارنة تكاليف الغاز حسب التاريخ (ر.س)' : 'Gas Refill Cost Over Time (SAR)'}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {isRTL ? 'تكلفة الاسطوانات الصغيرة مقابل الكبيرة' : 'Small Cylinders vs Big Cylinders expenditure comparison'}
                  </p>
                </div>
              </div>

              <BarChart
                data={chartData.costBarData}
                seriesAName={isRTL ? 'اسطوانات 12كجم' : 'Small Cylinders'}
                seriesBName={isRTL ? 'اسطوانات كبيرة' : 'Big Cylinders'}
                seriesAColor="#EA580C"
                seriesBColor="#262626"
                unit="SAR"
                height={210}
              />
            </div>

            {/* Chart 2: Cylinder Cost Breakdown Donut */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="border-b border-neutral-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                  {isRTL ? 'توزيع تكلفة الغاز' : 'Cylinder Cost Breakdown'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {isRTL ? 'نسبة الاسطوانات الصغيرة مقابل الكبيرة' : 'Small vs Big cylinder ratio'}
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
                Total Weight: {stats.totalWeight.toLocaleString()} kg
              </div>
            </div>

            {/* Chart 3: Cylinder Usage Over Time */}
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 lg:col-span-3">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900">
                    {isRTL ? 'معدل استخدام الاسطوانات حسب التاريخ' : 'Cylinders Usage Over Time (Units)'}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {isRTL ? 'عدد الاسطوانات الموردة والمستهلكة' : 'Quantity of cylinders procured over time'}
                  </p>
                </div>
              </div>

              <LineChart
                data={chartData.countBarData.map((d) => ({
                  label: d.label,
                  seriesA: d.seriesA,
                  seriesB: d.seriesB,
                }))}
                seriesAName={isRTL ? 'اسطوانات 12كجم' : 'Small Cylinders'}
                seriesBName={isRTL ? 'اسطوانات كبيرة' : 'Big Cylinders'}
                seriesAColor="#EA580C"
                seriesBColor="#525252"
                unit="Cylinders"
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
              {activeTab === 'Small Cylinders'
                ? isRTL ? 'سجلات الاسطوانات الصغيرة (12كجم)' : 'Small Cylinders (12kg) Records'
                : activeTab === 'Big Cylinders'
                ? isRTL ? 'سجلات الاسطوانات الكبيرة' : 'Big Cylinders Records'
                : isRTL ? 'كافة سجلات استهلاك الغاز' : 'All Gas Usage Records'}
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
                placeholder={isRTL ? 'بحث بالتاريخ أو الملاحظات أو الحالة...' : 'Search by date, status, notes...'}
                className="w-full h-9 ps-9 pe-3 bg-white border border-neutral-300 rounded-xl text-xs text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
              />
            </div>

            {/* Quick Add Button if in specific tab */}
            {activeTab === 'Small Cylinders' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => handleOpenAdd('Small Cylinders (12kg)')}
              >
                {isRTL ? '+ إضافة اسطوانة' : '+ Add Record'}
              </Button>
            )}
            {activeTab === 'Big Cylinders' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => handleOpenAdd('Big Cylinders')}
              >
                {isRTL ? '+ إضافة اسطوانة' : '+ Add Record'}
              </Button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {displayedRecords.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-3">
            <Flame className="w-9 h-9 mx-auto text-neutral-300 stroke-[1.5]" />
            <p className="text-xs font-medium">
              {isRTL ? 'لا توجد سجلات غاز مطابقة' : 'No gas usage records found.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => handleOpenAdd(activeTab === 'Big Cylinders' ? 'Big Cylinders' : 'Small Cylinders (12kg)')}
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
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'نوع الاسطوانة' : 'Cylinder Type'}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? 'العدد' : 'Cylinders'}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? 'الوزن/اسطوانة' : 'Kg/Cylinder'}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? 'إجمالي الوزن' : 'Total Weight'}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? 'السعر/اسطوانة' : 'Cost/Cylinder'}</th>
                  <th className="py-2.5 px-3 text-end">{isRTL ? 'التكلفة الإجمالية' : 'Total Cost'}</th>
                  <th className="py-2.5 px-3 text-center">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="py-2.5 px-3 text-start">{isRTL ? 'الملاحظات' : 'Notes'}</th>
                  <th className="py-2.5 px-3 text-center">{isRTL ? 'السند' : 'Purchase Slip'}</th>
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
                          record.cylinderType === 'Small Cylinders (12kg)'
                            ? 'bg-orange-50 text-orange-800 border-orange-200'
                            : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            record.cylinderType === 'Small Cylinders (12kg)' ? 'bg-orange-500' : 'bg-neutral-800'
                          }`}
                        />
                        {record.cylinderType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-bold text-neutral-900">
                      {record.cylindersCount}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono text-neutral-600">
                      {record.kgPerCylinder} kg
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-bold text-neutral-800">
                      {record.totalWeight.toLocaleString()} kg
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono text-neutral-700">
                      {record.costPerCylinder.toLocaleString()} SAR
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono font-black text-orange-700">
                      {record.totalCost.toLocaleString()} SAR
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          record.status === 'In Stock'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : record.status === 'In Use'
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                        }`}
                      >
                        {record.status || 'In Stock'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600 max-w-xs truncate" title={record.notes}>
                      {record.notes || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {record.slipName ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewSlip({
                              name: record.slipName || 'Slip',
                              url: record.slipUrl || '',
                            })
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200"
                        >
                          <FileText className="w-3 h-3" />
                          <span className="max-w-[70px] truncate">{record.slipName}</span>
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

      {/* Add / Edit Gas Modal */}
      <GasRecordModal
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
                  {isRTL ? 'تأكيد حذف سجل الغاز' : 'Confirm Delete Record'}
                </h3>
                <p className="text-xs text-neutral-500">
                  {isRTL
                    ? `هل أنت متأكد من حذف سجل ${recordToDelete.cylinderType} (${recordToDelete.cylindersCount} اسطوانة)؟`
                    : `Are you sure you want to delete this ${recordToDelete.cylinderType} record (${recordToDelete.cylindersCount} cylinders)?`}
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

      {/* Purchase Slip File Preview Modal */}
      {previewSlip && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-neutral-900 truncate max-w-xs">{previewSlip.name}</h3>
              </div>
              <button
                onClick={() => setPreviewSlip(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl text-center">
              {previewSlip.url ? (
                previewSlip.url.startsWith('data:image') ? (
                  <img
                    src={previewSlip.url}
                    alt={previewSlip.name}
                    className="max-h-72 mx-auto rounded-lg object-contain"
                  />
                ) : (
                  <div className="space-y-2 py-4">
                    <FileText className="w-12 h-12 text-orange-600 mx-auto" />
                    <p className="text-xs text-neutral-700 font-mono">{previewSlip.name}</p>
                    <a
                      href={previewSlip.url}
                      download={previewSlip.name}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {isRTL ? 'تحميل الملف' : 'Download Document'}
                    </a>
                  </div>
                )
              ) : (
                <div className="py-6 text-xs text-neutral-500">
                  {isRTL ? 'سند الشراء المسجل:' : 'Attached Purchase Slip:'} {previewSlip.name}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreviewSlip(null)}>
                {isRTL ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
