import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { DefectoClasificacionIndicator } from './defecto-clasificacion-indicator';
import type { Defecto } from '../types/defectos.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export interface DefectoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  defecto: Defecto | null;
  departamentos?: Departamento[];
  onReactivar?: (def: Defecto) => void;
}


function formatFecha(fechaStr?: string | null): string {
  if (!fechaStr) return '—';
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return fechaStr;
  }
}

export function DefectoDetailModal({
  isOpen,
  onClose,
  defecto,
  departamentos = [],
  onReactivar,
}: DefectoDetailModalProps) {
  const [mostrarAuditoria, setMostrarAuditoria] = useState(false);

  if (!defecto) return null;

  const isEliminado = Boolean(defecto.eliminadoEn);
  const deptosAsociadosActivos =
    defecto.departamentos?.filter(
      (d) => d.activo && !d.departamento.estado.includes('INACTIVO')
    ) || [];

  // Mapear los departamentos asociados enriqueciéndolos con las líneas de producción de la lista maestra
  const deptosIdsSet = new Set(deptosAsociadosActivos.map((d) => d.departamentoId));
  const deptosDetallados = departamentos.filter((d) => deptosIdsSet.has(d.id));

  // Si no se proveyó la lista de departamentos maestros, usar los datos locales de defecto.departamentos
  const usarListaMaestra = deptosDetallados.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl max-h-[90vh]">
      <ModalHeader title={`Detalle de Defecto #${defecto.clave}`} onClose={onClose} />
      <ModalBody className="space-y-5 overflow-y-auto">
        {/* Banner de Estado */}
        {isEliminado && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-800">
            <div className="flex items-center gap-2">
              <Icon name="delete" size="16px" className="text-red-600" />
              <span>Este defecto está <strong>eliminado (inactivo para inspecciones)</strong>.</span>
            </div>
            {onReactivar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onReactivar(defecto);
                }}
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs py-1 px-2.5"
              >
                <Icon name="restore" size="14px" className="mr-1" />
                Reactivar
              </Button>
            )}
          </div>
        )}

        {/* Encabezado Principal */}
        <div className="p-4 bg-app-surface-muted/60 rounded-xl border border-border flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5 flex-wrap">
              <span className="font-mono text-xl font-extrabold text-brand-primary">
                {defecto.clave}
              </span>
              <DefectoClasificacionIndicator clasificacion={defecto.clasificacion} />
              <div className="flex items-center gap-1.5 text-sm text-gray-800">
                <span className="text-xs text-text-muted">Departamento:</span>
                <span className="font-medium text-gray-800">{defecto.departamento?.nombre || 'CORTE'}</span>
              </div>
            </div>
            <h3 className="text-base font-bold text-text-primary leading-snug">
              {defecto.defecto}
            </h3>
          </div>
          <div className="text-right shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                !isEliminado && defecto.activo
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {!isEliminado && defecto.activo ? 'Activo' : 'Eliminado / Inactivo'}
            </span>
          </div>
        </div>

        {/* Departamentos de Detección Permitidos */}
        {defecto.etapas && defecto.etapas.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Icon name="fact_check" size="15px" className="text-brand-primary" />
                Departamentos de Detección Permitidos ({defecto.etapas.filter((e) => e.permitido).length} de {defecto.etapas.length})
              </label>
            </div>

            <div className="border border-border/80 rounded-xl bg-app-surface p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {defecto.etapas.map((etapa) => {
                  const permitido = etapa.permitido;
                  const nombreEtapa = etapa.departamento?.nombre || `Depto ${etapa.departamentoId}`;

                  return (
                    <div
                      key={etapa.id || etapa.departamentoId}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium ${
                        permitido
                          ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-400'
                      }`}
                    >
                      <span className="truncate pr-1">{nombreEtapa}</span>
                      <span
                        className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded ${
                          permitido
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-300'
                        }`}
                      >
                        {permitido ? (
                          <Icon name="check" size="14px" weight={700} />
                        ) : (
                          <Icon name="close" size="12px" weight={400} />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Departamentos vinculados agrupados por Líneas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Es seleccionable en ({deptosAsociadosActivos.length})
            </label>
          </div>

          {deptosAsociadosActivos.length > 0 ? (
            <div className="max-h-60 overflow-y-auto overflow-x-hidden border border-border/80 rounded-xl bg-app-surface p-3 space-y-3">
              {(() => {
                if (usarListaMaestra) {
                  const agrupados: Record<string, { lineaNombre: string; deptos: Departamento[] }> = {};

                  deptosDetallados.forEach((dep) => {
                    const lineas = dep.lineasAsociadas?.filter((l) => l.activo && l.linea) || [];
                    lineas.forEach((rel) => {
                      const lName = rel.linea.nombre;
                      if (!agrupados[lName]) {
                        agrupados[lName] = { lineaNombre: lName, deptos: [] };
                      }
                      if (!agrupados[lName].deptos.some((d) => d.id === dep.id)) {
                        agrupados[lName].deptos.push(dep);
                      }
                    });
                  });

                  const gruposLineas = Object.values(agrupados);

                  if (gruposLineas.length === 0) {
                    return (
                      <div className="py-4 text-center text-xs text-text-muted italic">
                        No hay departamentos con línea asociada para este defecto.
                      </div>
                    );
                  }

                  return (
                    <>
                      {gruposLineas.map((grupo) => (
                        <div key={grupo.lineaNombre} className="space-y-1.5">
                          <div className="flex items-center gap-1.5 pb-1 border-b border-border/60">
                            <Icon name="linear_scale" size="13px" className="text-brand-primary" />
                            <span className="text-[11px] font-bold text-brand-primary uppercase tracking-wide">
                              Línea {grupo.lineaNombre} ({grupo.deptos.length})
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {grupo.deptos.map((dep) => (
                              <div
                                key={`detail-${grupo.lineaNombre}-${dep.id}`}
                                className="flex items-center gap-2 p-2 rounded-lg border border-brand-primary/20 bg-brand-primary/5 text-xs text-brand-primary font-medium"
                              >
                                <Icon name="domain" size="14px" className="shrink-0 text-brand-primary/70" />
                                <span className="truncate" title={dep.nombre}>
                                  {dep.nombre}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                }

                // Fallback directo si no se cargó departamentos maestros aún
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {deptosAsociadosActivos.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 p-2 rounded-lg border border-brand-primary/20 bg-brand-primary/5 text-xs text-brand-primary font-medium"
                      >
                        <Icon name="domain" size="14px" className="shrink-0 text-brand-primary/70" />
                        <span className="truncate" title={d.departamento.nombre}>
                          {d.departamento.nombre}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-4 bg-app-surface border border-border/80 rounded-xl text-xs text-text-muted italic text-center">
              No tiene departamentos asociados actualmente.
            </div>
          )}
        </div>

        {/* Trazabilidad y Auditoría Plegable */}
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setMostrarAuditoria(!mostrarAuditoria)}
            className="w-full flex items-center justify-between text-xs font-semibold text-text-secondary hover:text-text-primary p-2 rounded-lg hover:bg-app-surface-muted/50 transition-colors cursor-pointer"
          >
            <span className="uppercase tracking-wider">Trazabilidad y Auditoría</span>
            <Icon
              name={mostrarAuditoria ? 'expand_less' : 'expand_more'}
              size="18px"
              className="text-text-muted transition-transform"
            />
          </button>

          {mostrarAuditoria && (
            <div className="mt-2 grid grid-cols-2 gap-3 text-xs bg-app-surface-muted/40 p-3 rounded-lg border border-border/60 animate-in fade-in duration-150">
              <div>
                <span className="text-text-muted block">Creado por:</span>
                <span className="font-medium text-text-primary">
                  {defecto.creador?.nombre || 'Sistema'} ({formatFecha(defecto.creadoEn)})
                </span>
              </div>
              {defecto.actualizadoEn && (
                <div>
                  <span className="text-text-muted block">Última modificación:</span>
                  <span className="font-medium text-text-primary">
                    {defecto.actualizador?.nombre || 'Admin'} ({formatFecha(defecto.actualizadoEn)})
                  </span>
                </div>
              )}
              {defecto.eliminadoEn && (
                <div className="col-span-2 text-red-700 bg-red-50/50 p-2 rounded">
                  <span className="block font-semibold">Fecha de Eliminación:</span>
                  <span>{formatFecha(defecto.eliminadoEn)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter className="flex items-center justify-end">
        <Button type="button" variant="cancelar" onClick={onClose}>
          Cerrar
        </Button>
      </ModalFooter>
    </Modal>
  );
}
