import React from 'react';
import { Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { useLanguage } from '../../i18n/LanguageContext';

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}> = ({ title, description, actionText, onAction, icon }) => {
  const { t } = useLanguage();

  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center max-w-sm mx-auto">
      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3 border border-neutral-200">
        {icon || <Inbox className="w-5 h-5 text-neutral-400" />}
      </div>
      <h4 className="text-sm font-semibold text-neutral-800 mb-1">
        {title || t('common.noData')}
      </h4>
      <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
        {description || t('common.noDataSubtitle')}
      </p>
      {actionText && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Something went wrong',
  message = "We couldn't load this information. Please check connection and try again.",
  onRetry,
}) => {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center max-w-md mx-auto">
      <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-3 border border-rose-200">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-neutral-900 mb-1">{title}</h4>
      <p className="text-xs text-neutral-500 mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
