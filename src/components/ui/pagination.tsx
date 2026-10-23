import { type ReactNode } from 'react';
import { Button } from './button';
import { Icon } from './icon';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  variant?: 'bar' | 'floating';
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  isLoading = false,
  variant = 'bar',
  className = '',
}: PaginationProps): ReactNode {
  // No mostrar controles de paginación si solo hay 1 página o menos
  if (totalPages <= 1) return null;

  const startItem = totalItems !== undefined && itemsPerPage !== undefined
    ? Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)
    : undefined;
  const endItem = totalItems !== undefined && itemsPerPage !== undefined
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : undefined;

  const canGoPrevious = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < totalPages && !isLoading;

  const getVisiblePages = (): (number | string)[] => {
    const delta = 1;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  if (variant === 'floating') {
    return (
      <div className={`flex items-center justify-between gap-3 px-4 py-3 bg-app-surface border border-border rounded-xl shadow-sm ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          aria-label="Página anterior"
        >
          <Icon name="chevron_left" size="sm" className="mr-1" />
          Anterior
        </Button>
        <span className="text-xs font-medium text-text-secondary">
          Pág. {currentPage} de {totalPages || 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Página siguiente"
        >
          Siguiente
          <Icon name="chevron_right" size="sm" className="ml-1" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-border/80 bg-cuadra-arena/10 text-xs text-text-secondary select-none ${className}`}
    >
      <div className="flex items-center gap-2">
        {totalItems !== undefined && startItem !== undefined && endItem !== undefined ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="text-text-muted">Resultados:</span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-text-primary px-2 py-0.5 rounded-md bg-white border border-border/70 shadow-2xs">
              <span>{startItem}</span>
              <span className="text-text-muted font-normal">–</span>
              <span>{endItem}</span>
            </span>
            <span className="text-text-muted">de</span>
            <span className="font-bold text-marca-primario px-1.5 py-0.5 rounded-md bg-marca-primario/10 font-mono">
              {totalItems}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
            <span className="text-text-muted">Página</span>
            <span className="font-bold text-marca-primario px-2 py-0.5 rounded-md bg-white border border-border shadow-2xs font-mono">
              {currentPage}
            </span>
            <span className="text-text-muted">de</span>
            <span className="font-bold text-text-primary font-mono">{totalPages || 1}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrevious}
          className="h-8 px-2.5 bg-white border-border/80 text-text-secondary hover:text-marca-primario hover:border-marca-primario/40 shadow-2xs disabled:opacity-40"
          title="Página anterior"
        >
          <Icon name="chevron_left" size="sm" />
          <span className="hidden sm:inline text-xs font-semibold ml-0.5">Anterior</span>
        </Button>

        <div className="hidden sm:flex items-center gap-1 px-1">
          {getVisiblePages().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="px-1.5 py-1 text-xs text-text-muted tracking-widest font-mono">
                  ···
                </span>
              );
            }

            const pageNum = Number(page);
            const isCurrent = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                disabled={isLoading || isCurrent}
                className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-marca-primario text-white shadow-xs pointer-events-none'
                    : 'bg-white text-text-secondary hover:text-marca-primario hover:bg-marca-primario/5 border border-border/70 hover:border-marca-primario/40'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          className="h-8 px-2.5 bg-white border-border/80 text-text-secondary hover:text-marca-primario hover:border-marca-primario/40 shadow-2xs disabled:opacity-40"
          title="Página siguiente"
        >
          <span className="hidden sm:inline text-xs font-semibold mr-0.5">Siguiente</span>
          <Icon name="chevron_right" size="sm" />
        </Button>
      </div>
    </div>
  );
}
