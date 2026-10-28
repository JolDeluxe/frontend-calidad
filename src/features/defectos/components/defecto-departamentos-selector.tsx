import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export interface DefectoDepartamentosSelectorProps {
  departamentos: Departamento[];
  selectedDeptosMap: Record<number, boolean>;
  onChange: (next: Record<number, boolean>) => void;
  departamentoPropietarioId?: number | '';
}

/**
 * Selector de «Otros Departamentos» evaluadores donde se permite capturar este defecto.
 * El departamento propietario NUNCA se muestra aquí porque ya es el dueño natural y
 * siempre está incluido por defecto.
 */
export function DefectoDepartamentosSelector({
  departamentos,
  selectedDeptosMap,
  onChange,
  departamentoPropietarioId,
}: DefectoDepartamentosSelectorProps) {
  const [busquedaDepto, setBusquedaDepto] = useState('');

  const propIdNum = departamentoPropietarioId ? Number(departamentoPropietarioId) : null;

  // Filtrar fuera el departamento propietario: no tiene sentido seleccionarlo
  const deptosSinPropietario = departamentos.filter((d) => d.id !== propIdNum);

  const seleccionadosCount = deptosSinPropietario.filter((d) => Boolean(selectedDeptosMap[d.id])).length;

  const deptosFiltrados = deptosSinPropietario.filter((d) => {
    if (!busquedaDepto.trim()) return true;
    const term = busquedaDepto.toLowerCase().trim();
    const matchNombre = d.nombre.toLowerCase().includes(term);
    const matchLinea = d.lineasAsociadas?.some((l) => l.linea?.nombre.toLowerCase().includes(term));
    return matchNombre || matchLinea;
  });

  const marcar = (valor: boolean) => {
    const next: Record<number, boolean> = { ...selectedDeptosMap };
    deptosFiltrados.forEach((d) => {
      next[d.id] = valor;
    });
    // Garantizar que el propietario permanezca activo en el mapa interno
    if (propIdNum) next[propIdNum] = true;
    onChange(next);
  };

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

  const renderDeptoItem = (dep: Departamento, keyPrefix: string) => {
    const isChecked = !!selectedDeptosMap[dep.id];
    return (
      <label
        key={`${keyPrefix}-${dep.id}`}
        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs transition-colors min-w-0 cursor-pointer ${
          isChecked
            ? 'bg-brand-primary/5 border-brand-primary/40 text-brand-primary font-semibold shadow-2xs'
            : 'bg-app-surface border-border/80 text-text-primary hover:bg-app-surface-muted'
        }`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => {
            const next = { ...selectedDeptosMap, [dep.id]: e.target.checked };
            if (propIdNum) next[propIdNum] = true;
            onChange(next);
          }}
          className="w-4 h-4 rounded border-border text-brand-primary focus:ring-brand-accent cursor-pointer shrink-0"
        />
        <span className="leading-snug text-left truncate flex-1" title={dep.nombre}>
          {dep.nombre}
        </span>
      </label>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
        <div>
          <Label className="block">Es seleccionable en</Label>
          <span className="text-[11px] text-text-muted">
            (El departamento responsable ya está incluido por defecto)
          </span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary shrink-0">
          {seleccionadosCount} adicionales
        </span>
      </div>

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

      <div className="flex items-center justify-between text-xs px-1 mb-2 text-text-muted">
        <span>{deptosFiltrados.length} departamentos mostrados</span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => marcar(true)}
            className="text-brand-primary hover:underline font-medium cursor-pointer"
          >
            Marcar todos
          </button>
          <span>|</span>
          <button
            type="button"
            onClick={() => marcar(false)}
            className="text-text-muted hover:text-text-primary cursor-pointer"
          >
            Desmarcar
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto overflow-x-hidden border border-border/80 rounded-xl bg-app-surface p-3 space-y-4">
        {gruposLineas.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted italic">
            No se encontraron departamentos asociados a líneas de producción.
          </div>
        ) : (
          gruposLineas.map((grupo) => (
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
          ))
        )}
      </div>
    </div>
  );
}
