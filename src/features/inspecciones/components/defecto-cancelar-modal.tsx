import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import type { InspeccionFilaResponse } from '../types/inspecciones.types';
import { inspeccionesApi } from '../api/inspecciones-api';

export interface DefectoCancelarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: InspeccionFilaResponse | null;
}

export function DefectoCancelarModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: DefectoCancelarModalProps) {
  const [codigoEsperado, setCodigoEsperado] = useState('');
  const [codigoIngresado, setCodigoIngresado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generar un número aleatorio de 6 dígitos cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setCodigoEsperado(code);
      setCodigoIngresado('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  const codigoValido = codigoIngresado.trim() === codigoEsperado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoValido) {
      setError('El código ingresado no coincide');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await inspeccionesApi.cancelarDetalleInspeccion(item.id, {
        codigoConfirmacion: codigoIngresado.trim(),
      });
      toast.success(
        `Defecto del lote ${item.lote} cancelado exitosamente`,
        { title: 'Defecto Cancelado' }
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar la inspección';
      setError(msg);
      toast.error(msg, { title: 'Error al Cancelar' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm w-full">
      <ModalHeader
        title="Cancelar Defecto de Inspección"
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1">
        <ModalBody className="space-y-4 pt-1">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
              <Icon name="error" size="16px" className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Resumen directo y limpio del elemento */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between font-bold text-slate-800">
              <span>Lote {item.lote}</span>
              <span className="text-danger">{item.paresDefectuosos} {item.paresDefectuosos === 1 ? 'par' : 'pares'}</span>
            </div>
            <p className="text-slate-600 truncate">{item.defectoNombre}</p>
          </div>

          <p className="text-[11px] text-text-muted text-center leading-relaxed">
            Las inspecciones no se editan ni se reactivan; si fue errónea se cancela y se debe volver a registrar.
          </p>

          {/* Código de confirmación */}
          <div className="space-y-2 text-center">
            <p className="text-xs text-slate-600">
              Escribe el código para confirmar la cancelación:
            </p>
            <div className="inline-block px-3 py-1 bg-rose-50 border border-rose-200 rounded-md font-mono text-base font-bold text-rose-700 tracking-wider">
              {codigoEsperado}
            </div>

            <Input
              type="text"
              maxLength={6}
              value={codigoIngresado}
              onChange={(e) => setCodigoIngresado(e.target.value.replace(/\D/g, ''))}
              placeholder="Código de 6 dígitos"
              required
              className="h-9 text-center text-sm font-mono tracking-widest mt-1"
              autoFocus
            />
          </div>
        </ModalBody>

        <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-8 text-xs px-3"
          >
            Volver
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={isSubmitting || !codigoValido}
            className="h-8 text-xs px-3 gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Spinner size="14px" />
                <span>Cancelando...</span>
              </>
            ) : (
              <>
                <Icon name="cancel" size="14px" />
                <span>Cancelar Defecto</span>
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
