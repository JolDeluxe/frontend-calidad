import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StatusBadge } from '@/components/ui/status-badge';
import type { DefectoItemStaging } from '../types/inspecciones.types';

interface DefectosStagingTablaProps {
  items: DefectoItemStaging[];
  onEliminar: (idTemporal: string) => void;
  disabled?: boolean;
}

export function DefectosStagingTabla({
  items,
  onEliminar,
  disabled = false,
}: DefectosStagingTablaProps) {
  const totalPares = items.reduce((acc, curr) => acc + curr.paresDefectuosos, 0);

  const getClasificacionVariant = (clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR') => {
    switch (clasificacion) {
      case 'CRITICO':
        return 'rose';
      case 'MAYOR':
        return 'amber';
      case 'MENOR':
        return 'sky';
      default:
        return 'zinc';
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-cuadra-arena-dark p-6 text-center bg-white/50">
        <Icon name="fact_check" size="28px" className="text-app-text-muted mx-auto mb-2 opacity-50" />
        <h4 className="text-xs font-semibold text-app-text">Sin defectos en lista</h4>
        <p className="text-[11px] text-app-text-muted mt-1">
          Busque y agregue los defectos detectados para este lote antes de confirmar la inspección.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-cuadra-arena-dark bg-white overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-2.5 bg-cuadra-arena/40 border-b border-cuadra-arena">
        <div className="flex items-center gap-2">
          <Icon name="list_alt" size="18px" className="text-marca-primario" />
          <span className="text-xs font-bold text-marca-primario uppercase tracking-wide">
            Defectos a Registrar ({items.length})
          </span>
        </div>
        <div className="text-xs font-bold text-marca-primario bg-white px-2.5 py-0.5 rounded border border-cuadra-arena">
          Total Pares con Falla: {totalPares}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-cuadra-arena bg-cuadra-arena/20 text-[11px] font-semibold text-app-text-muted uppercase tracking-wider">
              <th className="py-2.5 px-3 w-16 text-center">Clave</th>
              <th className="py-2.5 px-3">Defecto</th>
              <th className="py-2.5 px-3 w-28 text-center">Clasificación</th>
              <th className="py-2.5 px-3">Depto. Responsable</th>
              <th className="py-2.5 px-3 w-20 text-center">Pares</th>
              <th className="py-2.5 px-3">Observaciones</th>
              <th className="py-2.5 px-3 w-12 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cuadra-arena/40 text-xs">
            {items.map((item) => (
              <tr key={item.idTemporal} className="hover:bg-cuadra-arena/10 transition-colors">
                <td className="py-2.5 px-3 text-center font-mono font-bold text-marca-primario">
                  {item.clave}
                </td>
                <td className="py-2.5 px-3 font-semibold text-app-text">
                  {item.defecto}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <StatusBadge
                    label={item.clasificacion}
                    variant={getClasificacionVariant(item.clasificacion)}
                    showIcon={false}
                  />
                </td>
                <td className="py-2.5 px-3 font-medium text-app-text">
                  {item.departamentoResponsableNombre}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-marca-primario">
                  {item.paresDefectuosos}
                </td>
                <td className="py-2.5 px-3 text-app-text-muted italic max-w-xs truncate">
                  {item.notas || '—'}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <Button
                    type="button"
                    variant="icon"
                    size="icon"
                    icon="delete"
                    disabled={disabled}
                    onClick={() => onEliminar(item.idTemporal)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 h-7 w-7"
                    title="Remover defecto de la lista"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
