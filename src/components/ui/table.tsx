import { type ReactNode } from 'react';
import { Pagination } from './pagination';
import { Skeleton } from './skeleton';
import { Icon } from './icon';

export interface Column<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (row: T, index: number) => ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  emptyAction?: ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
  };
  className?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No se encontraron registros',
  emptyIcon = 'inbox',
  emptyAction,
  pagination,
  className = '',
}: TableProps<T>): ReactNode {
  return (
    <div className={`w-full overflow-hidden border border-border rounded-xl bg-app-surface shadow-2xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-app-surface-muted/60 text-xs font-semibold text-text-secondary uppercase tracking-wider">
              {columns.map((col) => {
                const alignClass =
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                    ? 'text-right'
                    : 'text-left';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={`py-3.5 px-4 font-sans ${alignClass} ${col.className || ''}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {isLoading && data.length === 0 ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-row-${rIdx}`}>
                  {columns.map((_col, cIdx) => (
                    <td key={`skeleton-col-${cIdx}`} className="py-3.5 px-4">
                      {cIdx === 0 ? (
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-2.5 w-16" />
                          </div>
                        </div>
                      ) : cIdx === columns.length - 1 ? (
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-7 w-7 rounded" />
                          <Skeleton className="h-7 w-7 rounded" />
                        </div>
                      ) : (
                        <Skeleton className="h-3.5 w-24" />
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto px-4">
                    <div className="w-12 h-12 rounded-full bg-cuadra-arena/60 flex items-center justify-center text-text-muted">
                      <Icon name={emptyIcon} size="md" />
                    </div>
                    <p className="text-sm font-medium text-text-secondary">{emptyMessage}</p>
                    {emptyAction && <div className="mt-2">{emptyAction}</div>}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={keyExtractor(row, index)}
                  className="hover:bg-app-surface-muted/40 transition-colors group"
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                        ? 'text-right'
                        : 'text-left';
                    return (
                      <td
                        key={`${keyExtractor(row, index)}-${col.key}`}
                        className={`py-3.5 px-4 text-text-primary ${alignClass} ${col.className || ''}`}
                      >
                        {col.render
                          ? col.render(row, index)
                          : ((row as Record<string, unknown>)[col.key] as ReactNode)}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.onPageChange}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
