import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { DefectoClasificacionIndicator } from '@/features/defectos/components/defecto-clasificacion-indicator';
import type { DefectoItemCapturado } from '../defecto-modal-captura';
import type { Defecto } from '@/features/defectos/types/defectos.types';

export interface CapturaDefectosTablaProps {
  defectosCapturados: DefectoItemCapturado[];
  totalParesFalla: number;
  departamentoAuditorId?: number;
  catalogoDefectos: Defecto[];
  setClaveDefecto: (val: string) => void;
  setDefectoSeleccionado: (d: Defecto | null) => void;
  setParesDefecto: (pares: number) => void;
  handleEliminarItem: (idTemporal: string) => void;
  guardando: boolean;
}

export function CapturaDefectosTabla({
  defectosCapturados,
  totalParesFalla,
  departamentoAuditorId,
  catalogoDefectos,
  setClaveDefecto,
  setDefectoSeleccionado,
  setParesDefecto,
  handleEliminarItem,
  guardando,
}: CapturaDefectosTablaProps) {
  // Estado para confirmación rápida en línea del botón de eliminar
  const [confirmandoEliminarId, setConfirmandoEliminarId] = useState<string | null>(null);

  // Determinar si hay defectos de otros departamentos en la lista capturada
  const hayDefectosExternos =
    Boolean(departamentoAuditorId) &&
    defectosCapturados.some(
      (item) => item.departamentoResponsableId && item.departamentoResponsableId !== departamentoAuditorId
    );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle shrink-0">
        <span className="text-xs font-black uppercase tracking-wider text-text-primary">
          DEFECTOS ({defectosCapturados.length})
        </span>
        <span className="text-xs font-black uppercase tracking-wider text-brand-primary">
          Total Fallas ({totalParesFalla})
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar border border-border rounded-xl bg-app-surface">
        {defectosCapturados.length === 0 ? (
          <div className="py-8 xl:py-16 px-4 text-center text-text-muted">
            <Icon name="playlist_add_check" size="40px" className="mx-auto mb-2 opacity-40 text-brand-primary" />
            <p className="text-xs font-semibold text-text-secondary">Sin defectos registrados</p>
            <p className="text-[11px] mt-0.5 text-text-muted">
              Capture clave o seleccione defecto arriba y presione [+]
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs table-fixed">
            <thead className="sticky top-0 bg-app-surface-muted border-b border-border text-[11px] font-bold text-text-secondary uppercase">
              <tr>
                <th className="py-2.5 px-2 w-10 text-center">No.</th>
                <th className="py-2.5 px-3 w-16 text-center">Clave</th>
                <th className="py-2.5 px-3">Defecto</th>
                {/* Columna Depto condicional: Solo aparece si hay defectos de otros departamentos */}
                {hayDefectosExternos && (
                  <th className="py-2.5 px-3 w-28 text-center">Depto</th>
                )}
                <th className="py-2.5 px-3 w-24 text-center">Clasif.</th>
                <th className="py-2.5 px-3 w-14 text-center">Pares</th>
                {/* Columna de Acciones con separación visual marcada */}
                <th className="py-2.5 px-3 w-32 text-center border-l border-border/80">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {defectosCapturados.map((item, index) => {
                const estaConfirmando = confirmandoEliminarId === item.idTemporal;
                const esDeptoExterno =
                  departamentoAuditorId &&
                  item.departamentoResponsableId &&
                  item.departamentoResponsableId !== departamentoAuditorId;

                return (
                  <tr
                    key={item.idTemporal}
                    className={`transition-colors ${
                      esDeptoExterno
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-900/30'
                        : 'hover:bg-app-surface-muted/50'
                    }`}
                  >
                    <td className="py-2.5 px-2 text-center font-mono font-semibold text-text-secondary text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {item.clave}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-text-primary">
                      <div className="relative group max-w-full">
                        <span className="block truncate" title={item.defecto}>
                          {item.defecto}
                        </span>
                        {/* Tooltip flotante enriquecido si el texto se corta */}
                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:flex flex-col z-50 pointer-events-none transition-all">
                          <div className="bg-slate-900/95 text-white text-[11px] font-medium py-1 px-2.5 rounded-lg shadow-xl max-w-xs whitespace-normal leading-tight backdrop-blur-xs">
                            {item.defecto}
                          </div>
                          <div className="w-2 h-1 bg-slate-900/95 rotate-45 ml-3 -mt-0.5" />
                        </div>
                      </div>
                    </td>
                    {/* Celda Depto condicional */}
                    {hayDefectosExternos && (
                      <td className="py-2.5 px-3 text-center truncate">
                        <span
                          className={`text-xs font-semibold ${
                            esDeptoExterno
                              ? 'text-amber-800 dark:text-amber-300 font-bold'
                              : 'text-text-secondary'
                          }`}
                          title={item.departamentoResponsableNombre}
                        >
                          {item.departamentoResponsableNombre}
                        </span>
                      </td>
                    )}
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex justify-center">
                        <DefectoClasificacionIndicator clasificacion={item.clasificacion} />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400 text-sm font-mono">
                      {item.pares}
                    </td>
                    {/* Columna de Acciones separada con borde izquierdo y espaciado */}
                    <td className="py-2.5 px-3 text-center border-l border-border/80 bg-app-surface-muted/20">
                      {estaConfirmando ? (
                        <div className="flex items-center justify-center gap-1.5 animate-in fade-in duration-150">
                          <button
                            type="button"
                            onClick={() => {
                              handleEliminarItem(item.idTemporal);
                              setConfirmandoEliminarId(null);
                            }}
                            disabled={guardando}
                            className="h-8 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-[11px] shadow-sm cursor-pointer touch-manipulation transition-all flex items-center gap-1 shrink-0"
                            title="Confirmar eliminación"
                          >
                            <Icon name="check" size="14px" />
                            <span>Sí</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmandoEliminarId(null)}
                            className="h-8 px-2 rounded-xl border border-border bg-app-surface text-text-primary hover:bg-app-surface-muted active:scale-95 text-[11px] font-semibold cursor-pointer touch-manipulation transition-all flex items-center justify-center shrink-0 shadow-2xs"
                            title="Cancelar"
                          >
                            <span>No</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Cargar en el formulario para editarlo
                              setClaveDefecto(String(item.clave));
                              const def = catalogoDefectos.find((d) => d.id === item.defectoId);
                              if (def) setDefectoSeleccionado(def);
                              setParesDefecto(item.pares);
                              handleEliminarItem(item.idTemporal);
                            }}
                            disabled={guardando}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-text-secondary hover:text-brand-primary hover:bg-brand-primary/10 cursor-pointer touch-manipulation active:scale-95 transition-all border border-border/60 shadow-2xs"
                            title="Editar defecto"
                          >
                            <Icon name="edit" size="16px" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmandoEliminarId(item.idTemporal)}
                            disabled={guardando}
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-danger hover:bg-danger/10 hover:border-danger/30 cursor-pointer touch-manipulation active:scale-95 transition-all border border-border/60 shadow-2xs"
                            title="Remover defecto"
                          >
                            <Icon name="delete" size="16px" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Banner informativo si hay defectos de otros departamentos registrados */}
      {hayDefectosExternos && (
        <div className="mt-1 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shrink-0 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Icon name="info" size="13px" className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-medium">
              Hay defectos registrados que pertenecen a otro departamento.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
