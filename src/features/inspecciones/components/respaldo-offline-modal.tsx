import { useState, useRef } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/toast';
import {
  offlineBackupService,
  type ValidacionRespaldoResult,
} from '../services/offline-backup.service';

export interface RespaldoOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRespaldoImportado?: () => void;
  totalPendientes?: number;
}

export function RespaldoOfflineModal({
  isOpen,
  onClose,
  onRespaldoImportado,
  totalPendientes = 0,
}: RespaldoOfflineModalProps) {
  const [pestaña, setPestaña] = useState<'exportar' | 'importar'>('exportar');
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultadoValidacion, setResultadoValidacion] = useState<ValidacionRespaldoResult | null>(
    null,
  );
  const [nombreArchivoCargado, setNombreArchivoCargado] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportar = async () => {
    try {
      setExportando(true);
      const res = await offlineBackupService.exportarRespaldoOffline();
      if (res.exito) {
        toast.success(`Respaldo descargado con éxito (${res.total} registros)`);
      } else {
        toast.error(res.mensaje || 'No se pudo generar el archivo de respaldo');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al exportar respaldo offline');
    } finally {
      setExportando(false);
    }
  };

  const handleArchivoSeleccionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivoCargado(file.name);
    try {
      const texto = await file.text();
      const validacion = await offlineBackupService.validarArchivoRespaldo(texto);
      setResultadoValidacion(validacion);

      if (!validacion.valido) {
        toast.error(validacion.error || 'Archivo de respaldo inválido');
      } else {
        toast.success(
          `Archivo verificado: ${validacion.resumen.nuevos} nuevo(s), ${validacion.resumen.duplicados} duplicado(s)`,
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error al leer el archivo de respaldo');
      setResultadoValidacion(null);
    }
  };

  const handleConfirmarImportacion = async () => {
    if (!resultadoValidacion?.archivo || !resultadoValidacion.valido) return;

    try {
      setImportando(true);
      const resultado = await offlineBackupService.importarRespaldoOffline(
        resultadoValidacion.archivo,
      );

      toast.success(
        `Se importaron ${resultado.importados} captura(s) a la cola local (${resultado.omitidosDuplicados} duplicados omitidos)`,
      );
      if (onRespaldoImportado) {
        onRespaldoImportado();
      }
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Error al incorporar registros a la cola local');
    } finally {
      setImportando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
      <ModalHeader title="Respaldo y Contingencia Offline (.mbcbak)" onClose={onClose} />
      <div className="flex border-b border-border px-4 bg-slate-50">
        <button
          type="button"
          onClick={() => setPestaña('exportar')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            pestaña === 'exportar'
              ? 'border-brand-primary text-brand-primary bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icon name="download" size="16px" />
          <span>Exportar Respaldo</span>
        </button>
        <button
          type="button"
          onClick={() => setPestaña('importar')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            pestaña === 'importar'
              ? 'border-brand-primary text-brand-primary bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Icon name="upload" size="16px" />
          <span>Importar Contingencia</span>
        </button>
      </div>

      <ModalBody className="p-4 space-y-4 text-xs">
        {pestaña === 'exportar' ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <Icon name="cloud_download" size="18px" className="text-emerald-700 shrink-0" />
                <span>Protección Física contra Pérdida de Datos</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Descarga un archivo <strong>.mbcbak</strong> con las inspecciones almacenadas en esta
                computadora. Este archivo se guarda fuera del navegador (en Descargas o USB) y
                permite recuperar las capturas si la computadora se avería o si se borran los datos del navegador.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-slate-500 font-medium block">Capturas pendientes en cola local:</span>
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {totalPendientes}{' '}
                  <span className="text-xs font-normal text-slate-500">registros</span>
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportar}
                disabled={exportando || totalPendientes === 0}
                className="font-bold px-4 h-9 shadow-xs"
              >
                <Icon name="download" size="16px" className="mr-1.5" />
                {exportando ? 'Generando...' : 'Descargar Archivo .mbcbak'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Icon name="cloud_upload" size="18px" className="text-blue-700 shrink-0" />
                <span>Restauración Segura e Idempotente</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Selecciona un archivo <strong>.mbcbak</strong> exportado previamente. El sistema validará
                la firma SHA-256 de integridad y agregará únicamente las capturas que no existan aún en el equipo.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".mbcbak,.json"
              onChange={handleArchivoSeleccionado}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-brand-primary/80 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white hover:bg-slate-50/60"
            >
              <Icon name="upload_file" size="32px" className="mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-slate-800">
                {nombreArchivoCargado ? nombreArchivoCargado : 'Haga clic para seleccionar archivo .mbcbak'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Archivos compatibles: Formato MBC Calidad Contingencia v1.0.0
              </p>
            </div>

            {resultadoValidacion && (
              <div className="space-y-3 border-t border-slate-200 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium">Terminal de origen:</span>{' '}
                    <strong className="text-slate-800">
                      {resultadoValidacion.archivo?.terminal?.nombre || 'Desconocida'} (
                      {resultadoValidacion.archivo?.terminal?.departamentoCodigo || 'LOCAL'})
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Nuevos: {resultadoValidacion.resumen.nuevos}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      Duplicados: {resultadoValidacion.resumen.duplicados}
                    </span>
                    {resultadoValidacion.resumen.conflictos > 0 && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Conflictos: {resultadoValidacion.resumen.conflictos}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lista de registros analizados */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {resultadoValidacion.detallesRegistros.map((item, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                          {item.lote}
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(item.fecha).toLocaleString('es-MX', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                          item.estadoComparacion === 'NUEVO'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.estadoComparacion === 'DUPLICADO'
                              ? 'bg-slate-50 text-slate-500 border border-slate-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.estadoComparacion}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter className="flex justify-end gap-2 border-t border-border p-3">
        <Button variant="outline" size="sm" onClick={onClose} disabled={importando}>
          Cerrar
        </Button>
        {pestaña === 'importar' && resultadoValidacion?.valido && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleConfirmarImportacion}
            disabled={importando || resultadoValidacion.resumen.nuevos === 0}
            className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {importando
              ? 'Importando...'
              : `Confirmar e Importar (${resultadoValidacion.resumen.nuevos})`}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
