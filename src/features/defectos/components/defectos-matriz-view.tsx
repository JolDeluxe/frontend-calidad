import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Defecto } from '../types/defectos.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { DefectoClasificacionIndicator } from './defecto-clasificacion-indicator';

export interface DefectosMatrizViewProps {
  defectos: Defecto[];
  departamentos: Departamento[];
  loading: boolean;
  busqueda: string;
  setBusqueda: (val: string) => void;
  filtroClasificacion: string;
  setFiltroClasificacion: (val: string) => void;
  verEliminados: boolean;
  setVerEliminados: (val: boolean) => void;
  puedeCargarMas: boolean;
  cargandoMas: boolean;
  onCargarMas: () => void;
  totalItems: number;
  onVerDetalle: (def: Defecto) => void;
  onOpenEdit: (def: Defecto) => void;
  onOpenDelete: (def: Defecto) => void;
  onReactivar: (def: Defecto) => void;
  onToggleEtapa?: (defectoId: number, departamentoId: number, nuevoPermitido: boolean) => Promise<void>;
}

// Orden canónico de referencia para departamentos de BOTA
export const CODIGOS_ETAPAS_CANONICAS = [
  'CORTE',
  'PRELIMINARES',
  'BORDADO_LASER',
  'PESPUNTE',
  'MONTADO',
  'AVIOS',
  'ACABADO',
  'ADORNO',
];

function abreviarEtapa(codigo: string, nombre: string): string {
  switch (codigo) {
    case 'CORTE':
      return 'CORTE';
    case 'PRELIMINARES':
      return 'PRELIM';
    case 'BORDADO_LASER':
      return 'BORD/LAS';
    case 'PESPUNTE':
      return 'PESP';
    case 'MONTADO':
      return 'MONT';
    case 'AVIOS':
      return 'AVÍOS';
    case 'ACABADO':
      return 'ACAB';
    case 'ADORNO':
      return 'ADORNO';
    case 'CINTOS':
      return 'CINTOS';
    case 'BOLSA':
      return 'BOLSA';
    default:
      return (nombre || codigo).substring(0, 8).toUpperCase();
  }
}


/**
 * Dropdown portal compacto para 3 puntos en la celda de Descripción
 */
