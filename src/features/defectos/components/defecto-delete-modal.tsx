import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { Defecto } from '../types/defectos.types';

export interface DefectoDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  defecto: Defecto | null;
  onConfirm: (defecto: Defecto) => Promise<void>;
}

export function DefectoDeleteModal({
  isOpen,
  onClose,
  defecto,
  onConfirm,
}: DefectoDeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !defecto) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm(defecto);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar defecto';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md max-h-[90vh]">
      <ModalHeader title="Eliminar Defecto" onClose={onClose} />
      <ModalBody className="space-y-4 overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
            {error}
          </div>
        )}
        <div className="p-4 rounded-xl bg-danger/5 border border-danger/20 space-y-2">
          <div className="flex items-center gap-2 text-danger font-medium text-sm">
            <Icon name="warning" size="18px" />
            <span>Confirmación de Eliminación Lógica</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            ¿Confirma que desea eliminar el defecto{' '}
            <strong className="text-text-primary">#{defecto.clave} - {defecto.defecto}</strong>?
          </p>
          <p className="text-xs text-text-muted">
            El defecto dejará de ser seleccionable para nuevas capturas. El historial previo se preservará intacto y podrá ser reactivado en cualquier momento desde &quot;Ver Eliminados&quot;.
          </p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="cancelar" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={isSubmitting}
          icon={isSubmitting ? undefined : 'delete'}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Spinner size="xs" />
              Eliminando...
            </span>
          ) : (
            'Confirmar Eliminación'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
