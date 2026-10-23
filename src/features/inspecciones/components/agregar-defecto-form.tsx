import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { defectosApi } from '@/features/defectos/api/defectos-api';
import type { Defecto } from '@/features/defectos/types/defectos.types';
import type { Departamento } from '@/features/departamentos/types/departamentos.types';
import type { DefectoItemStaging } from '../types/inspecciones.types';

interface AgregarDefectoFormProps {
  departamentos: Departamento[];
  onAgregar: (item: DefectoItemStaging) => void;
  disabled?: boolean;
}

export function AgregarDefectoForm({
  departamentos,
  onAgregar,
  disabled = false,
}: AgregarDefectoFormProps) {
  const [claveInput, setClaveInput] = useState('');
  const [buscandoDefecto, setBuscandoDefecto] = useState(false);
  const [errorDefecto, setErrorDefecto] = useState<string | null>(null);
  const [defectoSeleccionado, setDefectoSeleccionado] = useState<Defecto | null>(null);

  const [deptoResponsableId, setDeptoResponsableId] = useState<number | ''>('');
  const [paresDefectuosos, setParesDefectuosos] = useState<number>(1);
  const [notas, setNotas] = useState('');

  const handleBuscarPorClave = async () => {
    const claveNum = parseInt(claveInput.trim(), 10);
    if (isNaN(claveNum) || claveNum <= 0) {
      setErrorDefecto('Ingrese una clave numérica válida (ej. 1101, 1705)');
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
        // Preseleccionar el primer departamento asociado si existe
        if (d.departamentos && d.departamentos.length > 0) {
          const primero = d.departamentos[0];
          setDeptoResponsableId(primero.departamento.id);
        } else if (departamentos.length > 0) {
          setDeptoResponsableId(departamentos[0].id);
        }
      } else {
        setDefectoSeleccionado(null);
        setErrorDefecto(`No se encontró defecto activo con la clave #${claveNum}`);
      }
    } catch (err: any) {
      setErrorDefecto(err.message || 'Error al buscar defecto en catálogo');
      setDefectoSeleccionado(null);
    } finally {
      setBuscandoDefecto(false);
    }
  };

  const handleKeyDownClave = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBuscarPorClave();
    }
  };

  const handleAgregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectoSeleccionado) {
      setErrorDefecto('Debe buscar y seleccionar un defecto primero');
      return;
    }

    if (!deptoResponsableId) {
      setErrorDefecto('Seleccione el departamento responsable');
      return;
    }

    if (paresDefectuosos < 1) {
      setErrorDefecto('La cantidad de pares debe ser al menos 1');
      return;
    }

    const deptoObj = departamentos.find((d) => d.id === Number(deptoResponsableId));
    const deptoNombre = deptoObj ? deptoObj.nombre : `Depto #${deptoResponsableId}`;

    onAgregar({
      idTemporal: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      defectoId: defectoSeleccionado.id,
      clave: defectoSeleccionado.clave,
      defecto: defectoSeleccionado.defecto,
      clasificacion: defectoSeleccionado.clasificacion,
      departamentoResponsableId: Number(deptoResponsableId),
      departamentoResponsableNombre: deptoNombre,
      paresDefectuosos,
      notas: notas.trim() || undefined,
    });

    // Reset formulario de defecto parcial
    setClaveInput('');
    setDefectoSeleccionado(null);
    setParesDefectuosos(1);
    setNotas('');
    setErrorDefecto(null);
  };

  return (
    <div className="rounded-md border border-cuadra-arena-dark bg-white p-4 shadow-xs">
      <div className="flex items-center gap-2 border-b border-cuadra-arena pb-2 mb-3">
        <Icon name="add_circle" size="18px" className="text-marca-primario" />
        <h3 className="text-sm font-bold text-marca-primario">
          Agregar Defecto a la Inspección
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        {/* Búsqueda por Clave */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-app-text mb-1">
            Clave del Defecto *
          </label>
          <div className="flex gap-1.5">
            <Input
              type="text"
              placeholder="Ej. 1101, 1705..."
              value={claveInput}
              onChange={(e) => {
                setClaveInput(e.target.value);
                setErrorDefecto(null);
              }}
              onKeyDown={handleKeyDownClave}
              disabled={disabled || buscandoDefecto}
              className="text-xs font-mono font-bold"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleBuscarPorClave}
              disabled={disabled || buscandoDefecto || !claveInput.trim()}
              title="Buscar defecto por clave"
            >
              {buscandoDefecto ? <Spinner size="14px" /> : <Icon name="search" size="16px" />}
            </Button>
          </div>
        </div>

        {/* Nombre y Clasificación del Defecto Encontrado */}
        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-app-text mb-1">
            Defecto Detectado
          </label>
          <div className="min-h-9 flex items-center px-3 py-1.5 rounded-sm border border-cuadra-arena bg-cuadra-arena/30 text-xs">
            {defectoSeleccionado ? (
              <div className="flex items-center justify-between w-full gap-2">
                <span className="font-semibold text-marca-primario truncate" title={defectoSeleccionado.defecto}>
                  [{defectoSeleccionado.clave}] {defectoSeleccionado.defecto}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-cuadra-arena-dark text-app-text shrink-0">
                  {defectoSeleccionado.clasificacion}
                </span>
              </div>
            ) : (
              <span className="text-app-text-muted italic">
                Ingrese la clave y presione buscar
              </span>
            )}
          </div>
        </div>

        {/* Departamento Responsable */}
        <div className="md:col-span-3">
          <label className="block text-xs font-semibold text-app-text mb-1">
            Depto. Responsable *
          </label>
          <Select
            value={deptoResponsableId.toString()}
            onChange={(e) => setDeptoResponsableId(Number(e.target.value))}
            disabled={disabled || !defectoSeleccionado}
            className="text-xs"
          >
            <option value="">Seleccione Depto...</option>
            {departamentos.map((depto) => (
              <option key={depto.id} value={depto.id}>
                {depto.nombre}
              </option>
            ))}
          </Select>
        </div>

        {/* Pares Defectuosos */}
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-app-text mb-1">
            Pares *
          </label>
          <Input
            type="number"
            min={1}
            max={9999}
            value={paresDefectuosos}
            onChange={(e) => setParesDefectuosos(parseInt(e.target.value, 10) || 1)}
            disabled={disabled || !defectoSeleccionado}
            className="text-xs font-semibold"
          />
        </div>
      </div>

      {/* Fila inferior: Observaciones del defecto y botón añadir */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end mt-3 pt-2 border-t border-cuadra-arena/60">
        <div className="md:col-span-9">
          <label className="block text-xs font-semibold text-app-text mb-1">
            Observación / Detalle de la Falla (Opcional)
          </label>
          <Input
            type="text"
            placeholder="Ej. Lado derecho con soltura evidente, filo sin teñir..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={disabled || !defectoSeleccionado}
            className="text-xs"
          />
        </div>

        <div className="md:col-span-3 flex justify-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAgregar}
            disabled={disabled || !defectoSeleccionado || !deptoResponsableId}
            className="w-full justify-center gap-1.5"
          >
            <Icon name="playlist_add" size="18px" />
            <span>Agregar a Lista</span>
          </Button>
        </div>
      </div>

      {errorDefecto && (
        <div className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1">
          <Icon name="error" size="14px" />
          <span>{errorDefecto}</span>
        </div>
      )}
    </div>
  );
}
