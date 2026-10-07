import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Power,
  LayoutGrid,
  List,
  Copy,
  Check,
  Search,
  KeyRound,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { userService } from '../../services/userService';
import { projectService } from '../../services/projectService';
import { User, Project, UserRole } from '../../types';
import { DataTable, Column } from '../../components/tables/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/modals/Modal';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';

export const UsersPage: React.FC = () => {
  const { t, isRTL } = useLanguage();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View switch: 'cards' or 'table'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'USER' as UserRole,
    status: 'Active' as 'Active' | 'Inactive',
    projectId: '',
    password: 'User@123456',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [uData, pData] = await Promise.all([
        userService.getUsers({
          role: roleFilter === 'All' ? undefined : roleFilter,
          status: statusFilter === 'All' ? undefined : statusFilter,
          projectId: projectFilter === 'All' ? undefined : projectFilter,
        }),
        projectService.getProjects(),
      ]);
      setUsers(uData);
      setProjects(pData);
    } catch {
      toastError('Failed to load users directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      loadData();
    };
    window.addEventListener('camp_auth_user_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('camp_auth_user_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [roleFilter, statusFilter, projectFilter]);

  const toggleRevealPassword = (userId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    success(isRTL ? 'تم النسخ إلى الحافظة' : 'Copied to clipboard');
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      email: '',
      mobile: '+966 5',
      role: 'USER',
      status: 'Active',
      projectId: projects[0]?.id || '',
      password: 'User@123456',
    });
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user: User, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      status: user.status,
      projectId: user.projectId || (projects[0]?.id || ''),
      password: user.password || 'User@123456',
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (user: User, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = async (user: User, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await userService.toggleUserStatus(user.id);
      success(`User status changed to ${user.status === 'Active' ? 'Inactive' : 'Active'}`);
      loadData();
    } catch {
      toastError('Failed to update status');
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const proj = projects.find((p) => p.id === formData.projectId);
      await userService.createUser({
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        role: formData.role,
        status: formData.status,
        projectId: formData.projectId,
        projectName: proj?.name || '',
        password: formData.password || 'User@123456',
      });
      success('User added successfully');
      setIsCreateOpen(false);
      loadData();
    } catch {
      toastError('Failed to create user');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const proj = projects.find((p) => p.id === formData.projectId);
      await userService.updateUser(selectedUser.id, {
        name: formData.name,
        email: formData.email,
        mobile: formData.mobile,
        role: formData.role,
        status: formData.status,
        projectId: formData.projectId,
        projectName: proj?.name || '',
        password: formData.password || selectedUser.password || 'User@123456',
      });
      success('User details updated');
      setIsEditOpen(false);
      loadData();
    } catch {
      toastError('Failed to update user');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    try {
      await userService.deleteUser(selectedUser.id);
      success(`User ${selectedUser.name} removed`);
      setIsDeleteOpen(false);
      loadData();
    } catch {
      toastError('Failed to delete user');
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: t('users.name'),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.avatarUrl ? (
            <img
              src={row.avatarUrl}
              alt={row.name}
              className="w-7 h-7 rounded-full object-cover border border-orange-200 shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-xs shrink-0">
              {row.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <Link
              to={`/admin/users/${row.id}`}
              className="font-semibold text-neutral-900 hover:text-orange-600 transition"
            >
              {row.name}
            </Link>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('auth.email'),
      sortable: true,
      render: (row) => <span className="font-mono text-neutral-600 text-xs">{row.email}</span>,
    },
    {
      key: 'password',
      header: isRTL ? 'كلمة المرور' : 'Password',
      sortable: false,
      render: (row) => {
        const isRevealed = revealedPasswords[row.id];
        const isCopied = copiedId === row.id;
        const pwd = row.password || 'User@123456';
        return (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200 text-neutral-800">
              {isRevealed ? pwd : '••••••••'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleRevealPassword(row.id);
              }}
              className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100 transition"
              title={isRevealed ? 'Hide' : 'Reveal'}
            >
              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(pwd, row.id);
              }}
              className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-100 transition"
              title="Copy"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        );
      },
    },
    {
      key: 'mobile',
      header: t('users.mobile'),
      sortable: true,
      render: (row) => <span className="font-mono text-neutral-600 text-xs">{row.mobile}</span>,
    },
    {
      key: 'role',
      header: t('users.role'),
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-neutral-100 font-mono text-[11px] font-semibold text-neutral-700">
          {row.role}
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
      key: 'projectName',
      header: t('users.assignedProject'),
      sortable: true,
      render: (row) =>
        row.projectName ? (
          <span className="font-medium text-neutral-800">{row.projectName}</span>
        ) : (
          <span className="text-neutral-400 italic">{t('users.unassigned')}</span>
        ),
    },
    {
      key: 'reportsCount',
      header: t('projects.reportsCount'),
      align: 'center',
      sortable: true,
      render: (row) => (
        <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-800 font-bold border border-orange-200">
          {row.reportsCount}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (row) => <span className="text-neutral-400 font-mono text-[11px]">{row.createdAt}</span>,
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right',
      sortable: false,
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Link to={`/admin/users/${row.id}`} title="View Details">
            <button className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition">
              <Eye className="w-3.5 h-3.5" />
            </button>
          </Link>
          <button
            onClick={(e) => handleOpenEdit(row, e)}
            title="Edit User"
            className="p-1 rounded text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleToggleStatus(row, e)}
            title={row.status === 'Active' ? t('users.deactivate') : t('users.activate')}
            className={`p-1 rounded transition ${
              row.status === 'Active'
                ? 'text-neutral-500 hover:text-amber-600 hover:bg-neutral-100'
                : 'text-neutral-500 hover:text-emerald-600 hover:bg-neutral-100'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => handleOpenDelete(row, e)}
            title="Delete User"
            className="p-1 rounded text-neutral-500 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const filteredCardsUsers = useMemo(() => {
    let result = users;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.mobile.includes(q) ||
          (u.projectName && u.projectName.toLowerCase().includes(q))
      );
    }
    return result;
  }, [users, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
              {isRTL ? 'إدارة المستخدمين وبطاقات الحسابات' : 'Users, Credentials & Profiles Governance'}
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            {isRTL
              ? 'عرض بطاقات حسابات المستخدمين وصورهم ومشاريعهم وكلمات المرور مع إمكانية التعديل والإيقاف'
              : 'Inspect user profile cards, uploaded pictures, assigned projects, emails, and active passwords.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-lg border border-neutral-200">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">{isRTL ? 'بطاقات' : 'Cards'}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5 text-orange-600" />
              <span className="hidden sm:inline">{isRTL ? 'جدول' : 'Table'}</span>
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={handleOpenCreate}
          >
            {t('users.addUser')}
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-3 bg-white rounded-xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute start-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم، البريد، المشروع، أو الجوال...' : 'Search by name, email, project, or phone...'}
            className="w-full ps-8 pe-3 py-1.5 text-xs border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:outline-hidden focus:border-orange-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 px-2 text-xs border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:outline-hidden focus:border-orange-500"
          >
            <option value="All">{isRTL ? 'كافة الأدوار' : 'All Roles'}</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="USER">USER</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 text-xs border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:outline-hidden focus:border-orange-500"
          >
            <option value="All">{isRTL ? 'كافة الحالات' : 'All Statuses'}</option>
            <option value="Active">{isRTL ? 'نشط' : 'Active'}</option>
            <option value="Inactive">{isRTL ? 'معطل' : 'Inactive'}</option>
          </select>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-8 px-2 text-xs border border-neutral-300 rounded-lg bg-white text-neutral-700 focus:outline-hidden focus:border-orange-500"
          >
            <option value="All">{isRTL ? 'كافة المشاريع' : 'All Assigned Projects'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content: Cards or Table */}
      {viewMode === 'cards' ? (
        <div>
          {isLoading ? (
            <div className="p-12 text-center text-xs text-neutral-400 bg-white rounded-xl border border-neutral-200">
              {isRTL ? 'جارٍ تحميل بطاقات المستخدمين...' : 'Loading user profiles...'}
            </div>
          ) : filteredCardsUsers.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-400 bg-white rounded-xl border border-neutral-200">
              {isRTL ? 'لم يتم العثور على أي مستخدمين' : 'No users found matching current filters.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCardsUsers.map((u) => {
                const isRevealed = revealedPasswords[u.id];
                const isCopied = copiedId === u.id;
                const pwd = u.password || 'User@123456';

                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-xl bg-white border border-neutral-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* User Top Row: Image & Name */}
                      <div className="flex items-start gap-3 mb-3">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.name}
                            className="w-12 h-12 rounded-xl object-cover border border-orange-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <h3 className="font-bold text-sm text-neutral-900 truncate">{u.name}</h3>
                            <Badge status={u.status} size="sm" />
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-neutral-100 font-mono text-[10px] font-bold text-neutral-700">
                              {u.role}
                            </span>
                            {u.projectName ? (
                              <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-bold text-[10px] border border-orange-200 truncate">
                                {u.projectName}
                              </span>
                            ) : u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? (
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200 truncate">
                                {isRTL ? 'إدارة عامة' : 'Administration'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 text-[10px] truncate">
                                {isRTL ? 'غير معين' : 'Unassigned'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Credentials Box (Email & Password Display) */}
                      <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-neutral-500">
                            {isRTL ? 'البريد الإلكتروني:' : 'Email:'}
                          </span>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono font-medium text-neutral-800 text-[11px] truncate select-all">
                              {u.email}
                            </span>
                            <button
                              onClick={() => copyToClipboard(u.email, `mail-${u.id}`)}
                              className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200/60 transition"
                              title="Copy Email"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Password with Eye Toggle */}
                        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-neutral-200/70">
                          <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                            <KeyRound className="w-3 h-3 text-orange-600" />
                            {isRTL ? 'كلمة المرور:' : 'Password:'}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-neutral-900 bg-white px-2 py-0.5 rounded border border-neutral-200 text-xs">
                              {isRevealed ? pwd : '••••••••••••'}
                            </span>
                            <button
                              onClick={() => toggleRevealPassword(u.id)}
                              className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200/60 transition"
                              title={isRevealed ? 'Hide Password' : 'Show Password'}
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5 text-neutral-600" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => copyToClipboard(pwd, u.id)}
                              className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200/60 transition"
                              title="Copy Password"
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400 pt-0.5">
                          <span>{isRTL ? 'الجوال:' : 'Mobile:'}</span>
                          <span className="font-mono">{u.mobile || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                      <button
                        onClick={(e) => handleToggleStatus(u, e)}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded transition ${
                          u.status === 'Active'
                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {u.status === 'Active' ? (isRTL ? 'تعطيل الحساب' : 'Deactivate') : (isRTL ? 'تنشيط الحساب' : 'Activate')}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleOpenEdit(u, e)}
                          className="p-1.5 text-neutral-500 hover:text-orange-600 hover:bg-orange-50 rounded transition"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleOpenDelete(u, e)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          isLoading={isLoading}
          searchPlaceholder="Search user name, email, mobile or camp..."
        />
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={t('users.addUser')}
        subtitle="Register new camp manager or supervisor account"
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
            label={t('users.name')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Khalid Al-Otaibi"
          />
          <Input
            label={t('users.email')}
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@zahran.camp"
          />
          <Input
            label={isRTL ? 'كلمة المرور' : 'Account Password'}
            type="text"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="User@123456"
          />
          <Input
            label={t('users.mobile')}
            required
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
            placeholder="+966 50 123 4567"
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('users.role')}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              options={[
                { value: 'USER', label: 'USER (Field Officer)' },
                { value: 'ADMIN', label: 'ADMIN (Manager)' },
                { value: 'SUPER_ADMIN', label: 'SUPER_ADMIN' },
              ]}
            />
            <Select
              label={t('common.status')}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={['Active', 'Inactive']}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              {t('users.assignedProject')}
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">No Project Assigned</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.location})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={t('users.editUser')}
        subtitle={`Update configuration for ${selectedUser?.name}`}
        maxWidth="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <Input
            label={t('users.name')}
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label={t('users.email')}
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label={isRTL ? 'كلمة المرور' : 'Account Password'}
            type="text"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <Input
            label={t('users.mobile')}
            required
            value={formData.mobile}
            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('users.role')}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              options={[
                { value: 'USER', label: 'USER (Field Officer)' },
                { value: 'ADMIN', label: 'ADMIN (Manager)' },
                { value: 'SUPER_ADMIN', label: 'SUPER_ADMIN' },
              ]}
            />
            <Select
              label={t('common.status')}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              options={['Active', 'Inactive']}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1">
              {t('users.assignedProject')}
            </label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full h-9 px-3 bg-white border border-neutral-300 rounded-md text-xs text-neutral-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="">No Project Assigned</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.location})
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('users.deleteUser')}
        message="Are you sure you want to permanently remove this user account? They will lose access to camp portals."
        itemIdentifier={`USER: ${selectedUser?.name} (${selectedUser?.email})`}
        confirmLabel={t('users.deleteUser')}
        isDestructive={true}
      />
    </div>
  );
};
