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
  MapPin,
  FileText,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { reportService } from '../../services/reportService';
import { projectService } from '../../services/projectService';
import { waterUsageService } from '../../services/waterUsageService';
import { gasUsageService } from '../../services/gasUsageService';
import { fuelUsageService } from '../../services/fuelUsageService';
import { buildingService } from '../../services/buildingService';
import { personnelService } from '../../services/personnelService';
import { pdfReportGenerator } from '../../services/pdfReportGenerator';
import { Report, Project, Building, BuildingPersonnel } from '../../types';
import { WaterUsageRecord, GasUsageRecord, FuelUsageRecord } from '../../types/utilities';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/modals/Modal';

type DateFilterOption = 'All' | 'Today' | 'Week' | 'Month' | 'Year';

export const AdminReportsPage: React.FC = () => {
  const { isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  // Primary Data
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterUsageRecord[]>([]);
  const [gasRecords, setGasRecords] = useState<GasUsageRecord[]>([]);
  const [fuelRecords, setFuelRecords] = useState<FuelUsageRecord[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [personnel, setPersonnel] = useState<BuildingPersonnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('All');
  const [masterDateFilter, setMasterDateFilter] = useState<DateFilterOption>('All');
  const [waterDateFilter, setWaterDateFilter] = useState<DateFilterOption>('All');
  const [gasDateFilter, setGasDateFilter] = useState<DateFilterOption>('All');
  const [fuelDateFilter, setFuelDateFilter] = useState<DateFilterOption>('All');
  const [utilityDateFilter, setUtilityDateFilter] = useState<DateFilterOption>('All');
  const [livingDateFilter, setLivingDateFilter] = useState<DateFilterOption>('All');
  const [manpowerDateFilter, setManpowerDateFilter] = useState<DateFilterOption>('All');

  // Table filters for field reports
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<Report['status']>('Completed');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rData, pData, wData, gData, fData, bData, psData] = await Promise.all([
        reportService.getReports(),
        projectService.getProjects(),
        waterUsageService.getRecords().catch(() => []),
        gasUsageService.getRecords().catch(() => []),
        fuelUsageService.getRecords().catch(() => []),
        buildingService.getBuildings().catch(() => []),
        personnelService.getAllPersonnel().catch(() => []),
      ]);
      setReports(rData);
      setProjects(pData);
      setWaterRecords(wData);
      setGasRecords(gData);
      setFuelRecords(fData);
      setBuildings(bData);
      setPersonnel(psData);
    } catch {
      toastError('Failed to load operational reports data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Utility to filter records by Date
  const filterByDate = <T extends { date?: string; createdAt?: string }>(items: T[], option: DateFilterOption): T[] => {
    if (option === 'All') return items;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return items.filter((item) => {
      const dStr = item.date || item.createdAt;
      if (!dStr) return true;
      const d = new Date(dStr);

      if (option === 'Today') return dStr.slice(0, 10) === todayStr;
      if (option === 'Week') {
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      if (option === 'Month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (option === 'Year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  // Filter collections by selected project
  const projectWater = useMemo(() => {
    if (selectedProjectId === 'All') return waterRecords;
    return waterRecords.filter((w) => (w as any).projectId === selectedProjectId || w.campId === selectedProjectId);
  }, [waterRecords, selectedProjectId]);

  const projectGas = useMemo(() => {
    if (selectedProjectId === 'All') return gasRecords;
    return gasRecords.filter((g) => (g as any).projectId === selectedProjectId || g.campId === selectedProjectId);
  }, [gasRecords, selectedProjectId]);

  const projectFuel = useMemo(() => {
    if (selectedProjectId === 'All') return fuelRecords;
    return fuelRecords.filter((f) => (f as any).projectId === selectedProjectId || f.campId === selectedProjectId);
  }, [fuelRecords, selectedProjectId]);

  const projectBuildings = useMemo(() => {
    if (selectedProjectId === 'All') return buildings;
    return buildings.filter((b) => b.projectId === selectedProjectId);
  }, [buildings, selectedProjectId]);

  const projectPersonnel = useMemo(() => {
    if (selectedProjectId === 'All') return personnel;
    return personnel.filter((p) => p.projectId === selectedProjectId);
  }, [personnel, selectedProjectId]);

  // Date-filtered collections
  const filteredWater = useMemo(() => filterByDate(projectWater, waterDateFilter), [projectWater, waterDateFilter]);
  const filteredGas = useMemo(() => filterByDate(projectGas, gasDateFilter), [projectGas, gasDateFilter]);
  const filteredFuel = useMemo(() => filterByDate(projectFuel, fuelDateFilter), [projectFuel, fuelDateFilter]);

  const livingBuildings = useMemo(
    () => projectBuildings.filter((b) => !b.buildingType || b.buildingType === 'Accommodation'),
    [projectBuildings]
  );
  const utilityBuildings = useMemo(
    () => projectBuildings.filter((b) => b.buildingType && b.buildingType !== 'Accommodation'),
    [projectBuildings]
  );

  const selectedProjectObj = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const reportMeta = {
    projectName: selectedProjectId === 'All' ? 'All Camps & Projects (Combined)' : (selectedProjectObj?.name || 'Selected Project'),
    campName: selectedProjectId === 'All' ? 'Enterprise Master Audit' : (selectedProjectObj?.name || 'Camp Operations'),
    generatedBy: 'Central System Administrator',
  };

  // PDF Handlers
  const handleDownloadCombined = () => {
    pdfReportGenerator.downloadCombinedReport(
      {
        water: filteredWater,
        gas: filteredGas,
        fuel: filteredFuel,
        livingBuildings,
        utilityBuildings,
        personnel: projectPersonnel,
      },
      { ...reportMeta, dateFilter: masterDateFilter },
      isRTL
    );
    success(isRTL ? 'تم إنشاء التقرير الشامل الموحد بنجاح' : 'Master Combined Report PDF generated');
  };

  const handleDownloadWater = () => {
    pdfReportGenerator.downloadWaterReport(filteredWater, { ...reportMeta, dateFilter: waterDateFilter }, isRTL);
    success(isRTL ? 'تم إنشاء تقرير المياه بنجاح' : 'Water report PDF generated');
  };

  const handleDownloadGas = () => {
    pdfReportGenerator.downloadGasReport(filteredGas, { ...reportMeta, dateFilter: gasDateFilter }, isRTL);
    success(isRTL ? 'تم إنشاء تقرير الغاز بنجاح' : 'Gas report PDF generated');
  };

  const handleDownloadFuel = () => {
    pdfReportGenerator.downloadFuelReport(filteredFuel, { ...reportMeta, dateFilter: fuelDateFilter }, isRTL);
    success(isRTL ? 'تم إنشاء تقرير الوقود بنجاح' : 'Fuel report PDF generated');
  };

  const handleDownloadUtilityBuildings = () => {
    pdfReportGenerator.downloadUtilityBuildingsReport(utilityBuildings, reportMeta, isRTL);
    success(isRTL ? 'تم إنشاء تقرير المباني الخدمية بنجاح' : 'Utility buildings PDF generated');
  };

  const handleDownloadLivingBuildings = () => {
    pdfReportGenerator.downloadLivingBuildingsReport(livingBuildings, reportMeta, isRTL);
    success(isRTL ? 'تم إنشاء تقرير المباني السكنية بنجاح' : 'Living buildings PDF generated');
  };

  const handleDownloadManpower = () => {
    pdfReportGenerator.downloadManpowerReport(projectPersonnel, reportMeta, isRTL);
    success(isRTL ? 'تم إنشاء تقرير القوى العاملة بنجاح' : 'Manpower report PDF generated');
  };

  const dateFilterLabels: Record<DateFilterOption, { ar: string; en: string }> = {
    All: { ar: 'كافة الفترات', en: 'All Periods' },
    Today: { ar: 'اليوم', en: 'Today' },
    Week: { ar: 'آخر 7 أيام', en: 'Last 7 Days' },
    Month: { ar: 'هذا الشهر', en: 'This Month' },
    Year: { ar: 'هذا العام', en: 'This Year' },
  };

  // Table filtering
  const filteredFieldReports = useMemo(() => {
    return reports.filter((r) => {
      const matchProj = selectedProjectId === 'All' || r.projectId === selectedProjectId;
      const matchType = selectedType === 'All' || r.reportType === selectedType;
      const matchStatus = selectedStatus === 'All' || r.status === selectedStatus;
      return matchProj && matchType && matchStatus;
    });
  }, [reports, selectedProjectId, selectedType, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Top Banner with Global Project Filter & Language indicator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse"></span>
            <span className="text-xs uppercase font-extrabold tracking-wider text-orange-600">
              {isRTL ? 'مركز تقارير المخيمات الرسمي بصيغة PDF' : 'Official PDF Operations Reports Center'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            {isRTL ? 'تقارير الإدارة المركزية والتدقيق الشامل' : 'Operations Audit & PDF Reports'}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5 font-medium">
            {isRTL
              ? 'تنزيل تقارير PDF رسمية موثقة لكافة المشاريع أو لمشروع محدد مع الجداول والرسوم البيانية باللغة المختارة'
              : 'Download compliant PDF audit reports across all camp modules or select a specific project in Arabic or English'}
          </p>
        </div>

        {/* Project Selector & Language Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700">
            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="text-neutral-500">{isRTL ? 'المشروع:' : 'Project:'}</span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent font-bold text-neutral-900 focus:outline-hidden cursor-pointer"
            >
              <option value="All">{isRTL ? '🌐 كافة المشاريع (تقرير موحد)' : '🌐 All Projects (Combined)'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 font-semibold">
            <Printer className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span>{isRTL ? '🇸🇦 PDF بالعربية' : '🇬🇧 PDF in English'}</span>
          </div>
        </div>
      </div>

      {/* 1. MASTER COMBINED OPERATIONS REPORT HERO TILE */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-orange-500 bg-neutral-900 text-white p-6 shadow-md transition-all">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600 text-white text-[11px] font-bold tracking-wide uppercase shadow-2xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRTL ? 'التقرير الشامل الموحد لجميع الأقسام' : 'Combined Master Operations Report'}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {isRTL
                ? `تقرير شامل متكامل: ${selectedProjectId === 'All' ? 'كافة المخيمات والمشاريع' : selectedProjectObj?.name || ''}`
                : `All-in-One Operations Audit: ${selectedProjectId === 'All' ? 'All Camps & Projects' : selectedProjectObj?.name || ''}`}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium">
              {isRTL
                ? 'يحتوي على كافة الرسوم البيانية، جداول التكاليف، أرقام الإشغال، وقوائم التسكين بصيغة جاهزة للطباعة والتدقيق الرسمي.'
                : 'Includes all executive graphs, cost distributions, occupancy rates, and structured tables ready for official compliance.'}
            </p>
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-neutral-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {projectBuildings.length} {isRTL ? 'مبنى ومرفق' : 'Buildings & Units'}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {projectPersonnel.length} {isRTL ? 'موظف مسجل' : 'Personnel logged'}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isRTL ? 'المياه والغاز والوقود' : 'Water, Gas & Fuel audit'}
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
              className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'إجمالي التكلفة:' : 'Total Cost:'}</span>
                  <span className="font-bold text-orange-600 font-mono">
                    {filteredWater.reduce((acc, r) => acc + (Number(r.totalCost) || 0), 0).toLocaleString()} SAR
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'الحجم المسجل:' : 'Volume:'}</span>
                  <span className="font-mono">
                    {filteredWater.reduce((acc, r) => acc + (Number(r.trips) || 0) * 32, 0)} m³
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
                className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
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
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
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
                className="w-full py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
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

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'الأصول المحصورة:' : 'Total Assets:'}</span>
                  <span className="font-bold text-orange-600 font-mono">
                    {utilityBuildings.reduce((acc, b) => acc + (Number((b as any).totalItems) || (Number(b.totalRooms) || 1) * 6), 0)} pcs
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'حالة الجاهزية:' : 'Status:'}</span>
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
                className="w-full py-2 px-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تحميل تقرير المرافق (PDF)' : 'Download Utility Units PDF'}</span>
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
                  <option value="All">{isRTL ? 'كافة البلوكات' : 'All Living Blocks'}</option>
                  <option value="Today">{isRTL ? 'حالة اليوم' : 'Today Status'}</option>
                </select>
              </div>

              <button
                onClick={handleDownloadLivingBuildings}
                className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
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
                  {projectPersonnel.length} {isRTL ? 'موظف' : 'Staff'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs mb-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">{isRTL ? 'المتواجدون بالموقع:' : 'Active On-Site:'}</span>
                  <span className="font-bold text-emerald-700 font-mono">
                    {projectPersonnel.filter((p) => !(((p as any).status || '').toLowerCase().includes('leave'))).length} Active
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>{isRTL ? 'في إجازة:' : 'On Leave:'}</span>
                  <span className="font-mono text-orange-600 font-bold">
                    {projectPersonnel.filter((p) => ((p as any).status || '').toLowerCase().includes('leave')).length} Leave
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
                className="w-full py-2 px-3 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? 'تحميل تقرير القوى العاملة (PDF)' : 'Download Manpower PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FIELD OPERATIONAL INCIDENTS & INSPECTIONS TABLE */}
      <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
          <div>
            <h3 className="font-bold text-base text-neutral-900">
              {isRTL ? 'أرشيف البلاغات والملاحظات الميدانية' : 'Field Incidents & Inspection Submissions'}
            </h3>
            <p className="text-xs text-neutral-500">
              {isRTL ? 'سجلات السلامة والصيانة والتفتيش الميداني' : 'Operational logs, safety incident notifications, and maintenance logs'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 font-semibold"
            >
              <option value="All">{isRTL ? 'كافة أنواع البلاغات' : 'All Report Types'}</option>
              <option value="Daily Camp Operations">Daily Camp Operations</option>
              <option value="Maintenance Request">Maintenance Request</option>
              <option value="HSE Incident / Inspection">HSE Incident / Inspection</option>
              <option value="Inventory Audit">Inventory Audit</option>
              <option value="Catering & Dining">Catering & Dining</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-neutral-200 bg-neutral-50 text-xs text-neutral-700 font-semibold"
            >
              <option value="All">{isRTL ? 'كافة الحالات' : 'All Statuses'}</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-neutral-400">
            <p className="text-xs font-medium animate-pulse">{isRTL ? 'جاري تحميل التقارير...' : 'Loading operational reports...'}</p>
          </div>
        ) : filteredFieldReports.length === 0 ? (
          <div className="py-12 text-center text-neutral-400">
            <FileText className="w-8 h-8 mx-auto text-neutral-300 mb-1" />
            <p className="text-xs font-medium">{isRTL ? 'لا توجد بلاغات مسجلة' : 'No operational field reports found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50/80 border-b border-neutral-200 text-neutral-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Report #</th>
                  <th className="py-2.5 px-3 font-semibold">Project</th>
                  <th className="py-2.5 px-3 font-semibold">Type</th>
                  <th className="py-2.5 px-3 font-semibold">Title</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredFieldReports.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">{r.reportNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-neutral-700">{r.projectName}</td>
                    <td className="py-2.5 px-3 text-neutral-600">{r.reportType}</td>
                    <td className="py-2.5 px-3 font-semibold text-neutral-800">{r.title}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-400">{r.createdAt ? r.createdAt.slice(0, 10) : '-'}</td>
                    <td className="py-2.5 px-3 text-center">
                      <Badge status={r.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setActiveReport(r);
                          setReviewStatus(r.status);
                          setIsReviewOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[11px] font-bold transition"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Report Modal */}
      {isReviewOpen && activeReport && (
        <Modal
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          title={`Review Report: ${activeReport.reportNumber}`}
          subtitle={`Project: ${activeReport.projectName}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
              <span className="font-bold text-neutral-900 block text-sm">{activeReport.title}</span>
              <p className="text-neutral-600">{activeReport.description}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Approval Status
              </label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value as Report['status'])}
                className="w-full h-8 px-2.5 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="Completed">Completed (Approved)</option>
                <option value="Under Review">Under Review</option>
                <option value="Pending">Pending</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <Button variant="outline" size="sm" onClick={() => setIsReviewOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  await reportService.updateReport(activeReport.id, { status: reviewStatus });
                  success('Report updated');
                  setIsReviewOpen(false);
                  loadData();
                }}
              >
                Save Review
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
