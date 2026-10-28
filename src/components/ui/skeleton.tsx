import { cn } from '@/lib/utils/cn';
import type { HTMLAttributes } from 'react';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Esqueleto adaptable para simular carga de bloques de texto, inputs, filas o imágenes.
 * Uso: <Skeleton className="h-10 w-full" />
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-slate-200/80 dark:bg-slate-700/50 rounded-md', className)}
      {...props}
    />
  );
}

export interface TableRowsSkeletonProps {
  columns: number;
  rows?: number;
  cellClassName?: string;
  rowClassName?: string;
}

/**
 * Helper reutilizable para renderizar filas y celdas esqueleto dentro del <tbody>
 * de cualquier tabla mientras isLoading sea true.
 */
export function TableRowsSkeleton({
  columns,
  rows = 8,
  cellClassName = 'py-3 px-2 xl:px-2.5',
  rowClassName = 'border-b border-border/40',
}: TableRowsSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={`skeleton-row-${rIdx}`} className={rowClassName}>
          {Array.from({ length: columns }).map((_, cIdx) => (
            <td key={`skeleton-cell-${rIdx}-${cIdx}`} className={cellClassName}>
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
