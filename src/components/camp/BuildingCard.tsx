import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { Building } from '../../types';
import { Badge } from '../ui/Badge';
import { useLanguage } from '../../i18n/LanguageContext';
import { roomService } from '../../services/roomService';

interface BuildingCardProps {
  building: Building;
  employeeCount?: number;
  onDelete?: (building: Building) => void;
  onEdit?: (building: Building) => void;
}

export const BuildingCard: React.FC<BuildingCardProps> = ({
  building,
  employeeCount = 0,
  onDelete,
  onEdit,
}) => {
  const { isRTL } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const realRoomsCount = roomService.getRoomsCountForBuilding(building.id) || building.totalRooms || 0;

  const handleCardClick = () => {
    navigate(`/app/camp/buildings/${building.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-neutral-200/90 hover:border-orange-400 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-150 flex flex-col justify-between relative group cursor-pointer"
    >
      {/* Top Bar: Title, Badge, Action Menu */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-neutral-900 group-hover:text-orange-600 transition truncate max-w-[200px]">
              {building.name}
            </h3>
            <Badge status={building.status} size="sm" />
          </div>
          <span className="text-[11px] text-neutral-500 font-mono block mt-0.5">
            Building No: <strong className="text-neutral-800">{building.buildingNumber}</strong>
          </span>
        </div>

        {/* Action Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div className="absolute end-0 mt-1 w-36 bg-white border border-neutral-200 rounded-md shadow-lg z-20 py-1 text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    if (onEdit) {
                      onEdit(building);
                    } else {
                      handleCardClick();
                    }
                  }}
                  className="w-full px-3 py-1.5 text-start hover:bg-neutral-50 flex items-center gap-2 text-neutral-700"
                >
                  <Edit2 className="w-3.5 h-3.5 text-orange-600" />
                  <span>{isRTL ? 'تعديل المبنى' : 'Edit Building'}</span>
                </button>
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete(building);
                    }}
                    className="w-full px-3 py-1.5 text-start hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'حذف المبنى' : 'Delete'}</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Metrics Row: Capacity, Employees, Reports */}
      <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-neutral-50 border border-neutral-100 text-center">
        <div>
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
            {isRTL ? 'السعة' : 'Capacity'}
          </span>
          <span className="text-xs font-bold text-neutral-900 font-mono mt-0.5 block">
            {building.capacity}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
            {isRTL ? 'الموظفين' : 'Employees'}
          </span>
          <span className="text-xs font-bold text-neutral-900 font-mono mt-0.5 block">
            {employeeCount || building.currentOccupancy}
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block">
            {isRTL ? 'الغرف' : 'Rooms'}
          </span>
          <span className="text-xs font-bold text-orange-600 font-mono mt-0.5 block">
            {realRoomsCount}
          </span>
        </div>
      </div>

      {/* Facilities quick tags */}
      {building.facilities && building.facilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {building.facilities.slice(0, 4).map((f) => (
            <span
              key={f}
              className="px-1.5 py-0.5 rounded bg-neutral-100 text-[10px] text-neutral-600 font-medium capitalize"
            >
              {f}
            </span>
          ))}
          {building.facilities.length > 4 && (
            <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-[10px] text-neutral-500 font-medium">
              +{building.facilities.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer Link: View Building → */}
      <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
        <span className="text-[11px] text-neutral-400">
          {building.buildingType}
        </span>
        <button
          type="button"
          onClick={handleCardClick}
          className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition group-hover:translate-x-0.5"
        >
          <span>{isRTL ? 'عرض المبنى' : 'View Building'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
