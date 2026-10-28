import { useState, useEffect } from 'react';
import { auditApi, type EventoAuditoria, type VerificacionIntegridad } from '../api/auditoria-api';
import { EventosFiltros } from '../components/auditoria/eventos-filtros';
import { EventosTabla } from '../components/auditoria/eventos-tabla';
import { EventoDetalleModal } from '../components/auditoria/evento-detalle-modal';

const ACCIONES_COMUNES = [
  'LOGIN_EXITOSO',
  'LOGIN_FALLIDO',
  'TERMINAL_CREADA',
  'TERMINAL_REVOCADA',
  'TERMINAL_RECUPERADA_EXITOSAMENTE',
  'TERMINAL_RECUPERACION_SOLICITADA',
  'INSPECCION_REGISTRADA',
  'DEFECTO_INSPECCION_ELIMINADO',
  'DEFECTO_INSPECCION_RECUPERADO',
];

const ENTIDADES_COMUNES = ['sesion', 'terminal', 'inspeccion_cabecera', 'defecto', 'usuario'];

export function AuditEventsPage() {
  const [events, setEvents] = useState<EventoAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [accionFilter, setAccionFilter] = useState('');
  const [entidadFilter, setEntidadFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<EventoAuditoria | null>(null);
  const [integrityStatus, setIntegrityStatus] = useState<VerificacionIntegridad | null>(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);

  const fetchEvents = async (currentPage = 1) => {
    try {
      setLoading(true);
      const res = await auditApi.getEvents({
        page: currentPage,
        limit: 100,
        accion: accionFilter || undefined,
        entidad: entidadFilter || undefined,
      });
      if (res?.data) {
        setEvents(res.data.items);
        setTotal(res.data.total);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages || 1);
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
  }, [accionFilter, entidadFilter]);

  const handleLimpiarFiltros = () => {
    setBusqueda('');
    setAccionFilter('');
    setEntidadFilter('');
  };

  // Filtrado de texto local si se escribe en el buscador
  const eventosFiltrados = busqueda
    ? events.filter(
        (e) =>
          e.detalles?.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
          e.entidadId?.toLowerCase().includes(busqueda.toLowerCase()) ||
          e.usuario?.usuario?.toLowerCase().includes(busqueda.toLowerCase()) ||
          e.accion.toLowerCase().includes(busqueda.toLowerCase()),
      )
    : events;

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Encabezado Principal */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            AUDITORÍA FUNCIONAL
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary">
            {total} {total === 1 ? 'evento registrado' : 'eventos registrados'}
          </span>
        </div>
      </div>

      {/* Tabla con Toolbar de filtros integrados */}
      <EventosTabla
        items={eventosFiltrados}
        isLoading={loading}
        totalItems={total}
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => fetchEvents(p)}
        onVerDetalle={(ev) => setSelectedEvent(ev)}
        toolbar={
          <EventosFiltros
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            accion={accionFilter}
            onAccionChange={setAccionFilter}
            entidad={entidadFilter}
            onEntidadChange={setEntidadFilter}
            accionesDisponibles={ACCIONES_COMUNES}
            entidadesDisponibles={ENTIDADES_COMUNES}
            onLimpiar={handleLimpiarFiltros}
            integrityStatus={integrityStatus}
            checkingIntegrity={checkingIntegrity}
            onVerifyIntegrity={verifyIntegrity}
          />
        }
      />

      {/* Modal de Detalle */}
      <EventoDetalleModal
        isOpen={Boolean(selectedEvent)}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
    </div>
  );
}
