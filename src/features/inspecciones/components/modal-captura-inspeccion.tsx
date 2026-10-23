import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';
import { defectosApi } from '@/features/defectos/api/defectos-api';
import { inspeccionesApi } from '../api/inspecciones-api';
import type { Defecto } from '@/features/defectos/types/defectos.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';
import type { LineaOperativa, ProduccionLote, DefectoItemStaging } from '../types/inspecciones.types';

interface ModalCapturaInspeccionProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  departamentoAuditor: Departamento | null;
  lineas: LineaOperativa[];
  departamentos: Departamento[];
}

export function ModalCapturaInspeccion({
  isOpen,
  onClose,
  onSuccess,
  departamentoAuditor,
  lineas,
  departamentos,
}: ModalCapturaInspeccionProps) {
  // LADO IZQUIERDO: Lote y Datos de Producción
  const [loteInput, setLoteInput] = useState('');
  const [cargandoLote, setCargandoLote] = useState(false);
  const [errorLote, setErrorLote] = useState<string | null>(null);
  const [loteActivo, setLoteActivo] = useState<ProduccionLote | null>(null);

  const [lineaId, setLineaId] = useState<number | ''>('');
  const [hormaManual, setHormaManual] = useState('');
  const [notasGenerales, setNotasGenerales] = useState('');

  // LADO DERECHO: Defectos e Items
  const [claveDefectoInput, setClaveDefectoInput] = useState('');
  const [buscandoDefecto, setBuscandoDefecto] = useState(false);
  const [errorDefecto, setErrorDefecto] = useState<string | null>(null);
  const [defectoSeleccionado, setDefectoSeleccionado] = useState<Defecto | null>(null);
  const [deptoResponsableId, setDeptoResponsableId] = useState<number | ''>('');
  const [paresDefecto, setParesDefecto] = useState<number>(1);
  const [observacionDefecto, setObservacionDefecto] = useState('');

  // Staging de defectos
  const [defectosLista, setDefectosLista] = useState<DefectoItemStaging[]>([]);

  // Guardado
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null);

  // Inicializaciones al abrir modal
  useEffect(() => {
    if (isOpen) {
      setLoteInput('');
      setLoteActivo(null);
      setErrorLote(null);
      setLineaId(lineas.length > 0 ? lineas[0].id : '');
      setHormaManual('');
      setNotasGenerales('');
      setClaveDefectoInput('');
      setDefectoSeleccionado(null);
      setErrorDefecto(null);
      setParesDefecto(1);
      setObservacionDefecto('');
      setDefectosLista([]);
      setErrorGuardado(null);
      if (departamentoAuditor) {
        setDeptoResponsableId(departamentoAuditor.id);
      }
    }
  }, [isOpen, departamentoAuditor, lineas]);

  if (!isOpen) return null;

  // Límite de pares permitido: el total del lote si ya se encontró
  const maxParesPermitido = loteActivo ? Math.max(1, Math.floor(loteActivo.cantidad)) : 9999;

  const handleBuscarLote = async () => {
    const cod = loteInput.trim();
    if (!cod) {
      setErrorLote('Ingrese el número de lote');
      return;
    }

    setCargandoLote(true);
    setErrorLote(null);

    try {
      const lote = await inspeccionesApi.getLoteByCodigo(cod);
      setLoteActivo(lote);
      setHormaManual(lote.horma || '');
      setParesDefecto(1);
    } catch (err: any) {
      setLoteActivo(null);
      setErrorLote(err.message || `No se encontró el lote '${cod}'`);
    } finally {
      setCargandoLote(false);
    }
  };

  const handleBuscarDefectoPorClave = async () => {
    const claveNum = parseInt(claveDefectoInput.trim(), 10);
    if (isNaN(claveNum) || claveNum <= 0) {
      setErrorDefecto('Ingrese una clave de defecto numérica (ej. 1508, 1101)');
      return;
    }

    setBuscandoDefecto(true);
    setErrorDefecto(null);

    try {
      const resp = await defectosApi.getDefectos({
        clave: claveNum,
        activo: true,
        limit: 1,
      });

      if (resp.items && resp.items.length > 0) {
        const d = resp.items[0];
        setDefectoSeleccionado(d);
        if (d.departamentos && d.departamentos.length > 0) {
          setDeptoResponsableId(d.departamentos[0].departamento.id);
        } else if (departamentoAuditor) {
          setDeptoResponsableId(departamentoAuditor.id);
        }
      } else {
        setDefectoSeleccionado(null);
        setErrorDefecto(`Defecto #${claveNum} no encontrado en catálogo`);
      }
    } catch (err: any) {
      setErrorDefecto(err.message || 'Error al buscar defecto');
      setDefectoSeleccionado(null);
    } finally {
      setBuscandoDefecto(false);
    }
  };

  const handleParesChange = (valor: string) => {
    const limpio = valor.replace(/\D/g, '');
    let num = parseInt(limpio, 10);
    if (isNaN(num) || num < 1) num = 1;
    if (num > maxParesPermitido) num = maxParesPermitido;
    setParesDefecto(num);
  };

  const incrementarPares = () => {
    setParesDefecto((prev) => Math.min(prev + 1, maxParesPermitido));
  };

  const decrementarPares = () => {
    setParesDefecto((prev) => Math.max(prev - 1, 1));
  };

  const handleAgregarDefecto = () => {
    if (!loteActivo) {
      setErrorDefecto('Primero debe ingresar y verificar un lote válido');
      return;
    }

    if (!defectoSeleccionado) {
      setErrorDefecto('Seleccione un defecto válido');
      return;
    }

    if (!deptoResponsableId) {
      setErrorDefecto('Seleccione el departamento responsable');
      return;
    }

    const deptoObj = departamentos.find((d) => d.id === Number(deptoResponsableId));
    const deptoNombre = deptoObj ? deptoObj.nombre : `Depto #${deptoResponsableId}`;

    const nuevoItem: DefectoItemStaging = {
      idTemporal: `def-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      defectoId: defectoSeleccionado.id,
      clave: defectoSeleccionado.clave,
      defecto: defectoSeleccionado.defecto,
      clasificacion: defectoSeleccionado.clasificacion,
      departamentoResponsableId: Number(deptoResponsableId),
      departamentoResponsableNombre: deptoNombre,
      paresDefectuosos: paresDefecto,
      notas: observacionDefecto.trim() || undefined,
    };

    setDefectosLista((prev) => [...prev, nuevoItem]);

    // Reset formulario de defecto para agregar el siguiente rápidamente
    setClaveDefectoInput('');
    setDefectoSeleccionado(null);
    setParesDefecto(1);
    setObservacionDefecto('');
    setErrorDefecto(null);
  };

  const handleEliminarItem = (idTemporal: string) => {
    setDefectosLista((prev) => prev.filter((item) => item.idTemporal !== idTemporal));
  };

  const handleGuardarInspeccionCompleta = async () => {
    if (!loteActivo) {
      setErrorGuardado('Debe tener un lote válido cargado');
      return;
    }

    if (defectosLista.length === 0) {
      setErrorGuardado('Debe agregar al menos un defecto antes de guardar la inspección');
      return;
    }

    setGuardando(true);
    setErrorGuardado(null);

    try {
      await inspeccionesApi.createInspeccion({
        lote: loteActivo.lote,
        lineaId: lineaId ? Number(lineaId) : null,
        departamentoAuditoriaId: departamentoAuditor?.id,
        horma: hormaManual.trim() || loteActivo.horma,
        notas: notasGenerales.trim() || null,
        detalles: defectosLista.map((d) => ({
          defectoId: d.defectoId,
          defDeptoId: d.departamentoResponsableId,
          paresDefectuosos: d.paresDefectuosos,
          notas: d.notas,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[96vh] bg-white rounded-lg shadow-2xl border border-cuadra-arena-dark overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* ENCABEZADO DEL MODAL */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-marca-primario text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-sm">
              <Icon name="assignment_add" size="22px" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight">
                Captura de Defectos — {departamentoAuditor?.nombre || 'Calidad'}
              </h2>
              <p className="text-[11px] text-white/80">
                Registro oficial de inspección para estación operativa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            className="p-1 rounded-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <Icon name="close" size="22px" />
          </button>
        </div>

        {/* CUERPO DEL MODAL (DOS COLUMNAS GRANDES ADAPTADAS A PANTALLA TOUCH) */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-cuadra-arena overflow-hidden">
          
          {/* LADO IZQUIERDO (COLUMNA 5 DE 12): DATOS DE LOTE Y PRODUCCIÓN */}
          <div className="lg:col-span-5 p-4 sm:p-5 flex flex-col gap-3.5 bg-cuadra-arena/10 overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 border-b border-cuadra-arena pb-2">
              <Icon name="info" size="18px" className="text-marca-primario" />
              <span className="text-xs font-bold uppercase tracking-wider text-marca-primario">
                1. Datos del Lote de Producción
              </span>
            </div>

            {/* Input Lote */}
            <div>
              <label className="block text-xs font-bold uppercase text-app-text mb-1">
                Lote *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. 36296, 65282..."
                  value={loteInput}
                  onChange={(e) => {
                    setLoteInput(e.target.value);
                    setErrorLote(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBuscarLote();
                    }
                  }}
                  disabled={cargandoLote || guardando}
                  className="flex-1 h-12 px-3 text-base font-mono font-bold rounded border border-cuadra-arena-dark bg-white focus:outline-none focus:ring-2 focus:ring-marca-primario shadow-2xs"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleBuscarLote}
                  disabled={cargandoLote || guardando || !loteInput.trim()}
                  className="h-12 px-5 font-bold text-sm shrink-0 gap-1.5 touch-manipulation"
                >
                  {cargandoLote ? <Spinner size="18px" /> : <><Icon name="search" size="18px" /> <span>Buscar</span></>}
                </Button>
              </div>

              {errorLote && (
                <p className="mt-1.5 text-xs font-semibold text-red-600 flex items-center gap-1">
                  <Icon name="error" size="14px" />
                  <span>{errorLote}</span>
                </p>
              )}
            </div>

            {/* Ficha Destacada con Máxima Jerarquía (MODELO, LISTA, PARES) */}
            {loteActivo ? (
              <div className="rounded-lg border-2 border-marca-primario/30 bg-white p-3.5 shadow-xs space-y-3">
                <div className="grid grid-cols-3 gap-2 border-b border-cuadra-arena pb-2.5 text-center">
                  <div className="bg-cuadra-arena/30 rounded p-1.5">
                    <span className="block text-[10px] uppercase font-bold text-app-text-muted">Modelo</span>
                    <span className="text-base sm:text-lg font-black text-marca-primario leading-tight">
                      {loteActivo.modelo}
                    </span>
                  </div>

                  <div className="bg-cuadra-arena/30 rounded p-1.5">
                    <span className="block text-[10px] uppercase font-bold text-app-text-muted">Lista</span>
                    <span className="text-base sm:text-lg font-bold text-app-text leading-tight">
                      {loteActivo.lista}
                    </span>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded p-1.5">
                    <span className="block text-[10px] uppercase font-bold text-emerald-800">Total Pares</span>
                    <span className="text-base sm:text-lg font-black text-emerald-700 leading-tight">
                      {loteActivo.cantidad}
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="font-semibold text-app-text-muted">Cliente: </span>
                    <span className="font-bold text-app-text">{loteActivo.cliente}</span>
                  </div>
                  {loteActivo.descripcion && (
                    <div>
                      <span className="font-semibold text-app-text-muted">Descripción: </span>
                      <span className="text-app-text">{loteActivo.descripcion}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-semibold text-app-text-muted">Horma Sistema: </span>
                    <span className="font-bold text-marca-primario">{loteActivo.horma || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-cuadra-arena-dark/70 p-6 text-center text-app-text-muted bg-white/40">
                <Icon name="search_insights" size="32px" className="mx-auto mb-1 opacity-40 text-marca-primario" />
                <p className="text-xs font-semibold">Ingrese un lote para cargar los datos de producción</p>
                <p className="text-[11px] mt-0.5 opacity-75">Se validará el modelo, lista y cantidad de pares autorizados.</p>
              </div>
            )}

            {/* Campos Complementarios: Línea y Horma */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase text-app-text mb-1">
                  Línea
                </label>
                <Select
                  value={lineaId.toString()}
                  onChange={(e) => setLineaId(e.target.value ? Number(e.target.value) : '')}
                  disabled={guardando}
                  className="h-11 text-xs font-semibold"
                >
                  <option value="">L1 (Predeterminada)</option>
                  {lineas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-app-text mb-1">
                  Horma
                </label>
                <input
                  type="text"
                  placeholder="Ej. 94 EE"
                  value={hormaManual}
                  onChange={(e) => setHormaManual(e.target.value)}
                  disabled={guardando}
                  className="w-full h-11 px-3 text-xs font-bold rounded border border-cuadra-arena-dark bg-white focus:outline-none focus:ring-2 focus:ring-marca-primario"
                />
              </div>
            </div>

            {/* Observaciones generales */}
            <div>
              <label className="block text-xs font-bold uppercase text-app-text mb-1">
                Notas Generales (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Observaciones de la partida o lote..."
                value={notasGenerales}
                onChange={(e) => setNotasGenerales(e.target.value)}
                disabled={guardando}
                className="w-full p-2.5 text-xs rounded border border-cuadra-arena-dark bg-white focus:outline-none focus:ring-2 focus:ring-marca-primario resize-none"
              />
            </div>
          </div>

          {/* LADO DERECHO (COLUMNA 7 DE 12): CAPTURA DE DEFECTOS Y LISTA INFINITA CON SCROLL INDEPENDIENTE */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-white">
            
            {/* Formulario Superior para Capturar Defecto */}
            <div className="p-4 sm:p-5 border-b border-cuadra-arena bg-cuadra-arena/20 space-y-3 shrink-0">
              <div className="flex items-center justify-between border-b border-cuadra-arena/80 pb-2">
                <div className="flex items-center gap-2">
                  <Icon name="playlist_add" size="18px" className="text-marca-primario" />
                  <span className="text-xs font-bold uppercase tracking-wider text-marca-primario">
                    2. Registrar Defecto
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-app-text-muted">
                  Use teclado o botones táctiles
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Clave Defecto */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold uppercase text-app-text mb-1">
                    Clave Defecto *
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Ej. 1508..."
                      value={claveDefectoInput}
                      onChange={(e) => {
                        setClaveDefectoInput(e.target.value.replace(/\D/g, ''));
                        setErrorDefecto(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleBuscarDefectoPorClave();
                        }
                      }}
                      disabled={buscandoDefecto || guardando}
                      className="flex-1 h-11 px-3 text-sm font-mono font-bold rounded border border-cuadra-arena-dark bg-white focus:outline-none focus:ring-2 focus:ring-marca-primario"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleBuscarDefectoPorClave}
                      disabled={buscandoDefecto || guardando || !claveDefectoInput.trim()}
                      className="h-11 px-3 touch-manipulation"
                      title="Buscar clave"
                    >
                      {buscandoDefecto ? <Spinner size="14px" /> : <Icon name="search" size="18px" />}
                    </Button>
                  </div>
                </div>

                {/* Defecto Detectado */}
                <div className="sm:col-span-8">
                  <label className="block text-xs font-bold uppercase text-app-text mb-1">
                    Descripción del Defecto
                  </label>
                  <div className="h-11 px-3 rounded border border-cuadra-arena-dark bg-white flex items-center justify-between gap-2 text-xs">
                    {defectoSeleccionado ? (
                      <>
                        <span className="font-bold text-marca-primario truncate" title={defectoSeleccionado.defecto}>
                          [{defectoSeleccionado.clave}] {defectoSeleccionado.defecto}
                        </span>
                        <StatusBadge
                          label={defectoSeleccionado.clasificacion}
                          variant={
                            defectoSeleccionado.clasificacion === 'CRITICO'
                              ? 'rose'
                              : defectoSeleccionado.clasificacion === 'MAYOR'
                              ? 'amber'
                              : 'sky'
                          }
                          showIcon={false}
                        />
                      </>
                    ) : (
                      <span className="text-app-text-muted italic">Ingrese la clave de defecto</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fila Secundaria: Depto Responsable, Selector de Pares con Mas/Menos, y Botón Agregar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Depto Responsable */}
                <div className="sm:col-span-5">
                  <label className="block text-xs font-bold uppercase text-app-text mb-1">
                    Depto. Responsable *
                  </label>
                  <Select
                    value={deptoResponsableId.toString()}
                    onChange={(e) => setDeptoResponsableId(Number(e.target.value))}
                    disabled={guardando}
                    className="h-11 text-xs font-semibold"
                  >
                    {departamentos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Cantidad de Pares (Botón Menos, Input Numérico, Botón Más) */}
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold uppercase text-app-text mb-1">
                    Pares con Falla *
                  </label>
                  <div className="flex items-center h-11 border border-cuadra-arena-dark rounded bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={decrementarPares}
                      disabled={guardando || paresDefecto <= 1}
                      className="w-10 h-full flex items-center justify-center bg-cuadra-arena/30 hover:bg-cuadra-arena text-marca-primario font-bold active:bg-cuadra-arena-dark disabled:opacity-40 transition-colors touch-manipulation cursor-pointer select-none"
                      title="Disminuir un par"
                    >
                      <Icon name="remove" size="18px" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={paresDefecto}
                      onChange={(e) => handleParesChange(e.target.value)}
                      disabled={guardando}
                      className="w-full h-full text-center font-bold text-sm text-marca-primario focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={incrementarPares}
                      disabled={guardando || paresDefecto >= maxParesPermitido}
                      className="w-10 h-full flex items-center justify-center bg-cuadra-arena/30 hover:bg-cuadra-arena text-marca-primario font-bold active:bg-cuadra-arena-dark disabled:opacity-40 transition-colors touch-manipulation cursor-pointer select-none"
                      title="Aumentar un par"
                    >
                      <Icon name="add" size="18px" />
                    </button>
                  </div>
                </div>

                {/* Botón Agregar a Lista */}
                <div className="sm:col-span-3">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleAgregarDefecto}
                    disabled={guardando || !defectoSeleccionado || !loteActivo}
                    className="w-full h-11 justify-center gap-1.5 font-bold text-xs uppercase tracking-wide touch-manipulation"
                  >
                    <Icon name="add_circle" size="18px" />
                    <span>Agregar</span>
                  </Button>
                </div>
              </div>

              {/* Observación breve de la falla */}
              <div>
                <input
                  type="text"
                  placeholder="Detalle u observación opcional de la falla..."
                  value={observacionDefecto}
                  onChange={(e) => setObservacionDefecto(e.target.value)}
                  disabled={guardando}
                  className="w-full h-9 px-3 text-xs rounded border border-cuadra-arena bg-white focus:outline-none focus:ring-1 focus:ring-marca-primario"
                />
              </div>

              {errorDefecto && (
                <p className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <Icon name="error" size="14px" />
                  <span>{errorDefecto}</span>
                </p>
              )}
            </div>

            {/* Lista Infinita de Defectos con Scroll Independiente */}
            <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-cuadra-arena shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-marca-primario">
                  Defectos Agregados a la Inspección ({defectosLista.length})
                </span>
                <span className="text-xs font-extrabold text-marca-primario bg-cuadra-arena/40 px-2.5 py-0.5 rounded border border-cuadra-arena">
                  Pares Falla: {defectosLista.reduce((acc, d) => acc + d.paresDefectuosos, 0)}
                </span>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar border border-cuadra-arena rounded bg-white">
                {defectosLista.length === 0 ? (
                  <div className="p-8 text-center text-app-text-muted">
                    <Icon name="checklist" size="32px" className="mx-auto mb-1 opacity-30 text-marca-primario" />
                    <p className="text-xs font-semibold">No hay defectos agregados a la lista</p>
                    <p className="text-[11px] mt-0.5 opacity-75">Ingrese la clave y presione Agregar para acumular fallas.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-cuadra-arena/40 border-b border-cuadra-arena text-[11px] font-bold text-app-text-muted uppercase">
                      <tr>
                        <th className="py-2 px-2.5 w-14 text-center">Clave</th>
                        <th className="py-2 px-2.5">Defecto</th>
                        <th className="py-2 px-2.5 w-24">Depto.</th>
                        <th className="py-2 px-2.5 w-16 text-center">Pares</th>
                        <th className="py-2 px-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cuadra-arena/50">
                      {defectosLista.map((item) => (
                        <tr key={item.idTemporal} className="hover:bg-cuadra-arena/15 transition-colors">
                          <td className="py-2 px-2.5 text-center font-mono font-bold text-marca-primario">
                            {item.clave}
                          </td>
                          <td className="py-2 px-2.5 font-semibold text-app-text">
                            <div>{item.defecto}</div>
                            {item.notas && (
                              <div className="text-[10px] text-app-text-muted italic">{item.notas}</div>
                            )}
                          </td>
                          <td className="py-2 px-2.5 font-medium text-app-text-muted text-[11px]">
                            {item.departamentoResponsableNombre}
                          </td>
                          <td className="py-2 px-2.5 text-center font-bold text-marca-primario">
                            {item.paresDefectuosos}
                          </td>
                          <td className="py-2 px-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleEliminarItem(item.idTemporal)}
                              disabled={guardando}
                              className="p-1 rounded text-red-600 hover:text-red-800 hover:bg-red-50 cursor-pointer touch-manipulation"
                              title="Quitar defecto"
                            >
                              <Icon name="delete" size="18px" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PIE DEL MODAL: SIEMPRE VISIBLE CON EL BOTÓN GUARDAR Y CANCELAR */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-cuadra-arena/20 border-t border-cuadra-arena-dark shrink-0">
          <div>
            {errorGuardado && (
              <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                <Icon name="error" size="16px" className="shrink-0" />
                <span>{errorGuardado}</span>
              </p>
            )}
            {!errorGuardado && loteActivo && (
              <p className="text-xs text-app-text-muted">
                Lote #{loteActivo.lote} — {defectosLista.length} defecto(s) listo(s) para registrar
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Cancelar (menor jerarquía y más pequeño) */}
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2 text-xs font-semibold text-app-text-muted hover:text-app-text hover:bg-cuadra-arena/40 rounded transition-colors cursor-pointer select-none"
            >
              Cancelar
            </button>

            {/* Guardar (máxima jerarquía, grande y touch-friendly) */}
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={handleGuardarInspeccionCompleta}
              disabled={guardando || !loteActivo || defectosLista.length === 0}
              className="h-12 px-8 font-black text-sm uppercase tracking-wide gap-2 shadow-md touch-manipulation cursor-pointer"
            >
              {guardando ? (
                <>
                  <Spinner size="18px" />
                  <span>Guardando Inspección...</span>
                </>
              ) : (
                <>
                  <Icon name="save" size="20px" />
                  <span>Guardar Inspección</span>
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
