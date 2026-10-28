import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import {
  terminalesApi,
  type TerminalGestionItem,
  type SolicitarRecuperacionResult,
} from '@/features/terminales/api/terminales-api';
import { inspeccionesApi } from '@/features/inspecciones/api/inspecciones-api';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';
import { TerminalesToolbar } from '../components/terminales/terminales-toolbar';
import { TerminalesTabla } from '../components/terminales/terminales-tabla';

export function TerminalesPage() {
  const [terminales, setTerminales] = useState<TerminalGestionItem[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [deptoFiltro, setDeptoFiltro] = useState('');
  const [verInactivas, setVerInactivas] = useState(false);

  // Modal Alta
  const [modalAltaAbierto, setModalAltaAbierto] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoDeptoId, setNuevoDeptoId] = useState<number | ''>('');
  const [cargandoSugerencia, setCargandoSugerencia] = useState(false);
  const [guardandoAlta, setGuardandoAlta] = useState(false);

  // Modal Credencial Creada
  const [credencialCreada, setCredencialCreada] = useState<{
    nombre: string;
    credencial: string;
  } | null>(null);

  // Modal OTP Generado
  const [otpGenerado, setOtpGenerado] = useState<SolicitarRecuperacionResult | null>(null);
  const [generandoOtpId, setGenerandoOtpId] = useState<number | null>(null);

  // Modal Reasignar
  const [terminalReasignar, setTerminalReasignar] = useState<TerminalGestionItem | null>(null);
  const [reasignarDeptoId, setReasignarDeptoId] = useState<number | ''>('');
  const [guardandoReasignar, setGuardandoReasignar] = useState(false);

  // Modal Revocar
  const [terminalRevocar, setTerminalRevocar] = useState<TerminalGestionItem | null>(null);
  const [guardandoRevocar, setGuardandoRevocar] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      const [terms, deptos] = await Promise.all([
        terminalesApi.getTerminales(),
        inspeccionesApi.getDepartamentos(),
      ]);
      setTerminales(terms);
      setDepartamentos(deptos.filter((d) => d.estado === 'ACTIVO'));
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar terminales');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleDeptoAltaChange = async (deptoIdNum: number | '') => {
    setNuevoDeptoId(deptoIdNum);
    if (!deptoIdNum) {
      setNuevoNombre('');
      return;
    }

    try {
      setCargandoSugerencia(true);
      const nombreAuto = await terminalesApi.sugerirNombre(Number(deptoIdNum));
      setNuevoNombre(nombreAuto);
    } catch (err) {
      console.error('Error al sugerir nombre de terminal:', err);
      const dep = departamentos.find((d) => d.id === deptoIdNum);
      const cod = dep ? dep.codigo.toUpperCase() : 'TERMINAL';
      setNuevoNombre(`PC-${cod}-01`);
    } finally {
      setCargandoSugerencia(false);
    }
  };

  const handleCrearTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoDeptoId) return;

    setGuardandoAlta(true);
    try {
      const res = await terminalesApi.crearTerminal({
        nombre: nuevoNombre.trim() || undefined,
        departamentoId: Number(nuevoDeptoId),
      });
      setModalAltaAbierto(false);
      setNuevoNombre('');
      setNuevoDeptoId('');
      setCredencialCreada({
        nombre: res.terminal.nombre,
        credencial: res.credencial,
      });
      cargarDatos();
      toast.success('Terminal creada exitosamente', { title: 'Alta de Terminal' });
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la terminal');
    } finally {
      setGuardandoAlta(false);
    }
  };

  const handleSolicitarOtp = async (t: TerminalGestionItem) => {
    setGenerandoOtpId(t.id);
    try {
      const res = await terminalesApi.solicitarRecuperacion(t.id);
      setOtpGenerado(res);
      toast.success(`Código generado para ${t.nombre}`, { title: 'Recuperación OTP' });
    } catch (err: any) {
      toast.error(err.message || 'Error al generar código OTP');
    } finally {
      setGenerandoOtpId(null);
    }
  };

  const handleReasignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalReasignar || !reasignarDeptoId) return;

    setGuardandoReasignar(true);
    try {
      await terminalesApi.reasignarDepartamento(terminalReasignar.id, {
        departamentoId: Number(reasignarDeptoId),
      });
      setTerminalReasignar(null);
      setReasignarDeptoId('');
      cargarDatos();
      toast.success('Departamento reasignado exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al reasignar departamento');
    } finally {
      setGuardandoReasignar(false);
    }
  };

  const handleRevocar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalRevocar) return;

    setGuardandoRevocar(true);
    try {
      await terminalesApi.revocarTerminal(terminalRevocar.id);
      setTerminalRevocar(null);
      cargarDatos();
      toast.success('Terminal revocada y bloqueada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al revocar terminal');
    } finally {
      setGuardandoRevocar(false);
    }
  };

  // Filtrado de terminales
  const totalInactivas = useMemo(
    () => terminales.filter((t) => t.estado !== 'ACTIVO' || Boolean(t.fechaRevocacion)).length,
    [terminales],
  );

  const terminalesFiltradas = useMemo(() => {
    return terminales.filter((t) => {
      const esInactiva = t.estado !== 'ACTIVO' || Boolean(t.fechaRevocacion);
      if (verInactivas) {
        if (!esInactiva) return false;
      } else {
        if (esInactiva) return false;
      }

      if (busqueda && !t.nombre.toLowerCase().includes(busqueda.toLowerCase())) {
        return false;
      }

      if (deptoFiltro && t.departamentoId !== Number(deptoFiltro)) {
        return false;
      }

      return true;
    });
  }, [terminales, verInactivas, busqueda, deptoFiltro]);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      {/* Encabezado Principal */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/80">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
            TERMINALES Y ESTACIONES FÍSICAS
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-primary/10 text-brand-primary">
            {terminalesFiltradas.length}{' '}
            {terminalesFiltradas.length === 1 ? 'terminal registrada' : 'terminales registradas'}
          </span>
        </div>

        {/* Botón NUEVA TERMINAL */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setModalAltaAbierto(true)}
            className="h-9 px-4 font-black text-xs uppercase tracking-wider gap-1.5 shadow-sm touch-manipulation cursor-pointer bg-brand-primary hover:bg-brand-primary-hover text-white flex items-center"
          >
            <Icon name="add" size="18px" />
            <span>Nueva Terminal</span>
          </Button>
        </div>
      </div>

      {/* Tabla Principal */}
      <TerminalesTabla
        items={terminalesFiltradas}
        isLoading={cargando}
        totalItems={terminalesFiltradas.length}
        generandoOtpId={generandoOtpId}
        onSolicitarOtp={handleSolicitarOtp}
        onAbrirReasignar={(t) => {
          setTerminalReasignar(t);
          setReasignarDeptoId(t.departamentoId);
        }}
        onAbrirRevocar={(t) => setTerminalRevocar(t)}
        toolbar={
          <TerminalesToolbar
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
            deptoFiltro={deptoFiltro}
            onDeptoFiltroChange={setDeptoFiltro}
            deptos={departamentos}
            verInactivas={verInactivas}
            onToggleInactivas={() => setVerInactivas(!verInactivas)}
            totalInactivas={totalInactivas}
          />
        }
      />

      {/* MODAL 1: ALTA DE TERMINAL */}
      <Modal isOpen={modalAltaAbierto} onClose={() => setModalAltaAbierto(false)} className="max-w-md w-full">
        <ModalHeader title="Nueva Terminal de Captura" onClose={() => setModalAltaAbierto(false)} />
        <form onSubmit={handleCrearTerminal}>
          <ModalBody className="space-y-4 pt-1 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Departamento de Captura Asignado *</label>
              <select
                required
                value={nuevoDeptoId}
                onChange={(e) => handleDeptoAltaChange(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 text-slate-800"
              >
                <option value="">Seleccione un departamento</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                Nombre de la PC / Terminal
                <span className="text-[11px] font-normal text-slate-400 ml-1.5">(Autogenerado por departamento)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={cargandoSugerencia ? 'Calculando correlativo...' : nuevoNombre}
                  placeholder="Seleccione un departamento para generar..."
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 cursor-not-allowed select-none"
                />
                {cargandoSugerencia && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="sync" size="14px" className="animate-spin" />
                  </span>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalAltaAbierto(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={guardandoAlta || !nuevoDeptoId || cargandoSugerencia}>
              {guardandoAlta ? 'Guardando...' : 'Crear Terminal'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL 2: CREDENCIAL INICIAL GENERADA */}
      <Modal isOpen={Boolean(credencialCreada)} onClose={() => setCredencialCreada(null)} className="max-w-lg w-full">
        <ModalHeader title="Credencial Física Generada" onClose={() => setCredencialCreada(null)} />
        <ModalBody className="space-y-3 pt-1 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
            <p className="font-bold">¡Terminal {credencialCreada?.nombre} registrada exitosamente!</p>
            <p className="mt-1">
              Copie la siguiente credencial secreta. Solo se muestra una vez:
            </p>
          </div>
          <div className="p-3 bg-slate-900 text-emerald-300 font-mono rounded-lg break-all text-xs select-all border border-slate-800">
            {credencialCreada?.credencial}
          </div>
        </ModalBody>
        <ModalFooter className="flex justify-end border-t border-border pt-3">
          <Button variant="primary" size="sm" onClick={() => setCredencialCreada(null)}>
            Entendido
          </Button>
        </ModalFooter>
      </Modal>

      {/* MODAL 3: CÓDIGO OTP GENERADO */}
      <Modal isOpen={Boolean(otpGenerado)} onClose={() => setOtpGenerado(null)} className="max-w-sm w-full">
        <ModalHeader title="Código OTP Presencial" onClose={() => setOtpGenerado(null)} />
        <ModalBody className="text-center space-y-3 pt-2 text-xs">
          <p className="text-slate-600">
            Teclee este código de 6 dígitos directamente en la estación física:
          </p>
          <div className="py-3 px-6 bg-emerald-50 border-2 border-emerald-400 rounded-xl inline-block text-3xl font-black font-mono tracking-widest text-emerald-800 shadow-xs">
            {otpGenerado?.codigo}
          </div>
          <p className="text-[11px] text-slate-500">
            Expira el: <strong>{otpGenerado?.expiraEn ? new Date(otpGenerado.expiraEn).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '24 horas'}</strong>
          </p>
        </ModalBody>
        <ModalFooter className="flex justify-center border-t border-border pt-3">
          <Button variant="primary" size="sm" onClick={() => setOtpGenerado(null)}>
            Cerrar
          </Button>
        </ModalFooter>
      </Modal>

      {/* MODAL 4: REASIGNAR DEPARTAMENTO */}
      <Modal isOpen={Boolean(terminalReasignar)} onClose={() => setTerminalReasignar(null)} className="max-w-md w-full">
        <ModalHeader title={`Reasignar ${terminalReasignar?.nombre}`} onClose={() => setTerminalReasignar(null)} />
        <form onSubmit={handleReasignar}>
          <ModalBody className="space-y-4 pt-1 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Nuevo Departamento *</label>
              <select
                required
                value={reasignarDeptoId}
                onChange={(e) => setReasignarDeptoId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 text-slate-800"
              >
                <option value="">Seleccione departamento</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
                  </option>
                ))}
              </select>
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setTerminalReasignar(null)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={guardandoReasignar}>
              {guardandoReasignar ? 'Guardando...' : 'Confirmar Reasignación'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL 5: REVOCAR TERMINAL */}
      <Modal isOpen={Boolean(terminalRevocar)} onClose={() => setTerminalRevocar(null)} className="max-w-md w-full">
        <ModalHeader title={`Revocar ${terminalRevocar?.nombre}`} onClose={() => setTerminalRevocar(null)} />
        <form onSubmit={handleRevocar}>
          <ModalBody className="space-y-4 pt-1 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
              <p className="font-bold">¿Confirma la revocación de esta estación?</p>
              <p className="mt-1">
                La terminal quedará bloqueada inmediatamente y no podrá capturar inspecciones hasta que sea re-vinculada.
              </p>
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setTerminalRevocar(null)}>
              Cancelar
            </Button>
            <Button variant="danger" size="sm" type="submit" disabled={guardandoRevocar}>
              {guardandoRevocar ? 'Revocando...' : 'Confirmar Revocación'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
