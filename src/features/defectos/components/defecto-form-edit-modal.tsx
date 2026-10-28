import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { Defecto } from '../types/defectos.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export interface DefectoFormEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  defecto: Defecto | null;
  departamentos?: Departamento[];
  onSubmit: (data: {
    defecto: string;
    clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
    departamentoId?: number;
    nuevaClave?: number;
    departamentosList?: Array<{ departamentoId: number; activo: boolean }>;
  }) => Promise<void>;
}

export function DefectoFormEditModal({
  isOpen,
  onClose,
  defecto,
  departamentos = [],
  onSubmit,
}: DefectoFormEditModalProps) {
  const [formDefecto, setFormDefecto] = useState('');
  const [formClasificacion, setFormClasificacion] = useState<'CRITICO' | 'MAYOR' | 'MENOR'>('MENOR');
  const [formDepartamentoId, setFormDepartamentoId] = useState<number>(2);
  const [mostrarEditarClave, setMostrarEditarClave] = useState(false);
  const [formNuevaClave, setFormNuevaClave] = useState('');
  const [selectedDeptosMap, setSelectedDeptosMap] = useState<Record<number, boolean>>({});
  const [busquedaDepto, setBusquedaDepto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && defecto) {
      setFormDefecto(defecto.defecto);
      setFormClasificacion(defecto.clasificacion);
      setFormDepartamentoId(defecto.departamento?.id || defecto.departamentoId || 2);
      setMostrarEditarClave(false);
      setFormNuevaClave(defecto.clave.toString());
      setBusquedaDepto('');
      setError(null);
      setIsSubmitting(false);

      // Inicializar mapa de departamentos según los que ya tiene asignados el defecto
      const map: Record<number, boolean> = {};
      departamentos.forEach((d) => {
        map[d.id] = false;
      });
      defecto.departamentos?.forEach((d) => {
        if (d.activo) {
          map[d.departamentoId] = true;
        }
      });
      setSelectedDeptosMap(map);
    }
  }, [isOpen, defecto, departamentos]);

  if (!isOpen || !defecto) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDefecto.trim()) {
      setError('La descripción del defecto es obligatoria');
      return;
    }

    const nuevaClaveNum = Number(formNuevaClave);
    const vaACambiarClave =
      mostrarEditarClave &&
      !isNaN(nuevaClaveNum) &&
      nuevaClaveNum > 0 &&
      nuevaClaveNum !== defecto.clave;

    if (mostrarEditarClave) {
      if (!nuevaClaveNum || isNaN(nuevaClaveNum) || nuevaClaveNum <= 0) {
        setError('Ingresa un número válido de clave de defecto');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Generar lista de relaciones de departamentos si hay departamentos provistos
      const departamentosList =
        departamentos.length > 0
          ? Object.entries(selectedDeptosMap).map(([id, activo]) => ({
              departamentoId: Number(id),
              activo,
            }))
          : undefined;

      await onSubmit({
        defecto: formDefecto.trim(),
        clasificacion: formClasificacion,
        departamentoId: formDepartamentoId,
        nuevaClave: vaACambiarClave ? nuevaClaveNum : undefined,
        departamentosList,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar defecto';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const seleccionadosCount = Object.values(selectedDeptosMap).filter(Boolean).length;

  const deptosFiltrados = departamentos.filter((d) => {
    if (!busquedaDepto.trim()) return true;
    const term = busquedaDepto.toLowerCase().trim();
    const matchNombre = d.nombre.toLowerCase().includes(term);
    const matchLinea = d.lineasAsociadas?.some((l) =>
      l.linea?.nombre.toLowerCase().includes(term)
    );
    return matchNombre || matchLinea;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl max-h-[90vh]">
      <ModalHeader title={`Editar Defecto #${defecto.clave}`} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ModalBody className="space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div>
            <Label className="mb-1 block">
              Descripción del Defecto *
            </Label>
            <Input
              value={formDefecto}
              onChange={(e) => setFormDefecto(e.target.value)}
              placeholder="Ej. Costura desalineada en tubo"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">
                Departamento *
              </Label>
              <Select
                value={formDepartamentoId.toString()}
                onChange={(e) => setFormDepartamentoId(Number(e.target.value))}
              >
                {departamentos.map((dep) => (
                  <option key={dep.id} value={dep.id.toString()}>
                    {dep.nombre}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">
                Clasificación *
              </Label>
              <Select
                value={formClasificacion}
                onChange={(e) => setFormClasificacion(e.target.value as 'CRITICO' | 'MAYOR' | 'MENOR')}
              >
                <option value="CRITICO">Crítico</option>
                <option value="MAYOR">Mayor</option>
                <option value="MENOR">Menor</option>
              </Select>
            </div>
          </div>

          {/* Sección de Selección de Departamentos Disponibles */}
          {departamentos.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <Label className="block">
                  Departamentos Disponibles
                </Label>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary shrink-0">
                  {seleccionadosCount} seleccionados
                </span>
              </div>

              {/* Barra de búsqueda de departamentos */}
              <div className="relative mb-2">
                <Icon name="search" size="16px" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <Input
                  type="text"
                  placeholder="Filtrar departamentos..."
                  value={busquedaDepto}
                  onChange={(e) => setBusquedaDepto(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Marcar todos / Desmarcar */}
              <div className="flex items-center justify-between text-xs px-1 mb-2 text-text-muted">
                <span>{deptosFiltrados.length} departamentos mostrados</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<number, boolean> = { ...selectedDeptosMap };
                      deptosFiltrados.forEach((d) => {
                        next[d.id] = true;
                      });
                      setSelectedDeptosMap(next);
                    }}
                    className="text-brand-primary hover:underline font-medium cursor-pointer"
                  >
                    Marcar todos
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<number, boolean> = { ...selectedDeptosMap };
                      deptosFiltrados.forEach((d) => {
                        next[d.id] = false;
                      });
                      setSelectedDeptosMap(next);
                    }}
                    className="text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {/* Lista agrupada por líneas de producción */}
              <div className="max-h-60 overflow-y-auto overflow-x-hidden border border-border/80 rounded-xl bg-app-surface p-3 space-y-4">
                {(() => {
                  const agrupadosPorLinea: Record<string, { lineaNombre: string; deptos: Departamento[] }> = {};

                  deptosFiltrados.forEach((dep) => {
                    const lineas = dep.lineasAsociadas?.filter((l) => l.activo && l.linea) || [];
                    lineas.forEach((rel) => {
                      const lineaNombre = rel.linea.nombre;
                      if (!agrupadosPorLinea[lineaNombre]) {
                        agrupadosPorLinea[lineaNombre] = { lineaNombre, deptos: [] };
                      }
                      if (!agrupadosPorLinea[lineaNombre].deptos.some((d) => d.id === dep.id)) {
                        agrupadosPorLinea[lineaNombre].deptos.push(dep);
                      }
                    });
                  });

                  const gruposLineas = Object.values(agrupadosPorLinea);

                  if (gruposLineas.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-text-muted italic">
                        No se encontraron departamentos asociados a líneas de producción.
                      </div>
                    );
                  }

                  const renderDeptoItem = (dep: Departamento, keyPrefix: string) => {
                    const isChecked = !!selectedDeptosMap[dep.id];
                    return (
                      <label
                        key={`${keyPrefix}-${dep.id}`}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors min-w-0 ${
                          isChecked
                            ? 'bg-brand-primary/5 border-brand-primary/40 text-brand-primary font-semibold shadow-2xs'
                            : 'bg-app-surface border-border/80 text-text-primary hover:bg-app-surface-muted'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setSelectedDeptosMap((prev) => ({
                              ...prev,
                              [dep.id]: e.target.checked,
                            }))
                          }
                          className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-accent cursor-pointer shrink-0"
                        />
                        <span className="leading-snug text-left truncate" title={dep.nombre}>
                          {dep.nombre}
                        </span>
                      </label>
                    );
                  };

                  return (
                    <>
                      {gruposLineas.map((grupo) => (
                        <div key={grupo.lineaNombre} className="space-y-2">
                          <div className="flex items-center gap-2 pb-1 border-b border-border/60">
                            <Icon name="linear_scale" size="14px" className="text-brand-primary" />
                            <span className="text-xs font-bold text-brand-primary uppercase tracking-wide">
                              Línea {grupo.lineaNombre} ({grupo.deptos.length})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {grupo.deptos.map((dep) => renderDeptoItem(dep, grupo.lineaNombre))}
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Sección Plegable: Modificar Clave de Defecto */}
          <div className="border border-border/80 rounded-xl p-3 bg-app-surface-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-text-primary block">
                  Clave de Defecto
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarEditarClave(!mostrarEditarClave)}
                className="text-xs h-8 px-2.5"
              >
                <Icon name="key" size="14px" className="mr-1" />
                <span>{mostrarEditarClave ? 'Ocultar' : 'Modificar Clave'}</span>
              </Button>
            </div>

            {mostrarEditarClave && (
              <div className="mt-3 pt-3 border-t border-border space-y-3 animate-in fade-in duration-150">
                <div>
                  <Label className="mb-1 block">
                    Nueva Clave *
                  </Label>
                  <Input
                    type="number"
                    value={formNuevaClave}
                    onChange={(e) => setFormNuevaClave(e.target.value)}
                    placeholder="Ej. 1850"
                  />
                </div>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="cancelar"
            onClick={() => {
              setError(null);
              onClose();
            }}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="guardar"
            disabled={isSubmitting || !formDefecto.trim()}
            icon={isSubmitting ? undefined : 'check_circle'}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" />
                Guardando...
              </span>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
