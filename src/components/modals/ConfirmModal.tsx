import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemIdentifier?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemIdentifier,
  confirmLabel,
  cancelLabel,
  isDestructive = true,
  isLoading = false,
}) => {
  const { t } = useLanguage();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel || t('common.confirm')}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 items-start">
        <div className={`p-2 rounded-full shrink-0 ${isDestructive ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-2">
          <p className="text-xs text-neutral-600 leading-relaxed">{message}</p>
          {itemIdentifier && (
            <div className="p-2 rounded bg-neutral-100 border border-neutral-200 text-xs font-mono text-neutral-800 font-semibold">
              {itemIdentifier}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
