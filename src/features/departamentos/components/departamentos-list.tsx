import { type ReactNode } from 'react';
import type { Departamento, Linea, TipoOperacion } from '../types/departamentos.types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { HighlightText } from '@/features/inspecciones/components/highlight-text';

interface DepartamentosListProps {
  departamentos: Departamento[];
  lineas: Linea[];
  tiposOperacion: TipoOperacion[];
  filtroTexto: string;
  setFiltroTexto: (val: string) => void;
  filtroTipo: string;
  setFiltroTipo: (val: string) => void;
  filtroLinea: string;
  setFiltroLinea: (val: string) => void;
  verInactivos: boolean;
  onToggleInactivos: () => void;
  onLimpiarFiltros: () => void;
  onOpenCreate: () => void;
  onOpenEdit: (depto: Departamento) => void;
  onDesactivar: (depto: Departamento) => void;
  onReactivar: (depto: Departamento) => void;
  isLoading?: boolean;
}

export function DepartamentosList({
  departamentos,
  lineas,
  tiposOperacion,
  filtroTexto,
  setFiltroTexto,
  filtroTipo,
  setFiltroTipo,
  filtroLinea,
  setFiltroLinea,
  verInactivos,
  onToggleInactivos,
  onLimpiarFiltros,
  onOpenCreate: _onOpenCreate,
  onOpenEdit,
  onDesactivar,
  onReactivar,
  isLoading = false,
}: DepartamentosListProps): ReactNode {
  const hayFiltrosActivos = Boolean(filtroTexto || filtroTipo || filtroLinea);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-border flex flex-col w-full min-w-0">
      {/* Barra de Filtros Compacta Integrada: Estrictamente en UNA SOLA LÍNEA */}
      <div className="p-2.5 border-b border-slate-200 flex items-center justify-between gap-2.5 bg-slate-50/60 overflow-x-auto select-none">
        {/* Lado izquierdo: Buscador rápido */}
        <div className="relative w-56 sm:w-64 shrink-0">
          <Icon
            name="search"
            size="16px"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar departamento..."
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-primary transition-all text-slate-800"
          />
          {filtroTexto && (
            <button
              type="button"
              onClick={() => setFiltroTexto('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpiar búsqueda"
            >
              <Icon name="close" size="14px" />
            </button>
          )}
        </div>

        {/* Lado derecho: Selectores compactos y Botón Papelera al final en una sola fila */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Selector de Tipo de Operación */}
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-36 shrink-0"
            title="Filtrar por tipo de operación"
          >
            <option value="">Todos los Tipos</option>
            {tiposOperacion.map((t) => (
              <option key={t.id} value={t.id.toString()}>
                {t.nombre}
              </option>
            ))}
          </select>

          {/* Selector de Línea */}
          <select
            value={filtroLinea}
            onChange={(e) => setFiltroLinea(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer w-36 shrink-0"
            title="Filtrar por línea de producción"
          >
            <option value="">Todas las Líneas</option>
            {lineas.map((l) => (
              <option key={l.id} value={l.id.toString()}>
                {l.nombre}
              </option>
            ))}
          </select>

          {/* Botón Limpiar Filtros */}
          {hayFiltrosActivos && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLimpiarFiltros}
              className="h-8 text-xs px-2 text-text-muted hover:text-danger cursor-pointer shrink-0"
            >
              <Icon name="filter_alt_off" size="14px" className="mr-1" />
              Limpiar
            </Button>
          )}

          {/* Botón Papelera: Ver Departamentos Desactivados / Inactivos */}
          <button
            type="button"
            onClick={onToggleInactivos}
            title={
              verInactivos
                ? 'Papelera: Viendo departamentos inactivos (Click para volver a activos)'
                : 'Papelera: Ver departamentos inactivos'
            }
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
              verInactivos
                ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-2xs'
                : 'bg-white text-slate-500 border-slate-300 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Icon name="delete" size="18px" className={verInactivos ? 'text-rose-600' : 'text-slate-400'} />
            {verInactivos && <span>Inactivos</span>}
          </button>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      {!isLoading && departamentos.length === 0 ? (
        <div className="text-center py-16 px-4 bg-app-surface rounded-xl border border-border text-text-muted">
          <Icon name="domain_disabled" size="40px" className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-text-primary">
            {verInactivos
              ? 'No hay departamentos inactivos en la papelera'
              : 'No se encontraron departamentos registrados'}
          </p>
          <p className="text-xs text-text-muted/80 mt-1 max-w-md mx-auto">
            {verInactivos
              ? 'Todos los departamentos se encuentran activos y disponibles para selección.'
              : hayFiltrosActivos
              ? 'Intenta con otro término de búsqueda o limpia los filtros aplicados.'
              : 'No hay departamentos registrados actualmente en el sistema.'}
          </p>
        </div>
      ) : (
        <div className="bg-app-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-border text-text-secondary uppercase tracking-wider font-semibold text-2xs select-none">
                  <th className="py-2.5 px-4 w-12 text-center">No</th>
                  <th className="py-2.5 px-4">Nombre del Departamento</th>
                  <th className="py-2.5 px-4 w-32 text-center">Líneas Insp.</th>
                  <th className="py-2.5 px-4">Líneas Asociadas</th>
                  <th className="py-2.5 px-4 w-28 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <TableRowsSkeleton columns={5} rows={6} />
                ) : (
                  departamentos.map((depto, idx) => {
                    const isActivo = depto.estado === 'ACTIVO';
                    return (
                      <tr
                        key={depto.id}
                        className={`hover:bg-app-surface-muted/50 transition-colors ${
                          !isActivo ? 'opacity-60 bg-red-50/15' : ''
                        }`}
                      >
                        {/* No */}
                        <td className="py-3 px-4 text-center font-mono font-semibold text-slate-500">
                          {idx + 1}
                        </td>

                        {/* Nombre */}
                        <td className="py-3 px-4 font-semibold text-text-primary text-sm">
                          <HighlightText text={depto.nombre} highlight={filtroTexto} />
                        </td>

                        {/* Líneas de Inspección asignadas al capturar */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {depto.numeroLineas ?? 1} {depto.numeroLineas === 1 ? 'Línea' : 'Líneas'}
                          </span>
                        </td>

                        {/* Líneas Asociadas */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {depto.lineasAsociadas && depto.lineasAsociadas.length > 0 ? (
                              depto.lineasAsociadas.map((asoc) => (
                                <span
                                  key={asoc.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                                  <span>{asoc.linea?.nombre || `Línea ${asoc.lineaId}`}</span>
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-text-muted italic">Sin líneas vinculadas</span>
                            )}
                          </div>
                        </td>

                        {/* Acciones directas con botones e iconos visibles */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {!verInactivos ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onOpenEdit(depto)}
                                  title="Editar departamento"
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                >
                                  <Icon name="edit" size="16px" className="text-brand-primary" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDesactivar(depto)}
                                  title="Desactivar departamento"
                                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Icon name="delete" size="16px" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onReactivar(depto)}
                                title="Reactivar departamento"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <Icon name="restore" size="15px" className="text-emerald-700" />
                                <span>Reactivar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
