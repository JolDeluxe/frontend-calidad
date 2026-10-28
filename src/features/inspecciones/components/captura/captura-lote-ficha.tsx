import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProduccionLote } from '../../types/inspecciones.types';

export interface CapturaLoteFichaProps {
  lote: ProduccionLote | null;
  error: string | null;
  cargando?: boolean;
}

export function CapturaLoteFicha({ lote, error, cargando }: CapturaLoteFichaProps) {
  if (cargando) {
    return (
      <div className="rounded-xl border border-border bg-app-surface p-3 xl:p-5 space-y-2 xl:space-y-3.5 shadow-2xs flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
        {/* Fila 1 Skeleton: Lote y Lista */}
        <div className="grid grid-cols-12 gap-3 items-baseline border-b border-border-subtle pb-2 xl:pb-3">
          <div className="col-span-8 space-y-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 xl:h-10 w-28" />
          </div>
          <div className="col-span-4 flex flex-col items-end space-y-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-6 xl:h-7 w-16" />
          </div>
        </div>

        {/* Fila 2 Skeleton: Modelo y Pares */}
        <div className="flex-1 grid grid-cols-12 gap-3 items-center py-1 xl:py-2 min-h-0">
          <div className="col-span-7 sm:col-span-8 space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-6 xl:h-8 w-32" />
            <Skeleton className="h-3.5 w-48" />
          </div>
          <div className="col-span-5 sm:col-span-4 flex flex-col items-center justify-center bg-brand-primary/5 rounded-xl p-2 xl:p-3 border border-brand-primary/10 space-y-1.5">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-8 xl:h-10 w-16" />
          </div>
        </div>

        {/* Fila 3 Skeleton: Horma y Cliente */}
        <div className="grid grid-cols-2 gap-2 xl:gap-3 pt-2 xl:pt-3 border-t border-border-subtle">
          <div className="bg-app-surface-muted/60 p-2 xl:p-3 rounded-lg border border-border-subtle space-y-1.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="bg-app-surface-muted/60 p-2 xl:p-3 rounded-lg border border-border-subtle space-y-1.5">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 xl:p-6 text-center text-text-muted flex-1 flex flex-col items-center justify-center">
        <Icon name="search_off" size="44px" className="mx-auto mb-3 text-amber-700 dark:text-amber-400 opacity-90" />
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          {error}
        </p>
        <p className="text-xs mt-1.5 text-text-secondary max-w-xs">
          Verifique que el número de lote sea correcto y corresponda a producción activa.
        </p>
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4 xl:p-6 text-center text-text-muted bg-app-surface flex-1 flex flex-col items-center justify-center">
        <Icon name="inventory_2" size="44px" className="mx-auto mb-3 opacity-30 text-brand-primary" />
        <p className="text-sm font-bold text-text-primary">Ingrese un lote de producción</p>
        <p className="text-xs mt-1 text-text-secondary max-w-xs">
          Se validarán lote, lista, modelo y pares autorizados para la inspección.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-app-surface p-3 xl:p-5 space-y-2 xl:space-y-3.5 shadow-2xs flex-1 min-h-0 flex flex-col justify-between overflow-hidden">
      {/* 1. FILA SUPERIOR: LOTE (grande) vs LISTA (más pequeño) */}
      <div className="grid grid-cols-12 gap-3 items-baseline border-b border-border-subtle pb-2 xl:pb-3">
        <div className="col-span-8">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">
            Lote
          </span>
          <span className="text-2xl xl:text-4xl font-black text-text-primary tracking-tight font-mono leading-none">
            {lote.lote}
          </span>
        </div>

        <div className="col-span-4 text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
            Lista
          </span>
          <span className="text-base xl:text-xl font-bold text-text-secondary font-mono leading-none">
            {lote.lista}
          </span>
        </div>
      </div>

      {/* 2. FILA MEDIA: MODELO (que resalte más) vs PARES (que resalte grande) */}
      <div className="flex-1 grid grid-cols-12 gap-3 items-center py-1 xl:py-2 min-h-0">
        <div className="col-span-7 sm:col-span-8">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
            Modelo
          </span>
          <span className="text-xl xl:text-3xl font-black text-brand-primary tracking-tight block font-mono leading-tight">
            {lote.modelo}
          </span>
          {lote.descripcion && (
            <span className="text-[11px] xl:text-xs text-text-secondary font-medium block mt-1 line-clamp-2 leading-snug">
              {lote.descripcion}
            </span>
          )}
        </div>

        <div className="col-span-5 sm:col-span-4 text-center bg-brand-primary/5 rounded-xl p-2 xl:p-3 border border-brand-primary/10">
          <span className="block text-[11px] font-black uppercase tracking-wider text-brand-primary mb-0.5">
            Pares
          </span>
          <span className="text-2xl xl:text-4xl font-black text-brand-primary tracking-tight font-mono leading-none">
            {Math.floor(lote.cantidad)}
          </span>
        </div>
      </div>

      {/* 3. FILA INFERIOR: HORMA Y CLIENTE (como estaban) */}
      <div className="grid grid-cols-2 gap-2 xl:gap-3 pt-2 xl:pt-3 border-t border-border-subtle">
        <div className="bg-app-surface-muted/60 p-2 xl:p-3 rounded-lg border border-border-subtle">
          <span className="text-text-muted block text-[10px] font-bold uppercase tracking-wider mb-0.5">
            Horma
          </span>
          <span className="font-mono font-bold text-xs xl:text-base text-text-primary block truncate">
            {lote.horma || 'N/A'}
          </span>
        </div>

        <div className="bg-app-surface-muted/60 p-2 xl:p-3 rounded-lg border border-border-subtle">
          <span className="text-text-muted block text-[10px] font-bold uppercase tracking-wider mb-0.5">
            Cliente
          </span>
          <span className="font-bold text-xs xl:text-base text-brand-primary truncate block" title={lote.cliente}>
            {lote.cliente}
          </span>
        </div>
      </div>
    </div>
  );
}
