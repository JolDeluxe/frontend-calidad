import { useState, useEffect } from 'react';
import { auditApi, type SystemHealthData, type AiDiagnosticsResponse } from '../api/auditoria-api';
import { Button } from '@/components/ui/button';
import { Modal, ModalHeader, ModalBody } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';

export function SystemHealthMonitorHeader() {
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
    const interval = setInterval(fetchHealth, 10000);
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
    <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-xs">
      {/* Barra de Título y Diagnóstico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-base font-bold text-neutral-800 flex items-center gap-1.5">
            <Icon name="monitor_heart" size="18px" className="text-emerald-600" />
            <span>Monitor y Diagnóstico del Sistema</span>
          </h2>
          <p className="text-xs text-neutral-500">
            Salud de MySQL, memoria del backend y generación de diagnóstico IA sanitizado.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500' : 'bg-neutral-300'}`} />
            {autoRefresh ? 'Auto (10s)' : 'Pausado'}
          </button>

          <button
            type="button"
            onClick={handleGenerateAiDiagnostic}
            disabled={generatingReport}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-neutral-800 transition-colors shadow-xs disabled:opacity-50"
          >
            {generatingReport ? <Spinner size="12px" /> : <Icon name="psychology" size="14px" />}
            <span>Diagnóstico IA</span>
          </button>
        </div>
      </div>

      {/* Métricas Compactas en Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-neutral-100">
        {/* MySQL */}
        <div className="flex items-center justify-between rounded-lg bg-neutral-50/80 px-3 py-1.5 border border-neutral-200/60">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                health?.database.status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] font-semibold uppercase text-neutral-600">Base MySQL</span>
          </div>
          <span className="font-mono text-xs text-neutral-700">
            {health?.database.latencyMs ?? 0} ms
          </span>
        </div>

        {/* Uptime */}
        <div className="flex items-center justify-between rounded-lg bg-neutral-50/80 px-3 py-1.5 border border-neutral-200/60">
          <span className="text-[11px] font-semibold uppercase text-neutral-600">Tiempo Activo</span>
          <span className="font-mono text-xs text-neutral-700">
            {health ? formatUptime(health.uptimeSeconds) : '--'}
          </span>
        </div>

        {/* Memoria */}
        <div className="flex items-center justify-between rounded-lg bg-neutral-50/80 px-3 py-1.5 border border-neutral-200/60">
          <span className="text-[11px] font-semibold uppercase text-neutral-600">Memoria RSS</span>
          <span className="font-mono text-xs text-neutral-700">
            {health ? `${health.memory.rssMb} MB` : '--'}
          </span>
        </div>
      </div>

      {/* Modal de Diagnóstico IA */}
      {reportResult && (
        <Modal isOpen={true} onClose={() => setReportResult(null)} className="max-w-4xl">
          <ModalHeader
            title="Diagnóstico Técnico para IA (Sanitizado)"
            onClose={() => setReportResult(null)}
          />
          <ModalBody>
            <div className="flex flex-col gap-3 text-xs font-sans max-h-[75vh]">
              <p className="text-neutral-600 text-xs">
                Reporte estructurado con estado del sistema, eventos y excepciones recientes sin credenciales.
              </p>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadReport} className="flex items-center gap-1.5">
                  <Icon name="download" size="14px" />
                  <span>Descargar</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 bg-neutral-900 text-white"
                >
                  <Icon name={copied ? 'done' : 'content_copy'} size="14px" />
                  <span>{copied ? '¡Copiado!' : 'Copiar para IA'}</span>
                </Button>
              </div>

              <div className="bg-neutral-950 text-neutral-100 p-3.5 rounded-lg overflow-y-auto font-mono text-[11px] border border-neutral-800 max-h-[460px]">
                <pre className="whitespace-pre-wrap">{reportResult.markdown}</pre>
              </div>
            </div>
          </ModalBody>
        </Modal>
      )}
    </div>
  );
}
