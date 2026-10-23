import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Defecto } from '../types/defectos.types';
import type { Linea } from '@/features/departamentos/types/departamentos.types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { DefectoClasificacionIndicator } from './defecto-clasificacion-indicator';

interface DefectosTablaProps {
  defectos: Defecto[];
  loading: boolean;
  error: string | null;
  busqueda: string;
  setBusqueda: (val: string) => void;
  filtroClasificacion: string;
  setFiltroClasificacion: (val: string) => void;
  verEliminados: boolean;
  setVerEliminados: (val: boolean) => void;
  totalItems: number;
  puedeCargarMas: boolean;
  cargandoMas: boolean;
  onCargarMas: () => void;
  onVerDetalle: (def: Defecto) => void;
  onOpenEdit: (def: Defecto) => void;
  onOpenDeptos: (def: Defecto) => void;
  onOpenDelete: (def: Defecto) => void;
  onReactivar: (def: Defecto) => void;
  mostrarColumnaLinea?: boolean;
  lineas?: Linea[];
  selectedLineas?: number[];
  onToggleLinea?: (lineaId: number) => void;
  onClearLineas?: () => void;
}


/** Menú contextual de 3 puntos (mini-modal) para cada fila */
function MenuAccionesDefecto({
  def,
  isEliminado,
  onVerDetalle,
  onOpenEdit,
  onOpenDeptos,
  onOpenDelete,
  onReactivar,
}: {
  def: Defecto;
  isEliminado: boolean;
  onVerDetalle: (def: Defecto) => void;
  onOpenEdit: (def: Defecto) => void;
  onOpenDeptos: (def: Defecto) => void;
  onOpenDelete: (def: Defecto) => void;
  onReactivar: (def: Defecto) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 190;
      const menuHeight = 160;

      let left = rect.right - menuWidth;
      if (left < 10) left = 10;
      if (left + menuWidth > window.innerWidth - 10) {
        left = window.innerWidth - menuWidth - 10;
      }

      let top = rect.bottom + 4;
      if (top + menuHeight > window.innerHeight && rect.top - menuHeight > 0) {
        top = rect.top - menuHeight - 4;
      }

      setMenuPos({ top, left });
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleScrollOrResize() {
      if (isOpen) setIsOpen(false);
    }

    if (isOpen) {
      updateMenuPosition();
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-right">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) updateMenuPosition();
          setIsOpen(!isOpen);
        }}
        className="w-7 h-7 mx-auto flex items-center justify-center rounded-lg text-text-secondary hover:text-brand-primary hover:bg-cuadra-arena/50 transition-colors cursor-pointer"
        title="Opciones"
      >
        <Icon name="more_vert" size="18px" />
      </button>

      {isOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${menuPos.top}px`,
              left: `${menuPos.left}px`,
            }}
            className="w-48 rounded-xl bg-app-surface border border-border shadow-xl p-1.5 z-[9999] text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onVerDetalle(def);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-app-surface-muted rounded-md text-left transition-colors cursor-pointer"
            >
              <Icon name="visibility" size="14px" className="text-text-muted" />
              <span>Ver detalles</span>
            </button>

            {!isEliminado ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenEdit(def);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-app-surface-muted rounded-md text-left transition-colors cursor-pointer"
                >
                  <Icon name="edit" size="14px" className="text-text-muted" />
                  <span>Editar defecto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDeptos(def);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-text-primary hover:bg-app-surface-muted rounded-md text-left transition-colors cursor-pointer"
                >
                  <Icon name="domain" size="14px" className="text-text-muted" />
                  <span>Departamentos</span>
                </button>

                <div className="border-t border-border my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDelete(def);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-md text-left transition-colors cursor-pointer"
                >
                  <Icon name="delete" size="14px" className="text-red-600" />
                  <span>Eliminar defecto</span>
                </button>
              </>
            ) : (
              <>
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onReactivar(def);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-emerald-700 hover:bg-emerald-50 rounded-md text-left transition-colors cursor-pointer font-medium"
                >
                  <Icon name="restore" size="14px" className="text-emerald-700" />
                  <span>Reactivar defecto</span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function DefectosTabla({
  defectos,
  loading,
  error,
  busqueda,
  setBusqueda,
  filtroClasificacion,
  setFiltroClasificacion,
  verEliminados,
  setVerEliminados,
  totalItems,
  puedeCargarMas,
  cargandoMas,
  onCargarMas,
  onVerDetalle,
  onOpenEdit,
  onOpenDeptos,
  onOpenDelete,
  onReactivar,
  mostrarColumnaLinea = false,
  lineas = [],
  selectedLineas = [],
  onToggleLinea,
  onClearLineas,
}: DefectosTablaProps): ReactNode {
  const [isLineasOpen, setIsLineasOpen] = useState(false);
  const lineasDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        lineasDropdownRef.current &&
        !lineasDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLineasOpen(false);
      }
    }
    if (isLineasOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLineasOpen]);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Barra de Filtros Compacta: Buscador a la izquierda | LINEA (Select) | CLASIFICACION | BOTE DE BASURA a la derecha */}
      <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
        {/* Columna 1: Buscador */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Icon
            name="search"
            size="16px"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por clave (#) o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-primary transition-all text-slate-800"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <Icon name="close" size="14px" />
            </button>
          )}
        </div>

        {/* Columna 2: Filtros Compactos: LINEA (Select Checkbox) | CLASIFICACION | BOTE DE BASURA */}
        <div className="flex items-center gap-2">
          {/* Selector de Línea Tipo Checkbox Desplegable (Compacto y adaptable a la UX) */}
          {mostrarColumnaLinea && lineas.length > 0 && onToggleLinea && (
            <div className="relative" ref={lineasDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLineasOpen(!isLineasOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-2xs whitespace-nowrap shrink-0 ${
                  selectedLineas.length > 0
                    ? 'border-marca-primario text-marca-primario bg-marca-primario/5'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                title="Filtrar por una o varias líneas"
              >
                <Icon name="linear_scale" size="14px" className={selectedLineas.length > 0 ? 'text-marca-primario' : 'text-slate-400'} />
                <span className="whitespace-nowrap">
                  {selectedLineas.length === 0
                    ? 'Líneas'
                    : selectedLineas.length === 1
                    ? lineas.find((l) => l.id === selectedLineas[0])?.nombre || '1 línea'
                    : `${selectedLineas.length} líneas`}
                </span>
                <Icon
                  name={isLineasOpen ? 'expand_less' : 'expand_more'}
                  size="15px"
                  className="text-slate-400 ml-0.5"
                />
              </button>

              {isLineasOpen && (
                <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-100 px-1">
                    <span className="font-bold text-2xs uppercase tracking-wider text-slate-400">
                      Filtrar por Línea
                    </span>
                    {selectedLineas.length > 0 && onClearLineas && (
                      <button
                        type="button"
                        onClick={onClearLineas}
                        className="text-2xs font-semibold text-marca-primario hover:underline cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {lineas.map((lin) => {
                      const isChecked = selectedLineas.includes(lin.id);
                      return (
                        <label
                          key={lin.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-marca-primario/10 text-marca-primario font-semibold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => onToggleLinea(lin.id)}
                            className="rounded border-slate-300 text-marca-primario focus:ring-marca-primario/40 h-3.5 w-3.5 cursor-pointer accent-marca-primario"
                          />
                          <span className="truncate">{lin.nombre}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selector de Clasificación Compacto */}
          <select
            value={filtroClasificacion}
            onChange={(e) => setFiltroClasificacion(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
          >
            <option value="">Todas las clasificaciones</option>
            <option value="CRITICO">Crítico</option>
            <option value="MAYOR">Mayor</option>
            <option value="MENOR">Menor</option>
          </select>

          {/* Toggle Ver Eliminados: Botón Compacto con Ícono y Tooltip Nativo */}
          <button
            type="button"
            onClick={() => setVerEliminados(!verEliminados)}
            title={verEliminados ? 'Papelera: Viendo defectos eliminados' : 'Papelera: Ver defectos eliminados'}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
              verEliminados
                ? 'bg-rose-100 text-rose-700 border-rose-300'
                : 'bg-white text-slate-500 border-slate-300 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon name="delete" size="18px" />
          </button>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="m-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <Icon name="error" size="16px" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Resultados Limpia */}
      {loading && defectos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-app-surface rounded-xl border border-border">
          <Spinner size="36px" />
          <span className="mt-3 text-xs text-text-muted">Cargando defectos...</span>
        </div>
      ) : defectos.length === 0 ? (
        <div className="text-center py-16 px-4 bg-app-surface rounded-xl border border-border text-text-muted">
          <Icon name="search_off" size="40px" className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium">No se encontraron defectos registrados.</p>
          <p className="text-xs text-text-muted/80 mt-1">
            {verEliminados
              ? 'No hay defectos en la papelera o eliminados.'
              : 'Intenta con otro término de búsqueda o limpia los filtros.'}
          </p>
        </div>
      ) : (
        <div className="bg-app-surface rounded-xl shadow-xs border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-app-surface-muted/60 text-text-secondary text-xs uppercase tracking-wider border-b border-border font-semibold">
                  <th className="py-3 px-4 w-28">Clave</th>
                  <th className="py-3 px-4">Descripción del Defecto</th>
                  <th className="py-3 px-4 w-40">Propietario</th>
                  <th className="py-3 px-4 w-32">Clasificación</th>
                  {mostrarColumnaLinea && (
                    <th className="py-3 px-4 w-36">Línea</th>
                  )}
                  <th className="py-3 px-4 w-52">Etapas Permitidas</th>
                  <th className="py-3 px-4 w-24 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {defectos.map((def) => {
                  const isEliminado = Boolean(def.eliminadoEn);
                  const etapasPermitidasCount = def.etapas?.filter((e) => e.permitido).length || 0;
                  const totalEtapasCount = def.etapas?.length || 8;

                  return (
                    <tr
                      key={def.id}
                      className={`hover:bg-app-surface-muted/50 transition-colors ${
                        isEliminado ? 'opacity-60 bg-red-50/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-primary text-base">
                        #{def.clave}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-text-primary">
                        <button
                          type="button"
                          onClick={() => onVerDetalle(def)}
                          className="hover:underline text-left cursor-pointer font-semibold"
                        >
                          {def.defecto}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm text-gray-800">
                          {def.departamento?.nombre || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <DefectoClasificacionIndicator clasificacion={def.clasificacion} />
                      </td>
                      {mostrarColumnaLinea && (
                        <td className="py-3.5 px-4">
                          {(() => {
                            const lineasSet = new Set<string>();
                            def.departamentos?.forEach((d) => {
                              if (d.activo) {
                                d.departamento.lineasAsociadas?.forEach((l) => {
                                  if (l.activo && l.linea) {
                                    lineasSet.add(l.linea.nombre);
                                  }
                                });
                              }
                            });
                            const lineasArr = Array.from(lineasSet);
                            if (lineasArr.length === 0) return <span className="text-text-muted text-sm">—</span>;
                            return (
                              <div className="flex flex-col gap-1">
                                {lineasArr.map((lin) => (
                                  <div key={lin} className="flex items-center gap-1.5 text-sm text-gray-700">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full shrink-0" aria-hidden="true" />
                                    <span>{lin}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        {!isEliminado ? (
                          <button
                            type="button"
                            onClick={() => onOpenDeptos(def)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-app-surface-muted hover:bg-border/60 text-text-primary border border-border transition-colors cursor-pointer"
                            title="Ver o consultar etapas de detección permitidas"
                          >
                            <Icon name="verified" size="14px" className="text-emerald-600" />
                            <span>
                              {etapasPermitidasCount} / {totalEtapasCount} etapas
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs text-text-muted italic">Inactivo</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <MenuAccionesDefecto
                          def={def}
                          isEliminado={isEliminado}
                          onVerDetalle={onVerDetalle}
                          onOpenEdit={onOpenEdit}
                          onOpenDeptos={onOpenDeptos}
                          onOpenDelete={onOpenDelete}
                          onReactivar={onReactivar}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer Cargar Más & Contador Total */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-app-surface text-xs">
            <span className="text-text-secondary">
              Mostrando <strong className="text-text-primary">{defectos.length}</strong> de{' '}
              <strong className="text-text-primary">{totalItems}</strong> defectos
            </span>

            {puedeCargarMas && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cargandoMas}
                onClick={onCargarMas}
                className="text-xs font-semibold px-5 py-2"
              >
                {cargandoMas ? (
                  <>
                    <Spinner size="xs" className="mr-2" />
                    <span>Cargando más defectos...</span>
                  </>
                ) : (
                  <>
                    <Icon name="expand_more" size="16px" className="mr-1.5" />
                    <span>Ver más defectos</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
