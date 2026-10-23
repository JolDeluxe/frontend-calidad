import { type ReactNode } from 'react';
import type { TipoOperacion, Linea, Departamento } from '../types/departamentos.types';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';

interface EstructuraOrganizacionalProps {
  tipos: TipoOperacion[];
  departamentos: Departamento[];
  onOpenCreateTipo: () => void;
  onOpenEditTipo: (tipo: TipoOperacion) => void;
  onToggleEstadoTipo: (tipo: TipoOperacion) => void;
  onDeleteTipo: (tipo: TipoOperacion) => void;
  onOpenCreateLinea: (tipoId: number) => void;
  onOpenEditLinea: (linea: Linea) => void;
  onToggleEstadoLinea: (linea: Linea) => void;
  onDeleteLinea: (linea: Linea) => void;
  onOpenEditDepto: (depto: Departamento) => void;
}

export function EstructuraOrganizacionalTree({
  tipos,
  departamentos,
  onOpenCreateTipo,
  onOpenEditTipo,
  onToggleEstadoTipo,
  onDeleteTipo,
  onOpenCreateLinea,
  onOpenEditLinea,
  onToggleEstadoLinea,
  onDeleteLinea,
  onOpenEditDepto,
}: EstructuraOrganizacionalProps): ReactNode {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-cuadra-arena/30 p-4 rounded-lg border border-cuadra-oro/20">
        <div>
          <h2 className="text-base font-bold text-cuadra-cafe">Jerarquía Operativa</h2>
          <p className="text-xs text-cuadra-antracita/70">
            Estructura directa: Tipo de Operación ➔ Líneas ➔ Departamentos vinculados
          </p>
        </div>
        <Button onClick={onOpenCreateTipo} size="sm" className="flex items-center gap-1">
          <Icon name="add" />
          <span>Nuevo Tipo de Operación</span>
        </Button>
      </div>

      {tipos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-cuadra-oro/20 text-xs text-cuadra-antracita/60">
          No hay tipos de operación registrados. Cree uno para comenzar.
        </div>
      ) : (
        <div className="space-y-4">
          {tipos.map((tipo) => (
            <div
              key={tipo.id}
              className="bg-white rounded-lg border border-cuadra-oro/30 shadow-sm overflow-hidden"
            >
              {/* Header Tipo de Operación */}
              <div className="bg-cuadra-arena/50 p-4 flex flex-wrap items-center justify-between gap-3 border-b border-cuadra-oro/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cuadra-cafe text-white flex items-center justify-center font-bold text-xs">
                    T
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cuadra-cafe text-sm">{tipo.nombre}</span>
                      <span className="font-mono text-[10px] bg-cuadra-oro/20 text-cuadra-cafe px-1.5 py-0.5 rounded">
                        {tipo.codigo}
                      </span>
                      <StatusBadge estadoRegistro={tipo.estado} />
                    </div>
                    {tipo.descripcion && (
                      <p className="text-[11px] text-cuadra-antracita/70">{tipo.descripcion}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenCreateLinea(tipo.id)}
                    title="Agregar Línea a este Tipo de Operación"
                    className="text-xs text-cuadra-cafe hover:bg-cuadra-oro/20"
                  >
                    <Icon name="add" className="text-sm mr-1" />
                    <span>Línea</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleEstadoTipo(tipo)}
                    title={tipo.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                  >
                    <Icon
                      name={tipo.estado === 'ACTIVO' ? 'toggle_on' : 'toggle_off'}
                      className={tipo.estado === 'ACTIVO' ? 'text-green-600' : 'text-gray-400'}
                    />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onOpenEditTipo(tipo)} title="Editar">
                    <Icon name="edit" className="text-sm" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteTipo(tipo)}
                    className="text-red-600 hover:text-red-700"
                    title="Eliminar"
                  >
                    <Icon name="delete" className="text-sm" />
                  </Button>
                </div>
              </div>

              {/* Líneas dentro del Tipo de Operación */}
              <div className="p-4 space-y-3">
                {tipo.lineas && tipo.lineas.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tipo.lineas.map((linea) => {
                      const deptosLinea = departamentos.filter((d) =>
                        d.lineasAsociadas?.some((asoc) => asoc.lineaId === linea.id && asoc.activo)
                      );

                      return (
                        <div
                          key={linea.id}
                          className="border border-cuadra-oro/20 rounded-md p-3.5 bg-gray-50/50 hover:bg-white transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-cuadra-cafe text-xs">
                                  {linea.nombre}
                                </span>
                                <span className="font-mono text-[10px] text-cuadra-antracita/60">
                                  [{linea.codigo}]
                                </span>
                                <StatusBadge estadoRegistro={linea.estado} />
                              </div>
                              {linea.descripcion && (
                                <p className="text-[11px] text-cuadra-antracita/70 mt-0.5">
                                  {linea.descripcion}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleEstadoLinea(linea)}
                                title={linea.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                              >
                                <Icon
                                  name={linea.estado === 'ACTIVO' ? 'toggle_on' : 'toggle_off'}
                                  className={`text-sm ${
                                    linea.estado === 'ACTIVO' ? 'text-green-600' : 'text-gray-400'
                                  }`}
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onOpenEditLinea(linea)}
                                title="Editar línea"
                              >
                                <Icon name="edit" className="text-sm" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDeleteLinea(linea)}
                                className="text-red-600 hover:text-red-700"
                                title="Eliminar línea"
                              >
                                <Icon name="delete" className="text-sm" />
                              </Button>
                            </div>
                          </div>

                          {/* Departamentos asociados a esta Línea */}
                          <div className="mt-2.5 pt-2 border-t border-cuadra-oro/10">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cuadra-oro block mb-1.5">
                              Departamentos Asociados ({deptosLinea.length}):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {deptosLinea.length > 0 ? (
                                deptosLinea.map((dep) => (
                                  <button
                                    key={dep.id}
                                    type="button"
                                    onClick={() => onOpenEditDepto(dep)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cuadra-arena/60 hover:bg-cuadra-oro/20 text-cuadra-cafe border border-cuadra-oro/30 transition-colors"
                                    title="Click para ver/editar departamento"
                                  >
                                    <span>{dep.nombre}</span>
                                  </button>
                                ))
                              ) : (
                                <span className="text-[11px] text-cuadra-antracita/50 italic">
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
                  <p className="text-xs text-cuadra-antracita/50 italic py-2">
                    No hay líneas asociadas a este tipo de operación.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
