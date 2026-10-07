import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface BadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '', size = 'md' }) => {
  const { t } = useLanguage();

  const getStyle = (s: string) => {
    switch (s.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'in stock':
      case 'available':
      case 'normal':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'pending':
      case 'under review':
      case 'low stock':
      case 'on leave':
      case 'in progress':
      case 'scheduled':
      case 'medium':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'critical':
      case 'out of service':
      case 'delayed':
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-300';
      case 'maintenance':
      case 'occupied':
        return 'bg-orange-50 text-orange-800 border-orange-300';
      case 'draft':
      case 'archived':
      case 'inactive':
      case 'transferred':
      case 'low':
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  const sizeClass = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
  const label = t(`status.${status}`, status);

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-2xs whitespace-nowrap ${sizeClass} ${getStyle(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full me-1.5 bg-current opacity-70" />
      {label}
    </span>
  );
};
