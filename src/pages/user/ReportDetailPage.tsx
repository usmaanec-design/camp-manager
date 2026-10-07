import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, User, Paperclip, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../services/reportService';
import { Report } from '../../types';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

export const ReportDetailPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();

  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    if (!reportId) return;

    const loadReport = async () => {
      setIsLoading(true);
      try {
        const data = await reportService.getReportById(reportId);
        if (data) {
          // Verify user ownership in user portal
          if (user && data.userId !== user.id && user.role === 'USER') {
            setIsUnauthorized(true);
          } else {
            setReport(data);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [reportId, user]);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <EmptyState
        title="Unauthorized Access"
        description="You do not have permission to view another officer's private report."
        actionText="Back to My Reports"
        onAction={() => window.history.back()}
      />
    );
  }

  if (!report) {
    return (
      <EmptyState
        title="Report Not Found"
        description="The requested report record could not be found."
        actionText="Back to My Reports"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to="/app/reports"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Reports</span>
        </Link>
      </div>

      {/* Report Header Card */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-neutral-100 font-bold text-neutral-900 border border-neutral-200">
                {report.reportNumber}
              </span>
              <Badge status={report.status} size="sm" />
              <Badge status={report.priority} size="sm" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{report.title}</h1>
            <div className="flex items-center gap-3 text-xs text-neutral-500 pt-1 flex-wrap">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                {report.projectName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-neutral-400" />
                {report.userName}
              </span>
              <span>•</span>
              <span className="font-mono text-neutral-400">{report.createdAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Details */}
      <Card>
        <CardHeader title="Operational Observation & Description" subtitle={report.reportType} />
        <CardContent className="space-y-4 text-xs">
          <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-800 leading-relaxed text-sm whitespace-pre-line">
            {report.description}
          </div>

          {report.notes && (
            <div className="space-y-1">
              <h4 className="font-semibold text-neutral-900">Field Supervisor Notes:</h4>
              <p className="p-3 bg-neutral-100/70 rounded border border-neutral-200 text-neutral-700">
                {report.notes}
              </p>
            </div>
          )}

          {/* Attachments list */}
          {report.attachments && report.attachments.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-neutral-500" />
                Attached Inspection Documents:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {report.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded bg-white border border-neutral-200"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-orange-600 shrink-0" />
                      <span className="font-medium text-neutral-800 truncate">{att.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-neutral-500 shrink-0">{att.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit History Timeline */}
          <div className="pt-4 border-t border-neutral-100 space-y-2">
            <h4 className="font-semibold text-neutral-900">Governance Timeline:</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-neutral-900">Report Created and Logged</p>
                  <p className="text-[11px] text-neutral-400 font-mono">{report.createdAt}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <div>
                  <p className="font-semibold text-neutral-900">Last Updated</p>
                  <p className="text-[11px] text-neutral-400 font-mono">{report.updatedAt}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
