import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';

export interface ConsolaVisorProps {
  lines: string[];
  loading: boolean;
  selectedFile: string;
}

export function ConsolaVisor({ lines, loading, selectedFile }: ConsolaVisorProps) {
  const getLineColor = (line: string) => {
    const l = line.toLowerCase();
    if (l.includes('error') || l.includes('err') || l.includes('exception') || l.includes('failed')) {
      return 'text-rose-400 bg-rose-950/20';
    }
    if (l.includes('warn') || l.includes('warning')) {
      return 'text-amber-300';
    }
    if (l.includes('ready') || l.includes('online') || l.includes('success') || l.includes('200 ok')) {
      return 'text-emerald-400';
    }
    return 'text-slate-300';
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-950 border border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Barra superior de terminal estilo IDE */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          <span className="font-mono text-xs font-bold text-slate-300 ml-2">
            {selectedFile || 'pm2-stdout.log'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          {loading && (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Spinner size="12px" />
              <span>Sincronizando...</span>
            </div>
          )}
          <span>{lines.length} líneas</span>
        </div>
      </div>

      {/* Visor de terminal */}
      <div className="flex-1 p-4 font-mono text-xs overflow-auto space-y-0.5 leading-relaxed bg-slate-950 min-h-[360px]">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <Icon name="terminal" size="36px" className="opacity-30 mb-2" />
            <p className="font-semibold text-slate-500">Sin líneas de salida</p>
            <p className="text-[11px] text-slate-600">El archivo seleccionado está vacío o no coincide con el filtro</p>
          </div>
        ) : (
          lines.map((line, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 px-2 py-0.5 rounded hover:bg-slate-900/60 font-mono ${getLineColor(
                line,
              )}`}
            >
              <span className="text-slate-600 select-none w-10 text-right shrink-0 text-[11px]">
                {idx + 1}
              </span>
              <span className="break-all whitespace-pre-wrap flex-1">{line}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
