import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { inventoryService } from '../../services/inventoryService';
import { projectService } from '../../services/projectService';
import { InventoryItem, Project } from '../../types';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/modals/Modal';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';

export const InventoryPage: React.FC = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [projectFilter, setProjectFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState(10);

  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Safety & PPE' as InventoryItem['category'],
    quantity: 100,
    unit: 'pcs' as InventoryItem['unit'],
    minimumLevel: 25,
    status: 'In Stock' as InventoryItem['status'],
    lastRestocked: new Date().toISOString().split('T')[0],
    projectId: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [iData, pData] = await Promise.all([
        inventoryService.getInventory({
          projectId: projectFilter === 'All' ? undefined : projectFilter,
          category: categoryFilter === 'All' ? undefined : categoryFilter,
          status: statusFilter === 'All' ? undefined : statusFilter,
        }),
        projectService.getProjects(),
      ]);
      setItems(iData);
      setProjects(pData);
    } catch {
      toastError('Failed to load inventory data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectFilter, categoryFilter, statusFilter]);

  const handleOpenCreate = () => {
    setFormData({
      itemName: '',
      category: 'Safety & PPE',
      quantity: 50,
      unit: 'pcs',
      minimumLevel: 20,
      status: 'In Stock',
      lastRestocked: new Date().toISOString().split('T')[0],
      projectId: projects[0]?.id || '',
    });
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const proj = projects.find((p) => p.id === formData.projectId);
      const computedStatus: InventoryItem['status'] =
        formData.quantity <= formData.minimumLevel / 2
          ? 'Critical'
          : formData.quantity <= formData.minimumLevel
          ? 'Low Stock'
          : 'In Stock';

      await inventoryService.createItem({
        ...formData,
        status: computedStatus,
        projectName: proj?.name || '',
      });
      success('Inventory item registered');
      setIsCreateOpen(false);
      loadData();
    } catch {
      toastError('Failed to add item');
    }
  };

  const handleOpenRestock = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setRestockQty(25);
    setIsRestockOpen(true);
  };

  const handleSaveRestock = async () => {
    if (!selectedItem) return;
    try {
      const newQty = selectedItem.quantity + restockQty;
      const newStatus: InventoryItem['status'] =
        newQty <= selectedItem.minimumLevel / 2
          ? 'Critical'
          : newQty <= selectedItem.minimumLevel
          ? 'Low Stock'
          : 'In Stock';

      await inventoryService.updateItem(selectedItem.id, {
        quantity: newQty,
        status: newStatus,
        lastRestocked: new Date().toISOString().split('T')[0],
      });
      success(`Restocked ${restockQty} ${selectedItem.unit} for ${selectedItem.itemName}`);
      setIsRestockOpen(false);
      loadData();
    } catch {
      toastError('Failed to restock item');
    }
  };

  const handleDelete = (item: InventoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    try {
      await inventoryService.deleteItem(selectedItem.id);
      success(`Item ${selectedItem.itemName} removed from inventory`);
      setIsDeleteOpen(false);
      loadData();
    } catch {
      toastError('Failed to delete item');
    }
  };

  const columns: Column<InventoryItem>[] = [
    {
      key: 'itemName',
      header: t('inventory.itemName'),
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-semibold text-neutral-900 block">{row.itemName}</span>
          <span className="text-[10px] text-neutral-400 block">{row.category}</span>
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
      key: 'quantity',
      header: t('inventory.quantity'),
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-bold text-neutral-900 font-mono text-sm">
          {row.quantity} <span className="text-xs text-neutral-500 font-normal">{row.unit}</span>
        </span>
      ),
    },
    {
      key: 'minimumLevel',
      header: t('inventory.minLevel'),
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-neutral-600 text-xs">
          {row.minimumLevel} {row.unit}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      sortable: true,
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      key: 'lastRestocked',
      header: 'Last Restocked',
      sortable: true,
      render: (row) => <span className="font-mono text-neutral-400 text-[11px]">{row.lastRestocked}</span>,
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
            onClick={(e) => handleOpenRestock(row, e)}
          >
            Restock
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

  // Compute inventory counts per project
  const projectStats = React.useMemo(() => {
    const map = new Map<string, { totalPcs: number; itemsCount: number }>();
    projects.forEach((p) => map.set(p.id, { totalPcs: 0, itemsCount: 0 }));

    let totalAllPcs = 0;
    items.forEach((it) => {
      totalAllPcs += it.quantity || 0;
      if (it.projectId && map.has(it.projectId)) {
        const cur = map.get(it.projectId)!;
        cur.totalPcs += it.quantity || 0;
        cur.itemsCount += 1;
      }
    });

    return {
      byProject: map,
      totalAllPcs,
      totalAllItems: items.length,
    };
  }, [projects, items]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
            {t('inventory.title')}
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {t('inventory.subtitle')}
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={handleOpenCreate}
        >
          {t('inventory.addItem')}
        </Button>
      </div>

      {/* Top Small Project Summary Tiles */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 px-0.5">
          <span>{projectFilter === 'All' ? 'All Projects Inventory Summary' : 'Projects Inventory Summary'}</span>
          <span className="text-[11px] text-neutral-400 font-normal">
            Click any project tile to filter inventory below
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* All Projects Tile */}
          <button
            type="button"
            onClick={() => setProjectFilter('All')}
            className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
              projectFilter === 'All'
                ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
            }`}
          >
            <div className="flex items-center justify-between gap-1 w-full mb-1">
              <span className="text-xs font-bold text-neutral-900 truncate">
                All Projects
              </span>
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            </div>

            <div className="text-[11px] pt-1 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[10px] text-neutral-400">Total Stock</span>
              <span className="font-bold text-neutral-900 text-xs">
                {projectStats.totalAllPcs.toLocaleString()} <span className="font-normal text-[10px] text-neutral-500">pcs</span>
              </span>
            </div>
          </button>

          {/* Individual Project Tiles */}
          {projects.map((proj) => {
            const isSelected = projectFilter === proj.id;
            const stats = projectStats.byProject.get(proj.id) || { totalPcs: 0, itemsCount: 0 };

            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => setProjectFilter(proj.id)}
                className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-orange-50/70 border-orange-500 ring-2 ring-orange-500/20 shadow-xs'
                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full mb-1">
                  <span className="text-xs font-bold text-neutral-900 truncate" title={proj.name}>
                    {proj.name}
                  </span>
                  <span className="text-[10px] text-orange-600 font-semibold">{stats.itemsCount} items</span>
                </div>

                <div className="text-[11px] pt-1 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-400">Total Stock</span>
                  <span className="font-bold text-orange-600 text-xs">
                    {stats.totalPcs.toLocaleString()} <span className="font-normal text-[10px] text-neutral-500">pcs</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={items}
        isLoading={isLoading}
        searchPlaceholder="Search inventory item name, category or camp..."
        filterComponent={
          <div className="flex items-center gap-2 flex-wrap">
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700"
            >
              <option value="All">All Categories</option>
              <option value="Safety & PPE">Safety & PPE</option>
              <option value="Cleaning Supplies">Cleaning Supplies</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Food & Beverage">Food & Beverage</option>
              <option value="Linen & Bedding">Linen & Bedding</option>
              <option value="Tools & Hardware">Tools & Hardware</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        }
      />

      {/* Add Item Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t('inventory.addItem')}
        subtitle="Register camp supplies, PPE, or maintenance spare parts"
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
            label={t('inventory.itemName')}
            required
            value={formData.itemName}
            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            placeholder="e.g. Industrial Dust Masks N95"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('inventory.category')}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
              options={[
                'Safety & PPE',
                'Cleaning Supplies',
                'Maintenance',
                'Food & Beverage',
                'Linen & Bedding',
                'Tools & Hardware',
              ]}
            />
            <Select
              label={t('inventory.unit')}
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
              options={['pcs', 'boxes', 'liters', 'sets', 'rolls']}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('inventory.quantity')}
              type="number"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
            />
            <Input
              label={t('inventory.minLevel')}
              type="number"
              required
              value={formData.minimumLevel}
              onChange={(e) => setFormData({ ...formData, minimumLevel: Number(e.target.value) })}
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

      {/* Restock Modal */}
      <Modal
        isOpen={isRestockOpen}
        onClose={() => setIsRestockOpen(false)}
        title="Restock Inventory Quantity"
        subtitle={`Add shipment or purchase batch for ${selectedItem?.itemName}`}
        maxWidth="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsRestockOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveRestock}>
              Confirm Restock
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-xs">
            <p className="text-neutral-500">Current Stock:</p>
            <p className="text-base font-bold text-neutral-900">
              {selectedItem?.quantity} {selectedItem?.unit}
            </p>
          </div>
          <Input
            label={`Additional Quantity (${selectedItem?.unit || 'units'})`}
            type="number"
            min={1}
            value={restockQty}
            onChange={(e) => setRestockQty(Number(e.target.value))}
          />
        </div>
      </Modal>

      {/* Delete Item Confirmation */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Inventory Record"
        message="Are you sure you want to remove this supply item from inventory tracking?"
        itemIdentifier={`ITEM: ${selectedItem?.itemName}`}
        confirmLabel="Delete Item"
      />
    </div>
  );
};
