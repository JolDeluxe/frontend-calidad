import { useState, useEffect, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { ApiError } from '@/lib/api/http-client';
import { defectosApi } from '@/features/defectos/api/defectos-api';
import { catalogoOfflineService } from '@/features/catalogo-offline/services/catalogo-offline.service';
import { inspeccionesApi } from '../api/inspecciones-api';
import {
  inspeccionesOfflineService,
  computeLocalRowId,
} from '../services/inspecciones-offline.service';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';
import type { LineaOperativa, ProduccionLote } from '../types/inspecciones.types';
import type { Defecto } from '@/features/defectos/types/defectos.types';
import { useAuthSession } from '@/providers/auth-provider';
import {
  CapturaLoteSelector,
  CapturaLoteFicha,
  CapturaDefectoForm,
  CapturaDefectosTabla,
  FloatingNumpad,
} from './captura';

/** Clave única por intento de captura; el backend la usa para no duplicar inspecciones en reintentos. */
function nuevaClaveIdempotencia(): string {
  return `cap-${crypto.randomUUID()}`;
}

const DRAFT_STORAGE_KEY_PREFIX = 'calidad_captura_borrador_';

export interface BorradorCaptura {
  loteInput: string;
  loteActivo: ProduccionLote | null;
  lineaCodigo: string;
  defectosCapturados: DefectoItemCapturado[];
  departamentoId?: number;
  actualizadoEn: number;
}

function getDraftKey(deptoId?: number): string {
  return `${DRAFT_STORAGE_KEY_PREFIX}${deptoId ?? 'general'}`;
}

function guardarBorradorEnStorage(
  deptoId: number | undefined,
  data: {
    loteInput: string;
    loteActivo: ProduccionLote | null;
    lineaCodigo: string;
    defectosCapturados: DefectoItemCapturado[];
  }
) {
  if (typeof window === 'undefined') return;
  try {
    const key = getDraftKey(deptoId);
    if (!data.loteActivo && data.defectosCapturados.length === 0 && !data.loteInput.trim()) {
      window.localStorage.removeItem(key);
      return;
    }
    const borrador: BorradorCaptura = {
      ...data,
      departamentoId: deptoId,
      actualizadoEn: Date.now(),
    };
    window.localStorage.setItem(key, JSON.stringify(borrador));
  } catch {
    // Ignorar errores de cuota en almacenamiento local
  }
}

function eliminarBorradorDeStorage(deptoId?: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getDraftKey(deptoId));
  } catch {
    // Ignorar errores
  }
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
  lineas?: LineaOperativa[];
  departamentos: Departamento[];
}

