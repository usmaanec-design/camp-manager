import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Archive, Eye, FolderKanban, Users, Compass } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { projectService } from '../../services/projectService';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { Project, User } from '../../types';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/modals/Modal';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../contexts/ToastContext';
import { UsersPage } from './UsersPage';

export const ProjectsPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, switchRole } = useAuth();

  const activeTab = searchParams.get('tab') === 'users' ? 'users' : 'projects';

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    description: '',
    campCapacity: 500,
    currentOccupancy: 0,
    status: 'Active' as Project['status'],
    managerName: '',
    managerContact: '',
  });

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectService.getProjects({
        status: statusFilter === 'All' ? undefined : statusFilter,
      });
      setProjects(data);
    } catch {
      toastError('Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();

    const handleSync = () => {
      loadProjects();
    };
    window.addEventListener('camp_projects_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('camp_projects_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [statusFilter]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: `PRJ-NEW-${Math.floor(10 + Math.random() * 90)}`,
      location: '',
      description: '',
      campCapacity: 600,
      currentOccupancy: 0,
      status: 'Active',
      managerName: '',
      managerContact: '+966 50 ',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setFormData({
      name: project.name,
      code: project.code,
      location: project.location,
      description: project.description,
      campCapacity: project.campCapacity,
      currentOccupancy: project.currentOccupancy,
      status: project.status,
      managerName: project.managerName,
      managerContact: project.managerContact,
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProject(project);
    setIsDeleteOpen(true);
  };

  const handleOpenUserMode = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const allUsers = await userService.getUsers();
      // Look for an existing user assigned to this project
      const matchedUser = allUsers.find(
        (u) =>
          u.projectId === project.id ||
          (u.projectName && u.projectName.toLowerCase() === project.name.toLowerCase())
      );

      const targetUser: User = matchedUser
        ? {
            ...matchedUser,
            role: 'USER',
            projectId: project.id,
            projectName: project.name,
          }
        : {
            id: `usr-proj-${project.id}`,
            name: `${project.name} Officer`,
            email: `user@${project.code.toLowerCase().replace(/[^a-z0-9]/g, '') || 'camp'}.camp`,
            mobile: project.managerContact || '+966 50 000 0000',
            role: 'USER',
            status: 'Active',
            projectId: project.id,
            projectName: project.name,
            createdAt: new Date().toISOString().split('T')[0],
            lastActivity: 'Just now',
            reportsCount: 0,
            password: 'User@123456',
          };

      // Set admin preview state so the top banner shows in User Mode
      localStorage.setItem(
        'camps_manager_admin_preview',
        JSON.stringify({
          projectId: project.id,
          projectName: project.name,
          adminEmail: user?.email || 'admin@zahran.camp',
          adminName: user?.name || 'Admin',
        })
      );

      localStorage.setItem('camps_manager_auth_user', JSON.stringify(targetUser));
      switchRole('USER');
      success(
        isRTL
          ? `جارٍ فتح وضع المستخدم لمشروع: ${project.name}`
          : `Entering Field User Mode for: ${project.name}`
      );
      navigate('/app');
    } catch {
      toastError('Failed to open project in user mode');
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await projectService.createProject(formData);
      success('Project created successfully');
      setIsCreateOpen(false);
      loadProjects();
    } catch {
      toastError('Unable to create project');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      await projectService.updateProject(selectedProject.id, formData);
      success('Project updated successfully');
      setIsEditOpen(false);
      loadProjects();
    } catch {
      toastError('Unable to update project');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProject) return;
    try {
      await projectService.deleteProject(selectedProject.id);
      success(`Project ${selectedProject.name} deleted`);
      setIsDeleteOpen(false);
      loadProjects();
    } catch {
      toastError('Failed to delete project');
    }
  };

  const handleArchive = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await projectService.updateProject(project.id, { status: 'Archived' });
      success(`Project ${project.name} archived`);
      loadProjects();
    } catch {
      toastError('Failed to archive project');
    }
  };

  const columns: Column<Project>[] = [
    {
      key: 'name',
      header: t('projects.name'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/projects/${row.id}`}
            className="font-semibold text-neutral-900 hover:text-orange-600 transition"
          >
            {row.name}
          </Link>
          <span className="text-[10px] text-neutral-400 font-mono">({row.code})</span>
        </div>
      ),
    },
    {
      key: 'location',
      header: t('projects.location'),
      sortable: true,
      render: (row) => <span className="text-neutral-600">{row.location}</span>,
    },
    {
      key: 'status',
      header: t('common.status'),
      align: 'center',
      sortable: true,
      render: (row) => <Badge status={row.status} size="sm" />,
    },
    {
      key: 'occupancy',
      header: 'Capacity & Occupancy',
      align: 'right',
      render: (row) => {
        const pct = Math.round((row.currentOccupancy / (row.campCapacity || 1)) * 100);
        return (
          <div className="text-end">
            <span className="font-semibold text-neutral-900">
              {row.currentOccupancy} / {row.campCapacity}
            </span>
            <span className="text-[10px] text-neutral-400 block">({pct}%)</span>
          </div>
        );
      },
    },
    {
      key: 'usersCount',
      header: t('projects.usersCount'),
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-neutral-100 font-medium text-neutral-800">
          {row.usersCount}
        </span>
      ),
    },
    {
      key: 'reportsCount',
      header: t('projects.reportsCount'),
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-800 font-semibold border border-orange-200">
          {row.reportsCount}
        </span>
      ),
    },
    {
      key: 'lastActivity',
      header: t('projects.lastActivity'),
      sortable: true,
      render: (row) => <span className="text-neutral-400 font-mono text-[11px]">{row.lastActivity}</span>,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right',
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5 flex-wrap">
          {/* Dedicated View in User Mode Button */}
          <button
            onClick={(e) => handleOpenUserMode(row, e)}
            title={isRTL ? `معاينة وضع المستخدم لمشروع: ${row.name}` : `View User Mode for ${row.name}`}
            className="px-2 py-1 rounded bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200 hover:border-orange-600 transition flex items-center gap-1 text-[11px] font-semibold shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{isRTL ? 'وضع المستخدم' : 'User Mode'}</span>
          </button>

          <Link to={`/admin/projects/${row.id}`} title="View Details">
            <button className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition">
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Link>
          <button
            onClick={(e) => handleOpenEdit(row, e)}
            title="Edit Project"
            className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleArchive(row, e)}
            title="Archive"
            className="p-1 rounded text-neutral-500 hover:text-amber-600 hover:bg-neutral-100 transition"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleOpenDelete(row, e)}
            title="Delete Project"
            className="p-1 rounded text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Tab Switcher inside Projects */}
      <div className="flex border-b border-neutral-200 gap-2 bg-white px-4 pt-3 rounded-xl border shadow-2xs">
        <button
          onClick={() => setSearchParams({ tab: 'projects' })}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'projects'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>{isRTL ? 'إدارة المشاريع والمخيمات' : 'Projects Directory'}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-neutral-100 text-neutral-700 font-bold">
            {projects.length}
          </span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'users' })}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-orange-600 text-orange-600 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isRTL ? 'المستخدمين والحسابات' : 'Users & Profiles'}</span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <UsersPage />
      ) : (
        <>
          {/* Projects Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
            <div>
              <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                {t('projects.title')}
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                {t('projects.subtitle')}
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={handleOpenCreate}
            >
              {t('projects.createProject')}
            </Button>
          </div>

          {/* Projects Table */}
          <DataTable
            columns={columns}
            data={projects}
            isLoading={isLoading}
            searchPlaceholder="Search project name, code, or location..."
            filterComponent={
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2 text-xs border border-neutral-300 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="Archived">Archived</option>
              </select>
            }
          />
        </>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t('projects.createProject')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveCreate}>
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveCreate} className="space-y-3">
          <Input
            label={t('projects.name')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Sharq Camp Project"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('projects.code')}
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
            <Input
              label={t('projects.location')}
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Eastern Province"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Camp Capacity"
              type="number"
              required
              value={formData.campCapacity}
              onChange={(e) => setFormData({ ...formData, campCapacity: Number(e.target.value) })}
            />
            <Input
              label="Initial Occupancy"
              type="number"
              required
              value={formData.currentOccupancy}
              onChange={(e) => setFormData({ ...formData, currentOccupancy: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('projects.manager')}
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
            />
            <Input
              label={t('projects.contact')}
              value={formData.managerContact}
              onChange={(e) => setFormData({ ...formData, managerContact: e.target.value })}
            />
          </div>

          <Textarea
            label="Operational Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={t('projects.editProject')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <Input
            label={t('projects.name')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('projects.code')}
              required
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
            <Input
              label={t('projects.location')}
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Camp Capacity"
              type="number"
              required
              value={formData.campCapacity}
              onChange={(e) => setFormData({ ...formData, campCapacity: Number(e.target.value) })}
            />
            <Input
              label="Current Occupancy"
              type="number"
              required
              value={formData.currentOccupancy}
              onChange={(e) => setFormData({ ...formData, currentOccupancy: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('projects.manager')}
              value={formData.managerName}
              onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
            />
            <Input
              label={t('projects.contact')}
              value={formData.managerContact}
              onChange={(e) => setFormData({ ...formData, managerContact: e.target.value })}
            />
          </div>

          <Textarea
            label="Operational Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </form>
      </Modal>

      {/* Delete Project Confirmation Dialog */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('projects.deleteProject')}
        message={t('projects.deleteWarning')}
        itemIdentifier={`PROJECT: ${selectedProject?.name} (${selectedProject?.code})`}
        confirmLabel={t('projects.deleteProject')}
        isDestructive={true}
      />
    </div>
  );
};
