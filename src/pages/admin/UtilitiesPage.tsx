import React, { useState, useEffect } from 'react';
import { Plus, Droplets, Flame, Fuel } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { utilityService } from '../../services/utilityService';
import { projectService } from '../../services/projectService';
import { UtilityRecord, Project } from '../../types';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/modals/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';

export const UtilitiesPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();

  const [utilities, setUtilities] = useState<UtilityRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState('All');
  const [utilityTypeFilter, setUtilityTypeFilter] = useState('All');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    utilityType: 'Water' as UtilityRecord['utilityType'],
    consumption: 15000,
    unit: 'Gallons' as UtilityRecord['unit'],
    cost: 1100,
    recordDate: new Date().toISOString().split('T')[0],
    recordedBy: 'Ahmed Mansoor',
    status: 'Normal' as UtilityRecord['status'],
    projectId: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uData, pData] = await Promise.all([
        utilityService.getUtilities({
          projectId: projectFilter === 'All' ? undefined : projectFilter,
          utilityType: utilityTypeFilter === 'All' ? undefined : utilityTypeFilter,
        }),
        projectService.getProjects(),
      ]);
      setUtilities(uData);
      setProjects(pData);
    } catch {
      toastError('Failed to load utilities records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectFilter, utilityTypeFilter]);

  const waterTotal = utilities
    .filter((u) => u.utilityType === 'Water')
    .reduce((acc, u) => acc + u.consumption, 0);

  const fuelTotal = utilities
    .filter((u) => u.utilityType === 'Fuel')
    .reduce((acc, u) => acc + u.consumption, 0);

  const gasTotal = utilities
    .filter((u) => u.utilityType === 'Gas')
    .reduce((acc, u) => acc + u.consumption, 0);

  const totalCost = utilities.reduce((acc, u) => acc + u.cost, 0);

  const handleOpenCreate = () => {
    setFormData({
      utilityType: 'Water',
      consumption: 25000,
      unit: 'Gallons',
      cost: 1800,
      recordDate: new Date().toISOString().split('T')[0],
      recordedBy: 'Ahmed Mansoor',
      status: 'Normal',
      projectId: projects[0]?.id || '',
    });
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const proj = projects.find((p) => p.id === formData.projectId);
      await utilityService.createUtilityRecord({
        ...formData,
        projectName: proj?.name || '',
      });
      success('Utility record logged');
      setIsCreateOpen(false);
      loadData();
    } catch {
      toastError('Failed to log utility meter/delivery');
    }
  };

  const columns: Column<UtilityRecord>[] = [
    {
      key: 'utilityType',
      header: 'Utility Type',
      sortable: true,
      render: (row) => {
        let Icon = Droplets;
        let color = 'text-sky-700 bg-neutral-100';
        if (row.utilityType === 'Fuel') {
          Icon = Fuel;
          color = 'text-amber-700 bg-amber-50';
        } else if (row.utilityType === 'Gas') {
          Icon = Flame;
          color = 'text-orange-700 bg-orange-50';
        }
        return (
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${color} shrink-0`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-neutral-900">{row.utilityType}</span>
          </div>
        );
      },
    },
    {
      key: 'projectName',
      header: t('common.project'),
      sortable: true,
      render: (row) => <span className="text-neutral-800 font-medium">{row.projectName}</span>,
    },
    {
      key: 'consumption',
      header: t('utilities.consumption'),
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-bold font-mono text-neutral-900 text-sm">
          {row.consumption.toLocaleString()} <span className="text-xs text-neutral-500 font-normal">{row.unit}</span>
        </span>
      ),
    },
    {
      key: 'cost',
      header: t('utilities.cost'),
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-semibold text-orange-600 text-xs">
          SAR {row.cost.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'recordDate',
      header: t('utilities.recordDate'),
      sortable: true,
      render: (row) => <span className="font-mono text-neutral-500 text-[11px]">{row.recordDate}</span>,
    },
    {
      key: 'recordedBy',
      header: 'Recorded By',
      sortable: true,
      render: (row) => <span className="text-neutral-600">{row.recordedBy}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      sortable: true,
      render: (row) => <Badge status={row.status} size="sm" />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            {t('utilities.title')}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t('utilities.subtitle')}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenCreate}
        >
          {t('utilities.addRecord')}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-white border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">{t('utilities.water')}</span>
            <Droplets className="w-4 h-4 text-neutral-600" />
          </div>
          <div className="text-lg font-bold text-neutral-900 font-mono">
            {waterTotal.toLocaleString()} <span className="text-xs font-normal text-neutral-500">Gal</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Potable tankers received</div>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">{t('utilities.fuel')}</span>
            <Fuel className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-bold text-neutral-900 font-mono">
            {fuelTotal.toLocaleString()} <span className="text-xs font-normal text-neutral-500">Liters</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Diesel generators fuel</div>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">{t('utilities.gas')}</span>
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <div className="text-lg font-bold text-neutral-900 font-mono">
            {gasTotal} <span className="text-xs font-normal text-neutral-500">Cylinders</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Commercial dining refilled</div>
        </Card>

        <Card className="p-3.5 bg-white border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Logistics Cost</span>
            <span className="text-orange-600 font-bold text-xs font-mono">SAR</span>
          </div>
          <div className="text-lg font-bold text-orange-600 font-mono">
            SAR {totalCost.toLocaleString()}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Recorded invoices sum</div>
        </Card>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={utilities}
        isLoading={isLoading}
        searchPlaceholder="Search delivery log, recorded person or camp..."
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
              value={utilityTypeFilter}
              onChange={(e) => setUtilityTypeFilter(e.target.value)}
              className="h-8 px-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700"
            >
              <option value="All">All Types</option>
              <option value="Water">Water</option>
              <option value="Fuel">Fuel</option>
              <option value="Gas">Gas</option>
            </select>
          </div>
        }
      />

      {/* Log Utility Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t('utilities.addRecord')}
        subtitle="Log water delivery tanker, generator diesel fuel or kitchen gas refill"
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
            <Select
              label="Utility Category"
              value={formData.utilityType}
              onChange={(e) => {
                const type = e.target.value as UtilityRecord['utilityType'];
                const unit = type === 'Water' ? 'Gallons' : type === 'Fuel' ? 'Liters' : 'Cylinders';
                setFormData({ ...formData, utilityType: type, unit });
              }}
              options={['Water', 'Fuel', 'Gas']}
            />
            <Select
              label={t('common.status')}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={['Normal', 'High', 'Critical']}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Consumption (${formData.unit})`}
              type="number"
              required
              value={formData.consumption}
              onChange={(e) => setFormData({ ...formData, consumption: Number(e.target.value) })}
            />
            <Input
              label="Cost (SAR)"
              type="number"
              required
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('utilities.recordDate')}
              type="date"
              required
              value={formData.recordDate}
              onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
            />
            <Input
              label="Recorded By"
              required
              value={formData.recordedBy}
              onChange={(e) => setFormData({ ...formData, recordedBy: e.target.value })}
            />
          </div>

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
        </form>
      </Modal>
    </div>
  );
};
