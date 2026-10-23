import { StatusBadge } from '@/components/ui/status-badge';
import { Icon } from '@/components/ui/icon';
import type { ProduccionLote } from '../types/inspecciones.types';

interface LoteInfoCardProps {
  lote: ProduccionLote;
}

export function LoteInfoCard({ lote }: LoteInfoCardProps) {
  return (
    <div className="rounded-md border border-cuadra-arena-dark bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cuadra-arena pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-marca-primario/10 rounded-sm text-marca-primario">
            <Icon name="inventory_2" size="20px" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-app-text-muted">
              Lote Maestro
            </span>
            <h3 className="text-base font-bold text-marca-primario tracking-tight">
              #{lote.lote}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            label={lote.estado}
            variant={lote.estado === 'ACTIVO' ? 'emerald' : 'zinc'}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
        <div>
          <span className="text-app-text-muted block text-[11px] uppercase">Lista / Folio</span>
          <span className="font-semibold text-app-text">{lote.lista}</span>
        </div>

        <div>
          <span className="text-app-text-muted block text-[11px] uppercase">Modelo</span>
          <span className="font-bold text-marca-primario">{lote.modelo}</span>
        </div>

        <div>
          <span className="text-app-text-muted block text-[11px] uppercase">Cantidad Total</span>
          <span className="font-semibold text-app-text">{lote.cantidad} pares</span>
        </div>

        <div>
          <span className="text-app-text-muted block text-[11px] uppercase">Cliente</span>
          <span className="font-semibold text-app-text truncate block" title={lote.cliente}>
            {lote.cliente}
          </span>
        </div>

        <div>
          <span className="text-app-text-muted block text-[11px] uppercase">Horma</span>
          <span className="font-semibold text-app-text">{lote.horma || 'N/A'}</span>
        </div>

        <div>
          <span className="text-app-text-muted block text-[11px] uppercase">Id Producto</span>
          <span className="font-mono text-app-text-muted truncate block" title={lote.idProducto}>
            {lote.idProducto}
          </span>
        </div>
      </div>

      {lote.descripcion && (
        <div className="mt-2.5 pt-2 border-t border-cuadra-arena/60 text-xs text-app-text-muted">
          <span className="font-semibold text-app-text">Descripción: </span>
          {lote.descripcion}
        </div>
      )}
    </div>
  );
}
