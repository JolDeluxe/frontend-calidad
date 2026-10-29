import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DefectoClasificacionIndicator } from '@/features/defectos/components/defecto-clasificacion-indicator';
import type { InspeccionFilaResponse } from '../types/registro.types';

export interface RegistroDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InspeccionFilaResponse | null;
}

export function RegistroDetalleModal({ isOpen, onClose, item }: RegistroDetalleModalProps) {
  if (!item) return null;

  const fechaFormateada = (() => {
    try {
      return new Date(item.fecha).toLocaleString('es-MX', {
        dateStyle: 'full',
        timeStyle: 'medium',
      });
    } catch {
      return item.fecha;
    }
  })();

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl max-h-[90vh]">
      <ModalHeader
        title={`Detalle de Registro #${item.folio}`}
        onClose={onClose}
      />
      <ModalBody className="space-y-4">
        {/* Banner de Defecto y Clasificación */}
        <div className="p-4 bg-app-surface-muted/60 rounded-xl border border-border flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <span className="font-mono text-xl font-extrabold text-brand-primary">
                {item.defectoClave}
              </span>
              <DefectoClasificacionIndicator clasificacion={item.clasificacion} />
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                {item.paresDefectuosos} {item.paresDefectuosos === 1 ? 'par defectuoso' : 'pares defectuosos'}
              </span>
            </div>
            <h3 className="text-base font-bold text-text-primary leading-snug">
              {item.defectoNombre}
            </h3>
          </div>
        </div>

        {/* Datos de Producción / Lote */}
        <div className="border border-border/80 rounded-xl bg-app-surface p-3.5 space-y-2 text-xs">
          <div className="font-bold text-2xs uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <Icon name="inventory_2" size="14px" className="text-slate-500" />
            <span>Datos del Lote y Producto</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <span className="text-text-muted block text-2xs">Lote</span>
              <strong className="text-slate-900 font-mono text-sm">{item.lote}</strong>
            </div>
            <div>
              <span className="text-text-muted block text-2xs">Lista</span>
              <span className="text-slate-800 font-medium">{item.lista}</span>
            </div>
            <div>
              <span className="text-text-muted block text-2xs">Línea</span>
              <span className="text-slate-800 font-medium">{item.linea}</span>
            </div>
            <div>
              <span className="text-text-muted block text-2xs">Modelo</span>
              <span className="text-slate-800 font-bold">{item.modelo}</span>
            </div>
            <div>
              <span className="text-text-muted block text-2xs">Horma</span>
              <span className="text-slate-800 font-medium">{item.horma}</span>
            </div>
            <div>
              <span className="text-text-muted block text-2xs">Cantidad Total</span>
              <span className="text-slate-800 font-medium">{item.cantidadLote} pares</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-text-muted block text-2xs">Cliente</span>
            <span className="text-slate-900 font-medium">{item.cliente}</span>
            {item.descripcion && (
              <span className="text-text-muted block text-[11px] mt-0.5">{item.descripcion}</span>
            )}
          </div>
        </div>

        {/* Trazabilidad Departamental (discreta) */}
        <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-3 py-2 flex items-center justify-between text-2xs text-slate-600 gap-2">
          <span className="flex items-center gap-1.5 font-medium text-slate-500">
            <Icon name="fact_check" size="13px" className="text-slate-400" />
            <span>Auditado en: <strong className="text-slate-700 uppercase font-semibold">{item.departamentoAuditoria}</strong></span>
          </span>
          <span className="text-slate-400">|</span>
          <span className="flex items-center gap-1 font-medium text-slate-500">
            <span>Origen defecto: <strong className="text-amber-800 uppercase font-semibold">{item.defDepto}</strong></span>
          </span>
        </div>

        <div className="border border-border/80 rounded-xl bg-app-surface p-3 space-y-2 text-xs">
          <div className="text-2xs text-text-muted flex items-center justify-between">
            <span>Inspector: <strong className="text-slate-700">{item.usuario}</strong></span>
            <span>Fecha: {fechaFormateada}</span>
          </div>

          {item.notas && (
            <div className="p-2.5 rounded-lg bg-yellow-50/80 border border-yellow-200 text-yellow-900 text-xs">
              <strong>Observaciones del inspector:</strong>
              <p className="mt-0.5">{item.notas}</p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
