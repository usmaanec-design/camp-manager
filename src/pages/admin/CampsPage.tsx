import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { campService } from '../../services/campService';
import { projectService } from '../../services/projectService';
import { Camp, Room, Project } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/modals/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../contexts/ToastContext';

export const CampsPage: React.FC = () => {
  const { t } = useLanguage();
  const { error: toastError } = useToast();

  const [camps, setCamps] = useState<Camp[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Selected camp for viewing room matrix
  const [activeCamp, setActiveCamp] = useState<Camp | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cData, pData] = await Promise.all([
        campService.getCamps(selectedProject === 'All' ? undefined : selectedProject),
        projectService.getProjects(),
      ]);
      setCamps(cData);
      setProjects(pData);
    } catch {
      toastError('Failed to load camp facilities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  const handleOpenRooms = async (camp: Camp) => {
    setActiveCamp(camp);
    try {
      const rData = await campService.getRooms(camp.id);
      setRooms(rData);
      setIsRoomsModalOpen(true);
    } catch {
      toastError('Failed to load rooms');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            {t('camps.title')}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t('camps.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="h-8 px-2.5 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="All">All Camps & Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Camps Facilities Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      ) : camps.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg border border-neutral-200">
          <p className="text-sm font-semibold text-neutral-700">No Camps Registered</p>
          <p className="text-xs text-neutral-400 mt-1">Camps and facilities added by field users or admins will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {camps.map((c) => {
            const occPct = c.capacity > 0 ? Math.round((c.currentOccupancy / c.capacity) * 100) : 0;

            return (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between overflow-hidden"
              >
                <div className="p-3.5 space-y-2.5">
                  {/* Top header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-neutral-900 truncate">{c.campName}</h3>
                      <p className="text-[11px] font-medium text-orange-600 truncate">{c.projectName}</p>
                    </div>
                    <Badge status={c.status} size="sm" />
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 truncate">
                    <MapPin className="w-3 h-3 text-neutral-400 shrink-0" />
                    <span className="truncate">{c.location}</span>
                  </div>

                  {/* Compact Metrics */}
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="py-1.5 px-1 bg-neutral-50 rounded border border-neutral-100">
                      <span className="text-[10px] text-neutral-400 block leading-tight">Capacity</span>
                      <span className="text-xs font-bold text-neutral-800">{c.capacity}</span>
                    </div>
                    <div className="py-1.5 px-1 bg-neutral-50 rounded border border-neutral-100">
                      <span className="text-[10px] text-neutral-400 block leading-tight">Occupied</span>
                      <span className="text-xs font-bold text-neutral-800">{c.currentOccupancy}</span>
                    </div>
                    <div className="py-1.5 px-1 bg-orange-50/60 rounded border border-orange-100">
                      <span className="text-[10px] text-orange-500 block leading-tight">Occupancy</span>
                      <span className="text-xs font-bold text-orange-700">{occPct}%</span>
                    </div>
                  </div>

                  {/* Thin Progress bar */}
                  <div className="w-full bg-neutral-100 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-1 rounded-full ${occPct > 90 ? 'bg-red-500' : occPct > 75 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(occPct, 100)}%` }}
                    />
                  </div>

                  {/* Manager & Contact */}
                  <div className="text-[11px] bg-neutral-50/70 p-2 rounded border border-neutral-100 flex items-center justify-between text-neutral-600">
                    <span className="truncate font-medium">{c.managerName || 'Camp Manager'}</span>
                    <span className="font-mono text-[10px] text-neutral-500 shrink-0">{c.managerContact}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3.5 py-2 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500 font-medium">
                    {c.buildingsCount} Blocks &bull; {c.roomsCount} Rooms
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenRooms(c)}
                    className="text-[11px] h-6 px-2 text-neutral-700 hover:text-orange-600"
                  >
                    Room Allocations
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Matrix Modal */}
      <Modal
        isOpen={isRoomsModalOpen}
        onClose={() => setIsRoomsModalOpen(false)}
        title={activeCamp ? `${activeCamp.campName} - ${t('camps.roomsAllocation')}` : ''}
        subtitle="Current room status, maximum bed capacity, and allocated residents"
        maxWidth="lg"
        footer={
          <Button variant="outline" size="sm" onClick={() => setIsRoomsModalOpen(false)}>
            {t('common.close')}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                <tr>
                  <th className="p-2.5">Room #</th>
                  <th className="p-2.5">Building</th>
                  <th className="p-2.5 text-center">Capacity</th>
                  <th className="p-2.5 text-center">Occupied</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="p-2.5 font-semibold text-neutral-900">{r.roomNumber}</td>
                    <td className="p-2.5 text-neutral-700">{r.building}</td>
                    <td className="p-2.5 text-center font-medium">{r.capacity} Beds</td>
                    <td className="p-2.5 text-center font-bold text-neutral-900">{r.occupancy}</td>
                    <td className="p-2.5 text-center">
                      <Badge status={r.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
