import { useState, useEffect, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { defectosApi } from '@/features/defectos/api/defectos-api';
import { inspeccionesApi } from '../api/inspecciones-api';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';
import type { LineaOperativa, ProduccionLote } from '../types/inspecciones.types';
import type { Defecto } from '@/features/defectos/types/defectos.types';
import { useAuthSession } from '@/providers/auth-provider';
import {
  CapturaLoteSelector,
  CapturaLoteFicha,
  CapturaDefectoForm,
  CapturaDefectosTabla,
} from './captura';

/** Clave única por intento de captura; el backend la usa para no duplicar inspecciones en reintentos. */
function nuevaClaveIdempotencia(): string {
  return `cap-${crypto.randomUUID()}`;
}

export interface DefectoItemCapturado {
  idTemporal: string;
  defectoId: number;
  clave: number;
  defecto: string;
  clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
  departamentoResponsableId: number;
  departamentoResponsableNombre: string;
  pares: number;
}

export interface DefectoModalCapturaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nuevosDetallesIds?: number[]) => void;
  departamentoAuditor: Departamento | null;
  lineas: LineaOperativa[];
  departamentos: Departamento[];
}

export function DefectoModalCaptura({
  isOpen,
  onClose,
  onSuccess,
  departamentoAuditor,
  lineas,
  departamentos = [],
}: DefectoModalCapturaProps) {
  const { user } = useAuthSession();

  // Fecha en formato dd/mm/aaaa
  const hoy = new Date();
  const fechaTexto = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

  // Cantidad de líneas operativas en el departamento auditor
  const totalLineasDepto = Math.max(1, departamentoAuditor?.numeroLineas || 1);
  const tieneMultiplesLineas = totalLineasDepto > 1;

  // LADO IZQUIERDO: Consulta de Lote y datos de producción
  const [loteInput, setLoteInput] = useState('');
  const [cargandoLote, setCargandoLote] = useState(false);
  const [errorLote, setErrorLote] = useState<string | null>(null);
  const [loteActivo, setLoteActivo] = useState<ProduccionLote | null>(null);
  const [lineaCodigo, setLineaCodigo] = useState('L1');

  // LADO DERECHO: Formulario de captura y lista dinámica
  const [claveDefecto, setClaveDefecto] = useState('');
  const [buscandoDefecto, setBuscandoDefecto] = useState(false);
  const [catalogoDefectos, setCatalogoDefectos] = useState<Defecto[]>([]);
  const [defectoSeleccionado, setDefectoSeleccionado] = useState<Defecto | null>(null);
  const [errorDefecto, setErrorDefecto] = useState<string | null>(null);
  const [paresDefecto, setParesDefecto] = useState<number>(1);
  const [filtroTextoDefecto, setFiltroTextoDefecto] = useState('');
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Lista de defectos acumulados
  const [defectosCapturados, setDefectosCapturados] = useState<DefectoItemCapturado[]>([]);

  // Guardado
  const [guardando, setGuardando] = useState(false);
  // Misma clave en reintentos de una captura (doble clic/pérdida de respuesta); se renueva tras guardar con éxito
  const claveIdempotenciaRef = useRef<string>(nuevaClaveIdempotencia());

  // Si el contenido de la captura cambia, es una captura distinta: nueva clave de idempotencia
  useEffect(() => {
    claveIdempotenciaRef.current = nuevaClaveIdempotencia();
  }, [defectosCapturados, loteActivo]);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  const loteInputRef = useRef<HTMLInputElement>(null);
  const claveInputRef = useRef<HTMLInputElement>(null);

  // Cargar catálogo de defectos del departamento auditor o activos
  useEffect(() => {
    if (!isOpen) return;

    let cancelado = false;
    const cargarCatalogo = async () => {
      try {
        const resp = await defectosApi.getDefectos({
          etapaId: departamentoAuditor?.id,
          activo: true,
          limit: 1000,
        });
        if (!cancelado && resp.items) {
          setCatalogoDefectos(resp.items);
        }
      } catch (err) {
        console.error('Error cargando catálogo de defectos', err);
      }
    };

    cargarCatalogo();
    return () => {
      cancelado = true;
    };
  }, [isOpen, departamentoAuditor]);

  // Resetear el formulario al abrir el modal (solamente cuando isOpen cambia de false a true)
  useEffect(() => {
    if (isOpen) {
      setLoteInput('');
      setLoteActivo(null);
      setErrorLote(null);
      setLineaCodigo('L1');
      setClaveDefecto('');
      setFiltroTextoDefecto('');
      setSelectorAbierto(false);
      setDefectoSeleccionado(null);
      setErrorDefecto(null);
      setParesDefecto(1);
      setDefectosCapturados([]);
      setErrorGuardado(null);
      setTimeout(() => {
        loteInputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Búsqueda de Lote
  const handleBuscarLote = async (valorOverride?: string) => {
    const cod = (valorOverride !== undefined ? valorOverride : loteInput).trim();
    if (!cod) {
      setLoteActivo(null);
      setErrorLote(null);
      return;
    }

    // No mostrar error si tiene menos de 4 dígitos (esperar a que el usuario termine de teclear)
    if (cod.length < 4) {
      setLoteActivo(null);
      setErrorLote(null);
      return;
    }

    setCargandoLote(true);
    setErrorLote(null);

    try {
      const lote = await inspeccionesApi.getLoteByCodigo(cod);
      setLoteActivo(lote);
      setErrorLote(null);
      setTimeout(() => {
        claveInputRef.current?.focus();
      }, 100);
    } catch {
      setLoteActivo(null);
      setErrorLote(`El lote '${cod}' no existe o no está disponible`);
    } finally {
      setCargandoLote(false);
    }
  };

  // Debounce automático al escribir el número de lote
  useEffect(() => {
    if (!isOpen) return;

    const term = loteInput.trim();
    if (!term || term.length < 4) {
      setLoteActivo(null);
      setErrorLote(null);
      return;
    }

    const timer = setTimeout(() => {
      handleBuscarLote(term);
    }, 400);

    return () => clearTimeout(timer);
  }, [loteInput, isOpen]);

  // Búsqueda de Defecto por Clave
  const handleBuscarDefecto = async (claveManual?: string) => {
    const valor = claveManual !== undefined ? claveManual : claveDefecto;
    const term = valor.trim();
    if (!term || term.length < 4) {
      setDefectoSeleccionado(null);
      setErrorDefecto(null);
      return;
    }

    const num = parseInt(term, 10);
    if (isNaN(num) || num <= 0) {
      setDefectoSeleccionado(null);
      setErrorDefecto(null);
      return;
    }

    setBuscandoDefecto(true);
    setErrorDefecto(null);

    try {
      const resp = await defectosApi.getDefectos({
        clave: num,
        activo: true,
        limit: 1,
      });

      if (resp.items && resp.items.length > 0) {
        const d = resp.items[0];
        setDefectoSeleccionado(d);
        setErrorDefecto(null);
      } else {
        setDefectoSeleccionado(null);
        setErrorDefecto(`Defecto #${num} no encontrado`);
      }
    } catch {
      setDefectoSeleccionado(null);
      setErrorDefecto('Error al consultar el catálogo de defectos');
    } finally {
      setBuscandoDefecto(false);
    }
  };

  // Debounce automático al escribir la clave de defecto (a partir de 4 dígitos)
  useEffect(() => {
    if (!isOpen) return;

    const term = claveDefecto.trim();
    if (!term || term.length < 4) {
      setDefectoSeleccionado(null);
      setErrorDefecto(null);
      return;
    }

    const timer = setTimeout(() => {
      handleBuscarDefecto(term);
    }, 300);

    return () => clearTimeout(timer);
  }, [claveDefecto, isOpen]);

  // Cerrar selector al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setSelectorAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!isOpen) return null;

  const maxParesPermitido = loteActivo ? Math.max(1, Math.floor(loteActivo.cantidad)) : 9999;

  const handleModificarPares = (delta: number) => {
    setParesDefecto((prev) => Math.min(Math.max(1, prev + delta), maxParesPermitido));
  };

  const handleParesDirecto = (val: string) => {
    const limpio = val.replace(/\D/g, '');
    let num = parseInt(limpio, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > maxParesPermitido) num = maxParesPermitido;
    setParesDefecto(num);
  };

  const handleAgregarDefecto = () => {
    if (!loteActivo) {
      setErrorDefecto('Primero ingrese un lote válido');
      toast.warning('Primero ingrese y valide un lote de producción', { title: 'Lote requerido' });
      return;
    }

    if (!defectoSeleccionado) {
      setErrorDefecto('Seleccione o ingrese un defecto válido');
      toast.warning('Seleccione o teclee un defecto válido de la lista', { title: 'Defecto requerido' });
      return;
    }

    const deptoId = defectoSeleccionado.departamento?.id || defectoSeleccionado.departamentoId || (departamentoAuditor ? departamentoAuditor.id : (departamentos[0]?.id || 1));
    const deptoNom = defectoSeleccionado.departamento?.nombre || (departamentoAuditor ? departamentoAuditor.nombre : (departamentos[0]?.nombre || 'GENERAL'));

    setDefectosCapturados((prev) => {
      // Regla de acumulación MBC: si ya existe el mismo defecto capturado antes de guardar, acumular pares
      const indexExistente = prev.findIndex((d) => d.defectoId === defectoSeleccionado.id);

      if (indexExistente >= 0) {
        const itemExistente = prev[indexExistente];
        const nuevosPares = Math.min(maxParesPermitido, itemExistente.pares + paresDefecto);
        const actualizados = [...prev];
        actualizados[indexExistente] = {
          ...itemExistente,
          pares: nuevosPares,
        };
        return actualizados;
      }

      const item: DefectoItemCapturado = {
        idTemporal: `def-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        defectoId: defectoSeleccionado.id,
        clave: defectoSeleccionado.clave,
        defecto: defectoSeleccionado.defecto,
        clasificacion: defectoSeleccionado.clasificacion,
        departamentoResponsableId: deptoId,
        departamentoResponsableNombre: deptoNom,
        pares: paresDefecto,
      };

      return [item, ...prev];
    });

    setClaveDefecto('');
    setFiltroTextoDefecto('');
    setSelectorAbierto(false);
    setDefectoSeleccionado(null);
    setParesDefecto(1);
    setErrorDefecto(null);

    setTimeout(() => {
      claveInputRef.current?.focus();
    }, 50);

    toast.info(`Defecto #${defectoSeleccionado.clave} agregado a la lista (${paresDefecto} par${paresDefecto > 1 ? 'es' : ''})`);
  };

  const handleEliminarItem = (idTemporal: string) => {
    setDefectosCapturados((prev) => {
      const item = prev.find((d) => d.idTemporal === idTemporal);
      if (item) {
        toast.info(`Defecto #${item.clave} removido de la lista`);
      }
      return prev.filter((d) => d.idTemporal !== idTemporal);
    });
  };

  const handleGuardarInspeccion = async () => {
    if (!loteActivo) {
      setErrorGuardado('Debe tener un lote válido cargado');
      return;
    }

    if (defectosCapturados.length === 0) {
      setErrorGuardado('Agregue al menos un defecto antes de guardar la inspección');
      return;
    }

    setGuardando(true);
    setErrorGuardado(null);

    try {
      const lineaObj = lineas.find((l) => l.codigo === lineaCodigo || l.nombre === lineaCodigo);

      const res = await inspeccionesApi.createInspeccion({
        lote: loteActivo.lote,
        lineaId: lineaObj?.id || null,
        lineaTexto: lineaCodigo,
        // El departamento de auditoría lo determina el servidor a partir de la terminal física validada
        horma: loteActivo.horma,
        detalles: defectosCapturados.map((d) => ({
          defectoId: d.defectoId,
          defDeptoId: d.departamentoResponsableId,
          paresDefectuosos: d.pares,
        })),
      }, claveIdempotenciaRef.current);

      // Captura confirmada: la siguiente inspección usará una clave nueva
      claveIdempotenciaRef.current = nuevaClaveIdempotencia();

      const nuevosIds: number[] = Array.isArray(res?.detalles)
        ? res.detalles.map((d: any) => d.id)
        : [];

      toast.success(
        `Se registraron ${defectosCapturados.length} defectos del lote ${loteActivo.lote} exitosamente.`,
        { title: 'Inspección Guardada' }
      );

      onSuccess(nuevosIds);
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Error al guardar la inspección en el servidor';
      setErrorGuardado(msg);
      toast.error(msg, { title: 'Error al Guardar' });
    } finally {
      setGuardando(false);
    }
  };

  const totalParesFalla = defectosCapturados.reduce((acc, d) => acc + d.pares, 0);
  const inspectorNombre = (user?.nombre || user?.usuario || 'INSPECTOR CALIDAD').toUpperCase();
  const deptoNombre = (departamentoAuditor?.nombre || 'MONTADO').toUpperCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="screen"
      className="w-full h-[96vh] max-h-[96vh] border-border shadow-2xl bg-app-surface"
    >
      <ModalHeader
        title={`Captura de Defectos — ${departamentoAuditor?.nombre || 'Calidad'}`}
        onClose={onClose}
        className="px-6 py-4"
      />

      <ModalBody className="p-4 xl:p-6 flex-1 min-h-0 flex flex-col bg-app-surface overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 xl:gap-6 items-stretch flex-1 min-h-0 overflow-hidden">
          
          {/* LADO IZQUIERDO (COLUMNA 5 DE 12): FICHA TÉCNICA DEL LOTE */}
          <div className="lg:col-span-5 flex flex-col justify-between self-stretch bg-app-surface-muted/40 rounded-xl border border-border p-3 xl:p-5 gap-2.5 xl:gap-4 min-h-0 overflow-hidden">
            <div className="space-y-2 xl:space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
              
              {/* Fecha de Registro */}
              <div className="flex items-center justify-between border-b border-border-subtle pb-2 xl:pb-3 shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Fecha de Registro
                </span>
                <span className="text-xs xl:text-sm font-bold text-text-primary font-mono">
                  {fechaTexto}
                </span>
              </div>

              {/* LOTE + SELECTOR DE LÍNEA */}
              <CapturaLoteSelector
                loteInput={loteInput}
                setLoteInput={setLoteInput}
                setErrorLote={setErrorLote}
                handleBuscarLote={handleBuscarLote}
                loteInputRef={loteInputRef}
                cargandoLote={cargandoLote}
                guardando={guardando}
                tieneMultiplesLineas={tieneMultiplesLineas}
                totalLineasDepto={totalLineasDepto}
                lineaCodigo={lineaCodigo}
                setLineaCodigo={setLineaCodigo}
              />

              {/* FICHA TÉCNICA DEL LOTE: LOTE | LISTA | MODELO | PARES | HORMA | CLIENTE */}
              <CapturaLoteFicha
                lote={loteActivo}
                error={errorLote}
                cargando={cargandoLote}
              />
            </div>

            {/* SELLO DE AUDITORÍA */}
            <div className="shrink-0 pt-2 border-t border-border-subtle flex items-center justify-between text-[10px] xl:text-xs text-text-muted opacity-75">
              <span className="font-semibold uppercase tracking-wider truncate mr-2" title={deptoNombre}>
                {deptoNombre}
              </span>
              <span className="font-mono truncate" title={inspectorNombre}>
                {inspectorNombre}
              </span>
            </div>
          </div>

          {/* LADO DERECHO (COLUMNA 7 DE 12): CAPTURA Y LISTA DE DEFECTOS */}
          <div className="lg:col-span-7 flex flex-col min-h-0 overflow-hidden bg-app-surface rounded-xl border border-border p-3 xl:p-5 gap-2.5 xl:gap-4">
            
            {/* Formulario de Captura de Defecto */}
            <CapturaDefectoForm
              loteActivo={!!loteActivo}
              departamentoAuditorId={departamentoAuditor?.id}
              claveDefecto={claveDefecto}
              setClaveDefecto={setClaveDefecto}
              claveInputRef={claveInputRef}
              buscandoDefecto={buscandoDefecto}
              handleBuscarDefecto={handleBuscarDefecto}
              defectoSeleccionado={defectoSeleccionado}
              setDefectoSeleccionado={setDefectoSeleccionado}
              catalogoDefectos={catalogoDefectos}
              selectorAbierto={selectorAbierto}
              setSelectorAbierto={setSelectorAbierto}
              selectorRef={selectorRef}
              filtroTextoDefecto={filtroTextoDefecto}
              setFiltroTextoDefecto={setFiltroTextoDefecto}
              paresDefecto={paresDefecto}
              handleModificarPares={handleModificarPares}
              handleParesDirecto={handleParesDirecto}
              maxParesPermitido={maxParesPermitido}
              handleAgregarDefecto={handleAgregarDefecto}
              guardando={guardando}
              errorDefecto={errorDefecto}
              setErrorDefecto={setErrorDefecto}
            />

            {/* Tabla de Defectos Capturados */}
            <CapturaDefectosTabla
              defectosCapturados={defectosCapturados}
              totalParesFalla={totalParesFalla}
              departamentoAuditorId={departamentoAuditor?.id}
              catalogoDefectos={catalogoDefectos}
              setClaveDefecto={setClaveDefecto}
              setDefectoSeleccionado={setDefectoSeleccionado}
              setParesDefecto={setParesDefecto}
              handleEliminarItem={handleEliminarItem}
              guardando={guardando}
            />

            {errorGuardado && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-bold text-red-700 flex items-center gap-1.5">
                <Icon name="error" size="16px" />
                <span>{errorGuardado}</span>
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      {/* FOOTER DEL MODAL */}
      <ModalFooter className="flex items-center justify-between px-6 py-4 bg-app-surface-muted/60 border-t border-border-subtle">
        <span className="text-xs font-semibold text-text-secondary">
          {loteActivo
            ? ``
            : 'Ingrese un lote de producción para habilitar el registro'}
        </span>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={guardando}
            className="cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="guardar"
            size="md"
            onClick={handleGuardarInspeccion}
            disabled={guardando || !loteActivo || defectosCapturados.length === 0}
            className="px-6 font-bold uppercase tracking-wider text-xs gap-2 cursor-pointer shadow-sm touch-manipulation"
          >
            {guardando ? (
              <div className="flex items-center gap-2">
                <Spinner size="14px" />
                <span>Guardando...</span>
              </div>
            ) : (
              <>
                <Icon name="save" size="18px" />
                <span>Guardar</span>
              </>
            )}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
