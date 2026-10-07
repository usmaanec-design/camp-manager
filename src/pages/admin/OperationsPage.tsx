import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { operationService } from '../../services/operationService';
import { projectService } from '../../services/projectService';
import { Operation, Project } from '../../types';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/modals/Modal';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../contexts/ToastContext';

export const OperationsPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();

  const [operations, setOperations] = useState<Operation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);

  const [formData, setFormData] = useState({
    activityName: '',
    responsiblePerson: '',
    status: 'Scheduled' as Operation['status'],
    priority: 'Medium' as Operation['priority'],
    date: new Date().toISOString().split('T')[0],
    notes: '',
    projectId: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [oData, pData] = await Promise.all([
        operationService.getOperations({
          projectId: projectFilter === 'All' ? undefined : projectFilter,
          status: statusFilter === 'All' ? undefined : statusFilter,
        }),
        projectService.getProjects(),
      ]);
      setOperations(oData);
      setProjects(pData);
    } catch {
      toastError('Failed to load operational tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectFilter, statusFilter]);

  const handleOpenCreate = () => {
    setFormData({
      activityName: '',
      responsiblePerson: '',
      status: 'Scheduled',
      priority: 'Medium',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      projectId: projects[0]?.id || '',
    });
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const proj = projects.find((p) => p.id === formData.projectId);
      await operationService.createOperation({
        ...formData,
        projectName: proj?.name || '',
      });
      success('Operational task scheduled');
      setIsCreateOpen(false);
      loadData();
    } catch {
      toastError('Failed to schedule activity');
    }
  };

  const handleToggleStatus = async (op: Operation) => {
    const nextStatus: Operation['status'] =
      op.status === 'Scheduled'
        ? 'In Progress'
        : op.status === 'In Progress'
        ? 'Completed'
        : 'Scheduled';

    try {
      await operationService.updateOperation(op.id, { status: nextStatus });
      success(`Task status updated to ${nextStatus}`);
      loadData();
    } catch {
      toastError('Failed to update status');
    }
  };

  const handleDelete = (op: Operation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedOp(op);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedOp) return;
    try {
      await operationService.deleteOperation(selectedOp.id);
      success('Operation record removed');
      setIsDeleteOpen(false);
      loadData();
    } catch {
      toastError('Failed to delete operation');
    }
  };

  const columns: Column<Operation>[] = [
    {
      key: 'activityName',
      header: t('operations.activityName'),
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-neutral-900 block">{row.activityName}</span>
          {row.notes && <span className="text-[11px] text-neutral-500 block truncate max-w-xs">{row.notes}</span>}
        </div>
      ),
    },
    {
      key: 'projectName',
      header: t('common.project'),
      sortable: true,
      render: (row) => <span className="text-neutral-800 font-medium">{row.projectName}</span>,
    },
    {
      key: 'responsiblePerson',
      header: t('operations.responsiblePerson'),
      sortable: true,
      render: (row) => <span className="text-neutral-700">{row.responsiblePerson}</span>,
    },
    {
      key: 'date',
      header: t('operations.targetDate'),
      sortable: true,
      render: (row) => <span className="font-mono text-neutral-600 text-xs">{row.date}</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'center',
      sortable: true,
      render: (row) => <Badge status={row.priority} size="sm" />,
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      sortable: true,
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-2"
            onClick={() => handleToggleStatus(row)}
          >
            Advance
          </Button>
          <button
            onClick={(e) => handleDelete(row, e)}
            className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            {t('operations.title')}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t('operations.subtitle')}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenCreate}
        >
          {t('operations.addActivity')}
        </Button>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={operations}
        isLoading={isLoading}
        searchPlaceholder="Search task name, lead, notes or camp..."
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
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Delayed">Delayed</option>
            </select>
          </div>
        }
      />

      {/* Create Activity Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t('operations.addActivity')}
        subtitle="Schedule preventive maintenance, cleaning, or HSE audit task"
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
          <Input
            label={t('operations.activityName')}
            required
            value={formData.activityName}
            onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
            placeholder="e.g. Monthly Diesel Generator Filter Swap"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('operations.responsiblePerson')}
              required
              value={formData.responsiblePerson}
              onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
              placeholder="Lead Tech / Supervisor"
            />
            <Input
              label={t('operations.targetDate')}
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              options={['Low', 'Medium', 'High']}
            />
            <Select
              label={t('common.status')}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={['Scheduled', 'In Progress', 'Completed', 'Delayed']}
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

          <Textarea
            label="Task Scope & Procedures"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Details, safety equipment required, and expected duration"
          />
        </form>
      </Modal>

      {/* Confirm Delete */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Remove Activity"
        message="Are you sure you want to cancel and remove this scheduled operation task?"
        itemIdentifier={`TASK: ${selectedOp?.activityName}`}
        confirmLabel="Remove Task"
      />
    </div>
  );
};
