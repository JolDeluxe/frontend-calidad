import { type ClipboardEvent, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/icon';
import type { ClasificacionDefecto } from '../types/defectos.types';
import {
  aplicarPegado,
  crearFilaVacia,
  parsearTSV,
  type FilaLoteEditable,
} from '../utils/pegado-excel';

export interface EstadoFilaLote {
  validada: boolean;
  errores: string[];
  clave: number | null;
}

export interface DefectoCargaMasivaTablaProps {
  filas: FilaLoteEditable[];
  onChange: (filas: FilaLoteEditable[]) => void;
  clasificacionPorDefecto: ClasificacionDefecto | '';
  /** Estado de validación por índice de fila (viene de la previsualización o del error del servidor). */
  estados: Record<number, EstadoFilaLote>;
  disabled?: boolean;
}

let secuencia = 0;
export const generarIdFila = (): string => `fila-${Date.now().toString(36)}-${++secuencia}`;

const inputBase =
  'w-full bg-transparent px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:bg-brand-primary/5 focus:ring-1 focus:ring-inset focus:ring-brand-primary/40 rounded-sm disabled:opacity-60';

/** Tabla editable estilo hoja de cálculo: edición directa, pegado desde Excel, agregar/eliminar filas. */
export function DefectoCargaMasivaTabla({
  filas,
  onChange,
  clasificacionPorDefecto,
  estados,
  disabled = false,
}: DefectoCargaMasivaTablaProps) {
  const actualizar = (indice: number, cambios: Partial<FilaLoteEditable>) => {
    onChange(filas.map((f, i) => (i === indice ? { ...f, ...cambios } : f)));
  };

  const eliminar = (indice: number) => onChange(filas.filter((_, i) => i !== indice));

  const agregar = () => onChange([...filas, crearFilaVacia(generarIdFila(), clasificacionPorDefecto)]);

  const enfocarCelda = (fila: number, col: number) => {
    setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-celda="${fila}-${col}"]`)?.focus();
    }, 0);
  };

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const objetivo = (e.target as HTMLElement).closest<HTMLElement>('[data-celda]');
    if (!objetivo) return;

    const texto = e.clipboardData.getData('text/plain');
    const multiCelda = /[\t\r\n]/.test(texto.replace(/[\r\n]+$/, ''));
    const esInput = objetivo.tagName === 'INPUT';
    // Un único valor pegado en un campo de texto usa el comportamiento nativo.
    if (!multiCelda && esInput) return;

    e.preventDefault();
    const fila = Number(objetivo.dataset.fila);
    const col = Number(objetivo.dataset.col);
    onChange(aplicarPegado(filas, fila, col, parsearTSV(texto), clasificacionPorDefecto, generarIdFila));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, indice: number) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (indice === filas.length - 1) agregar();
    enfocarCelda(indice + 1, 0);
  };

  return (
    <div className="space-y-2">
      <div
        onPaste={handlePaste}
        className="border border-border rounded-xl overflow-auto max-h-80 bg-app-surface"
      >
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-app-surface-muted text-text-secondary text-2xs uppercase tracking-wider">
            <tr>
              <th className="py-2 px-2 w-10 text-center border-b border-border">#</th>
              <th className="py-2 px-2 border-b border-border">Descripción del defecto</th>
              <th className="py-2 px-2 w-36 border-b border-border">Clasificación</th>
              <th className="py-2 px-2 w-24 text-center border-b border-border">Clave</th>
              <th className="py-2 px-2 w-44 border-b border-border">Validación</th>
              <th className="py-2 px-1 w-10 border-b border-border" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-text-muted italic">
                  Sin filas. Use «Agregar fila» o pegue un bloque copiado desde Excel (Descripción, Clasificación).
                </td>
              </tr>
            )}
            {filas.map((fila, i) => {
              const estado = estados[i];
              const conError = !!estado && estado.errores.length > 0;
              return (
                <tr key={fila.id} className={conError ? 'bg-red-50/60' : undefined}>
                  <td className="py-1 px-2 text-center text-xs text-text-muted font-mono">{i + 1}</td>
                  <td className="p-0.5">
                    <input
                      type="text"
                      data-celda={`${i}-0`}
                      data-fila={i}
                      data-col={0}
                      value={fila.descripcion}
                      disabled={disabled}
                      maxLength={255}
                      placeholder="Descripción…"
                      aria-label={`Descripción fila ${i + 1}`}
                      onChange={(e) => actualizar(i, { descripcion: e.target.value })}
                      onKeyDown={(e) => handleKeyDown(e, i)}
                      className={inputBase}
                    />
                  </td>
                  <td className="p-0.5">
                    <select
                      data-celda={`${i}-1`}
                      data-fila={i}
                      data-col={1}
                      value={fila.clasificacion}
                      disabled={disabled}
                      aria-label={`Clasificación fila ${i + 1}`}
                      onChange={(e) => actualizar(i, { clasificacion: e.target.value as ClasificacionDefecto | '' })}
                      className={`${inputBase} cursor-pointer`}
                    >
                      <option value="">Seleccionar…</option>
                      <option value="CRITICO">Crítico</option>
                      <option value="MAYOR">Mayor</option>
                      <option value="MENOR">Menor</option>
                    </select>
                  </td>
                  <td className="py-1 px-2 text-center font-mono text-xs font-bold text-brand-primary">
                    {estado?.clave ? `#${estado.clave}` : '—'}
                  </td>
                  <td className="py-1 px-2 text-xs align-top">
                    {!estado ? (
                      <span className="text-text-muted">Sin validar</span>
                    ) : conError ? (
                      <ul className="text-red-700 space-y-0.5">
                        {estado.errores.map((err) => (
                          <li key={err} className="flex gap-1">
                            <Icon name="error" size="13px" className="shrink-0 mt-0.5" />
                            <span>{err}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                        <Icon name="check_circle" size="13px" /> Válida
                      </span>
                    )}
                  </td>
                  <td className="py-1 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => eliminar(i)}
                      disabled={disabled}
                      title="Eliminar fila"
                      aria-label={`Eliminar fila ${i + 1}`}
                      className="p-1 text-text-muted hover:text-red-600 hover:bg-red-50 rounded cursor-pointer disabled:opacity-50"
                    >
                      <Icon name="delete" size="16px" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={agregar}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline cursor-pointer disabled:opacity-50"
      >
        <Icon name="add" size="16px" /> Agregar fila
      </button>
    </div>
  );
}
