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
      className={cn('animate-pulse bg-slate-200 dark:bg-slate-700/50 rounded-sm', className)}
      {...props}
    />
  );
}
