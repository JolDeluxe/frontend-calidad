import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DefectoClasificacionIndicator } from '@/features/defectos/components/defecto-clasificacion-indicator';
import type { InspeccionFilaResponse } from '../types/inspecciones.types';

export interface InspeccionDetalleModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InspeccionFilaResponse | null;
}

export function InspeccionDetalleModal({
  isOpen,
  onClose,
  item,
}: InspeccionDetalleModalProps) {
  if (!isOpen || !item) return null;

  const fechaHoraStr = (() => {
    try {
      const d = new Date(item.fecha);
      const diaSemana = d.toLocaleDateString('es-MX', { weekday: 'long' });
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const anio = d.getFullYear();
      const hora = d.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      return `${diaSemana} ${dia}/${mes}/${anio} ${hora}`;
    } catch {
      return item.fecha;
    }
  })();

  const fechaHoraEliminadoStr = (() => {
    if (!item.eliminadoEn) return null;
    try {
      const d = new Date(item.eliminadoEn);
      const diaSemana = d.toLocaleDateString('es-MX', { weekday: 'long' });
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const anio = d.getFullYear();
      const hora = d.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      return `${diaSemana} ${dia}/${mes}/${anio} ${hora}`;
    } catch {
      return String(item.eliminadoEn);
    }
  })();

  const esDeptoExterno = item.defDepto.toUpperCase() !== item.departamentoAuditoria.toUpperCase();

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <ModalHeader title="Detalle Completo de Captura" onClose={onClose} />
      <ModalBody className="space-y-3.5 text-xs">
        {/* Cabecera con Defecto y Criticidad */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-lg font-extrabold text-brand-primary">
              Clave {item.defectoClave}
            </span>
            <DefectoClasificacionIndicator clasificacion={item.clasificacion} />
          </div>
          <p className="font-bold text-sm text-slate-900 leading-snug break-words">
            {item.defectoNombre}
          </p>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 border-t border-slate-200 pt-2">
            <span>Pares defectuosos registrados:</span>
            <strong className="text-sm font-extrabold text-slate-900">
              {item.paresDefectuosos} {item.paresDefectuosos === 1 ? 'par' : 'pares'}
            </strong>
          </div>
        </div>

        {/* Datos de Producción y Lote (Separados claramente, sin truncar) */}
        <div className="border border-slate-200 rounded-xl bg-app-surface p-3.5 space-y-2.5">
          <div className="font-bold text-2xs uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-100 flex items-center gap-1.5">
            <Icon name="inventory_2" size="14px" className="text-slate-500" />
            <span>Datos del Lote y Calzado</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-text-muted block text-2xs">Lote</span>
              <strong className="text-base font-extrabold text-marca-primario font-mono">
                {item.lote}
              </strong>
            </div>

            <div>
              <span className="text-text-muted block text-2xs">Modelo</span>
              <strong className="text-sm font-bold text-slate-900">
                {item.modelo}
              </strong>
            </div>

            <div>
              <span className="text-text-muted block text-2xs">Lista</span>
              <span className="text-xs font-semibold text-slate-800 font-mono">
                {item.lista}
              </span>
            </div>

            <div>
              <span className="text-text-muted block text-2xs">Horma</span>
              <span className="text-xs font-semibold text-slate-800">
                {item.horma || 'N/A'}
              </span>
            </div>

            <div>
              <span className="text-text-muted block text-2xs">Línea de Producción</span>
              <span className="text-xs font-medium text-slate-800">
                {item.linea}
              </span>
            </div>

            <div>
              <span className="text-text-muted block text-2xs">Cantidad en Lote</span>
              <span className="text-xs font-medium text-slate-800">
                {item.cantidadLote} pares
              </span>
            </div>
          </div>

          {(Boolean(item.cliente && item.cliente.trim() && item.cliente !== 'ORIGEN_HISTORICO') || Boolean(item.descripcion && item.descripcion.trim())) && (
            <div className="pt-2 border-t border-slate-100 space-y-1">
              {item.cliente && item.cliente.trim() && item.cliente !== 'ORIGEN_HISTORICO' && (
                <div>
                  <span className="text-text-muted block text-2xs">Cliente</span>
                  <span className="text-xs font-medium text-slate-900 break-words">{item.cliente}</span>
                </div>
              )}
              {item.descripcion && item.descripcion.trim() && (
                <div>
                  <span className="text-text-muted block text-2xs">Descripción del Producto</span>
                  <p className="text-xs text-slate-700 leading-relaxed break-words">{item.descripcion}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trazabilidad Departamental (solo si se encontró en otro departamento) */}
        {esDeptoExterno && (
          <div className="border border-amber-300 rounded-xl bg-amber-50/50 p-3.5 space-y-2.5">
            <div className="font-bold text-2xs uppercase tracking-wider text-amber-900 pb-1 border-b border-amber-200 flex items-center gap-1.5">
              <Icon name="sync_alt" size="14px" className="text-amber-700" />
              <span>Trazabilidad Departamental</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg border border-amber-200 bg-white/80">
                <span className="text-2xs text-text-muted block mb-0.5">Estación de Detección</span>
                <strong className="text-xs text-slate-900 uppercase">{item.departamentoAuditoria}</strong>
              </div>

              <div className="p-2.5 rounded-lg border border-amber-300 bg-amber-100/60">
                <span className="text-2xs text-amber-900 block mb-0.5">Departamento del Defecto</span>
                <strong className="text-xs text-amber-950 font-black uppercase">
                  {item.defDepto}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* Inspector, Fecha y Hora */}
        <div className="border border-slate-200 rounded-xl bg-app-surface p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <span className="text-text-muted text-2xs block">Inspector</span>
              <strong className="text-slate-800">{item.usuario}</strong>
            </div>

            <div className="sm:text-right">
              <span className="text-text-muted text-2xs flex items-center sm:justify-end gap-1">
                <Icon name="schedule" size="13px" className="text-brand-primary" />
                Fecha y Hora de Registro:
              </span>
              <strong className="text-slate-900 font-mono text-xs capitalize">{fechaHoraStr}</strong>
            </div>
          </div>

          {/* Información de Cancelación / Eliminación (Únicamente si está cancelada o eliminada) */}
          {Boolean(item.eliminadoEn) && (
            <div className="pt-2.5 mt-2 border-t border-rose-200/80 bg-rose-50/60 -mx-3.5 -mb-3.5 p-3 rounded-b-xl space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold text-2xs uppercase tracking-wider">
                <Icon name="cancel" size="14px" className="text-rose-600" />
                <span>Registro Cancelado</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-rose-700/80 text-2xs block">Cancelado / Eliminado por</span>
                  <strong className="text-rose-950 font-semibold">
                    {item.eliminadoPorNombre || (item.eliminadoPor ? `Usuario #${item.eliminadoPor}` : 'No especificado')}
                  </strong>
                </div>
                <div className="sm:text-right">
                  <span className="text-rose-700/80 text-2xs block">
                    Fecha y Hora de Cancelación:
                  </span>
                  <strong className="text-rose-950 font-mono text-xs capitalize">
                    {fechaHoraEliminadoStr}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {item.notas &&
            item.notas.trim() &&
            !item.notas.toLowerCase().startsWith('histórico:') &&
            !item.notas.toLowerCase().startsWith('historico:') && (
              <div className="p-2.5 bg-yellow-50/80 border border-yellow-200 rounded-lg text-xs text-yellow-950 break-words mt-1">
                <strong className="block text-2xs uppercase tracking-wider text-yellow-900 mb-0.5">Observaciones:</strong>
                <p className="leading-relaxed">{item.notas}</p>
              </div>
            )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" size="sm" onClick={onClose} className="w-full cursor-pointer">
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
