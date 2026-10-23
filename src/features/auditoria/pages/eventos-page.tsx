import { useState, useEffect } from 'react';
import { auditApi, type AuditEventItem, type IntegrityVerificationResponse } from '../api/auditoria-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalHeader, ModalBody } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@/components/ui/icon';

export function AuditEventsPage() {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [accionFilter, setAccionFilter] = useState('');
  const [entidadFilter, setEntidadFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<AuditEventItem | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<IntegrityVerificationResponse | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);

  const fetchEvents = async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await auditApi.getEvents({
        page: currentPage,
        limit: 20,
        accion: accionFilter || undefined,
        entidad: entidadFilter || undefined,
      });
      if (res?.data) {
        setEvents(res.data.items);
        setTotal(res.data.total);
        setPage(res.data.page);
      }
    } catch (err) {
      console.error('Error al cargar eventos de auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyIntegrity = async () => {
    try {
      setCheckingIntegrity(true);
      const res = await auditApi.verifyIntegrity();
      if (res?.data) {
        setIntegrityStatus(res.data);
      }
    } catch (err) {
      console.error('Error al verificar integridad criptográfica:', err);
    } finally {
      setCheckingIntegrity(false);
    }
  };

  useEffect(() => {
    fetchEvents(1);
    verifyIntegrity();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-2 sm:p-4">
      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-neutral-200">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Icon name="history" className="text-marca-primario" />
            Auditoría Funcional del Sistema
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Registro inmutable y trazabilidad criptográfica SHA-256 de todas las operaciones realizadas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {integrityStatus && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                integrityStatus.cadenaValida
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
              }`}
            >
              <Icon name={integrityStatus.cadenaValida ? 'verified' : 'warning'} size="18px" />
              <span>
                {integrityStatus.cadenaValida
                  ? `Cadena Íntegra (${integrityStatus.eventosVerificados} verificados)`
                  : `Alteración Detectada (Evento #${integrityStatus.primerAlteradoId})`}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={verifyIntegrity}
            disabled={checkingIntegrity}
            className="flex items-center gap-2"
          >
            {checkingIntegrity ? <Spinner size="16px" /> : <Icon name="sync" size="16px" />}
            <span>Reverificar Hash</span>
          </Button>
        </div>
      </div>

      {/* Filtros de Búsqueda */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl shadow-sm border border-neutral-200">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Filtrar por Acción (ej. USUARIO_CREADO)"
            value={accionFilter}
            onChange={(e) => setAccionFilter(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Filtrar por Entidad (ej. Usuario, Sesion)"
            value={entidadFilter}
            onChange={(e) => setEntidadFilter(e.target.value)}
          />
        </div>
        <Button onClick={() => fetchEvents(1)} variant="primary" size="sm" className="flex items-center gap-2">
          <Icon name="search" size="16px" />
          <span>Filtrar</span>
        </Button>
        <Button
          onClick={() => {
            setAccionFilter('');
            setEntidadFilter('');
            fetchEvents(1);
          }}
          variant="ghost"
          size="sm"
        >
          Limpiar
        </Button>
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="36px" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <Icon name="search_off" size="48px" />
            <p className="mt-2 text-sm font-medium">No se encontraron registros de auditoría.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-700">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-3">ID / Fecha</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Entidad</th>
                  <th className="px-4 py-3">Resultado</th>
                  <th className="px-4 py-3">Hash SHA-256</th>
                  <th className="px-4 py-3 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-mono text-xs">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="px-4 py-3 font-sans">
                      <div className="font-bold text-neutral-900">#{ev.id}</div>
                      <div className="text-neutral-400 text-xs">{new Date(ev.fecha).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <div className="font-medium text-neutral-800">
                        {ev.usuario?.nombre || ev.detalles?.actorHistorico || 'Sistema'}
                      </div>
                      <div className="text-neutral-400 text-xs">
                        {ev.usuario?.usuario || ev.detalles?.rolHistorico || 'Automático'}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-sans font-semibold text-neutral-800">{ev.accion}</td>
                    <td className="px-4 py-3 font-sans">
                      <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded text-xs">
                        {ev.entidad} {ev.entidadId ? `(${ev.entidadId})` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          ev.detalles?.resultado === 'EXITOSO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {ev.detalles?.resultado || 'EXITOSO'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400 max-w-[120px] truncate" title={ev.hashIntegridad || ''}>
                      {ev.hashIntegridad ? `${ev.hashIntegridad.slice(0, 10)}...` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(ev)}>
                        <Icon name="visibility" size="16px" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 text-xs text-neutral-500">
          <span>Total: {total} eventos</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => fetchEvents(page - 1)}
            >
              Anterior
            </Button>
            <span className="font-semibold text-neutral-700">Pág. {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={events.length < 20 || loading}
              onClick={() => fetchEvents(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Diferencias y Metadatos */}
      {selectedEvent && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEvent(null)}
          className="max-w-3xl"
        >
          <ModalHeader
            title={`Evento de Auditoría #${selectedEvent.id} — ${selectedEvent.accion}`}
            onClose={() => setSelectedEvent(null)}
          />
          <ModalBody>
            <div className="flex flex-col gap-4 text-xs font-sans max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                <div>
                  <span className="text-neutral-400 block">Fecha y Hora</span>
                  <span className="font-semibold">{new Date(selectedEvent.fecha).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Actor Registrado</span>
                  <span className="font-semibold">
                    {selectedEvent.usuario?.nombre || selectedEvent.detalles?.actorHistorico || 'Sistema'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block">Módulo / Origen</span>
                  <span className="font-semibold">
                    {selectedEvent.detalles?.modulo || 'GENERAL'} ({selectedEvent.detalles?.origen || 'INTERFAZ'})
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400 block">IP / Terminal</span>
                  <span className="font-semibold">
                    {selectedEvent.ipOrigen || 'Local'} / {selectedEvent.terminal?.nombre || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Hash de Integridad Criptográfica */}
              <div className="bg-neutral-900 text-neutral-200 p-3 rounded-lg">
                <span className="text-neutral-400 block text-xs">Firma Criptográfica SHA-256 (Inmutabilidad):</span>
                <code className="text-amber-400 break-all text-[11px]">
                  {selectedEvent.hashIntegridad || 'GENESIS'}
                </code>
              </div>

              {/* Comparativa Before / After */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-neutral-200 rounded-lg p-3">
                  <span className="font-bold text-rose-700 block mb-2">Valores Anteriores (Before):</span>
                  <pre className="bg-neutral-50 p-2 rounded text-[11px] overflow-x-auto text-neutral-700 max-h-48 font-mono">
                    {JSON.stringify(selectedEvent.detalles?.valoresAnteriores, null, 2) || 'null (Creación)'}
                  </pre>
                </div>
                <div className="border border-neutral-200 rounded-lg p-3">
                  <span className="font-bold text-emerald-700 block mb-2">Valores Posteriores (After):</span>
                  <pre className="bg-neutral-50 p-2 rounded text-[11px] overflow-x-auto text-neutral-700 max-h-48 font-mono">
                    {JSON.stringify(selectedEvent.detalles?.valoresPosteriores, null, 2) || 'null (Eliminación)'}
                  </pre>
                </div>
              </div>

              {/* Contexto Técnico de la Petición */}
              {selectedEvent.detalles?.requestId && (
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 flex flex-wrap gap-4 text-neutral-600">
                  <span>
                    <strong>Request ID:</strong> {selectedEvent.detalles.requestId}
                  </span>
                  {selectedEvent.detalles.correlationId && (
                    <span>
                      <strong>Correlation ID:</strong> {selectedEvent.detalles.correlationId}
                    </span>
                  )}
                  {selectedEvent.detalles.rutaHttp && (
                    <span>
                      <strong>HTTP:</strong> {selectedEvent.detalles.metodoHttp} {selectedEvent.detalles.rutaHttp}
                    </span>
                  )}
                </div>
              )}
            </div>
          </ModalBody>
        </Modal>
      )}
    </div>
  );
}
