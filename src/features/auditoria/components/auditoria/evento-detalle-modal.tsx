import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import type { EventoAuditoria } from '../../types/auditoria.types';

export interface EventoDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventoAuditoria | null;
}

export function EventoDetalleModal({ isOpen, onClose, event }: EventoDetalleModalProps) {
  if (!isOpen || !event) return null;

  const desc = event.detalles?.descripcion || event.motivo || 'Sin descripción detallada';
  const valAnt = event.detalles?.valoresAnteriores;
  const valPost = event.detalles?.valoresPosteriores;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
      <ModalHeader
        title={`Detalle de Evento de Auditoría #${event.id}`}
        onClose={onClose}
      />
      <ModalBody className="space-y-4 pt-1 text-xs">
        {/* Metadatos Generales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Acción
            </span>
            <span className="font-mono font-bold text-slate-900">{event.accion}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Entidad
            </span>
            <span className="font-bold text-slate-800">
              {event.entidad} {event.entidadId ? `#${event.entidadId}` : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Usuario
            </span>
            <span className="font-semibold text-slate-800">{event.usuario?.usuario || 'Sistema'}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Terminal
            </span>
            <span className="font-mono font-semibold text-slate-800">
              {event.terminal?.nombre || '—'}
            </span>
          </div>
        </div>

        {/* Descripción y Motivo */}
        <div className="space-y-2">
          <div>
            <span className="font-bold text-slate-700 block">Descripción:</span>
            <p className="p-2.5 bg-white border border-slate-200 rounded-md text-slate-800 font-sans">
              {desc}
            </p>
          </div>
          {event.motivo && (
            <div>
              <span className="font-bold text-slate-700 block">Motivo Registrado:</span>
              <p className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-md text-amber-900 font-sans">
                {event.motivo}
              </p>
            </div>
          )}
        </div>

        {/* Criptografía SHA-256 */}
        <div className="p-3 bg-slate-900 text-slate-200 rounded-lg space-y-2 font-mono text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <Icon name="lock" size="14px" />
            <span>Encadenamiento Criptográfico SHA-256</span>
          </div>
          <div className="space-y-1">
            <div className="truncate">
              <span className="text-slate-500">Hash de Integridad:</span>{' '}
              <span className="text-emerald-300 font-bold">{event.hashIntegridad || 'N/A'}</span>
            </div>
            <div className="truncate">
              <span className="text-slate-500">IP de Origen:</span>{' '}
              <span className="text-slate-400">{event.ipOrigen || '127.0.0.1'}</span>
            </div>
          </div>
        </div>

        {/* Valores JSON */}
        {(valAnt || valPost) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {valAnt && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">Valores Anteriores:</span>
                <pre className="p-2.5 bg-slate-100 rounded-md text-[10px] font-mono overflow-auto max-h-40 border border-slate-200 text-slate-700">
                  {JSON.stringify(valAnt, null, 2)}
                </pre>
              </div>
            )}
            {valPost && (
              <div>
                <span className="font-bold text-slate-700 block mb-1">Valores Posteriores:</span>
                <pre className="p-2.5 bg-slate-100 rounded-md text-[10px] font-mono overflow-auto max-h-40 border border-slate-200 text-slate-700">
                  {JSON.stringify(valPost, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter className="flex justify-end border-t border-border pt-3">
        <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs px-4">
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
