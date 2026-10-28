import { useState, useEffect } from 'react';
import { auditApi, type Pm2FileItem } from '../api/auditoria-api';
import { ConsolaToolbar } from '../components/consola/consola-toolbar';
import { ConsolaVisor } from '../components/consola/consola-visor';

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
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Encabezado Principal */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            CONSOLA OPERATIVA PM2
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary">
            {filteredLines.length} líneas en tiempo real
          </span>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="p-3 border border-border/80 bg-app-surface rounded-xl shadow-xs">
        <ConsolaToolbar
          pm2Files={pm2Files}
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          filtroTexto={pm2Filter}
          onFiltroTextoChange={setPm2Filter}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
          loading={loadingPm2}
          onRefrescar={fetchPm2Content}
        />
      </div>

      {/* Visor de terminal */}
      <ConsolaVisor
        lines={filteredLines}
        loading={loadingPm2}
        selectedFile={selectedFile}
      />
    </div>
  );
}
