import type { ReactNode } from 'react';

export interface DefectoClasificacionIndicatorProps {
  clasificacion: string;
  className?: string;
  textClassName?: string;
}

/**
 * Indicador visual minimalista de clasificación / criticidad de defectos.
 * Estilo unificado: Punto indicador (Dot) + Texto con color exacto.
 * - Crítico: bg-red-600 text-red-600 font-medium
 * - Mayor: bg-orange-500 text-orange-500 font-medium
 * - Menor: bg-yellow-500 text-yellow-500 font-medium
 */
export function DefectoClasificacionIndicator({
  clasificacion,
  className = '',
  textClassName = '',
}: DefectoClasificacionIndicatorProps): ReactNode {
  switch (clasificacion?.toUpperCase()) {
    case 'CRITICO':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs text-red-600 font-medium ${className}`}>
          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" aria-hidden="true" />
          <span className={textClassName}>Crítico</span>
        </span>
      );
    case 'MAYOR':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs text-orange-500 font-medium ${className}`}>
          <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" aria-hidden="true" />
          <span className={textClassName}>Mayor</span>
        </span>
      );
    case 'MENOR':
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs text-yellow-500 font-medium ${className}`}>
          <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" aria-hidden="true" />
          <span className={textClassName}>Menor</span>
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs text-slate-500 font-medium ${className}`}>
          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" aria-hidden="true" />
          <span className={textClassName}>{clasificacion || '—'}</span>
        </span>
      );
  }
}
