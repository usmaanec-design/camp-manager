import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2,
  Users,
  FileText,
  Truck,
  HardHat,
  Boxes,
  CalendarCheck2,
  Zap,
  MapPin,
  Shield,
  Layers,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { projectService } from '../../services/projectService';
import { campService } from '../../services/campService';
import { manpowerService } from '../../services/manpowerService';
import { vehicleService } from '../../services/vehicleService';
import { inventoryService } from '../../services/inventoryService';
import { operationService } from '../../services/operationService';
import { utilityService } from '../../services/utilityService';
import { reportService } from '../../services/reportService';
import { userService } from '../../services/userService';
import {
  Project,
  Camp,
  Room,
  Manpower,
  Vehicle,
  InventoryItem,
  Operation,
  UtilityRecord,
  Report,
  User,
} from '../../types';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useLanguage();

  const [project, setProject] = useState<Project | null>(null);
  const [camp, setCamp] = useState<Camp | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [manpower, setManpower] = useState<Manpower[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [utilities, setUtilities] = useState<UtilityRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active section tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'camp'
    | 'manpower'
    | 'vehicles'
    | 'inventory'
    | 'operations'
    | 'utilities'
    | 'reports'
    | 'users'
  >('overview');

  useEffect(() => {
    if (!projectId) return;

    const loadProjectData = async () => {
      setIsLoading(true);
      try {
        const [
          prjData,
          campData,
          roomsData,
          mpData,
          vehData,
          invData,
          opsData,
          utlData,
          repData,
          usrData,
        ] = await Promise.all([
          projectService.getProjectById(projectId),
          campService.getCampByProjectId(projectId),
          campService.getRooms(undefined, projectId),
          manpowerService.getManpower({ projectId }),
          vehicleService.getVehicles({ projectId }),
          inventoryService.getInventory({ projectId }),
          operationService.getOperations({ projectId }),
          utilityService.getUtilities({ projectId }),
          reportService.getReports({ projectId }),
          userService.getUsers({ projectId }),
        ]);

        setProject(prjData);
        setCamp(campData);
        setRooms(roomsData);
        setManpower(mpData);
        setVehicles(vehData);
        setInventory(invData);
        setOperations(opsData);
        setUtilities(utlData);
        setReports(repData);
        setUsers(usrData);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project Not Found"
        description="The requested project does not exist or may have been deleted."
        actionText="Back to Projects"
        onAction={() => window.history.back()}
      />
    );
  }

  const occupancyRate = Math.round((project.currentOccupancy / project.campCapacity) * 100);

  const tabs = [
    { id: 'overview', label: t('common.overview'), icon: Layers },
    { id: 'camp', label: t('nav.camps'), icon: Building2 },
    { id: 'manpower', label: t('nav.manpower'), icon: HardHat, count: manpower.length },
    { id: 'vehicles', label: t('nav.vehicles'), icon: Truck, count: vehicles.length },
    { id: 'inventory', label: t('nav.inventory'), icon: Boxes, count: inventory.length },
    { id: 'operations', label: t('nav.operations'), icon: CalendarCheck2, count: operations.length },
    { id: 'utilities', label: t('nav.utilities'), icon: Zap, count: utilities.length },
    { id: 'reports', label: t('nav.reports'), icon: FileText, count: reports.length },
    { id: 'users', label: t('nav.users'), icon: Users, count: users.length },
  ];

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: t('nav.projects'), href: '/admin/projects' },
          { label: project.name },
        ]}
      />

      {/* Project Header Banner */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{project.name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-600 font-semibold border border-neutral-200">
                {project.code}
              </span>
              <Badge status={project.status} size="sm" />
            </div>

            <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap pt-1">
              <span className="flex items-center gap-1 text-neutral-700">
                <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                {project.location}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                Manager: <strong>{project.managerName}</strong> ({project.managerContact})
              </span>
              <span>•</span>
              <span className="font-mono text-[11px] text-neutral-400">
                Created: {project.createdAt}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-end">
              <span className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold block">
                Occupancy
              </span>
              <span className="text-sm font-bold text-neutral-900">
                {project.currentOccupancy} / {project.campCapacity}{' '}
                <span className="text-xs text-orange-600 font-medium">({occupancyRate}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-neutral-200 pb-1 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-md transition-all whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-orange-500 text-orange-600 bg-white shadow-2xs'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-orange-100 text-orange-700' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader title="Operational Profile" subtitle="General scope and camp status" />
              <CardContent className="space-y-3 text-xs leading-relaxed text-neutral-700">
                <p>{project.description}</p>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-100 text-xs">
                  <div>
                    <span className="text-neutral-500 block">Facility Name:</span>
                    <span className="font-semibold text-neutral-900">{camp?.campName || 'Central Camp'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Total Residential Blocks:</span>
                    <span className="font-semibold text-neutral-900">{camp?.buildingsCount || 4} Accommodation Blocks</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Active Logistics Fleet:</span>
                    <span className="font-semibold text-neutral-900">{vehicles.length} Units</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Assigned Officers:</span>
                    <span className="font-semibold text-neutral-900">{users.length} Users</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Quick Contacts" subtitle="Facility supervisor & dispatch" />
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                  <p className="font-semibold text-neutral-900">{project.managerName}</p>
                  <p className="text-neutral-500">Camp Operations Manager</p>
                  <p className="text-orange-600 font-mono font-medium">{project.managerContact}</p>
                </div>
                <div className="text-[11px] text-neutral-500">
                  <Shield className="w-3.5 h-3.5 inline me-1 text-emerald-600" />
                  Project strictly isolated in multi-tenant data architecture.
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CAMP & ROOMS TAB */}
        {activeTab === 'camp' && (
          <div className="space-y-4">
            {camp ? (
              <Card>
                <CardHeader
                  title={camp.campName}
                  subtitle={camp.location}
                  action={<Badge status={camp.status} size="sm" />}
                />
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-neutral-50 rounded border border-neutral-100">
                      <span className="text-neutral-500 block">Total Capacity</span>
                      <span className="text-base font-bold text-neutral-900">{camp.capacity}</span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded border border-neutral-100">
                      <span className="text-neutral-500 block">Occupied Beds</span>
                      <span className="text-base font-bold text-neutral-900">{camp.currentOccupancy}</span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded border border-neutral-100">
                      <span className="text-neutral-500 block">Total Rooms</span>
                      <span className="text-base font-bold text-neutral-900">{camp.roomsCount}</span>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded border border-neutral-100">
                      <span className="text-neutral-500 block">Buildings</span>
                      <span className="text-base font-bold text-neutral-900">{camp.buildingsCount}</span>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 bg-neutral-50 p-3 rounded border border-neutral-200">
                    <strong>Facility Notes:</strong> {camp.notes}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {/* Room Matrix Table */}
            <Card>
              <CardHeader title="Room Occupancy Allocation" subtitle="Modular accommodation rooms" />
              <CardContent className="p-0">
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
                      {rooms.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-neutral-400">
                            No individual room details registered for this project.
                          </td>
                        </tr>
                      ) : (
                        rooms.map((r) => (
                          <tr key={r.id} className="hover:bg-neutral-50">
                            <td className="p-2.5 font-semibold text-neutral-900">{r.roomNumber}</td>
                            <td className="p-2.5 text-neutral-700">{r.building}</td>
                            <td className="p-2.5 text-center font-medium">{r.capacity}</td>
                            <td className="p-2.5 text-center font-semibold">{r.occupancy}</td>
                            <td className="p-2.5 text-center">
                              <Badge status={r.status} size="sm" />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MANPOWER TAB */}
        {activeTab === 'manpower' && (
          <Card>
            <CardHeader title={t('manpower.title')} subtitle={`Personnel deployed at ${project.name}`} />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">{t('manpower.employeeName')}</th>
                      <th className="p-2.5">{t('manpower.employeeId')}</th>
                      <th className="p-2.5">{t('manpower.position')}</th>
                      <th className="p-2.5">{t('manpower.department')}</th>
                      <th className="p-2.5 text-center">{t('common.status')}</th>
                      <th className="p-2.5">{t('manpower.contactNumber')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {manpower.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-neutral-400">
                          No manpower records for this project.
                        </td>
                      </tr>
                    ) : (
                      manpower.map((m) => (
                        <tr key={m.id} className="hover:bg-neutral-50">
                          <td className="p-2.5 font-semibold text-neutral-900">{m.employeeName}</td>
                          <td className="p-2.5 font-mono text-neutral-600">{m.employeeId}</td>
                          <td className="p-2.5 text-neutral-700">{m.position}</td>
                          <td className="p-2.5 text-neutral-600">{m.department}</td>
                          <td className="p-2.5 text-center">
                            <Badge status={m.status} size="sm" />
                          </td>
                          <td className="p-2.5 font-mono text-neutral-600">{m.contactNumber}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VEHICLES TAB */}
        {activeTab === 'vehicles' && (
          <Card>
            <CardHeader title={t('vehicles.title')} subtitle={`Transport assets assigned to ${project.name}`} />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">{t('vehicles.vehicleNumber')}</th>
                      <th className="p-2.5">{t('vehicles.plateNumber')}</th>
                      <th className="p-2.5">{t('vehicles.type')}</th>
                      <th className="p-2.5">{t('vehicles.driver')}</th>
                      <th className="p-2.5 text-center">{t('common.status')}</th>
                      <th className="p-2.5">{t('vehicles.lastInspection')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {vehicles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-neutral-400">
                          No vehicles assigned to this camp.
                        </td>
                      </tr>
                    ) : (
                      vehicles.map((v) => (
                        <tr key={v.id} className="hover:bg-neutral-50">
                          <td className="p-2.5 font-semibold text-neutral-900 font-mono">{v.vehicleNumber}</td>
                          <td className="p-2.5 font-mono text-neutral-700">{v.plateNumber}</td>
                          <td className="p-2.5 text-neutral-700">{v.type}</td>
                          <td className="p-2.5 text-neutral-800">{v.driverName}</td>
                          <td className="p-2.5 text-center">
                            <Badge status={v.status} size="sm" />
                          </td>
                          <td className="p-2.5 font-mono text-neutral-500">{v.lastInspectionDate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <Card>
            <CardHeader title={t('inventory.title')} subtitle="Camp provisions and equipment" />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">{t('inventory.itemName')}</th>
                      <th className="p-2.5">{t('inventory.category')}</th>
                      <th className="p-2.5 text-right">{t('inventory.quantity')}</th>
                      <th className="p-2.5 text-right">{t('inventory.minLevel')}</th>
                      <th className="p-2.5 text-center">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {inventory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-neutral-400">
                          No inventory items logged.
                        </td>
                      </tr>
                    ) : (
                      inventory.map((i) => (
                        <tr key={i.id} className="hover:bg-neutral-50">
                          <td className="p-2.5 font-semibold text-neutral-900">{i.itemName}</td>
                          <td className="p-2.5 text-neutral-600">{i.category}</td>
                          <td className="p-2.5 text-right font-bold text-neutral-900">
                            {i.quantity} {i.unit}
                          </td>
                          <td className="p-2.5 text-right text-neutral-500">{i.minimumLevel}</td>
                          <td className="p-2.5 text-center">
                            <Badge status={i.status} size="sm" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* OPERATIONS TAB */}
        {activeTab === 'operations' && (
          <Card>
            <CardHeader title={t('operations.title')} subtitle="Daily tasks, PMs, and inspections" />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">{t('operations.activityName')}</th>
                      <th className="p-2.5">{t('operations.responsiblePerson')}</th>
                      <th className="p-2.5">{t('common.date')}</th>
                      <th className="p-2.5 text-center">Priority</th>
                      <th className="p-2.5 text-center">{t('common.status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {operations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-neutral-400">
                          No scheduled operations for this camp.
                        </td>
                      </tr>
                    ) : (
                      operations.map((o) => (
                        <tr key={o.id} className="hover:bg-neutral-50">
                          <td className="p-2.5 font-semibold text-neutral-900">{o.activityName}</td>
                          <td className="p-2.5 text-neutral-700">{o.responsiblePerson}</td>
                          <td className="p-2.5 font-mono text-neutral-500">{o.date}</td>
                          <td className="p-2.5 text-center">
                            <Badge status={o.priority} size="sm" />
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge status={o.status} size="sm" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* UTILITIES TAB */}
        {activeTab === 'utilities' && (
          <Card>
            <CardHeader title={t('utilities.title')} subtitle="Water, Diesel, and Gas deliveries" />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">Utility</th>
                      <th className="p-2.5 text-right">{t('utilities.consumption')}</th>
                      <th className="p-2.5 text-right">{t('utilities.cost')}</th>
                      <th className="p-2.5">{t('utilities.recordDate')}</th>
                      <th className="p-2.5">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {utilities.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-neutral-400">
                          No utility consumption logs for this project.
                        </td>
                      </tr>
                    ) : (
                      utilities.map((u) => (
                        <tr key={u.id} className="hover:bg-neutral-50">
                          <td className="p-2.5 font-semibold text-neutral-900">{u.utilityType}</td>
                          <td className="p-2.5 text-right font-medium text-neutral-900">
                            {u.consumption.toLocaleString()} {u.unit}
                          </td>
                          <td className="p-2.5 text-right font-bold text-orange-600 font-mono">
                            SAR {u.cost.toLocaleString()}
                          </td>
                          <td className="p-2.5 font-mono text-neutral-500">{u.recordDate}</td>
                          <td className="p-2.5 text-neutral-600">{u.recordedBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <Card>
            <CardHeader title={t('reports.title')} subtitle={`Field incident & operational logs for ${project.name}`} />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">Report #</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Title</th>
                      <th className="p-2.5">Author</th>
                      <th className="p-2.5 text-center">Status</th>
                      <th className="p-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-neutral-400">
                          No reports recorded for this project.
                        </td>
                      </tr>
                    ) : (
                      reports.map((r) => (
                        <tr key={r.id} className="hover:bg-neutral-50">
                          <td className="p-2.5 font-mono font-semibold text-neutral-900">{r.reportNumber}</td>
                          <td className="p-2.5 text-neutral-600">{r.reportType}</td>
                          <td className="p-2.5 font-medium text-neutral-900 max-w-sm truncate">{r.title}</td>
                          <td className="p-2.5 text-neutral-600">{r.userName}</td>
                          <td className="p-2.5 text-center">
                            <Badge status={r.status} size="sm" />
                          </td>
                          <td className="p-2.5 font-mono text-neutral-400">{r.createdAt}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader title={t('users.title')} subtitle={`Personnel assigned to ${project.name}`} />
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Mobile</th>
                      <th className="p-2.5">Role</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-neutral-400">
                          No assigned users found for this project.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-neutral-50">
                          <td className="p-2.5 font-semibold text-neutral-900">{u.name}</td>
                          <td className="p-2.5 text-neutral-600">{u.email}</td>
                          <td className="p-2.5 font-mono text-neutral-600">{u.mobile}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 font-mono text-[11px] font-semibold text-neutral-700">
                              {u.role}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge status={u.status} size="sm" />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
