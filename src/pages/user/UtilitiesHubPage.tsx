import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets,
  Flame,
  Fuel,
  ArrowRight,
  Plus,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Button } from '../../components/ui/Button';
import { waterUsageService } from '../../services/waterUsageService';
import { gasUsageService } from '../../services/gasUsageService';
import { fuelUsageService } from '../../services/fuelUsageService';
import { WaterRecordModal } from '../../components/utilities/WaterRecordModal';
import { GasRecordModal } from '../../components/utilities/GasRecordModal';
import { FuelRecordModal } from '../../components/utilities/FuelRecordModal';

export const UtilitiesHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  const [waterStats, setWaterStats] = useState({ totalTrips: 0, totalCost: 0, freshCost: 0, wasteCost: 0 });
  const [gasStats, setGasStats] = useState({ totalCylinders: 0, totalCost: 0, inStock: 0, inUse: 0 });
  const [fuelStats, setFuelStats] = useState({ totalLiters: 0, totalCost: 0, dieselLiters: 0, petrolLiters: 0 });

  // Quick modals
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);

  const loadAllStats = async () => {
    try {
      const [water, gas, fuel] = await Promise.all([
        waterUsageService.getRecords(),
        gasUsageService.getRecords(),
        fuelUsageService.getRecords(),
      ]);

      // Water stats
      const totalWaterTrips = water.reduce((s, r) => s + (r.trips || 0), 0);
      const totalWaterCost = water.reduce((s, r) => s + (r.totalCost || 0), 0);
      const freshCost = water.filter((r) => r.type === 'Fresh Water').reduce((s, r) => s + (r.totalCost || 0), 0);
      const wasteCost = water.filter((r) => r.type === 'Waste Water').reduce((s, r) => s + (r.totalCost || 0), 0);
      setWaterStats({ totalTrips: totalWaterTrips, totalCost: totalWaterCost, freshCost, wasteCost });

      // Gas stats
      const totalGasCyl = gas.reduce((s, r) => s + (r.cylindersCount || 0), 0);
      const totalGasCost = gas.reduce((s, r) => s + (r.totalCost || 0), 0);
      const inStock = gas.filter((r) => r.status === 'In Stock').reduce((s, r) => s + (r.cylindersCount || 0), 0);
      const inUse = gas.filter((r) => r.status === 'In Use').reduce((s, r) => s + (r.cylindersCount || 0), 0);
      setGasStats({ totalCylinders: totalGasCyl, totalCost: totalGasCost, inStock, inUse });

      // Fuel stats
      const totalFuelLiters = fuel.reduce((s, r) => s + (r.litersUsed || 0), 0);
      const totalFuelCost = fuel.reduce((s, r) => s + (r.cost || 0), 0);
      const dieselL = fuel.filter((r) => r.fuelType === 'Diesel').reduce((s, r) => s + (r.litersUsed || 0), 0);
      const petrolL = fuel.filter((r) => r.fuelType === 'Petrol').reduce((s, r) => s + (r.litersUsed || 0), 0);
      setFuelStats({ totalLiters: totalFuelLiters, totalCost: totalFuelCost, dieselLiters: dieselL, petrolLiters: petrolL });
    } catch (err) {
      console.error('Failed to load utilities summary:', err);
    }
  };

  useEffect(() => {
    loadAllStats();

    const handleWaterUpdate = () => loadAllStats();
    const handleGasUpdate = () => loadAllStats();
    const handleFuelUpdate = () => loadAllStats();

    window.addEventListener('camp_water_usage_updated', handleWaterUpdate);
    window.addEventListener('camp_gas_usage_updated', handleGasUpdate);
    window.addEventListener('camp_fuel_usage_updated', handleFuelUpdate);

    return () => {
      window.removeEventListener('camp_water_usage_updated', handleWaterUpdate);
      window.removeEventListener('camp_gas_usage_updated', handleGasUpdate);
      window.removeEventListener('camp_fuel_usage_updated', handleFuelUpdate);
    };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Welcome Banner - 100% Solid White, High Contrast */}
      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>{isRTL ? 'إدارة الموارد والاستهلاك' : 'Camp Utilities & Resource Management'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
              {isRTL ? 'إدارة استهلاك الخدمات والمرافق' : 'Camp Utilities Center'}
            </h1>
            <p className="text-sm text-neutral-600 mt-1 max-w-2xl font-medium">
              {isRTL
                ? 'متابعة استهلاك المياه العذبة ومياه الصرف، مخزون اسطوانات الغاز، واستهلاك وقود المولدات والمعدات بكل دقة.'
                : 'Monitor and log fresh & waste water shipments, small & big gas cylinder inventories, and generator fuel consumption.'}
            </p>
          </div>
        </div>
      </div>

      {/* THE THREE MAIN CARDS - FULLY CLICKABLE TILES, ZERO TRANSPARENCY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. WATER USAGE CARD */}
        <div
          onClick={() => navigate('/app/utilities/water')}
          className="bg-white border-2 border-neutral-200 hover:border-orange-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Droplets className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 group-hover:text-orange-600 transition-colors">
                    {isRTL ? 'استهلاك المياه' : 'Water Usage'}
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">
                    {isRTL ? 'مياه نقية وصرف صحي' : 'Fresh & Waste Water'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-orange-100 text-orange-800 border border-orange-200">
                {isRTL ? 'نشط' : 'Active'}
              </span>
            </div>

            <p className="text-xs text-neutral-600 mt-4 leading-relaxed font-normal">
              {isRTL
                ? 'تسجيل شحنات صهاريج المياه النقية ومياه الصرف الصحي مع حساب التكلفة التلقائي ورفع الفواتير.'
                : 'Track water tanker deliveries and wastewater drainage with automated cost calculation and invoice uploads.'}
            </p>

            {/* Quick Metrics - Solid Background, Bold Legible Text */}
            <div className="grid grid-cols-2 gap-3 mt-5 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div>
                <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي الرحلات' : 'Total Trips'}</span>
                <span className="text-2xl font-black text-neutral-900">
                  {waterStats.totalTrips.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</span>
                <span className="text-2xl font-black text-orange-600">
                  {waterStats.totalCost.toLocaleString()} <span className="text-xs text-neutral-600 font-bold">SAR</span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-between text-xs text-neutral-700 font-semibold px-1">
              <span>{isRTL ? 'نقية:' : 'Fresh:'} {waterStats.freshCost.toLocaleString()} SAR</span>
              <span>{isRTL ? 'صرف:' : 'Waste:'} {waterStats.wasteCost.toLocaleString()} SAR</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsWaterModalOpen(true);
              }}
              className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50 shrink-0 font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'إضافة' : 'Add'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/app/utilities/water');
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold justify-center shadow-sm"
            >
              <span>{isRTL ? 'فتح استهلاك المياه' : 'Open Water Usage'}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* 2. GAS USAGE CARD */}
        <div
          onClick={() => navigate('/app/utilities/gas')}
          className="bg-white border-2 border-neutral-200 hover:border-neutral-900 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 group-hover:text-neutral-700 transition-colors">
                    {isRTL ? 'استهلاك الغاز' : 'Gas Usage'}
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">
                    {isRTL ? 'اسطوانات 12كجم وكبيرة' : 'Small (12kg) & Big Cylinders'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-800 border border-neutral-300">
                {isRTL ? 'مخزون' : 'Inventory'}
              </span>
            </div>

            <p className="text-xs text-neutral-600 mt-4 leading-relaxed font-normal">
              {isRTL
                ? 'متابعة اسطوانات الغاز للمطابخ والمطاعم مع حساب الوزن الإجمالي، متابعة المخزون، وفواتير الشراء.'
                : 'Record gas cylinder refills, track in-stock and in-use counts, with automatic weight and cost calculation.'}
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 mt-5 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div>
                <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي الاسطوانات' : 'Total Cylinders'}</span>
                <span className="text-2xl font-black text-neutral-900">
                  {gasStats.totalCylinders.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</span>
                <span className="text-2xl font-black text-orange-600">
                  {gasStats.totalCost.toLocaleString()} <span className="text-xs text-neutral-600 font-bold">SAR</span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-between text-xs text-neutral-700 font-semibold px-1">
              <span>{isRTL ? 'في المخزون:' : 'In Stock:'} {gasStats.inStock}</span>
              <span>{isRTL ? 'قيد الاستخدام:' : 'In Use:'} {gasStats.inUse}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsGasModalOpen(true);
              }}
              className="text-xs border-neutral-300 text-neutral-800 hover:bg-neutral-100 shrink-0 font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'إضافة' : 'Add'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/app/utilities/gas');
              }}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-bold justify-center shadow-sm"
            >
              <span>{isRTL ? 'فتح استهلاك الغاز' : 'Open Gas Usage'}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>

        {/* 3. FUEL USAGE CARD */}
        <div
          onClick={() => navigate('/app/utilities/fuel')}
          className="bg-white border-2 border-neutral-200 hover:border-orange-600 rounded-xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-100/70 border border-orange-300 text-orange-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Fuel className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 group-hover:text-orange-600 transition-colors">
                    {isRTL ? 'استهلاك الوقود' : 'Fuel Usage'}
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">
                    {isRTL ? 'ديزل وبنزين للمولدات والمعدات' : 'Generators & Machinery'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-orange-100 text-orange-800 border border-orange-200">
                {isRTL ? 'طاقة' : 'Power'}
              </span>
            </div>

            <p className="text-xs text-neutral-600 mt-4 leading-relaxed font-normal">
              {isRTL
                ? 'تسجيل استهلاك الوقود للمولدات الكهربائية والمضخات ومكائن الموقع، وحساب سعر اللتر الفعلي.'
                : 'Log diesel and petrol consumption for heavy generators, pumps, and machinery with automated cost per liter.'}
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 mt-5 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
              <div>
                <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي اللترات' : 'Total Liters'}</span>
                <span className="text-2xl font-black text-neutral-900">
                  {fuelStats.totalLiters.toLocaleString()} <span className="text-xs text-neutral-600 font-bold">L</span>
                </span>
              </div>
              <div>
                <span className="text-xs text-neutral-600 font-semibold block">{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</span>
                <span className="text-2xl font-black text-orange-600">
                  {fuelStats.totalCost.toLocaleString()} <span className="text-xs text-neutral-600 font-bold">SAR</span>
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-between text-xs text-neutral-700 font-semibold px-1">
              <span>{isRTL ? 'ديزل:' : 'Diesel:'} {fuelStats.dieselLiters.toLocaleString()} L</span>
              <span>{isRTL ? 'بنزين:' : 'Petrol:'} {fuelStats.petrolLiters.toLocaleString()} L</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsFuelModalOpen(true);
              }}
              className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50 shrink-0 font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              {isRTL ? 'إضافة' : 'Add'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/app/utilities/fuel');
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold justify-center shadow-sm"
            >
              <span>{isRTL ? 'فتح استهلاك الوقود' : 'Open Fuel Usage'}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Add Modals */}
      <WaterRecordModal
        isOpen={isWaterModalOpen}
        onClose={() => setIsWaterModalOpen(false)}
        onSuccess={() => {
          setIsWaterModalOpen(false);
          loadAllStats();
        }}
      />

      <GasRecordModal
        isOpen={isGasModalOpen}
        onClose={() => setIsGasModalOpen(false)}
        onSuccess={() => {
          setIsGasModalOpen(false);
          loadAllStats();
        }}
      />

      <FuelRecordModal
        isOpen={isFuelModalOpen}
        onClose={() => setIsFuelModalOpen(false)}
        onSuccess={() => {
          setIsFuelModalOpen(false);
          loadAllStats();
        }}
      />
    </div>
  );
};
