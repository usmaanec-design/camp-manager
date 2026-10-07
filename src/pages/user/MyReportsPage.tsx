import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Calendar,
  Droplets,
  Flame,
  Fuel,
  Warehouse,
  Building2,
  Users,
  Layers,
  Sparkles,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { waterUsageService } from '../../services/waterUsageService';
import { gasUsageService } from '../../services/gasUsageService';
import { fuelUsageService } from '../../services/fuelUsageService';
import { buildingService } from '../../services/buildingService';
import { personnelService } from '../../services/personnelService';
import { reportService } from '../../services/reportService';
import { pdfReportGenerator } from '../../services/pdfReportGenerator';
import { Badge } from '../../components/ui/Badge';
import { WaterUsageRecord, GasUsageRecord, FuelUsageRecord } from '../../types/utilities';
import { Building, BuildingPersonnel, Report } from '../../types';

type DateFilterOption = 'All' | 'Today' | 'Week' | 'Month' | 'Year';

export const MyReportsPage: React.FC = () => {
  const { isRTL } = useLanguage();
  const { user } = useAuth();
  const { success } = useToast();

  // Data states
  const [isLoading, setIsLoading] = useState(false);
  const [waterRecords, setWaterRecords] = useState<WaterUsageRecord[]>([]);
  const [gasRecords, setGasRecords] = useState<GasUsageRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelUsageRecord[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [personnel, setPersonnel] = useState<BuildingPersonnel[]>([]);
  const [fieldReports, setFieldReports] = useState<Report[]>([]);

  // Individual Tile Date Filters
  const [waterDateFilter, setWaterDateFilter] = useState<DateFilterOption>('All');
  const [gasDateFilter, setGasDateFilter] = useState<DateFilterOption>('All');
  const [fuelDateFilter, setFuelDateFilter] = useState<DateFilterOption>('All');
  const [utilityDateFilter, setUtilityDateFilter] = useState<DateFilterOption>('All');
  const [livingDateFilter, setLivingDateFilter] = useState<DateFilterOption>('All');
  const [manpowerDateFilter, setManpowerDateFilter] = useState<DateFilterOption>('All');
  const [masterDateFilter, setMasterDateFilter] = useState<DateFilterOption>('All');

  // Load all module data
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        const prjId = user?.projectId || 'prj-sharq';
        const [w, g, f, b, p, r] = await Promise.all([
          waterUsageService.getRecords().catch(() => []),
          gasUsageService.getRecords().catch(() => []),
          fuelUsageService.getRecords().catch(() => []),
          buildingService.getBuildings(undefined, prjId).catch(() => []),
          personnelService.getAllPersonnel(prjId).catch(() => []),
          reportService.getReports({ userId: user?.id }).catch(() => []),
        ]);
        setWaterRecords(w);
        setGasRecords(g);
        setFuelRecords(f);
        setBuildings(b);
        setPersonnel(p);
        setFieldReports(r);
      } finally {
        setIsLoading(false);
      }
    };

    loadAll();
  }, [user]);

  // Utility to filter records by DateFilterOption
  const filterByDate = <T extends { date?: string; createdAt?: string }>(items: T[], option: DateFilterOption): T[] => {
    if (option === 'All') return items;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return items.filter((item) => {
      const dStr = item.date || item.createdAt;
      if (!dStr) return true;
      const d = new Date(dStr);

      if (option === 'Today') {
        return dStr.slice(0, 10) === todayStr;
      }
      if (option === 'Week') {
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (option === 'Month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (option === 'Year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  // Filtered collections
  const filteredWater = useMemo(() => filterByDate(waterRecords, waterDateFilter), [waterRecords, waterDateFilter]);
  const filteredGas = useMemo(() => filterByDate(gasRecords, gasDateFilter), [gasRecords, gasDateFilter]);
  const filteredFuel = useMemo(() => filterByDate(fuelRecords, fuelDateFilter), [fuelRecords, fuelDateFilter]);

  const livingBuildings = useMemo(
    () => buildings.filter((b) => !b.buildingType || b.buildingType === 'Accommodation'),
    [buildings]
  );
  const utilityBuildings = useMemo(
    () => buildings.filter((b) => b.buildingType && b.buildingType !== 'Accommodation'),
    [buildings]
  );

  const meta = {
    projectName: user?.projectName || 'Sharq Camp',
    campName: 'Camp Facility Operations',
    generatedBy: user?.name || 'Site Administrator',
  };

  // Handlers for downloading PDFs
  const handleDownloadWater = () => {
    pdfReportGenerator.downloadWaterReport(filteredWater, { ...meta, dateFilter: waterDateFilter }, isRTL);
    success(isRTL ? 'تم إنشاء تقرير المياه بنجاح' : 'Water report generated successfully');
  };

  const handleDownloadGas = () => {
    pdfReportGenerator.downloadGasReport(filteredGas, { ...meta, dateFilter: gasDateFilter }, isRTL);
    success(isRTL ? 'تم إنشاء تقرير الغاز بنجاح' : 'Gas report generated successfully');
  };

  const handleDownloadFuel = () => {
    pdfReportGenerator.downloadFuelReport(filteredFuel, { ...meta, dateFilter: fuelDateFilter }, isRTL);
    success(isRTL ? 'تم إنشاء تقرير الوقود بنجاح' : 'Fuel report generated successfully');
  };

  const handleDownloadUtilityBuildings = () => {
    pdfReportGenerator.downloadUtilityBuildingsReport(utilityBuildings, meta, isRTL);
    success(isRTL ? 'تم إنشاء تقرير المباني الخدمية بنجاح' : 'Utility buildings report generated');
  };

  const handleDownloadLivingBuildings = () => {
    pdfReportGenerator.downloadLivingBuildingsReport(livingBuildings, meta, isRTL);
    success(isRTL ? 'تم إنشاء تقرير المباني السكنية بنجاح' : 'Living buildings report generated');
  };

  const handleDownloadManpower = () => {
    pdfReportGenerator.downloadManpowerReport(personnel, meta, isRTL);
    success(isRTL ? 'تم إنشاء تقرير القوى العاملة بنجاح' : 'Manpower report generated');
  };

  const handleDownloadCombined = () => {
    pdfReportGenerator.downloadCombinedReport(
      {
        water: filteredWater,
        gas: filteredGas,
        fuel: filteredFuel,
        livingBuildings,
        utilityBuildings,
        personnel,
      },
      { ...meta, dateFilter: masterDateFilter },
      isRTL
    );
    success(isRTL ? 'تم إنشاء التقرير الشامل الموحد بنجاح' : 'Combined Master Report generated successfully');
  };

  const dateFilterLabels: Record<DateFilterOption, { ar: string; en: string }> = {
    All: { ar: 'كافة الفترات', en: 'All Periods' },
    Today: { ar: 'اليوم', en: 'Today' },
    Week: { ar: 'آخر 7 أيام', en: 'Last 7 Days' },
    Month: { ar: 'هذا الشهر', en: 'This Month' },
    Year: { ar: 'هذا العام', en: 'This Year' },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-neutral-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
            <span className="text-xs uppercase font-extrabold tracking-wider text-orange-600">
              {isRTL ? 'مركز تقارير المخيم والتحميل بصيغة PDF' : 'Official PDF Operations Reports Center'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
            {isRTL ? 'التقارير وسجلات التشغيل الرسمية' : 'Camp Reports & Operational Records'}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-2xl font-medium">
            {isRTL
              ? 'تنزيل تقارير PDF منفصلة لكل وحدة تشغيلية أو تقرير شامل موحد مع الرسوم البيانية والجداول باللغة المحددة للتطبيق حالياً.'
              : 'Download dedicated PDF audit reports for any operational module or an integrated Master Camp Report with full charts & tables.'}
          </p>
        </div>

        {/* Current Language Notice Badge */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-50/80 border border-orange-200 text-xs text-orange-950 font-semibold self-start md:self-auto">
          <Printer className="w-4 h-4 text-orange-600 shrink-0" />
          <div>
            <span className="block text-[10px] text-orange-700 uppercase font-bold">
              {isRTL ? 'لغة إصدار التقرير' : 'PDF Output Language'}
            </span>
            <span className="font-bold text-orange-900">
              {isRTL ? '🇸🇦 العربية (Arabic RTL Format)' : '🇬🇧 English (LTR Format)'}
            </span>
          </div>
        </div>
      </div>

      {/* 1. MASTER COMBINED REPORT HERO TILE */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-orange-500 bg-neutral-900 text-white p-6 shadow-md transition-all">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600 text-white text-[11px] font-bold tracking-wide uppercase shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRTL ? 'التقرير الشامل الموحد لجميع الأقسام' : 'Combined Master Operations Report'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {isRTL
                ? 'تقرير شامل متكامل: السكن، العمالة، المياه، الغاز، الوقود، والمرافق'
                : 'All-in-One Executive Audit: Living Blocks, Workforce, Water, Gas, Fuel & Utilities'}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium">
              {isRTL
                ? 'يحتوي على كافة الرسوم البيانية، جداول التكاليف، أرقام الإشغال، وقوائم التسكين بصيغة جاهزة للطباعة والتدقيق الرسمي.'
                : 'Includes all executive graphs, cost distributions, occupancy rates, and structured tables ready for official compliance.'}
            </p>
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-neutral-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isRTL ? `${buildings.length} مبنى ومرفق` : `${buildings.length} Facilities`}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isRTL ? `${personnel.length} موظف مسجل` : `${personnel.length} Personnel`}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isRTL ? 'إجمالي تكلفة استهلاك الخدمات' : 'Full Utilities Breakdown'}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <select
              value={masterDateFilter}
              onChange={(e) => setMasterDateFilter(e.target.value as DateFilterOption)}
              className="px-3.5 py-2.5 rounded-xl bg-neutral-800 border border-neutral-700 text-white text-xs font-semibold focus:outline-hidden focus:border-orange-500"
            >
              {(Object.keys(dateFilterLabels) as DateFilterOption[]).map((key) => (
                <option key={key} value={key}>
                  {dateFilterLabels[key][isRTL ? 'ar' : 'en']}
                </option>
              ))}
            </select>

            <button
              onClick={handleDownloadCombined}
              className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>{isRTL ? 'تحميل التقرير الشامل (PDF)' : 'Download Master PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED MODULES REPORT TILES GRID */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Layers className="w-4 h-4 text-neutral-500" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800">
            {isRTL ? 'تقارير الأقسام والخدمات المنفصلة' : 'Individual Module PDF Reports'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* TILE 1: Water Usage Report */}
          <div className="rounded-2xl p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'تقرير استهلاك المياه' : 'Water Usage Report'}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {isRTL ? 'صهاريج المياه العذبة ونزح الصرف' : 'Fresh & Waste Tankers'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold border border-neutral-200">
                  {filteredWater.length} {isRTL ? 'رحلة' : 'Trips'}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'إجمالي التكلفة:' : 'Total Cost:'}</span>
                  <span className="font-bold text-orange-600 font-mono">
                    {filteredWater.reduce((acc, r) => acc + (Number(r.totalCost) || 0), 0).toLocaleString()} SAR
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'الحجم التقديري:' : 'Est. Volume:'}</span>
                  <span className="font-mono">
                    {filteredWater.reduce((acc, r) => acc + ((Number(r.trips) || 0) * 32), 0)} m³
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  {isRTL ? 'الفترة:' : 'Filter:'}
                </span>
                <select
                  value={waterDateFilter}
                  onChange={(e) => setWaterDateFilter(e.target.value as DateFilterOption)}
                  className="px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] font-semibold"
                >
                  {(Object.keys(dateFilterLabels) as DateFilterOption[]).map((key) => (
                    <option key={key} value={key}>
                      {dateFilterLabels[key][isRTL ? 'ar' : 'en']}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDownloadWater}
                className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تحميل تقرير المياه (PDF)' : 'Download Water PDF'}</span>
              </button>
            </div>
          </div>

          {/* TILE 2: Gas Usage Report */}
          <div className="rounded-2xl p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'تقرير استهلاك الغاز' : 'Gas Usage Report'}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {isRTL ? 'أسطوانات صغيرة (12كجم) وكبيرة' : 'Small & Big Cylinders'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold border border-neutral-200">
                  {filteredGas.length} {isRTL ? 'حركة' : 'Logs'}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'إجمالي التكلفة:' : 'Total Cost:'}</span>
                  <span className="font-bold text-amber-600 font-mono">
                    {filteredGas.reduce((acc, r) => acc + (Number(r.totalCost) || 0), 0).toLocaleString()} SAR
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'الكمية الإجمالية:' : 'Total Cylinders:'}</span>
                  <span className="font-mono">
                    {filteredGas.reduce((acc, r) => acc + (Number(r.cylindersCount) || 0), 0)} pcs
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  {isRTL ? 'الفترة:' : 'Filter:'}
                </span>
                <select
                  value={gasDateFilter}
                  onChange={(e) => setGasDateFilter(e.target.value as DateFilterOption)}
                  className="px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] font-semibold"
                >
                  {(Object.keys(dateFilterLabels) as DateFilterOption[]).map((key) => (
                    <option key={key} value={key}>
                      {dateFilterLabels[key][isRTL ? 'ar' : 'en']}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDownloadGas}
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تحميل تقرير الغاز (PDF)' : 'Download Gas PDF'}</span>
              </button>
            </div>
          </div>

          {/* TILE 3: Fuel Usage Report */}
          <div className="rounded-2xl p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-800 flex items-center justify-center shrink-0">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'تقرير استهلاك الوقود' : 'Fuel Usage Report'}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {isRTL ? 'ديزل وبنزين المولدات والمعدات' : 'Diesel & Petrol Power'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold border border-neutral-200">
                  {filteredFuel.length} {isRTL ? 'تعبئة' : 'Fills'}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'إجمالي التكلفة:' : 'Total Cost:'}</span>
                  <span className="font-bold text-neutral-900 font-mono">
                    {filteredFuel.reduce((acc, r) => acc + (Number(r.cost) || 0), 0).toLocaleString()} SAR
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'إجمالي اللترات:' : 'Total Liters:'}</span>
                  <span className="font-mono">
                    {filteredFuel.reduce((acc, r) => acc + (Number(r.litersUsed) || 0), 0).toLocaleString()} L
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  {isRTL ? 'الفترة:' : 'Filter:'}
                </span>
                <select
                  value={fuelDateFilter}
                  onChange={(e) => setFuelDateFilter(e.target.value as DateFilterOption)}
                  className="px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] font-semibold"
                >
                  {(Object.keys(dateFilterLabels) as DateFilterOption[]).map((key) => (
                    <option key={key} value={key}>
                      {dateFilterLabels[key][isRTL ? 'ar' : 'en']}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleDownloadFuel}
                className="w-full py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تحميل تقرير الوقود (PDF)' : 'Download Fuel PDF'}</span>
              </button>
            </div>
          </div>

          {/* TILE 4: Utility Buildings Report */}
          <div className="rounded-2xl p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'المباني والمرافق الخدمية' : 'Utility Buildings Report'}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {isRTL ? 'المطابخ والمغاسل والعيادات' : 'Central Kitchens & Facilities'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold border border-neutral-200">
                  {utilityBuildings.length} {isRTL ? 'مرفق' : 'Units'}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'الأصول المحصورة:' : 'Total Assets:'}</span>
                  <span className="font-bold text-orange-600 font-mono">
                    {utilityBuildings.reduce((acc, b) => acc + (Number((b as any).totalItems) || (Number(b.totalRooms) || 1) * 6), 0)} pcs
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'حالة الجاهزية:' : 'Operational Ratio:'}</span>
                  <span className="font-mono text-emerald-600 font-bold">100% Active</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  {isRTL ? 'الفترة:' : 'Filter:'}
                </span>
                <select
                  value={utilityDateFilter}
                  onChange={(e) => setUtilityDateFilter(e.target.value as DateFilterOption)}
                  className="px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] font-semibold"
                >
                  <option value="All">{isRTL ? 'كافة المرافق' : 'All Facilities'}</option>
                  <option value="Today">{isRTL ? 'حالة اليوم' : 'Today Status'}</option>
                </select>
              </div>

              <button
                onClick={handleDownloadUtilityBuildings}
                className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تحميل تقرير المباني الخدمية (PDF)' : 'Download Utility Units PDF'}</span>
              </button>
            </div>
          </div>

          {/* TILE 5: Living Buildings Report */}
          <div className="rounded-2xl p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'المباني السكنية والإشغال' : 'Living Buildings Report'}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {isRTL ? 'سعة البلوكات والغرف وتوزيع الأسرة' : 'Accommodation Blocks & Capacity'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold border border-neutral-200">
                  {livingBuildings.length} {isRTL ? 'بلوك' : 'Blocks'}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'إجمالي الغرف:' : 'Total Rooms:'}</span>
                  <span className="font-bold text-neutral-900 font-mono">
                    {livingBuildings.reduce((acc, b) => acc + (Number(b.totalRooms) || 0), 0)} Rooms
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'إشغال الأسرة:' : 'Bed Occupancy:'}</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {livingBuildings.reduce((acc, b) => acc + (Number(b.currentOccupancy) || 0), 0)} /{' '}
                    {livingBuildings.reduce((acc, b) => acc + (Number(b.capacity) || 0), 0)} Beds
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  {isRTL ? 'الفترة:' : 'Filter:'}
                </span>
                <select
                  value={livingDateFilter}
                  onChange={(e) => setLivingDateFilter(e.target.value as DateFilterOption)}
                  className="px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] font-semibold"
                >
                  <option value="All">{isRTL ? 'كافة البلوكات السكنية' : 'All Living Blocks'}</option>
                  <option value="Today">{isRTL ? 'حالة اليوم' : 'Today Status'}</option>
                </select>
              </div>

              <button
                onClick={handleDownloadLivingBuildings}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تحميل تقرير السكن (PDF)' : 'Download Living PDF'}</span>
              </button>
            </div>
          </div>

          {/* TILE 6: Manpower Report */}
          <div className="rounded-2xl p-5 border border-neutral-200 bg-white shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#F6EADB] border border-[#EFE8DC] text-[#B45309] flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-tight">
                      {isRTL ? 'تقرير القوى العاملة' : 'Manpower & Workforce Report'}
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      {isRTL ? 'سجل الموظفين والمسميات والتسكين' : 'Personnel Roles & Allocations'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-bold border border-neutral-200">
                  {personnel.length} {isRTL ? 'موظف' : 'Staff'}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'المتواجدون بالموقع:' : 'Active On-Site:'}</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {personnel.filter((p) => !(((p as any).status || '').toLowerCase().includes('leave'))).length} Active
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'في إجازة:' : 'On Vacation/Leave:'}</span>
                  <span className="font-mono text-orange-600 font-bold">
                    {personnel.filter((p) => ((p as any).status || '').toLowerCase().includes('leave')).length} Leave
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  {isRTL ? 'الفترة:' : 'Filter:'}
                </span>
                <select
                  value={manpowerDateFilter}
                  onChange={(e) => setManpowerDateFilter(e.target.value as DateFilterOption)}
                  className="px-2 py-1 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-800 text-[11px] font-semibold"
                >
                  <option value="All">{isRTL ? 'كافة القوى العاملة' : 'All Personnel'}</option>
                  <option value="Today">{isRTL ? 'الحالة اليومية' : 'Today Status'}</option>
                </select>
              </div>

              <button
                onClick={handleDownloadManpower}
                className="w-full py-2 px-3 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تحميل تقرير القوى العاملة (PDF)' : 'Download Manpower PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Field / Incident Reports History Table */}
      {fieldReports.length > 0 && (
        <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-neutral-900">
              {isRTL ? 'أرشيف البلاغات والتقارير الميدانية' : 'Field Incidents & Operational Submissions'}
            </h3>
            <span className="text-xs text-neutral-400">{fieldReports.length} {isRTL ? 'تقرير' : 'reports'}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-neutral-800">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] uppercase tracking-wider text-neutral-500 text-start">
                  <th className="py-2.5 px-3">{isRTL ? 'رقم التقرير' : 'Report #'}</th>
                  <th className="py-2.5 px-3">{isRTL ? 'العنوان' : 'Title'}</th>
                  <th className="py-2.5 px-3">{isRTL ? 'النوع' : 'Type'}</th>
                  <th className="py-2.5 px-3">{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className="py-2.5 px-3">{isRTL ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {fieldReports.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50/80 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">{r.reportNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-neutral-800">{r.title}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{r.reportType}</td>
                    <td className="py-2.5 px-3 text-neutral-500 font-mono">{r.createdAt ? r.createdAt.slice(0, 10) : '-'}</td>
                    <td className="py-2.5 px-3">
                      <Badge status={r.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
