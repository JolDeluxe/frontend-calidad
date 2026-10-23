import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';
import { defectosApi } from '@/features/defectos/api/defectos-api';
import { inspeccionesApi } from '../api/inspecciones-api';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';
import type { LineaOperativa, ProduccionLote } from '../types/inspecciones.types';
import type { Defecto } from '@/features/defectos/types/defectos.types';
import { useAuthSession } from '@/providers/auth-provider';

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
  onSuccess: () => void;
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
  }, [isOpen, departamentoAuditor]);

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
    const num = parseInt(valor.trim(), 10);
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

  // Debounce automático al escribir la clave de defecto
  useEffect(() => {
    if (!isOpen) return;

    const term = claveDefecto.trim();
    if (!term) {
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
      return;
    }

    if (!defectoSeleccionado) {
      setErrorDefecto('Seleccione o ingrese un defecto válido');
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

    try {
      const lineaObj = lineas.find((l) => l.codigo === lineaCodigo || l.nombre === lineaCodigo);

      await inspeccionesApi.createInspeccion({
        lote: loteActivo.lote,
        lineaId: lineaObj?.id || null,
        departamentoAuditoriaId: departamentoAuditor?.id,
        horma: loteActivo.horma,
        detalles: defectosCapturados.map((d) => ({
          defectoId: d.defectoId,
          defDeptoId: d.departamentoResponsableId,
          paresDefectuosos: d.pares,
        })),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorGuardado(err.message || 'Error al guardar la inspección en el servidor');
    } finally {
      setGuardando(false);
    }
  };

  const getClasificacionVariant = (c: 'CRITICO' | 'MAYOR' | 'MENOR') => {
    switch (c) {
      case 'CRITICO':
        return 'rose';
      case 'MAYOR':
        return 'amber';
      case 'MENOR':
        return 'sky';
      default:
        return 'zinc';
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

      <ModalBody className="p-6 flex-1 min-h-0 flex flex-col bg-app-surface overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0">
          
          {/* LADO IZQUIERDO (COLUMNA 5 DE 12): FICHA TÉCNICA DEL LOTE */}
          <div className="lg:col-span-5 flex flex-col justify-between self-stretch bg-app-surface-muted/40 rounded-xl border border-border p-5 space-y-4">
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              
              {/* Fecha de Registro y Número de Lote con Línea Arribo */}
              <div className="flex items-center justify-between border-b border-border-subtle pb-3 shrink-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Fecha de Registro
                </span>
                <span className="text-sm font-bold text-text-primary font-mono">
                  {fechaTexto}
                </span>
              </div>

              {/* LOTE + LÍNEA ARRIBO EN LA MISMA FILA */}
              <div className="shrink-0">
                <div className="grid grid-cols-12 gap-2.5 items-end">
                  <div className="col-span-8 sm:col-span-9">
                    <Label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-text-primary">
                      Número de Lote *
                    </Label>
                    <div className="relative">
                      <Input
                        ref={loteInputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={loteInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setLoteInput(val);
                          setErrorLote(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleBuscarLote();
                          }
                        }}
                        disabled={guardando}
                        className="h-11 font-mono font-bold text-base text-brand-primary tracking-wider pr-8"
                      />
                      {cargandoLote && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary">
                          <Spinner size="16px" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-4 sm:col-span-3">
                    <Label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5 truncate">
                      Línea
                    </Label>
                    <Select
                      value={lineaCodigo}
                      onChange={(e) => setLineaCodigo(e.target.value)}
                      disabled={guardando}
                      className="h-11 text-xs font-bold text-center font-mono"
                    >
                      <option value="L1">L1</option>
                      <option value="L2">L2</option>
                    </Select>
                  </div>
                </div>
              </div>

              {/* FICHA TÉCNICA DINÁMICA DEL LOTE: EXPANSIBLE */}
              {loteActivo ? (
                <div className="rounded-xl border border-border bg-app-surface p-5 space-y-4 shadow-2xs flex-1 flex flex-col justify-between">
                  <div className="grid grid-cols-2 gap-4 border-b border-border-subtle pb-4">
                    <div>
                      <span className="block text-[11px] font-semibold uppercase text-text-secondary mb-1">
                        Lista / Folio
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight font-mono">
                        {loteActivo.lista}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[11px] font-semibold uppercase text-text-secondary mb-1">
                        Total Pares Lote
                      </span>
                      <span className="text-3xl sm:text-4xl font-black text-brand-primary tracking-tight">
                        {Math.floor(loteActivo.cantidad)}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center py-2">
                    <span className="block text-[11px] font-semibold uppercase text-text-secondary mb-1">
                      Modelo
                    </span>
                    <span className="text-2xl font-black text-brand-primary tracking-tight block">
                      {loteActivo.modelo}
                    </span>
                    {loteActivo.descripcion && (
                      <span className="text-sm text-text-secondary font-medium block mt-1.5 leading-relaxed">
                        {loteActivo.descripcion}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-subtle">
                    <div className="bg-app-surface-muted/60 p-3 rounded-lg border border-border-subtle">
                      <span className="text-text-muted block text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        Horma
                      </span>
                      <span className="font-mono font-bold text-base text-text-primary block">
                        {loteActivo.horma || 'N/A'}
                      </span>
                    </div>

                    <div className="bg-app-surface-muted/60 p-3 rounded-lg border border-border-subtle">
                      <span className="text-text-muted block text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        Cliente
                      </span>
                      <span className="font-bold text-base text-brand-primary truncate block" title={loteActivo.cliente}>
                        {loteActivo.cliente}
                      </span>
                    </div>
                  </div>
                </div>
              ) : errorLote ? (
                <div className="rounded-xl border border-amber-300/60 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-8 text-center text-text-muted flex-1 flex flex-col items-center justify-center">
                  <Icon name="search_off" size="44px" className="mx-auto mb-3 text-amber-700 dark:text-amber-400 opacity-90" />
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {errorLote}
                  </p>
                  <p className="text-xs mt-1.5 text-text-secondary max-w-xs">
                    Verifique que el número de lote sea correcto y corresponda a producción activa.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-8 text-center text-text-muted bg-app-surface flex-1 flex flex-col items-center justify-center">
                  <Icon name="inventory_2" size="44px" className="mx-auto mb-3 opacity-30 text-brand-primary" />
                  <p className="text-sm font-bold text-text-primary">Ingrese un lote de producción</p>
                  <p className="text-xs mt-1 text-text-secondary max-w-xs">
                    Se validarán lista, modelo y pares autorizados para la inspección.
                  </p>
                </div>
              )}
            </div>

            {/* SELLO DE AUDITORÍA */}
            <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-text-muted opacity-60 shrink-0">
              <span className="text-[11px] font-medium uppercase tracking-wider">
                {deptoNombre}
              </span>
              <span className="text-[11px] font-mono">
                {inspectorNombre}
              </span>
            </div>
          </div>

          {/* LADO DERECHO (COLUMNA 7 DE 12): CAPTURA Y LISTA DE DEFECTOS */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-app-surface rounded-xl border border-border p-5 space-y-4">
            
            {/* Formulario Compacto Superior: CLAVE DEFECTO | DESCRIPCION | PARES | [+] */}
            <div className={cn(
              "p-3.5 rounded-xl border space-y-2 transition-all",
              loteActivo
                ? "bg-app-surface-muted/50 border-border"
                : "bg-app-surface-muted/20 border-border-subtle opacity-50 pointer-events-none select-none"
            )}>
              <div className="grid grid-cols-12 gap-2.5 items-end">
                
                {/* 1. CLAVE DEFECTO */}
                <div className="col-span-3 sm:col-span-2">
                  <Label className="block text-[11px] font-bold uppercase mb-1 text-text-secondary truncate">
                    Clave *
                  </Label>
                  <div className="relative">
                    <Input
                      ref={claveInputRef}
                      type="text"
                      value={claveDefecto}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setClaveDefecto(val);
                        setErrorDefecto(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBuscarDefecto(claveDefecto);
                        }
                      }}
                      disabled={guardando || !loteActivo}
                      placeholder={!loteActivo ? "—" : ""}
                      className="h-11 text-xs font-mono font-bold text-center pr-6"
                    />
                    {buscandoDefecto && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 text-brand-primary">
                        <Spinner size="12px" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. DESCRIPCION CON BARRA DE BUSQUEDA INCORPORADA */}
                <div className="col-span-9 sm:col-span-5 relative" ref={selectorRef}>
                  <Label className="block text-[11px] font-bold uppercase mb-1 text-text-secondary truncate">
                    Descripción Defecto *
                  </Label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={guardando || !loteActivo}
                      onClick={() => setSelectorAbierto((prev) => !prev)}
                      className="w-full h-11 px-3 text-left border border-border rounded-lg bg-app-surface flex items-center justify-between text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="truncate">
                        {!loteActivo
                          ? '-- Ingrese lote primero --'
                          : defectoSeleccionado
                          ? `[${defectoSeleccionado.clave}] ${defectoSeleccionado.defecto}`
                          : '-- Seleccionar defecto --'}
                      </span>
                      <Icon name="arrow_drop_down" size="20px" className="shrink-0 text-text-muted" />
                    </button>

                    {/* Popover de búsqueda rápida de defectos */}
                    {selectorAbierto && loteActivo && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-app-surface border border-border rounded-xl shadow-xl z-50 p-2 flex flex-col max-h-72">
                        <div className="relative mb-2 shrink-0">
                          <Icon name="search" size="16px" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type="text"
                            placeholder="Buscar defecto o clave..."
                            value={filtroTextoDefecto}
                            onChange={(e) => setFiltroTextoDefecto(e.target.value)}
                            autoFocus
                            className="w-full h-9 pl-8 pr-2 text-xs border border-border rounded-md bg-app-surface-muted/60 text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-border-subtle custom-scrollbar">
                          {catalogoDefectos
                            .filter((d) => {
                              if (!filtroTextoDefecto.trim()) return true;
                              const q = filtroTextoDefecto.toLowerCase();
                              return (
                                String(d.clave).includes(q) ||
                                d.defecto.toLowerCase().includes(q)
                              );
                            })
                            .map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setDefectoSeleccionado(d);
                                  setClaveDefecto(String(d.clave));
                                  setSelectorAbierto(false);
                                  setFiltroTextoDefecto('');
                                  setErrorDefecto(null);
                                }}
                                className={`w-full p-2 text-left hover:bg-app-surface-muted flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                                  defectoSeleccionado?.id === d.id ? 'bg-brand-primary/10 font-bold text-brand-primary' : ''
                                }`}
                              >
                                <span className="truncate">
                                  <strong className="font-mono text-brand-primary mr-1.5">[{d.clave}]</strong>
                                  {d.defecto}
                                </span>
                                <span className="text-[10px] uppercase font-bold text-text-muted shrink-0">
                                  {d.clasificacion}
                                </span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. PARES CON BOTONES TOUCH PROMINENTES [-] [número] [+] */}
                <div className="col-span-8 sm:col-span-3">
                  <Label className="block text-[11px] font-bold uppercase mb-1 text-text-secondary truncate">
                    Pares *
                  </Label>
                  <div className="flex items-center h-11 border border-border rounded-lg bg-app-surface overflow-hidden shadow-2xs p-0.5 gap-1">
                    <button
                      type="button"
                      onClick={() => handleModificarPares(-1)}
                      disabled={guardando || !loteActivo || paresDefecto <= 1}
                      className="flex-1 h-full flex items-center justify-center bg-app-surface-muted hover:bg-border/90 text-text-primary rounded-md font-black active:scale-90 disabled:opacity-20 transition-all touch-manipulation cursor-pointer select-none border border-border/60"
                      title="Disminuir un par"
                    >
                      <Icon name="remove" size="22px" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={paresDefecto}
                      onChange={(e) => handleParesDirecto(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAgregarDefecto();
                        }
                      }}
                      disabled={guardando || !loteActivo}
                      className="w-12 h-full text-center font-black text-base text-brand-primary focus:outline-none bg-transparent shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => handleModificarPares(1)}
                      disabled={guardando || !loteActivo || paresDefecto >= maxParesPermitido}
                      className="flex-1 h-full flex items-center justify-center bg-app-surface-muted hover:bg-border/90 text-text-primary rounded-md font-black active:scale-90 disabled:opacity-20 transition-all touch-manipulation cursor-pointer select-none border border-border/60"
                      title="Aumentar un par"
                    >
                      <Icon name="add" size="22px" />
                    </button>
                  </div>
                </div>

                {/* 4. BOTÓN AGREGAR VERDE CON ICONO GRANDE [+] */}
                <div className="col-span-4 sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAgregarDefecto}
                    disabled={guardando || !defectoSeleccionado || !loteActivo}
                    className="w-full h-11 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg shadow-sm font-bold text-2xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                    title="Agregar defecto a la inspección"
                  >
                    +
                  </button>
                </div>
              </div>

              {errorDefecto && (
                <p className="text-xs font-semibold text-danger flex items-center gap-1 pt-1">
                  <Icon name="error" size="14px" />
                  <span>{errorDefecto}</span>
                </p>
              )}
            </div>

            {/* TABLA DE DEFECTOS: PRIORIDAD VISUAL DEFECTOS (N) */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle shrink-0">
                <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                  DEFECTOS ({defectosCapturados.length})
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-text-primary">
                  Total Pares Falla ({totalParesFalla})
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar border border-border rounded-xl bg-app-surface">
                {defectosCapturados.length === 0 ? (
                  <div className="py-16 px-4 text-center text-text-muted">
                    <Icon name="playlist_add_check" size="40px" className="mx-auto mb-2 opacity-40 text-brand-primary" />
                    <p className="text-xs font-semibold text-text-secondary">Sin defectos registrados</p>
                    <p className="text-[11px] mt-0.5 text-text-muted">
                      Capture clave o seleccione defecto arriba y presione [+]
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-app-surface-muted border-b border-border text-[11px] font-bold text-text-secondary uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-16 text-center">Clave</th>
                        <th className="py-2.5 px-3">Defecto</th>
                        <th className="py-2.5 px-3 w-28 text-center">Clasificación</th>
                        <th className="py-2.5 px-3 w-16 text-center">Pares</th>
                        <th className="py-2.5 px-3 w-20 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {defectosCapturados.map((item) => (
                        <tr key={item.idTemporal} className="hover:bg-app-surface-muted/50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {item.clave}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-text-primary">
                            {item.defecto}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <StatusBadge
                              label={item.clasificacion}
                              variant={getClasificacionVariant(item.clasificacion)}
                              showIcon={false}
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                            {item.pares}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  // Cargar en el formulario para editarlo
                                  setClaveDefecto(String(item.clave));
                                  const def = catalogoDefectos.find((d) => d.id === item.defectoId);
                                  if (def) setDefectoSeleccionado(def);
                                  setParesDefecto(item.pares);
                                  handleEliminarItem(item.idTemporal);
                                }}
                                disabled={guardando}
                                className="p-1 rounded text-text-secondary hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer touch-manipulation transition-colors"
                                title="Editar defecto"
                              >
                                <Icon name="edit" size="16px" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarItem(item.idTemporal)}
                                disabled={guardando}
                                className="p-1 rounded text-danger hover:bg-danger/10 cursor-pointer touch-manipulation transition-colors"
                                title="Remover defecto"
                              >
                                <Icon name="delete" size="16px" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

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
            ? `Lote #${loteActivo.lote} (${loteActivo.modelo}) — ${defectosCapturados.length} defecto(s) acumulado(s)`
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
                <span>Guardar Inspección</span>
              </>
            )}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
