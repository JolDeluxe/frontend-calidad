import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Pm2FileItem } from '../../api/auditoria-api';

export interface ConsolaToolbarProps {
  pm2Files: Pm2FileItem[];
  selectedFile: string;
  onSelectFile: (fileName: string) => void;
  filtroTexto: string;
  onFiltroTextoChange: (val: string) => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  loading: boolean;
  onRefrescar: () => void;
}

export function ConsolaToolbar({
  pm2Files,
  selectedFile,
  onSelectFile,
  filtroTexto,
  onFiltroTextoChange,
  autoRefresh,
  onToggleAutoRefresh,
  loading,
  onRefrescar,
}: ConsolaToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 w-full select-none py-1">
      {/* Lado izquierdo: Selector de Archivo PM2 y Buscador en Vivo */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        {/* Selector de Archivo PM2 */}
        <div className="shrink-0">
          <select
            value={selectedFile}
            onChange={(e) => onSelectFile(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 cursor-pointer max-w-xs"
            title="Seleccionar archivo de log de PM2"
          >
            {pm2Files.length === 0 ? (
              <option value="">No hay archivos disponibles</option>
            ) : (
              pm2Files.map((f) => (
                <option key={f.nombre} value={f.nombre}>
                  {f.nombre} ({(f.tamanoBytes / 1024).toFixed(1)} KB)
                </option>
              ))
            )}
          </select>
        </div>

        {/* Buscador en líneas */}
        <div className="relative w-64 sm:w-80 shrink-0">
          <Icon
            name="search"
            size="16px"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Filtrar líneas de la consola..."
            value={filtroTexto}
            onChange={(e) => onFiltroTextoChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-primary transition-all text-slate-800"
          />
          {filtroTexto && (
            <button
              type="button"
              onClick={() => onFiltroTextoChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpiar filtro"
            >
              <Icon name="close" size="14px" />
            </button>
          )}
        </div>
      </div>

      {/* Lado derecho: Auto-refresh y Botón de actualización */}
      <div className="shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleAutoRefresh}
          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            autoRefresh
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
          }`}
          title="Actualización continua cada 5 segundos"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`}
          />
          <span>Auto-Refresco (5s)</span>
        </button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefrescar}
          disabled={loading}
          className="h-8 text-xs px-2.5 bg-white text-slate-700 border-slate-300 hover:bg-slate-50 cursor-pointer"
          title="Actualizar consola ahora"
        >
          {loading ? <Spinner size="14px" /> : <Icon name="refresh" size="14px" className="mr-1" />}
          <span>Refrescar</span>
        </Button>
      </div>
    </div>
  );
}
