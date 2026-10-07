import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Mail, Phone, Building2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { userService } from '../../services/userService';
import { reportService } from '../../services/reportService';
import { User, Report } from '../../types';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadUserData = async () => {
      setIsLoading(true);
      try {
        const [uData, rData] = await Promise.all([
          userService.getUserById(userId),
          reportService.getReports({ userId }),
        ]);
        setUser(uData);
        setReports(rData);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <EmptyState
        title="User Not Found"
        description="The requested user account was not located."
        actionText="Back to Directory"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: t('nav.users'), href: '/admin/users' },
          { label: user.name },
        ]}
      />

      {/* User Header Profile Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs">
              {user.name.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{user.name}</h1>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-semibold border border-neutral-200">
                  {user.role}
                </span>
                <Badge status={user.status} size="sm" />
              </div>

              <div className="flex items-center gap-4 text-xs text-neutral-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  {user.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  {user.mobile}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                  {user.projectName || t('users.unassigned')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link to={`/admin/reports?userId=${user.id}`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {t('users.viewAllReports')} ({reports.length})
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Details & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader title={t('users.accountInfo')} subtitle="Identity and timeline" />
          <CardContent className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-neutral-500">System Role:</span>
              <span className="font-mono font-semibold text-neutral-800">{user.role}</span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-neutral-500">Account Status:</span>
              <Badge status={user.status} size="sm" />
            </div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <span className="text-neutral-500">Registered Date:</span>
              <span className="font-mono text-neutral-700">{user.createdAt}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Last Recorded Activity:</span>
              <span className="font-mono text-neutral-700">{user.lastActivity}</span>
            </div>
          </CardContent>
        </Card>

        {/* User Reports Table (2 Cols) */}
        <Card className="md:col-span-2">
          <CardHeader
            title={t('users.userReports')}
            subtitle={`Reports submitted by ${user.name}`}
            action={
              <Link to={`/admin/reports?userId=${user.id}`}>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Filter in Reports
                </Button>
              </Link>
            }
          />
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 uppercase text-[11px]">
                  <tr>
                    <th className="p-2.5">Report #</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Title</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-neutral-400">
                        No reports submitted by this user yet.
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id} className="hover:bg-neutral-50">
                        <td className="p-2.5 font-mono font-semibold text-neutral-900">
                          {r.reportNumber}
                        </td>
                        <td className="p-2.5 text-neutral-600">{r.reportType}</td>
                        <td className="p-2.5 font-medium text-neutral-900 max-w-xs truncate">
                          {r.title}
                        </td>
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
      </div>
    </div>
  );
};