function AccionesMenuMatriz({
  def,
  onVerDetalle,
  onOpenEdit,
  onOpenDelete,
  onReactivar,
}: {
  def: Defecto;
  onVerDetalle: (def: Defecto) => void;
  onOpenEdit: (def: Defecto) => void;
  onOpenDelete: (def: Defecto) => void;
  onReactivar: (def: Defecto) => void;
}): ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isEliminado = Boolean(def.eliminadoEn);

  const updateMenuPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 160;
      const menuHeight = 110;

      let left = rect.right - menuWidth;
      if (left < 10) left = 10;

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
    <div className="relative inline-block text-right shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) updateMenuPosition();
          setIsOpen(!isOpen);
        }}
        className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        title="Más opciones"
      >
        <Icon name="more_vert" size="16px" />
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
            className="w-40 rounded-xl bg-white border border-slate-200 shadow-xl p-1 z-[9999] text-xs space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onVerDetalle(def);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 rounded-md text-left transition-colors cursor-pointer"
            >
              <Icon name="visibility" size="14px" className="text-slate-400" />
              <span>Ver detalle</span>
            </button>

            {!isEliminado ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenEdit(def);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-slate-100 rounded-md text-left transition-colors cursor-pointer"
                >
                  <Icon name="edit" size="14px" className="text-slate-400" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDelete(def);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-md text-left transition-colors cursor-pointer"
                >
                  <Icon name="delete" size="14px" className="text-red-500" />
                  <span>Eliminar</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onReactivar(def);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md text-left transition-colors cursor-pointer"
              >
                <Icon name="restore" size="14px" className="text-emerald-500" />
                <span>Reactivar</span>
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function DefectosMatrizView({
  defectos,
  departamentos,
  loading,
  busqueda,
  setBusqueda,
  filtroClasificacion,
  setFiltroClasificacion,
  verEliminados,
  setVerEliminados,
  puedeCargarMas,
  cargandoMas,
  onCargarMas,
  totalItems,
  onVerDetalle,
  onOpenEdit,
  onOpenDelete,
  onReactivar,
  onToggleEtapa,
}: DefectosMatrizViewProps) {
  const [updatingCellKey, setUpdatingCellKey] = useState<string | null>(null);

  // Ordenar y proyectar los departamentos de la línea activa respetando orden dinámico de BD
  const etapasOrdenadas = (() => {
    const deptosActivos = departamentos.filter((d) => d.estado === 'ACTIVO');
    return [...deptosActivos].sort((a, b) => {
      const ordenA = a.lineasAsociadas?.[0]?.orden ?? 999;
      const ordenB = b.lineasAsociadas?.[0]?.orden ?? 999;
      if (ordenA !== ordenB) return ordenA - ordenB;
      return a.nombre.localeCompare(b.nombre);
    });
  })();

  const handleCellClick = async (def: Defecto, etapa: Departamento, permitidoActual: boolean) => {
    if (!onToggleEtapa || def.eliminadoEn) return;
    const cellKey = `${def.id}-${etapa.id}`;
    try {
      setUpdatingCellKey(cellKey);
      await onToggleEtapa(def.id, etapa.id, !permitidoActual);
    } catch {
      // Manejado en la capa superior
    } finally {
      setUpdatingCellKey(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Barra de Filtros Compacta */}
      <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Icon
            name="search"
            size="16px"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar por clave o descripción..."
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

        <div className="flex items-center gap-2">
          {/* Selector de Clasificación Compacto */}
          <select
            value={filtroClasificacion}
            onChange={(e) => setFiltroClasificacion(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer"
          >
            <option value="">Todas</option>
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

      {/* Matriz Scrollable Horizontalmente */}
      <div className="overflow-x-auto overflow-y-hidden">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-slate-100/90 border-b border-slate-200 text-2xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-16 text-center sticky left-0 z-10 bg-slate-100 border-r border-slate-200">
                Clave
              </th>
              <th className="py-2.5 px-4 min-w-[280px] sticky left-16 z-10 bg-slate-100 border-r border-slate-200 shadow-2xs">
                Descripción
              </th>
              <th className="py-2.5 px-3 w-28 text-center border-r border-slate-200">
                Propietario
              </th>
              <th className="py-2.5 px-3 w-24 text-center border-r border-slate-200">
                Clasif.
              </th>
              {/* 9 Columnas Oficiales de Etapas de Detección */}
              {etapasOrdenadas.map((etapa) => (
                <th
                  key={etapa.codigo}
                  className="py-2.5 px-2 text-center text-xs font-black border-r border-slate-200 last:border-r-0 min-w-[70px] whitespace-nowrap cursor-help hover:bg-slate-200/80 transition-colors"
                  title={`Etapa de Detección: ${etapa.nombre}`}
                >
                  <span className="tracking-wider text-slate-700 font-mono">
                    {abreviarEtapa(etapa.codigo, etapa.nombre)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
            {loading && defectos.length === 0 ? (
              <tr>
                <td colSpan={4 + etapasOrdenadas.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Spinner size="md" className="text-brand-primary" />
                    <span>Cargando matriz...</span>
                  </div>
                </td>
              </tr>
            ) : defectos.length === 0 ? (
              <tr>
                <td colSpan={4 + etapasOrdenadas.length} className="py-12 text-center text-slate-400 italic">
                  No se encontraron defectos registrados.
                </td>
              </tr>
            ) : (
              defectos.map((def) => {
                // Mapa real de etapas permitidas/bloqueadas provenientes de la API
                const mapEtapasPermitidas = new Map<number, boolean>();
                const mapEtapasCodigo = new Map<string, boolean>();
                def.etapas?.forEach((e) => {
                  mapEtapasPermitidas.set(e.departamentoId, e.permitido);
                  if (e.departamento?.codigo) {
                    mapEtapasCodigo.set(e.departamento.codigo, e.permitido);
                  }
                });

                const isEliminado = Boolean(def.eliminadoEn);

                return (
                  <tr
                    key={def.id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isEliminado ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    {/* Clave Sticky */}
                    <td className="py-2 px-3 font-mono font-bold text-center text-brand-primary sticky left-0 z-10 bg-white border-r border-slate-200 whitespace-nowrap">
                      #{def.clave}
                    </td>

                    {/* Descripción Sticky con Ojito y 3 Puntos */}
                    <td className="py-2 px-4 font-medium text-slate-900 sticky left-16 z-10 bg-white border-r border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="leading-snug truncate" title={def.defecto}>
                          {def.defecto}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Ojito para ver detalle */}
                          <button
                            type="button"
                            onClick={() => onVerDetalle(def)}
                            className="p-1 text-slate-400 hover:text-brand-primary hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="Ver detalles"
                          >
                            <Icon name="visibility" size="16px" />
                          </button>

                          {/* 3 puntos para más opciones (Editar / Eliminar) */}
                          <AccionesMenuMatriz
                            def={def}
                            onVerDetalle={onVerDetalle}
                            onOpenEdit={onOpenEdit}
                            onOpenDelete={onOpenDelete}
                            onReactivar={onReactivar}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Departamento Propietario */}
                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                      <span className="text-sm text-gray-800">
                        {def.departamento?.nombre || '—'}
                      </span>
                    </td>

                    {/* Clasificación */}
                    <td className="py-2 px-3 text-center border-r border-slate-200 whitespace-nowrap">
                      <div className="flex justify-center">
                        <DefectoClasificacionIndicator clasificacion={def.clasificacion} />
                      </div>
                    </td>

                    {/* Celdas de Etapas de Detección: Palomita (Permitido) / Tachita (Bloqueado) interactivo */}
                    {etapasOrdenadas.map((etapa) => {
                      const permitido = etapa.id > 0
                        ? mapEtapasPermitidas.get(etapa.id)
                        : mapEtapasCodigo.get(etapa.codigo);

                      const isPermitido = permitido === true;
                      const cellKey = `${def.id}-${etapa.id}`;
                      const isUpdating = updatingCellKey === cellKey;

                      return (
                        <td
                          key={etapa.codigo}
                          className="py-2 px-2 text-center border-r border-slate-200 last:border-r-0"
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(def, etapa, isPermitido)}
                            disabled={Boolean(def.eliminadoEn) || !onToggleEtapa || isUpdating}
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 ${
                              def.eliminadoEn
                                ? 'opacity-40 cursor-not-allowed'
                                : 'cursor-pointer hover:scale-110 active:scale-95'
                            } ${
                              isPermitido
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-50 text-slate-300 border border-slate-200 hover:bg-slate-100 hover:text-slate-400'
                            }`}
                            title={
                              def.eliminadoEn
                                ? 'Defecto inactivo'
                                : `${isPermitido ? 'Permitido' : 'Bloqueado'} en ${etapa.nombre}. Haz clic para cambiar estado.`
                            }
                          >
                            {isUpdating ? (
                              <Spinner size="xs" />
                            ) : isPermitido ? (
                              <Icon name="check" size="16px" weight={700} />
                            ) : (
                              <Icon name="close" size="14px" weight={400} />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con Ver Más y Contador */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <div>
          Mostrando <strong>{defectos.length}</strong> de <strong>{totalItems}</strong> defectos
        </div>

        {puedeCargarMas && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCargarMas}
            disabled={cargandoMas}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold hover:bg-slate-100"
          >
            {cargandoMas ? (
              <>
                <Spinner size="xs" />
                <span>Cargando más...</span>
              </>
            ) : (
              <>
                <Icon name="expand_more" size="15px" />
                <span>Ver Más Defectos</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
