import { useState, useEffect } from 'react';
import { auditApi, type Pm2FileItem } from '../api/auditoria-api';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';

export function Pm2ConsolePage() {
  const [pm2Files, setPm2Files] = useState<Pm2FileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [pm2Lines, setPm2Lines] = useState<string[]>([]);
  const [loadingPm2, setLoadingPm2] = useState(false);
  const [pm2Filter, setPm2Filter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchPm2Files = async () => {
    try {
      const res = await auditApi.getPm2Files();
      if (res?.data?.files) {
        setPm2Files(res.data.files);
        if (res.data.files.length > 0 && !selectedFile) {
          setSelectedFile(res.data.files[0].nombre);
        }
      }
    } catch (err) {
      console.error('Error al consultar lista de archivos PM2:', err);
    }
  };

  const fetchPm2Content = async () => {
    if (!selectedFile) return;
    try {
      setLoadingPm2(true);
      const res = await auditApi.getPm2Content(selectedFile, 200, pm2Filter || undefined, true);
      if (res?.data?.lineas) {
        setPm2Lines(res.data.lineas);
      }
    } catch (err) {
      console.error('Error al leer archivo de PM2:', err);
    } finally {
      setLoadingPm2(false);
    }
  };

  useEffect(() => {
    fetchPm2Files();
  }, []);

  useEffect(() => {
    if (selectedFile) {
      fetchPm2Content();
    }
  }, [selectedFile]);

  useEffect(() => {
    if (!autoRefresh || !selectedFile) return;
    const interval = setInterval(fetchPm2Content, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedFile]);

  const filteredLines = pm2Filter
    ? pm2Lines.filter((line) => line.toLowerCase().includes(pm2Filter.toLowerCase()))
    : pm2Lines;

  return (
    <div className="flex flex-col gap-5">
      {/* Header y Control de Archivos */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-neutral-200">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
            <Icon name="terminal" className="text-marca-primario" />
            Consola Operativa PM2 (Archivos en Vivo)
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Visualizador en tiempo real de logs directos de procesos PM2 del Sistema de Calidad MBC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="h-10 px-3 rounded-lg border border-neutral-300 bg-white text-sm text-neutral-700 outline-none focus:border-marca-primario max-w-xs"
          >
            {pm2Files.length === 0 ? (
              <option value="">No hay archivos de log disponibles</option>
            ) : (
              pm2Files.map((f) => (
                <option key={f.nombre} value={f.nombre}>
                  {f.nombre} ({(f.tamanoBytes / 1024).toFixed(1)} KB)
                </option>
              ))
            )}
          </select>

          <Button
            type="button"
            variant={autoRefresh ? 'primary' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs"
          >
            <Icon name="autorenew" size="18px" className={autoRefresh ? 'animate-spin' : ''} />
            {autoRefresh ? 'Auto (5s)' : 'Pausado'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={fetchPm2Content}
            disabled={loadingPm2 || !selectedFile}
          >
            <Icon name="refresh" size="18px" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Visor de Terminal */}
      <div className="bg-neutral-950 text-neutral-200 rounded-xl shadow-lg border border-neutral-800 overflow-hidden font-mono flex flex-col min-h-[500px]">
        {/* Barra superior de terminal */}
        <div className="bg-neutral-900 px-4 py-2.5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="ml-2 font-semibold text-neutral-300">
              {selectedFile || 'consola-desconectada'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Filtrar líneas..."
              value={pm2Filter}
              onChange={(e) => setPm2Filter(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs px-2.5 py-1 rounded outline-none focus:border-marca-primario w-44 sm:w-60"
            />
            <span className="text-neutral-400">
              {filteredLines.length} / {pm2Lines.length} líneas
            </span>
          </div>
        </div>

        {/* Contenido tipo consola */}
        <div className="p-4 flex-1 overflow-y-auto text-xs leading-5 custom-scrollbar max-h-[600px] select-text">
          {loadingPm2 && pm2Lines.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-neutral-500">
              <Spinner size="24px" />
              <span className="ml-2">Cargando salida del proceso...</span>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-500">
              <Icon name="terminal" size="36px" className="mb-2 opacity-40" />
              <p>No hay líneas de salida registradas en este archivo.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredLines.map((line, idx) => {
                const isError =
                  line.includes('ERR') || line.includes('Error') || line.includes('error');
                const isWarn =
                  line.includes('WARN') || line.includes('Warning') || line.includes('warn');
                const isSuccess =
                  line.includes('✓') || line.includes('success') || line.includes('online');

                return (
                  <div
                    key={idx}
                    className={`px-2 py-0.5 rounded hover:bg-neutral-900/80 transition-colors flex items-start gap-3 ${
                      isError
                        ? 'text-rose-400 bg-rose-950/20'
                        : isWarn
                        ? 'text-amber-300 bg-amber-950/20'
                        : isSuccess
                        ? 'text-emerald-400'
                        : 'text-neutral-300'
                    }`}
                  >
                    <span className="text-neutral-600 select-none text-[10px] w-8 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <span className="break-all whitespace-pre-wrap">{line}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
