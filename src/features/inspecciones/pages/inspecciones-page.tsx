import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { InspeccionesTabla } from '../components/inspecciones-tabla';
import { DefectoModalCaptura } from '../components/defecto-modal-captura';
import { inspeccionesApi } from '../api/inspecciones-api';
import { useAuthSession } from '@/providers/auth-provider';
import type {
  InspeccionFilaResponse,
  LineaOperativa,
} from '../types/inspecciones.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';

export function InspeccionesPage() {
  const { user } = useAuthSession();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados de Filtros sincronizados con la URL
  const periodo = (searchParams.get('periodo') as 'hoy' | 'ultimos' | 'todos') || 'ultimos';
  const busquedaParam = searchParams.get('q') || '';
  const mesParam = searchParams.get('mes') || '';
  const anioParam = searchParams.get('anio') || '';
  const deptoParam = searchParams.get('depto') || '';

  const [inputBusqueda, setInputBusqueda] = useState(busquedaParam);
  const [items, setItems] = useState<InspeccionFilaResponse[]>([]);
  const [, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Catálogos auxiliares
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [lineas, setLineas] = useState<LineaOperativa[]>([]);
  const [deptoAuditor, setDeptoAuditor] = useState<Departamento | null>(null);

  // Modal de captura
  const [modalAbierto, setModalAbierto] = useState(false);

  // Sincronizar input con cambios de URL
  useEffect(() => {
    setInputBusqueda(busquedaParam);
  }, [busquedaParam]);

  // Cargar catálogos
  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      try {
        const [deptosRes, lineasRes] = await Promise.all([
          inspeccionesApi.getDepartamentos(),
          inspeccionesApi.getLineas(),
        ]);
        if (!cancelado) {
          setDepartamentos(deptosRes);
          setLineas(lineasRes);

          // Si el usuario tiene departamento asignado, preseleccionarlo
          const userDeptos = (user as any)?.departamentos || [];
          if (deptoParam) {
            const enc = deptosRes.find((d) => d.id === Number(deptoParam));
            if (enc) setDeptoAuditor(enc);
          } else if (userDeptos.length > 0) {
            const primerDeptoId = userDeptos[0].departamentoId || userDeptos[0].id;
            const enc = deptosRes.find((d) => d.id === primerDeptoId);
            if (enc) setDeptoAuditor(enc);
          } else {
            // Predeterminado MONTADO o el primero
            const montado = deptosRes.find((d) => d.codigo === 'MONTADO') || deptosRes[0];
            if (montado) setDeptoAuditor(montado);
          }
        }
      } catch (err) {
        console.error('Error cargando catálogos de inspecciones', err);
      }
    };
    cargar();
    return () => {
      cancelado = true;
    };
  }, [user, deptoParam]);

  // Consultar filas de inspección
  const cargarRegistros = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await inspeccionesApi.getFilasInspeccion({
        periodo,
        busqueda: busquedaParam || undefined,
        departamentoAuditoriaId: deptoAuditor ? deptoAuditor.id : undefined,
        mes: mesParam ? Number(mesParam) : undefined,
        anio: anioParam ? Number(anioParam) : undefined,
        limit: periodo === 'ultimos' ? 30 : 50,
      });

      setItems(resp.items);
      setTotal(resp.total);
    } catch (err) {
      console.error('Error al consultar inspecciones', err);
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [periodo, busquedaParam, deptoAuditor, mesParam, anioParam]);

  useEffect(() => {
    cargarRegistros();
  }, [cargarRegistros]);

  // Manejadores de Filtros en URL
  const actualizarParametro = (clave: string, valor: string | null) => {
    const nuevos = new URLSearchParams(searchParams);
    if (valor) {
      nuevos.set(clave, valor);
    } else {
      nuevos.delete(clave);
    }
    setSearchParams(nuevos, { replace: true });
  };

  const handlePeriodoChange = (nuevoPeriodo: 'hoy' | 'ultimos' | 'todos') => {
    const nuevos = new URLSearchParams(searchParams);
    nuevos.set('periodo', nuevoPeriodo);
    if (nuevoPeriodo !== 'todos') {
      nuevos.delete('mes');
      nuevos.delete('anio');
    }
    setSearchParams(nuevos, { replace: true });
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    actualizarParametro('q', inputBusqueda.trim() || null);
  };

  const handleLimpiarBusqueda = () => {
    setInputBusqueda('');
    actualizarParametro('q', null);
  };

  const handleDeptoAuditorChange = (id: number) => {
    const d = departamentos.find((dep) => dep.id === id);
    if (d) {
      setDeptoAuditor(d);
      actualizarParametro('depto', d.id.toString());
    }
  };

  return (
    <div className="flex flex-col gap-4">
      
      {/* BARRA SUPERIOR: SELECTOR DE DEPTO INSPECCIONADO, TABS (HOY, ULTIMOS, TODOS) Y BOTÓN AGREGAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-cuadra-arena-dark shadow-xs">
        
        {/* Lado izquierdo: Estación / Depto actual y Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-app-text-muted">
              Depto:
            </span>
            <Select
              value={deptoAuditor?.id.toString() || ''}
              onChange={(e) => handleDeptoAuditorChange(Number(e.target.value))}
              className="h-10 text-xs font-bold text-marca-primario min-w-[170px]"
            >
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </div>

          {/* Botones de Periodo: HOY, ÚLTIMOS (30), TODOS */}
          <div className="inline-flex rounded border border-cuadra-arena bg-cuadra-arena/30 p-1">
            <button
              type="button"
              onClick={() => handlePeriodoChange('hoy')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors touch-manipulation cursor-pointer ${
                periodo === 'hoy'
                  ? 'bg-marca-primario text-white shadow-xs'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              HOY
            </button>
            <button
              type="button"
              onClick={() => handlePeriodoChange('ultimos')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors touch-manipulation cursor-pointer ${
                periodo === 'ultimos'
                  ? 'bg-marca-primario text-white shadow-xs'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              ÚLTIMOS (30)
            </button>
            <button
              type="button"
              onClick={() => handlePeriodoChange('todos')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors touch-manipulation cursor-pointer ${
                periodo === 'todos'
                  ? 'bg-marca-primario text-white shadow-xs'
                  : 'text-app-text-muted hover:text-app-text'
              }`}
            >
              TODOS
            </button>
          </div>
        </div>

        {/* Lado derecho: Buscador por Lote / Id Defecto y Botón AGREGAR + */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Si está en periodo TODOS, mostrar selectores de Mes y Año */}
          {periodo === 'todos' && (
            <div className="flex items-center gap-1.5">
              <Select
                value={mesParam}
                onChange={(e) => actualizarParametro('mes', e.target.value || null)}
                className="h-10 text-xs min-w-[110px]"
              >
                <option value="">Todo el Año</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </Select>

              <Select
                value={anioParam}
                onChange={(e) => actualizarParametro('anio', e.target.value || null)}
                className="h-10 text-xs min-w-[90px]"
              >
                <option value="">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </Select>
            </div>
          )}

          {/* Barra Buscadora de Lote o Defecto (ID) */}
          <form onSubmit={handleBuscar} className="flex items-center gap-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar Lote o Defecto (Id)..."
                value={inputBusqueda}
                onChange={(e) => setInputBusqueda(e.target.value)}
                className="h-10 pl-8 pr-7 text-xs rounded border border-cuadra-arena-dark bg-white focus:outline-none focus:ring-2 focus:ring-marca-primario w-48 sm:w-64"
              />
              <Icon
                name="search"
                size="16px"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-app-text-muted"
              />
              {inputBusqueda && (
                <button
                  type="button"
                  onClick={handleLimpiarBusqueda}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text p-0.5 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <Icon name="close" size="14px" />
                </button>
              )}
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="h-10 px-3 text-xs font-bold"
            >
              Buscar
            </Button>
          </form>

          {/* Botón AGREGAR + (Táctil, prominente y accesible) */}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setModalAbierto(true)}
            className="h-10 px-4 font-black text-xs uppercase tracking-wider gap-1.5 shadow-sm touch-manipulation cursor-pointer"
          >
            <Icon name="add" size="20px" />
            <span>Agregar</span>
          </Button>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE DEFECTOS (FORMATO SISTEMA ANTERIOR CON SUBRAYADO DE BÚSQUEDA) */}
      <InspeccionesTabla
        items={items}
        busqueda={busquedaParam}
        isLoading={isLoading}
      />

      {/* MODAL DE CAPTURA IDÉNTICO AL SISTEMA ORIGINAL */}
      <DefectoModalCaptura
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSuccess={cargarRegistros}
        departamentoAuditor={deptoAuditor}
        lineas={lineas}
        departamentos={departamentos}
      />

    </div>
  );
}
