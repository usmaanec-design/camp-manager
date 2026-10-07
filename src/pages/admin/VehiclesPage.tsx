import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { vehicleService } from '../../services/vehicleService';
import { projectService } from '../../services/projectService';
import { Vehicle, Project } from '../../types';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/modals/Modal';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';

export const VehiclesPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    vehicleNumber: '',
    type: 'Bus' as Vehicle['type'],
    plateNumber: '',
    driverName: '',
    status: 'Active' as Vehicle['status'],
    lastInspectionDate: new Date().toISOString().split('T')[0],
    projectId: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vData, pData] = await Promise.all([
        vehicleService.getVehicles({
          projectId: projectFilter === 'All' ? undefined : projectFilter,
          status: statusFilter === 'All' ? undefined : statusFilter,
        }),
        projectService.getProjects(),
      ]);
      setVehicles(vData);
      setProjects(pData);
    } catch {
      toastError('Failed to load fleet data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectFilter, statusFilter]);

  const handleOpenCreate = () => {
    setFormData({
      vehicleNumber: `FLT-OLY-0${vehicles.length + 1}`,
      type: 'Bus',
      plateNumber: '',
      driverName: '',
      status: 'Active',
      lastInspectionDate: new Date().toISOString().split('T')[0],
      projectId: projects[0]?.id || '',
    });
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const proj = projects.find((p) => p.id === formData.projectId);
      await vehicleService.createVehicle({
        ...formData,
        projectName: proj?.name || '',
      });
      success('Vehicle registered successfully');
      setIsCreateOpen(false);
      loadData();
    } catch {
      toastError('Failed to register vehicle');
    }
  };

  const handleDelete = (v: Vehicle, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedVehicle(v);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedVehicle) return;
    try {
      await vehicleService.deleteVehicle(selectedVehicle.id);
      success('Vehicle removed from fleet register');
      setIsDeleteOpen(false);
      loadData();
    } catch {
      toastError('Failed to delete vehicle');
    }
  };

  const columns: Column<Vehicle>[] = [
    {
      key: 'vehicleNumber',
      header: t('vehicles.vehicleNumber'),
      sortable: true,
      render: (row) => <span className="font-mono font-semibold text-neutral-900">{row.vehicleNumber}</span>,
    },
    {
      key: 'plateNumber',
      header: t('vehicles.plateNumber'),
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300 font-mono font-bold text-neutral-800">
          {row.plateNumber}
        </span>
      ),
    },
    {
      key: 'type',
      header: t('vehicles.type'),
      sortable: true,
      render: (row) => <span className="text-neutral-700 font-medium">{row.type}</span>,
    },
    {
      key: 'projectName',
      header: t('common.project'),
      sortable: true,
      render: (row) => <span className="text-neutral-800 font-medium">{row.projectName}</span>,
    },
    {
      key: 'driverName',
      header: t('vehicles.driver'),
      sortable: true,
      render: (row) => <span className="text-neutral-700">{row.driverName}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      sortable: true,
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      key: 'lastInspectionDate',
      header: t('vehicles.lastInspection'),
      sortable: true,
      render: (row) => <span className="font-mono text-neutral-500 text-[11px]">{row.lastInspectionDate}</span>,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right',
      render: (row) => (
        <button
          onClick={(e) => handleDelete(row, e)}
          className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            {t('vehicles.title')}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t('vehicles.subtitle')}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenCreate}
        >
          {t('vehicles.addVehicle')}
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={vehicles}
        isLoading={isLoading}
        searchPlaceholder="Search asset number, plate, driver or type..."
        filterComponent={
          <div className="flex items-center gap-2">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 px-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700"
            >
              <option value="All">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Out of Service">Out of Service</option>
            </select>
          </div>
        }
      />

      {/* Register Vehicle Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t('vehicles.addVehicle')}
        subtitle="Add transport or logistics asset to fleet directory"
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCreate}>
              {t('common.create')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('vehicles.vehicleNumber')}
              required
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
            />
            <Input
              label={t('vehicles.plateNumber')}
              required
              value={formData.plateNumber}
              onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
              placeholder="e.g. 5812 KSA"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('vehicles.type')}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              options={['Bus', 'Pickup', 'Sedan', 'Water Tanker', 'Heavy Equipment', 'Emergency Vehicle']}
            />
            <Select
              label={t('common.status')}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={['Active', 'Maintenance', 'Out of Service']}
            />
          </div>

          <Input
            label={t('vehicles.driver')}
            required
            value={formData.driverName}
            onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
            placeholder="Driver Name"
          />

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              {t('common.project')}
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full h-9 px-3 bg-white border border-neutral-300 rounded text-xs"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label={t('vehicles.lastInspection')}
            type="date"
            value={formData.lastInspectionDate}
            onChange={(e) => setFormData({ ...formData, lastInspectionDate: e.target.value })}
          />
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Deregister Vehicle"
        message="Are you sure you want to remove this vehicle asset from the operational fleet register?"
        itemIdentifier={`VEHICLE: ${selectedVehicle?.vehicleNumber} (${selectedVehicle?.plateNumber})`}
        confirmLabel="Deregister Asset"
      />
    </div>
  );
};
