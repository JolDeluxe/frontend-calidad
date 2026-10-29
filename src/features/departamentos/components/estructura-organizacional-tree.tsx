import { type ReactNode } from 'react';
import type { TipoOperacion, Linea, Departamento } from '../types/departamentos.types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

interface EstructuraOrganizacionalProps {
  tipos: TipoOperacion[];
  departamentos: Departamento[];
  onOpenCreateTipo: () => void;
  onOpenEditTipo: (tipo: TipoOperacion) => void;
  onDeleteTipo: (tipo: TipoOperacion) => void;
  onOpenCreateLinea: (tipoId: number) => void;
  onOpenEditLinea: (linea: Linea) => void;
  onDeleteLinea: (linea: Linea) => void;
  onOpenEditDepto: (depto: Departamento) => void;
}

export function EstructuraOrganizacionalTree({
  tipos,
  departamentos,
  onOpenCreateTipo: _onOpenCreateTipo,
  onOpenEditTipo,
  onDeleteTipo,
  onOpenCreateLinea,
  onOpenEditLinea,
  onDeleteLinea,
  onOpenEditDepto,
}: EstructuraOrganizacionalProps): ReactNode {
  return (
    <div className="space-y-4">
      {tipos.length === 0 ? (
        <div className="text-center py-16 px-4 bg-app-surface rounded-xl border border-border text-text-muted">
          <Icon name="device_hub" size="40px" className="mx-auto mb-2 opacity-50" />
          <p className="text-sm font-semibold text-text-primary">
            No hay tipos de operación registrados
          </p>
          <p className="text-xs text-text-muted/80 mt-1 max-w-sm mx-auto">
            Cree un nuevo tipo de operación para asociar líneas de producción y departamentos.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tipos.map((tipo) => {
            const totalLineas = tipo.lineas?.length || 0;

            return (
              <div
                key={tipo.id}
                className="bg-white rounded-xl border border-border shadow-xs overflow-hidden transition-all"
              >
                {/* Cabecera Tipo de Operación: Más visible, espaciosa y legible */}
                <div className="px-5 py-3.5 flex items-center justify-between gap-3 bg-slate-50/80 border-b border-border/80">
                  <div className="flex items-center gap-3 min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-base tracking-tight truncate">
                      {tipo.nombre}
                    </h3>
                    <span className="text-xs font-bold text-marca-primario bg-marca-primario/10 border border-marca-primario/20 px-2.5 py-0.5 rounded-full">
                      {totalLineas} {totalLineas === 1 ? 'Línea' : 'Líneas'}
                    </span>
                  </div>

                  {/* Acciones para el Tipo: Nueva Línea, Editar y Eliminar */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenCreateLinea(tipo.id)}
                      title="Agregar Línea de Producción a este Tipo"
                      className="text-xs flex items-center gap-1.5 h-8 px-3 font-semibold"
                    >
                      <Icon name="add" size="15px" />
                      <span>Nueva Línea</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => onOpenEditTipo(tipo)}
                      title="Editar tipo"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                      <Icon name="edit" size="17px" className="text-brand-primary" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTipo(tipo)}
                      title="Eliminar tipo"
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Icon name="delete" size="17px" />
                    </button>
                  </div>
                </div>

                {/* Líneas dentro del Tipo de Operación con mayor tamaño y confort visual */}
                <div className="p-4 bg-app-surface">
                  {tipo.lineas && tipo.lineas.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                      {tipo.lineas.map((linea) => {
                        const deptosLinea = departamentos.filter((d) =>
                          d.lineasAsociadas?.some((asoc) => asoc.lineaId === linea.id && asoc.activo)
                        );

                        const esLineaProtegida = ['BOTA', 'ACCESORIOS'].includes((linea.codigo || '').toUpperCase());
                        const tieneDeptos = deptosLinea.length > 0;
                        const puedeEliminar = !esLineaProtegida && !tieneDeptos;
                        const motivoNoEliminar = esLineaProtegida
                          ? 'Línea base maestra protegida del sistema'
                          : tieneDeptos
                          ? `No se puede eliminar: tiene ${deptosLinea.length} departamento(s) asignado(s)`
                          : 'Eliminar línea';

                        return (
                          <div
                            key={linea.id}
                            className="border border-border/90 rounded-xl p-4 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between shadow-2xs space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {/* Nombre de la Línea destacado y con tipografía clara */}
                              <span className="font-extrabold text-slate-800 text-sm tracking-tight truncate">
                                {linea.nombre}
                              </span>

                              {/* Acciones de Línea */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onOpenEditLinea(linea)}
                                  title="Editar línea"
                                  className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                >
                                  <Icon name="edit" size="15px" className="text-brand-primary" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => puedeEliminar && onDeleteLinea(linea)}
                                  disabled={!puedeEliminar}
                                  title={motivoNoEliminar}
                                  className={`p-1.5 rounded-md transition-colors ${
                                    puedeEliminar
                                      ? 'text-rose-600 hover:bg-rose-50 cursor-pointer'
                                      : 'text-slate-300 dark:text-slate-600 cursor-not-allowed opacity-50'
                                  }`}
                                >
                                  <Icon name="delete" size="15px" />
                                </button>
                              </div>
                            </div>

                            {/* Departamentos asociados con badges más amplios y legibles */}
                            <div className="pt-2.5 border-t border-border/80">
                              <span className="text-xs font-bold text-slate-600 block mb-2">
                                Departamentos ({deptosLinea.length}):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {deptosLinea.length > 0 ? (
                                  deptosLinea.map((dep) => (
                                    <button
                                      key={dep.id}
                                      type="button"
                                      onClick={() => onOpenEditDepto(dep)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                                      title="Click para ver/editar departamento"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                                      <span>{dep.nombre}</span>
                                    </button>
                                  ))
                                ) : (
                                  <span className="text-xs text-text-muted italic py-1">
                                    Sin departamentos asignados
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic py-3 text-center">
                      No hay líneas registradas para este tipo. Haga clic en "+ Nueva Línea" para agregar una.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
