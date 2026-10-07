import React from 'react';
import { NavLink } from 'react-router-dom';
import { Droplets, Flame, Fuel, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const UtilityTopNav: React.FC = () => {
  const { isRTL } = useLanguage();

  const navItems = [
    {
      to: '/app/utilities',
      end: true,
      label: isRTL ? 'مركز الخدمات' : 'Utilities Hub',
      sub: isRTL ? 'اللوحة الرئيسية' : 'Main Hub Overview',
      icon: LayoutDashboard,
    },
    {
      to: '/app/utilities/water',
      label: isRTL ? 'استهلاك المياه' : 'Water Usage',
      sub: isRTL ? 'مياه نقية وصرف صحي' : 'Fresh & Waste Water',
      icon: Droplets,
    },
    {
      to: '/app/utilities/gas',
      label: isRTL ? 'استهلاك الغاز' : 'Gas Usage',
      sub: isRTL ? 'اسطوانات 12كجم وكبيرة' : 'Small & Big Cylinders',
      icon: Flame,
    },
    {
      to: '/app/utilities/fuel',
      label: isRTL ? 'استهلاك الوقود' : 'Fuel Usage',
      sub: isRTL ? 'ديزل وبنزين للمولدات' : 'Diesel & Petrol Generators',
      icon: Fuel,
    },
  ];

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-2 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={Boolean((item as any).end)}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-xl transition-all border ${
                  isActive
                    ? 'bg-orange-50 border-orange-500 text-orange-950 ring-2 ring-orange-500/20 shadow-xs'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-white border border-neutral-200 text-neutral-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="overflow-hidden">
                    <span
                      className={`text-xs font-bold block truncate ${
                        isActive ? 'text-orange-900 font-extrabold' : 'text-neutral-800'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="text-[10px] text-neutral-500 block truncate">
                      {item.sub}
                    </span>
                  </div>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