export function DefectoModalCaptura({
  isOpen,
  onClose,
  onSuccess,
  departamentoAuditor,
  departamentos = [],
}: DefectoModalCapturaProps) {
  const { user, isOfflineMode } = useAuthSession();

  // Fecha en formato dd/mm/aaaa
  const hoy = new Date();
  const fechaTexto = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

  // Cantidad de líneas operativas en el departamento auditor (MONTADO cuenta con 2 líneas: L1 y L2)
  const totalLineasDepto = Math.max(
    1,
    departamentoAuditor?.numeroLineas ?? (departamentoAuditor?.codigo === 'MONTADO' ? 2 : 1)
  );
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

  // Control del teclado numérico flotante para pantallas táctiles
  const [tecladoTarget, setTecladoTarget] = useState<'lote' | 'clave' | null>(null);

  // Cargar catálogo de defectos del departamento auditor (con fallback automático a IndexedDB en modo offline)
  const [avisoCatalogoOffline, setAvisoCatalogoOffline] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;

    let cancelado = false;
    const cargarCatalogo = async () => {
      setAvisoCatalogoOffline(null);
      const etapaTargetId = departamentoAuditor?.id;

      const cargarDesdeLocal = async () => {
        const resLocal = await catalogoOfflineService.consultarDefectosLocales({
          etapaId: etapaTargetId,
          activo: true,
          limit: 1000,
        });
        if (!cancelado) {
          setCatalogoDefectos(resLocal.items);
          if (resLocal.items.length === 0) {
            setAvisoCatalogoOffline(
              'No hay datos locales de defectos disponibles en este equipo porque no hay conexión con el servidor.',
            );
          }
        }
      };

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        await cargarDesdeLocal();
        return;
      }

      try {
        const resp = await defectosApi.getDefectos({
          etapaId: etapaTargetId,
          activo: true,
          limit: 1000,
        });
        if (!cancelado && resp.items) {
          setCatalogoDefectos(resp.items);
          setAvisoCatalogoOffline(null);
          // Persistir oportunistamente en el catálogo local para garantizar disponibilidad inmediata si se apaga el backend
          void catalogoOfflineService.guardarDefectosEnCacheLocal(resp.items, etapaTargetId);
        }
      } catch (err) {
        console.warn('[Offline] Usando catálogo local de defectos en IndexedDB:', err);
        await cargarDesdeLocal();
      }
    };

    void cargarCatalogo();
    return () => {
      cancelado = true;
    };
  }, [isOpen, departamentoAuditor, isOfflineMode]);

  // Limpiar campos cada vez que se abre el modal
  useEffect(() => {
    if (isOpen) {
      eliminarBorradorDeStorage(departamentoAuditor?.id);
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
  }, [isOpen, departamentoAuditor?.id]);

  // Persistir en localStorage mientras el modal esté abierto únicamente si hay datos activos
  useEffect(() => {
    if (!isOpen) return;
    if (!loteActivo && defectosCapturados.length === 0 && !loteInput.trim()) {
      eliminarBorradorDeStorage(departamentoAuditor?.id);
      return;
    }
    guardarBorradorEnStorage(departamentoAuditor?.id, {
      loteInput,
      loteActivo,
      lineaCodigo,
      defectosCapturados,
    });
  }, [isOpen, loteInput, loteActivo, lineaCodigo, defectosCapturados, departamentoAuditor?.id]);

  // Borrar el lote y en consecuencia borrar también todos los defectos registrados
  const handleLimpiarLote = () => {
    setLoteInput('');
    setLoteActivo(null);
    setErrorLote(null);
    setDefectosCapturados([]);
    setClaveDefecto('');
    setFiltroTextoDefecto('');
    setSelectorAbierto(false);
    setDefectoSeleccionado(null);
    setErrorDefecto(null);
    setParesDefecto(1);
    setTecladoTarget((prev) => (prev === 'lote' ? null : prev));
    eliminarBorradorDeStorage(departamentoAuditor?.id);
    setTimeout(() => {
      loteInputRef.current?.focus();
    }, 50);
  };

  // Cerrar directamente al presionar la tachita o Cancelar sin confirmaciones ni persistencias no deseadas
  const handleCerrarDirecto = () => {
    // 1. Si el teclado numérico está abierto, cerrarlo
    if (tecladoTarget) {
      setTecladoTarget(null);
    }
    // 2. Si el selector de defectos está desplegado, cerrarlo
    if (selectorAbierto) {
      setSelectorAbierto(false);
    }
    // 3. Limpiar estado, eliminar cualquier borrador en localStorage y cerrar
    eliminarBorradorDeStorage(departamentoAuditor?.id);
    setLoteInput('');
    setLoteActivo(null);
    setErrorLote(null);
    setDefectosCapturados([]);
    setClaveDefecto('');
    setFiltroTextoDefecto('');
    setDefectoSeleccionado(null);
    setErrorDefecto(null);
    setParesDefecto(1);
    setErrorGuardado(null);
    setTecladoTarget(null);
    onClose();
  };

  // Búsqueda de Lote (con fallback a IndexedDB cat_lotes cuando no hay red)
  const handleBuscarLote = async (valorOverride?: string) => {
    const cod = (valorOverride !== undefined ? valorOverride : loteInput).trim();
    if (!cod) {
      handleLimpiarLote();
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

    const buscarEnIdb = async (): Promise<boolean> => {
      const loteOffline = await catalogoOfflineService.getLoteLocal(cod);
      if (loteOffline) {
        if (loteActivo && loteActivo.lote !== loteOffline.lote) {
          setDefectosCapturados([]);
        }
        setLoteActivo({
          id: loteOffline.id,
          listaLote: `${loteOffline.lista}-${loteOffline.lote}`,
          lista: loteOffline.lista,
          lote: loteOffline.lote,
          idProducto: loteOffline.idProducto,
          modelo: loteOffline.modelo,
          cantidad: loteOffline.cantidad,
          descripcion: null,
          cliente: loteOffline.cliente,
          horma: loteOffline.horma,
          estado: 'ACTIVO',
        });
        setErrorLote(null);
        setTimeout(() => {
          claveInputRef.current?.focus();
        }, 100);
        return true;
      }
      return false;
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        const hallado = await buscarEnIdb();
        if (!hallado) {
          setLoteActivo(null);
          setErrorLote(`El lote '${cod}' no se encuentra en el catálogo local de lotes activos.`);
        } else {
          // Si lo encuentra y el teclado estaba en modo lote, cerrarlo automáticamente
          setTecladoTarget((prev) => (prev === 'lote' ? null : prev));
        }
        return;
      }

      const lote = await inspeccionesApi.getLoteByCodigo(cod);
      if (loteActivo && loteActivo.lote !== lote.lote) {
        setDefectosCapturados([]);
      }
      setLoteActivo(lote);
      setErrorLote(null);
      // Cerrar teclado numérico automáticamente si encontró el lote
      setTecladoTarget((prev) => (prev === 'lote' ? null : prev));
      setTimeout(() => {
        claveInputRef.current?.focus();
      }, 100);
    } catch (err: any) {
      // Si fue un 404 explícito del servidor en línea, el lote no existe en MySQL
      if (err instanceof ApiError && err.statusCode === 404) {
        setLoteActivo(null);
        setErrorLote(`El lote '${cod}' no existe o no está disponible`);
        return;
      }

      // Fallo de red: intentar resolver desde IndexedDB
      const halladoLocal = await buscarEnIdb();
      if (!halladoLocal) {
        setLoteActivo(null);
        setErrorLote(
          `Sin conexión al servidor y el lote '${cod}' no está en el catálogo local.`,
        );
      } else {
        // Encontrado localmente: cerrar teclado
        setTecladoTarget((prev) => (prev === 'lote' ? null : prev));
      }
    } finally {
      setCargandoLote(false);
    }
  };

  // Debounce automático al escribir el número de lote
  useEffect(() => {
    if (!isOpen) return;

    const term = loteInput.trim();
    if (!term) {
      setLoteActivo(null);
      setErrorLote(null);
      if (defectosCapturados.length > 0) {
        setDefectosCapturados([]);
        eliminarBorradorDeStorage(departamentoAuditor?.id);
      }
      return;
    }

    if (term.length < 4) {
      setLoteActivo(null);
      setErrorLote(null);
      return;
    }

    const timer = setTimeout(() => {
      void handleBuscarLote(term);
    }, 400);

    return () => clearTimeout(timer);
  }, [loteInput, isOpen]);

  // Búsqueda de Defecto por Clave (con soporte local / IndexedDB)
  const handleBuscarDefecto = async (claveManual?: string): Promise<Defecto | null> => {
    const valor = claveManual !== undefined ? claveManual : claveDefecto;
    const term = valor.trim();
    if (!term || term.length < 4) {
      setDefectoSeleccionado(null);
      setErrorDefecto(null);
      return null;
    }

    const num = parseInt(term, 10);
    if (isNaN(num) || num <= 0) {
      setDefectoSeleccionado(null);
      setErrorDefecto(null);
      return null;
    }

    // Buscar primero en el catálogo ya cargado para la etapa de la terminal
    const enCatalogoLocal = catalogoDefectos.find((d) => d.clave === num);
    if (enCatalogoLocal) {
      setDefectoSeleccionado(enCatalogoLocal);
      setErrorDefecto(null);
      return enCatalogoLocal;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const resLocal = await catalogoOfflineService.consultarDefectosLocales({
        clave: num,
        etapaId: departamentoAuditor?.id,
        activo: true,
        limit: 1,
      });
      if (resLocal.items.length > 0) {
        setDefectoSeleccionado(resLocal.items[0]);
        setErrorDefecto(null);
        return resLocal.items[0];
      } else {
        setDefectoSeleccionado(null);
        setErrorDefecto(
          catalogoDefectos.length === 0
            ? 'Sin conexión al servidor y no hay catálogo de defectos guardado en este equipo.'
            : `Defecto #${num} no encontrado o no permitido en esta etapa`,
        );
        return null;
      }
    }

    setBuscandoDefecto(true);
    setErrorDefecto(null);

    try {
      const resp = await defectosApi.getDefectos({
        clave: num,
        etapaId: departamentoAuditor?.id,
        activo: true,
        limit: 1,
      });

      if (resp.items && resp.items.length > 0) {
        const d = resp.items[0];
        setDefectoSeleccionado(d);
        setErrorDefecto(null);
        return d;
      } else {
        setDefectoSeleccionado(null);
        setErrorDefecto(`Defecto #${num} no encontrado en esta etapa`);
        return null;
      }
    } catch {
      const resLocal = await catalogoOfflineService.consultarDefectosLocales({
        clave: num,
        etapaId: departamentoAuditor?.id,
        activo: true,
        limit: 1,
      });
      if (resLocal.items.length > 0) {
        setDefectoSeleccionado(resLocal.items[0]);
        setErrorDefecto(null);
        return resLocal.items[0];
      } else {
        setDefectoSeleccionado(null);
        setErrorDefecto('Sin conexión para consultar el defecto y no se encontró en este equipo.');
        return null;
      }
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
      void handleBuscarDefecto(term);
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

  const handleAgregarDefecto = (defectoPersonalizado?: Defecto) => {
    const defectoAUsar = defectoPersonalizado || defectoSeleccionado;

    if (!loteActivo) {
      setErrorDefecto('Primero ingrese un lote válido');
      return;
    }

    if (!defectoAUsar) {
      setErrorDefecto('Seleccione o ingrese un defecto válido');
      return;
    }

    const deptoId =
      defectoAUsar.departamento?.id ||
      defectoAUsar.departamentoId ||
      (departamentoAuditor ? departamentoAuditor.id : departamentos[0]?.id || 1);
    const deptoNom =
      defectoAUsar.departamento?.nombre ||
      (departamentoAuditor ? departamentoAuditor.nombre : departamentos[0]?.nombre || 'GENERAL');

    setDefectosCapturados((prev) => {
      // Regla de acumulación MBC: si ya existe el mismo defecto capturado antes de guardar, acumular pares
      const indexExistente = prev.findIndex((d) => d.defectoId === defectoAUsar.id);

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
        defectoId: defectoAUsar.id,
        clave: defectoAUsar.clave,
        defecto: defectoAUsar.defecto,
        clasificacion: defectoAUsar.clasificacion,
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

    // Si se agregó con éxito el defecto, cerrar el teclado numérico de clave
    setTecladoTarget((prev) => (prev === 'clave' ? null : prev));

    setTimeout(() => {
      claveInputRef.current?.focus();
    }, 50);
  };

  const handleEliminarItem = (idTemporal: string) => {
    setDefectosCapturados((prev) => prev.filter((d) => d.idTemporal !== idTemporal));
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

    // Si el departamento tiene múltiples líneas (ej. Montado con 2), se envía la seleccionada (L1, L2, L3...)
    // Si solo tiene 1 línea (ej. Corte con 1), se envía por defecto "L1"
    const sublineaEfectiva = tieneMultiplesLineas ? (lineaCodigo || 'L1') : 'L1';

    const payloadCaptura = {
      lote: loteActivo.lote,
      lineaId: null,
      lineaTexto: sublineaEfectiva,
      horma: loteActivo.horma,
      detalles: defectosCapturados.map((d) => ({
        defectoId: d.defectoId,
        defectoClave: d.clave,
        defectoNombre: d.defecto,
        clasificacion: d.clasificacion,
        defDeptoId: d.departamentoResponsableId,
        defDeptoNombre: d.departamentoResponsableNombre,
        paresDefectuosos: d.pares,
      })),
    };

    const guardarEnColaOffline = async () => {
      if (!user) {
        throw new Error('No hay sesión de inspector activa para encolar la captura.');
      }

      const itemCola = await inspeccionesOfflineService.encolarCaptura({
        payload: payloadCaptura,
        inspector: {
          id: user.id,
          usuario: user.usuario,
          nombre: user.nombre,
        },
        esContingencia: false,
        motivoContingencia: null,
        idLocalClienteOpcional: claveIdempotenciaRef.current,
      });

      claveIdempotenciaRef.current = nuevaClaveIdempotencia();

      const idsLocales = itemCola.payload.detalles.map((_, idx) =>
        computeLocalRowId(itemCola.idLocalCliente, idx),
      );

      toast.info(
        'La captura se guardó en este equipo y se enviará al recuperar la conexión.',
        { title: 'Sin conexión' },
      );

      eliminarBorradorDeStorage(departamentoAuditor?.id);
      setLoteInput('');
      setLoteActivo(null);
      setDefectosCapturados([]);
      onSuccess(idsLocales);
      onClose();
    };

    try {
      const estaOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

      if (estaOffline) {
        await guardarEnColaOffline();
        return;
      }

      const res = await inspeccionesApi.createInspeccion(
        payloadCaptura,
        claveIdempotenciaRef.current,
      );

      // Captura confirmada: la siguiente inspección usará una clave nueva
      claveIdempotenciaRef.current = nuevaClaveIdempotencia();

      const nuevosIds: number[] = Array.isArray(res?.detalles)
        ? res.detalles.map((d: any) => d.id)
        : [];

      toast.success(
        `Se registraron ${defectosCapturados.length} defectos del lote ${loteActivo.lote} exitosamente.`,
        { title: 'Inspección Guardada' },
      );

      eliminarBorradorDeStorage(departamentoAuditor?.id);
      setLoteInput('');
      setLoteActivo(null);
      setDefectosCapturados([]);
      onSuccess(nuevosIds);
      onClose();
    } catch (err: any) {
      // Si el fallo es de red o un error 5xx del servidor, encolar en IndexedDB sin perder el trabajo del inspector
      const esErrorDeClienteValidacion =
        err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;

      if (!esErrorDeClienteValidacion && user) {
        try {
          await guardarEnColaOffline();
          return;
        } catch (offlineErr: any) {
          const msgUsuario =
            'No se pudo guardar la captura en este equipo. Verifique su sesión o intente nuevamente.';
          const detalle =
            offlineErr instanceof Error &&
            !offlineErr.message.toLowerCase().includes('indexeddb')
              ? offlineErr.message
              : msgUsuario;
          setErrorGuardado(detalle);
          toast.error(msgUsuario, { title: 'La captura no se guardó' });
          return;
        }
      }

      const msg = err?.message || 'Error al guardar la inspección en el servidor';
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCerrarDirecto}
        size="screen"
        className="w-full h-[96vh] max-h-[96vh] border-border shadow-2xl bg-app-surface"
      >
        <ModalHeader
          title={`Captura de Defectos — ${departamentoAuditor?.nombre || 'Calidad'}`}
          onClose={handleCerrarDirecto}
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
                  onAbrirTeclado={() =>
                    setTecladoTarget((prev) => (prev === 'lote' ? null : 'lote'))
                  }
                  tecladoActivo={tecladoTarget === 'lote'}
                  onLimpiarLote={handleLimpiarLote}
                />

                {/* FICHA TÉCNICA DEL LOTE: LOTE | LISTA | MODELO | PARES | HORMA | CLIENTE */}
                <CapturaLoteFicha lote={loteActivo} error={errorLote} cargando={cargandoLote} />
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
              {avisoCatalogoOffline && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 flex items-center gap-2 shrink-0">
                  <Icon name="wifi_off" size="16px" className="text-amber-600 shrink-0" />
                  <span>{avisoCatalogoOffline}</span>
                </div>
              )}

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
                onAbrirTeclado={() =>
                  setTecladoTarget((prev) => (prev === 'clave' ? null : 'clave'))
                }
                tecladoActivo={tecladoTarget === 'clave'}
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
            {loteActivo ? `` : 'Ingrese un lote de producción para habilitar el registro'}
          </span>

          <div className="flex items-center gap-6">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleCerrarDirecto}
              disabled={guardando}
              className="cursor-pointer font-medium px-5 border-border hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              variant="guardar"
              size="md"
              onClick={handleGuardarInspeccion}
              disabled={guardando || !loteActivo || defectosCapturados.length === 0}
              className="px-7 font-bold uppercase tracking-wider text-xs gap-2 cursor-pointer shadow-sm touch-manipulation"
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

        {/* TECLADO NUMÉRICO FLOTANTE Y ARRASTRABLE PARA PANTALLAS TÁCTILES */}
        <FloatingNumpad
          isOpen={Boolean(tecladoTarget)}
          onClose={() => setTecladoTarget(null)}
          anchorElement={tecladoTarget === 'lote' ? loteInputRef.current : claveInputRef.current}
          preferredSide={tecladoTarget === 'clave' ? 'left' : 'right'}
          title={tecladoTarget === 'lote' ? 'Número de Lote' : 'Clave de Defecto'}
          targetInputName={
            tecladoTarget === 'lote'
              ? `Lote: ${loteInput || '—'}`
              : `Clave: ${claveDefecto || '—'}`
          }
          submitLabel={tecladoTarget === 'lote' ? 'Buscar Lote' : 'Agregar Defecto'}
          onDigit={(digito) => {
            if (tecladoTarget === 'lote') {
              if (loteInput.length < 10) {
                setLoteInput(loteInput + digito);
                setErrorLote(null);
              }
            } else if (tecladoTarget === 'clave') {
              if (claveDefecto.length < 6) {
                setClaveDefecto(claveDefecto + digito);
                setErrorDefecto(null);
              }
            }
          }}
          onBackspace={() => {
            if (tecladoTarget === 'lote') {
              const nuevo = loteInput.slice(0, -1);
              setLoteInput(nuevo);
              if (!nuevo.trim()) {
                handleLimpiarLote();
              }
            } else if (tecladoTarget === 'clave') {
              setClaveDefecto(claveDefecto.slice(0, -1));
            }
          }}
          onClear={() => {
            if (tecladoTarget === 'lote') {
              handleLimpiarLote();
            } else if (tecladoTarget === 'clave') {
              setClaveDefecto('');
            }
          }}
          onSubmit={async () => {
            if (tecladoTarget === 'lote') {
              handleBuscarLote();
            } else if (tecladoTarget === 'clave') {
              if (defectoSeleccionado) {
                handleAgregarDefecto(defectoSeleccionado);
              } else {
                const encontrado = await handleBuscarDefecto(claveDefecto);
                if (encontrado) {
                  handleAgregarDefecto(encontrado);
                }
              }
            }
          }}
        />
      </Modal>
    </>
  );
}
