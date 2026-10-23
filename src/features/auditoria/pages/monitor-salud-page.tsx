import { useState, useEffect } from 'react';
import { auditApi, type SystemHealthData, type AiDiagnosticsResponse } from '../api/auditoria-api';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalBody } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';

export function SystemHealthMonitorPage() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Diagnóstico IA
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<AiDiagnosticsResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await auditApi.getHealth();
      if (res?.data) {
        setHealth(res.data);
      }
    } catch (err) {
      console.error('Error al consultar salud del backend:', err);
    }
  };

  useEffect(() => {
    fetchHealth();
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, 10000); // 10 segundos
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleGenerateAiDiagnostic = async () => {
    try {
      setGeneratingReport(true);
      const res = await auditApi.generateAiDiagnostics({
        ventanaMinutos: 15,
      });
      if (res?.data) {
        setReportResult(res.data);
      }
    } catch (err) {
      console.error('Error al generar diagnóstico para IA:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!reportResult?.markdown) return;
    navigator.clipboard.writeText(reportResult.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadReport = () => {
    if (!reportResult?.markdown) return;
    const blob = new Blob([reportResult.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diagnostico-calidad-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatUptime = (secs: number) => {
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${days}d ${hours}h ${mins}m ${secs % 60}s`;
  };

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Icon name="monitor_heart" className="text-emerald-600" />
            Monitoreo Operativo y Diagnóstico IA
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Supervisión continua de servicios, base de datos MySQL y generación de diagnósticos sanitizados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2 text-xs"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
            {autoRefresh ? 'Auto-refresco (10s)' : 'Pausado'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateAiDiagnostic}
            disabled={generatingReport}
            className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            {generatingReport ? <Spinner size="16px" /> : <Icon name="psychology" size="18px" />}
            <span>Preparar Diagnóstico para IA</span>
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Salud */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estado MySQL */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400">Base de Datos MySQL</span>
            <Icon
              name={health?.database.status === 'connected' ? 'database' : 'error'}
              className={health?.database.status === 'connected' ? 'text-emerald-600' : 'text-rose-600'}
            />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-neutral-800 flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  health?.database.status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              {health?.database.status === 'connected' ? 'Conectada (OK)' : 'Fallo de Conexión'}
            </div>
            <div className="text-xs text-neutral-500 mt-1 font-mono">
              Latencia ping: <strong>{health?.database.latencyMs ?? 0} ms</strong>
            </div>
          </div>
        </div>

        {/* Proceso y Uptime */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400">Proceso Backend</span>
            <Icon name="timer" className="text-sky-600" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-neutral-800 font-mono">
              {health ? formatUptime(health.uptimeSeconds) : '--'}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              Entorno: <strong className="uppercase">{health?.environment || 'N/A'}</strong> | {health?.platform}
            </div>
          </div>
        </div>

        {/* Consumo de Memoria */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400">Memoria del Proceso</span>
            <Icon name="memory" className="text-purple-600" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-neutral-800 font-mono">
              {health ? `${health.memory.rssMb} MB` : '--'}
            </div>
            <div className="text-xs text-neutral-500 mt-1 font-mono">
              Heap: {health?.memory.heapUsedMb} MB / {health?.memory.heapTotalMb} MB
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Diagnóstico para IA */}
      {reportResult && (
        <Modal
          isOpen={true}
          onClose={() => setReportResult(null)}
          className="max-w-4xl"
        >
          <ModalHeader
            title="Paquete de Diagnóstico Técnico Generado (Sanitizado)"
            onClose={() => setReportResult(null)}
          />
          <ModalBody>
            <div className="flex flex-col gap-4 text-xs font-sans max-h-[75vh]">
              <p className="text-neutral-600 text-xs">
                Este reporte compila el estado del servidor, latencias, excepciones recientes en la ventana y eventos
                asociados. Todos los secretos, credenciales y contraseñas han sido redactados automáticamente.
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadReport} className="flex items-center gap-1.5">
                  <Icon name="download" size="16px" />
                  <span>Descargar Markdown</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 bg-neutral-900 text-white"
                >
                  <Icon name={copied ? 'done' : 'content_copy'} size="16px" />
                  <span>{copied ? '¡Copiado!' : 'Copiar para IA'}</span>
                </Button>
              </div>

              <div className="bg-neutral-950 text-neutral-100 p-4 rounded-xl overflow-y-auto font-mono text-[11px] border border-neutral-800 max-h-[500px]">
                <pre className="whitespace-pre-wrap">{reportResult.markdown}</pre>
              </div>
            </div>
          </ModalBody>
        </Modal>
      )}
    </div>
  );
}
