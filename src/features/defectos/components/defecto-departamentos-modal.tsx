import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import type { Defecto } from '../types/defectos.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export interface DefectoDepartamentosModalProps {
  isOpen: boolean;
  onClose: () => void;
  defecto: Defecto | null;
  departamentos: Departamento[];
  onSubmit: (departamentos: Array<{ departamentoId: number; activo: boolean }>) => Promise<void>;
}

export function DefectoDepartamentosModal({
  isOpen,
  onClose,
  defecto,
  departamentos,
  onSubmit,
}: DefectoDepartamentosModalProps) {
  const [selectedDeptosMap, setSelectedDeptosMap] = useState<Record<number, boolean>>({});
  const [busquedaDeptoModal, setBusquedaDeptoModal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && defecto) {
      const map: Record<number, boolean> = {};
      departamentos.forEach((d) => {
        const exists = defecto.departamentos?.some((rel) => rel.departamentoId === d.id && rel.activo);
        map[d.id] = !!exists;
      });
      setSelectedDeptosMap(map);
      setBusquedaDeptoModal('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, defecto, departamentos]);

  if (!isOpen || !defecto) return null;

  const deptosModalFiltrados = departamentos.filter(
    (dep) =>
      dep.nombre.toLowerCase().includes(busquedaDeptoModal.toLowerCase()) ||
      dep.codigo.toLowerCase().includes(busquedaDeptoModal.toLowerCase())
  );

  const seleccionadosEnModalCount = Object.values(selectedDeptosMap).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError(null);
      const list = Object.entries(selectedDeptosMap).map(([id, activo]) => ({
        departamentoId: Number(id),
        activo,
      }));
      await onSubmit(list);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al asociar departamentos';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl max-h-[90vh]">
      <ModalHeader
        title={`Departamentos Disponibles (#${defecto.clave})`}
        onClose={onClose}
      />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <ModalBody className="space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* Banner Informativo del Departamento Propietario */}
          <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Icon name="corporate_fare" size="16px" className="text-brand-primary" />
              <span>
                Departamento Propietario del Defecto:{' '}
                <strong className="text-brand-primary uppercase">
                  {defecto.departamento?.nombre || 'CORTE'}
                </strong>
              </span>
            </div>
            <span className="text-2xs text-text-muted italic">Inmutable en esta vista</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-xs text-text-secondary">
              Selecciona las áreas donde este defecto estará disponible para captura en inspección:
            </p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary shrink-0">
              {seleccionadosEnModalCount} seleccionados
            </span>
          </div>

          {/* Barra de búsqueda de departamentos */}
          <div className="relative">
            <Icon name="search" size="16px" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Filtrar departamentos..."
              value={busquedaDeptoModal}
              onChange={(e) => setBusquedaDeptoModal(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Selector de todos / ninguno */}
          <div className="flex items-center justify-between text-xs px-1 text-text-muted">
            <span>{deptosModalFiltrados.length} departamentos mostrados</span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const next: Record<number, boolean> = { ...selectedDeptosMap };
                  deptosModalFiltrados.forEach((d) => {
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
                  deptosModalFiltrados.forEach((d) => {
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
          <div className="max-h-80 overflow-y-auto overflow-x-hidden border border-border/80 rounded-xl bg-app-surface p-3 space-y-4">
            {(() => {
              const agrupadosPorLinea: Record<string, { lineaNombre: string; deptos: Departamento[] }> = {};

              deptosModalFiltrados.forEach((dep) => {
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
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="cancelar" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="guardar" disabled={isSubmitting} icon={isSubmitting ? undefined : 'check_circle'}>
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Spinner size="xs" />
                Guardando...
              </span>
            ) : (
              'Guardar Asociaciones'
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
