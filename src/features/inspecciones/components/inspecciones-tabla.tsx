import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { HighlightText } from './highlight-text';
import { DefectoClasificacionIndicator } from '@/features/defectos/components/defecto-clasificacion-indicator';
import type { InspeccionFilaResponse } from '../types/inspecciones.types';

interface InspeccionesTablaProps {
  items: InspeccionFilaResponse[];
  busqueda?: string;
  isLoading?: boolean;
  totalItems?: number;
  destacadosIds?: number[];
  toolbar?: ReactNode;
  puedeCargarMas?: boolean;
  cargandoMas?: boolean;
  verEliminados?: boolean;
  onCargarMas?: () => void;
  onVerDetalle?: (item: InspeccionFilaResponse) => void;
  onCancelar?: (item: InspeccionFilaResponse) => void;
}

/** Menú contextual de 3 puntos (mini-modal / dropdown flotante) para cada fila */
function MenuAccionesInspeccion({
  row,
  onVerDetalle,
  onCancelar,
  verEliminados,
}: {
  row: InspeccionFilaResponse;
  onVerDetalle?: (row: InspeccionFilaResponse) => void;
  onCancelar?: (row: InspeccionFilaResponse) => void;
  verEliminados?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 170;
      let left = rect.right - menuWidth;
      if (left < 10) left = 10;
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: left + window.scrollX,
      });
    }
    setIsOpen(!isOpen);
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
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Regla de negocio: Solo los registros de los últimos 30 días pueden ser cancelados/eliminados
  const puedeEliminarPorAntiguedad = (() => {
    try {
      const fechaRegistro = new Date(row.fecha);
      const limite30Dias = new Date();
      limite30Dias.setDate(limite30Dias.getDate() - 30);
      limite30Dias.setHours(0, 0, 0, 0);
      return fechaRegistro >= limite30Dias;
    } catch {
      return false;
    }
  })();

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-border/60 transition-colors cursor-pointer"
        title="Opciones"
      >
        <Icon name="more_vert" size="16px" />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
            className="fixed z-50 w-44 bg-app-surface border border-border rounded-lg shadow-xl p-1 text-xs animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {onVerDetalle && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onVerDetalle(row);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-text-primary hover:bg-app-surface-muted rounded-md text-left transition-colors cursor-pointer"
              >
                <Icon name="visibility" size="14px" className="text-brand-primary" />
                <span>Ver detalles</span>
              </button>
            )}

            {onCancelar && puedeEliminarPorAntiguedad && !verEliminados && (
              <>
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onCancelar(row);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-rose-700 hover:bg-rose-50 rounded-md text-left transition-colors cursor-pointer font-medium"
                >
                  <Icon name="cancel" size="14px" className="text-rose-600" />
                  <span>Cancelar Defecto</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export function InspeccionesTabla({
  items,
  busqueda = '',
  isLoading = false,
  totalItems = 0,
  destacadosIds = [],
  toolbar,
  puedeCargarMas = false,
  cargandoMas = false,
  verEliminados = false,
  onCargarMas,
  onVerDetalle,
  onCancelar,
}: InspeccionesTablaProps): ReactNode {
  const formatearFecha = (fechaIso: string) => {
    try {
      const d = new Date(fechaIso);
      return d.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return fechaIso;
    }
  };

  if (!isLoading && items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-border flex flex-col w-full min-w-0">
        <table className="w-full text-left border-collapse table-fixed text-[11px] xl:text-xs">
          <thead className="sticky top-0 z-30 shadow-xs">
            {toolbar && (
              <tr className="bg-white border-b border-border/80">
                <th colSpan={14} className="p-2.5 xl:p-3 font-normal text-left bg-white rounded-t-xl">
                  {toolbar}
                </th>
              </tr>
            )}
            <tr className="bg-slate-100 border-b border-border text-text-secondary uppercase tracking-wider font-semibold text-2xs select-none">
              <th className="py-2 px-1.5 xl:px-2.5 w-[4%] text-center">No</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[9%] truncate">Depto</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[8%] truncate">Fecha</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[6%] truncate">Lista</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[6%] truncate">Lote</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[5%] text-center">Línea</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[7%] truncate">Modelo</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[18%]">Descripción</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[5%] text-center font-mono">Clave</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[16%]">Defecto</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[6%]">Clasif.</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[4%] text-center">Prs</th>
              <th className="py-2 px-1.5 xl:px-2.5 w-[6%] truncate">Inspector</th>
              <th className="py-2 px-1 w-[32px] text-center"></th>
            </tr>
          </thead>
        </table>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-text-muted">
          <Icon name="search_off" size="40px" className="mx-auto mb-2 opacity-50" />
          <h4 className="text-sm font-semibold text-text-primary">No se encontraron defectos registrados</h4>
          <p className="text-xs text-text-muted/80 mt-1 max-w-md mx-auto">
            Intente con otro término de búsqueda o seleccione otro periodo (Hoy, Recientes o Histórico).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-xs border border-border flex flex-col w-full min-w-0">
      {/* TABLA PRINCIPAL: ENCABEZADO Y FILTROS INTEGRADOS EN THEAD STICKY TOP-0 */}
      <table className="w-full text-left border-collapse table-fixed text-[11px] xl:text-xs">
        <thead className="sticky top-0 z-30 shadow-xs">
          {/* Fila 1: Filtros Integrados (Cero cálculo top-14, irrompible) */}
          {toolbar && (
            <tr className="bg-white border-b border-border/80">
              <th colSpan={14} className="p-2.5 xl:p-3 font-normal text-left bg-white rounded-t-xl">
                {toolbar}
              </th>
            </tr>
          )}

          {/* Fila 2: Títulos de Columnas Proporcionales (suman 100% con table-fixed) */}
          <tr className="bg-slate-100 border-b border-border text-text-secondary uppercase tracking-wider font-semibold text-2xs select-none">
            <th className="py-2 px-1.5 xl:px-2.5 w-[4%] text-center">No</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[9%] truncate">Depto</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[8%] truncate">Fecha</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[6%] truncate">Lista</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[6%] truncate">Lote</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[5%] text-center">Línea</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[7%] truncate">Modelo</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[18%]">Descripción</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[5%] text-center font-mono">Clave</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[16%]">Defecto</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[6%]">Clasif.</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[4%] text-center">Prs</th>
            <th className="py-2 px-1.5 xl:px-2.5 w-[6%] truncate">Inspector</th>
            <th className="py-2 px-1 w-[32px] text-center"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {isLoading ? (
            <TableRowsSkeleton columns={14} rows={10} />
          ) : (
            items.map((row, idx) => {
              // Resaltar si el departamento de origen/responsable es diferente del auditado
              const esDeptoExterno =
                row.defDepto.trim().toUpperCase() !== row.departamentoAuditoria.trim().toUpperCase();
              const esRecienGuardado = destacadosIds.includes(row.id);

              return (
                <tr
                  key={row.id}
                  className={`transition-colors duration-200 ${
                    esRecienGuardado
                      ? 'row-newly-saved'
                      : 'hover:bg-app-surface-muted/50'
                  }`}
                >
                  {/* No */}
                  <td className="py-2 px-1 xl:px-2 text-center font-mono font-semibold text-slate-500">
                    {idx + 1}
                  </td>

                  {/* Depto */}
                  <td className="py-2 px-1.5 xl:px-2.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-bold text-slate-800 uppercase truncate" title={row.defDepto}>
                        {row.defDepto}
                      </span>
                      {esDeptoExterno && (
                        <div
                          className="group relative inline-flex items-center cursor-help shrink-0"
                          tabIndex={0}
                        >
                          <Icon
                            name="info"
                            size="11px"
                            className="text-amber-700 hover:text-amber-800 transition-colors"
                          />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:flex group-focus:flex flex-col items-center z-50 pointer-events-none">
                            <div className="bg-slate-900 text-white text-[11px] font-medium py-1 px-2.5 rounded shadow-lg whitespace-nowrap">
                              Defecto de {row.defDepto} encontrado en {row.departamentoAuditoria}
                            </div>
                            <div className="w-2 h-1 bg-slate-900 rotate-45 -mt-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Fecha */}
                  <td className="py-2 px-1.5 xl:px-2 font-mono font-semibold text-slate-700 whitespace-nowrap truncate">
                    {formatearFecha(row.fecha)}
                  </td>

                  {/* Lista */}
                  <td className="py-2 px-1 xl:px-2 font-semibold text-slate-700 truncate" title={row.lista}>
                    <HighlightText text={row.lista} highlight={busqueda} />
                  </td>

                  {/* Lote */}
                  <td className="py-2 px-1 xl:px-2 font-extrabold text-sm text-marca-primario font-mono truncate" title={row.lote}>
                    <HighlightText text={row.lote} highlight={busqueda} />
                  </td>

                  {/* Línea */}
                  <td className="py-2 px-1 text-center">
                    <span className="inline-block px-1 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 truncate">
                      {row.linea}
                    </span>
                  </td>

                  {/* Modelo */}
                  <td className="py-2 px-1.5 xl:px-2 font-semibold text-slate-900 truncate" title={row.modelo}>
                    <HighlightText text={row.modelo} highlight={busqueda} />
                  </td>

                  {/* Descripción (Truncate con title para que nunca empuje la tabla) */}
                  <td className="py-2 px-1.5 xl:px-2.5 text-text-muted truncate" title={row.descripcion || ''}>
                    {row.descripcion ? (
                      <HighlightText text={row.descripcion} highlight={busqueda} />
                    ) : (
                      ''
                    )}
                  </td>

                  {/* Clave de Defecto */}
                  <td className="py-2 px-1 text-center font-mono font-extrabold text-brand-primary">
                    <HighlightText text={row.defectoClave} highlight={busqueda} />
                  </td>

                  {/* Defecto (Nombre / Descripción) */}
                  <td className="py-2 px-1.5 xl:px-2.5 truncate" title={row.defectoNombre}>
                    <HighlightText text={row.defectoNombre} highlight={busqueda} />
                  </td>

                  {/* Clasificación */}
                  <td className="py-2 px-1 xl:px-2">
                    <DefectoClasificacionIndicator clasificacion={row.clasificacion} />
                  </td>

                  {/* Prs */}
                  <td className="py-2 px-1 text-center">
                    <span className="inline-flex items-center justify-center font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-900 text-xs">
                      {row.paresDefectuosos}
                    </span>
                  </td>

                  {/* Inspector */}
                  <td className="py-2 px-1.5 xl:px-2 text-text-muted text-[11px] truncate" title={row.usuario}>
                    {row.usuario}
                  </td>

                  {/* Columna de Acción (3 puntos) */}
                  <td className="py-2 px-1 text-center">
                    <MenuAccionesInspeccion
                      row={row}
                      onVerDetalle={onVerDetalle}
                      onCancelar={onCancelar}
                      verEliminados={verEliminados}
                    />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Footer: Contador y Botón "Ver más" */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-app-surface text-xs rounded-b-xl">
        <span className="text-text-secondary">
          Mostrando <strong className="text-text-primary font-bold">{items.length}</strong> de{' '}
          <strong className="text-text-primary font-bold">{totalItems || items.length}</strong> defectos
        </span>

        {puedeCargarMas && onCargarMas && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={cargandoMas}
            onClick={onCargarMas}
            className="text-xs font-semibold px-5 py-2 cursor-pointer"
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
  );
}
