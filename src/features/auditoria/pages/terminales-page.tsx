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
import { RespaldoOfflineModal } from '@/features/inspecciones/components/respaldo-offline-modal';

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
  const [nuevosDeptosIds, setNuevosDeptosIds] = useState<number[]>([]);
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

  // Modal Configurar (Nombre personalizado + Departamentos donde opera)
  const [terminalReasignar, setTerminalReasignar] = useState<TerminalGestionItem | null>(null);
  const [editarNombre, setEditarNombre] = useState('');
  const [editarDeptosIds, setEditarDeptosIds] = useState<number[]>([]);
  const [guardandoReasignar, setGuardandoReasignar] = useState(false);

  // Modal Revocar
  const [terminalRevocar, setTerminalRevocar] = useState<TerminalGestionItem | null>(null);
  const [guardandoRevocar, setGuardandoRevocar] = useState(false);

  // Modal Respaldo de Contingencia
  const [modalRespaldoAbierto, setModalRespaldoAbierto] = useState(false);

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

  const toggleDeptoAlta = async (deptoId: number) => {
    setNuevosDeptosIds((prev) => {
      const existe = prev.includes(deptoId);
      const next = existe ? prev.filter((id) => id !== deptoId) : [...prev, deptoId];

      // Si seleccionó al menos un departamento y no ha escrito nombre manual, sugerir automáticamente
      if (!existe && next.length === 1 && !nuevoNombre.trim()) {
        void sugerirNombreParaAlta(next[0]);
      }
      return next;
    });
  };

  const sugerirNombreParaAlta = async (deptoId: number) => {
    try {
      setCargandoSugerencia(true);
      const nombreAuto = await terminalesApi.sugerirNombre(deptoId);
      setNuevoNombre(nombreAuto);
    } catch {
      const dep = departamentos.find((d) => d.id === deptoId);
      const cod = dep ? dep.codigo.toUpperCase() : 'TERMINAL';
      setNuevoNombre(`PC-${cod}-01`);
    } finally {
      setCargandoSugerencia(false);
    }
  };

  const handleCrearTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevosDeptosIds.length === 0) {
      toast.error('Debe seleccionar al menos un departamento para la terminal');
      return;
    }

    setGuardandoAlta(true);
    try {
      const res = await terminalesApi.crearTerminal({
        nombre: nuevoNombre.trim() || undefined,
        departamentoId: nuevosDeptosIds[0],
        departamentosIds: nuevosDeptosIds,
      });
      setModalAltaAbierto(false);
      setNuevoNombre('');
      setNuevosDeptosIds([]);
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

  const toggleEditarDepto = (deptoId: number) => {
    setEditarDeptosIds((prev) => {
      if (prev.includes(deptoId)) {
        if (prev.length <= 1) {
          toast.warning('La terminal debe tener al menos un departamento asignado');
          return prev;
        }
        return prev.filter((id) => id !== deptoId);
      }
      return [...prev, deptoId];
    });
  };

  const handleReasignar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalReasignar || editarDeptosIds.length === 0) {
      toast.error('Debe seleccionar al menos un departamento');
      return;
    }

    const nombreLimpio = editarNombre.trim();
    if (nombreLimpio.length < 2) {
      toast.error('El nombre de la terminal debe tener al menos 2 caracteres');
      return;
    }

    setGuardandoReasignar(true);
    try {
      if (nombreLimpio !== terminalReasignar.nombre) {
        await terminalesApi.renombrarTerminal(terminalReasignar.id, {
          nombre: nombreLimpio,
        });
      }

      await terminalesApi.actualizarDepartamentosTerminal(terminalReasignar.id, {
        departamentosIds: editarDeptosIds,
        departamentoPrincipalId: editarDeptosIds[0],
      });

      setTerminalReasignar(null);
      setEditarNombre('');
      setEditarDeptosIds([]);
      cargarDatos();
      toast.success('Configuración de la terminal actualizada exitosamente');
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar configuración de la terminal');
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

      if (deptoFiltro) {
        const deptoNum = Number(deptoFiltro);
        const pertenece =
          t.departamentoId === deptoNum ||
          (Array.isArray(t.departamentosIds) && t.departamentosIds.includes(deptoNum));
        if (!pertenece) return false;
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

        {/* Botones de Acción */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => setModalRespaldoAbierto(true)}
            className="h-9 px-3.5 font-bold text-xs uppercase tracking-wider gap-1.5 shadow-2xs touch-manipulation cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center"
            title="Herramientas de respaldo y recuperación offline (.mbcbak)"
          >
            <Icon name="archive" size="18px" />
            <span>Contingencia (.mbcbak)</span>
          </Button>

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
          setEditarNombre(t.nombre);
          const ids =
            t.departamentosIds && t.departamentosIds.length > 0
              ? t.departamentosIds
              : [t.departamentoId];
          setEditarDeptosIds(ids);
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
      <Modal isOpen={modalAltaAbierto} onClose={() => setModalAltaAbierto(false)} className="max-w-lg w-full">
        <ModalHeader title="Nueva Terminal de Captura" onClose={() => setModalAltaAbierto(false)} />
        <form onSubmit={handleCrearTerminal}>
          <ModalBody className="space-y-4 pt-1 text-xs">
            {/* Nombre de la terminal */}
            <div>
              <label className="block text-slate-800 font-bold mb-1">
                Nombre Visible de la Estación / Terminal *
                <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                  (Ej. SIGMA, PC-CORTE-01, MESA-CONTROL)
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={cargandoSugerencia ? 'Calculando sugerencia...' : nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Escriba un nombre o seleccione departamentos..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                />
                {cargandoSugerencia && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="sync" size="14px" className="animate-spin" />
                  </span>
                )}
              </div>
            </div>

            {/* Departamentos donde opera */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-800 font-bold">
                  Departamentos asignados a esta estación *
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {nuevosDeptosIds.length}{' '}
                  {nuevosDeptosIds.length === 1 ? 'departamento' : 'departamentos'}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                {departamentos.map((d) => {
                  const seleccionado = nuevosDeptosIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        seleccionado
                          ? 'bg-brand-primary/10 text-slate-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => toggleDeptoAlta(d.id)}
                          className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                        />
                        <span className="uppercase text-xs tracking-wide">{d.nombre}</span>
                      </div>
                      {seleccionado && (
                        <span className="text-[10px] font-bold text-brand-primary uppercase">
                          Asignado
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta explicativa de detección inteligente */}
            {nuevosDeptosIds.length === 1 && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <Icon name="check_circle" size="16px" className="text-emerald-600" />
                  <span>
                    Estación individual:{' '}
                    {departamentos.find((d) => d.id === nuevosDeptosIds[0])?.nombre}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 pl-5">
                  Todos los defectos capturados se registrarán como encontrados en{' '}
                  <strong className="text-slate-900 uppercase">
                    {departamentos.find((d) => d.id === nuevosDeptosIds[0])?.nombre}
                  </strong>
                  .
                </p>
              </div>
            )}

            {nuevosDeptosIds.length >= 2 && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                  <Icon name="hub" size="16px" className="text-indigo-600" />
                  <span>Estación compartida ({nuevosDeptosIds.length} departamentos)</span>
                </div>
                <div className="text-[11px] text-slate-700 pl-5 space-y-1">
                  <p>
                    • Defectos propios de{' '}
                    <strong className="text-slate-900 uppercase">
                      {departamentos
                        .filter((d) => nuevosDeptosIds.includes(d.id))
                        .map((d) => d.nombre)
                        .join(', ')}
                    </strong>
                    : se registrarán como encontrados en su respectivo departamento.
                  </p>
                  <p>
                    • Defectos externos (de otros departamentos): se registrarán como encontrados en{' '}
                    <strong className="text-indigo-900 uppercase font-mono">
                      {nuevoNombre.trim() || 'esta terminal'}
                    </strong>
                    .
                  </p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setModalAltaAbierto(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={guardandoAlta || nuevosDeptosIds.length === 0 || cargandoSugerencia}
            >
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

      {/* MODAL 4: CONFIGURAR NOMBRE VISIBLE Y DEPARTAMENTOS ASOCIADOS */}
      <Modal isOpen={Boolean(terminalReasignar)} onClose={() => setTerminalReasignar(null)} className="max-w-lg w-full">
        <ModalHeader title={`Configurar ${terminalReasignar?.nombre}`} onClose={() => setTerminalReasignar(null)} />
        <form onSubmit={handleReasignar}>
          <ModalBody className="space-y-4 pt-1 text-xs">
            {/* Nombre de la terminal */}
            <div>
              <label className="block text-slate-800 font-bold mb-1">
                Nombre Visible de la Estación / Terminal *
                <span className="text-[11px] font-normal text-slate-500 ml-1.5">
                  (Ej. SIGMA, PC-CORTE-01, MESA-CONTROL)
                </span>
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={editarNombre}
                onChange={(e) => setEditarNombre(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent/50 text-slate-800"
              />
            </div>

            {/* Departamentos donde opera */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-800 font-bold">
                  Departamentos asignados a esta estación *
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {editarDeptosIds.length}{' '}
                  {editarDeptosIds.length === 1 ? 'departamento' : 'departamentos'}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                {departamentos.map((d) => {
                  const seleccionado = editarDeptosIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                        seleccionado
                          ? 'bg-brand-primary/10 text-slate-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={() => toggleEditarDepto(d.id)}
                          className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary w-4 h-4 cursor-pointer"
                        />
                        <span className="uppercase text-xs tracking-wide">{d.nombre}</span>
                      </div>
                      {seleccionado && (
                        <span className="text-[10px] font-bold text-brand-primary uppercase">
                          Asignado
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta explicativa de detección inteligente */}
            {editarDeptosIds.length === 1 && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <Icon name="check_circle" size="16px" className="text-emerald-600" />
                  <span>
                    Estación individual:{' '}
                    {departamentos.find((d) => d.id === editarDeptosIds[0])?.nombre ||
                      terminalReasignar?.departamento?.nombre}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 pl-5">
                  Todos los defectos capturados se registrarán como encontrados en{' '}
                  <strong className="text-slate-900 uppercase">
                    {departamentos.find((d) => d.id === editarDeptosIds[0])?.nombre ||
                      terminalReasignar?.departamento?.nombre}
                  </strong>
                  .
                </p>
              </div>
            )}

            {editarDeptosIds.length >= 2 && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950 text-xs">
                  <Icon name="hub" size="16px" className="text-indigo-600" />
                  <span>Estación compartida ({editarDeptosIds.length} departamentos)</span>
                </div>
                <div className="text-[11px] text-slate-700 pl-5 space-y-1">
                  <p>
                    • Defectos propios de{' '}
                    <strong className="text-slate-900 uppercase">
                      {departamentos
                        .filter((d) => editarDeptosIds.includes(d.id))
                        .map((d) => d.nombre)
                        .join(', ')}
                    </strong>
                    : se registrarán como encontrados en su respectivo departamento.
                  </p>
                  <p>
                    • Defectos externos (de otros departamentos): se registrarán como encontrados en{' '}
                    <strong className="text-indigo-900 uppercase font-mono">
                      {editarNombre.trim() || terminalReasignar?.nombre}
                    </strong>
                    .
                  </p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" type="button" onClick={() => setTerminalReasignar(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={guardandoReasignar || editarDeptosIds.length === 0}
            >
              {guardandoReasignar ? 'Guardando...' : 'Guardar Cambios'}
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

      {/* MODAL 6: RESPALDO Y CONTINGENCIA OFFLINE (.mbcbak) */}
      <RespaldoOfflineModal
        isOpen={modalRespaldoAbierto}
        onClose={() => setModalRespaldoAbierto(false)}
      />
    </div>
  );
}
