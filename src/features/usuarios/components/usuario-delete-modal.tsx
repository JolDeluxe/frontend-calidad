import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { UsuarioItem } from '../types/usuarios.types';

export interface UsuarioDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuario: UsuarioItem | null;
  onConfirm: (usuario: UsuarioItem) => Promise<void>;
}

export function UsuarioDeleteModal({
  isOpen,
  onClose,
  usuario,
  onConfirm,
}: UsuarioDeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !usuario) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(usuario);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al desactivar usuario';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <ModalHeader title="Desactivar Cuenta de Usuario" onClose={onClose} />
      <ModalBody className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
            <Icon name="error" size="16px" className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}
        <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 space-y-2">
          <div className="flex items-center gap-2 text-danger font-medium text-sm">
            <Icon name="warning" size="18px" />
            <span>Confirmación de Desactivación</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            ¿Confirma que desea desactivar al usuario{' '}
            <strong className="text-text-primary">
              {usuario.nombre} ({usuario.usuario})
            </strong>?
          </p>
          <p className="text-xs text-text-muted">
            El usuario perderá acceso inmediato al sistema y sus sesiones activas serán revocadas. Podrá reactivarlo en cualquier momento desde el menú de opciones.
          </p>
        </div>
      </ModalBody>
      <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="h-9 text-xs px-4"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="h-9 text-xs px-4 font-bold"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-1.5">
              <Spinner size="xs" />
              <span>Desactivando...</span>
            </span>
          ) : (
            'Desactivar Usuario'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
