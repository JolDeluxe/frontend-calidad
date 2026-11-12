import {
  idbDatabase,
  type ColaInspeccionStore,
  type ContingenciaInspeccionStore,
} from '@/lib/db/idb-database';
import { terminalStorage } from '@/features/terminales/services/terminal-storage';
import {
  computeCanonicalPayloadHash,
  inspeccionesOfflineService,
} from './inspecciones-offline.service';

export interface RespaldoOfflineItem {
  idLocalCliente: string;
  inspectorId: number;
  inspectorUsuario: string;
  inspectorNombre: string;
  terminalId: number;
  terminalNombre: string;
  departamentoAuditoriaId: number;
  offlineToken: string;
  fechaCapturaDispositivo: string;
  esContingencia: boolean;
  motivoContingencia: string | null;
  payload: {
    lote: string;
    lineaId: number | null;
    lineaTexto: string | null;
    horma: string | null;
    notas: string | null;
    detalles: Array<{
      defectoId: number;
      defectoClave?: number;
      defectoNombre?: string;
      clasificacion?: 'CRITICO' | 'MAYOR' | 'MENOR';
      defDeptoId?: number;
      defDeptoNombre?: string;
      paresDefectuosos: number;
      notas?: string;
    }>;
  };
  payloadHash: string;
}

export interface RespaldoOfflineArchivo {
  magicHeader: 'MBC_OFFLINE_BACKUP';
  version: '1.0.0';
  sistema: 'MBC_CALIDAD';
  generadoEn: string;
  terminal?: {
    id?: number;
    nombre?: string;
    departamentoId?: number;
    departamentoCodigo?: string;
    departamentoNombre?: string;
  };
  totalRegistros: number;
  checksumSha256: string;
  registros: RespaldoOfflineItem[];
}

export interface AnalisisRegistroRespaldo {
  idLocalCliente: string;
  lote: string;
  fecha: string;
  estadoComparacion: 'NUEVO' | 'DUPLICADO' | 'CONFLICTO';
  motivo?: string;
}

export interface ValidacionRespaldoResult {
  valido: boolean;
  error?: string;
  archivo?: RespaldoOfflineArchivo;
  resumen: {
    total: number;
    nuevos: number;
    duplicados: number;
    conflictos: number;
  };
  detallesRegistros: AnalisisRegistroRespaldo[];
}

/**
 * Calcula un digest SHA-256 de una cadena de texto en formato hexadecimal usando Web Crypto API.
 */
async function computeSha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

class OfflineBackupService {
  /**
   * Genera y descarga un archivo externo de contingencia `.mbcbak` con todas las capturas
   * pendientes de sincronizar en `cola_inspecciones`.
   * Operación estrictamente de solo lectura sobre IndexedDB (no muta ni elimina registros locales).
   */
  public async exportarRespaldoOffline(): Promise<{
    exito: boolean;
    total: number;
    nombreArchivo?: string;
    mensaje?: string;
  }> {
    if (!idbDatabase.getAvailable()) {
      return { exito: false, total: 0, mensaje: 'IndexedDB no está disponible en este navegador.' };
    }

    const [itemsCola, cachedTerminal] = await Promise.all([
      idbDatabase.getAll<ColaInspeccionStore>('cola_inspecciones'),
      terminalStorage.getProfileFromIdb(),
    ]);

    if (itemsCola.length === 0) {
      return {
        exito: false,
        total: 0,
        mensaje: 'No hay inspecciones en la cola local para respaldar.',
      };
    }

    // Mapear elementos a estructura normalizada de respaldo con hash canónico
    const registros: RespaldoOfflineItem[] = [];
    for (const item of itemsCola) {
      const payloadHash =
        item.payloadHash ||
        (await computeCanonicalPayloadHash({
          lote: item.payload.lote,
          lineaId: item.payload.lineaId,
          detalles: item.payload.detalles.map((d) => ({
            defectoId: d.defectoId,
            paresDefectuosos: d.paresDefectuosos,
          })),
        }));

      registros.push({
        idLocalCliente: item.idLocalCliente,
        inspectorId: item.inspectorId,
        inspectorUsuario: item.inspectorUsuario || 'INSPECTOR',
        inspectorNombre: item.inspectorNombre || 'Inspector',
        terminalId: item.terminalId || cachedTerminal?.terminalId || 0,
        terminalNombre: item.terminalNombre || cachedTerminal?.nombre || 'ESTACION',
        departamentoAuditoriaId: item.departamentoAuditoriaId,
        offlineToken: item.offlineToken,
        fechaCapturaDispositivo: item.fechaCapturaDispositivo,
        esContingencia: item.esContingencia,
        motivoContingencia: item.motivoContingencia ?? null,
        payload: {
          lote: item.payload.lote,
          lineaId: item.payload.lineaId ?? null,
          lineaTexto: item.payload.lineaTexto ?? null,
          horma: item.payload.horma ?? null,
          notas: item.payload.notas ?? null,
          detalles: item.payload.detalles.map((d) => ({
            defectoId: d.defectoId,
            defectoClave: d.defectoClave,
            defectoNombre: d.defectoNombre,
            clasificacion: d.clasificacion,
            defDeptoId: d.defDeptoId,
            defDeptoNombre: d.defDeptoNombre,
            paresDefectuosos: d.paresDefectuosos,
            notas: d.notas,
          })),
        },
        payloadHash,
      });
    }

    // Calcular checksum sobre los registros canónicos ordenados
    const canonicalPayloadString = JSON.stringify(registros);
    const checksumSha256 = await computeSha256Hex(canonicalPayloadString);

    const generadoEn = new Date().toISOString();
    const deptoCodigo = (cachedTerminal?.departamentoCodigo || 'GENERAL').toUpperCase();
    const terminalNombre = (cachedTerminal?.nombre || 'ESTACION').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fechaArchivo = generadoEn.replace(/[:.]/g, '-').slice(0, 19);
    const nombreArchivo = `MBC_CALIDAD_RESPALDO_OFFLINE_${deptoCodigo}_${terminalNombre}_${fechaArchivo}_${registros.length}REG.mbcbak`;

    const archivoRespaldo: RespaldoOfflineArchivo = {
      magicHeader: 'MBC_OFFLINE_BACKUP',
      version: '1.0.0',
      sistema: 'MBC_CALIDAD',
      generadoEn,
      terminal: cachedTerminal
        ? {
            id: cachedTerminal.terminalId,
            nombre: cachedTerminal.nombre,
            departamentoId: cachedTerminal.departamentoId,
            departamentoCodigo: cachedTerminal.departamentoCodigo,
            departamentoNombre: cachedTerminal.departamentoNombre,
          }
        : undefined,
      totalRegistros: registros.length,
      checksumSha256,
      registros,
    };

    // Descargar el archivo físicamente fuera del navegador
    const jsonContenido = JSON.stringify(archivoRespaldo, null, 2);
    const blob = new Blob([jsonContenido], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return {
      exito: true,
      total: registros.length,
      nombreArchivo,
    };
  }

  /**
   * Analiza y valida la integridad de un archivo `.mbcbak` antes de importarlo a la cola local.
   * Detecta duplicados, posibles colisiones y verifica que los hashes criptográficos coincidan.
   */
  public async validarArchivoRespaldo(contenidoTexto: string): Promise<ValidacionRespaldoResult> {
    try {
      const parsed = JSON.parse(contenidoTexto) as RespaldoOfflineArchivo;

      if (!parsed || parsed.magicHeader !== 'MBC_OFFLINE_BACKUP') {
        return {
          valido: false,
          error: 'El archivo no tiene el formato de respaldo de contingencia válido (magic header incorrecto).',
          resumen: { total: 0, nuevos: 0, duplicados: 0, conflictos: 0 },
          detallesRegistros: [],
        };
      }

      if (parsed.version !== '1.0.0') {
        return {
          valido: false,
          error: `Versión de archivo no compatible (${parsed.version}). Versión soportada: 1.0.0.`,
          resumen: { total: 0, nuevos: 0, duplicados: 0, conflictos: 0 },
          detallesRegistros: [],
        };
      }

      if (!Array.isArray(parsed.registros) || parsed.registros.length === 0) {
        return {
          valido: false,
          error: 'El archivo de respaldo no contiene registros de inspección.',
          resumen: { total: 0, nuevos: 0, duplicados: 0, conflictos: 0 },
          detallesRegistros: [],
        };
      }

      // Validar checksum global SHA-256
      const canonicalPayloadString = JSON.stringify(parsed.registros);
      const computedChecksum = await computeSha256Hex(canonicalPayloadString);
      if (computedChecksum !== parsed.checksumSha256) {
        return {
          valido: false,
          error: 'El checksum criptográfico SHA-256 no coincide. El archivo pudo haber sido alterado o dañado.',
          resumen: { total: parsed.registros.length, nuevos: 0, duplicados: 0, conflictos: 0 },
          detallesRegistros: [],
        };
      }

      // Comparar registros con la base de datos local existente
      const [colaExistente, contingenciasExistentes] = await Promise.all([
        idbDatabase.getAll<ColaInspeccionStore>('cola_inspecciones'),
        idbDatabase.getAll<ContingenciaInspeccionStore>('contingencias_inspecciones'),
      ]);

      const mapaCola = new Map(colaExistente.map((i) => [i.idLocalCliente, i]));
      const mapaContingencias = new Map(contingenciasExistentes.map((c) => [c.idLocalCliente, c]));

      let nuevos = 0;
      let duplicados = 0;
      let conflictos = 0;
      const detalles: AnalisisRegistroRespaldo[] = [];

      for (const reg of parsed.registros) {
        const itemCola = mapaCola.get(reg.idLocalCliente);
        const itemContingencia = mapaContingencias.get(reg.idLocalCliente);

        if (itemCola) {
          if (itemCola.payloadHash === reg.payloadHash) {
            duplicados++;
            detalles.push({
              idLocalCliente: reg.idLocalCliente,
              lote: reg.payload.lote,
              fecha: reg.fechaCapturaDispositivo,
              estadoComparacion: 'DUPLICADO',
              motivo: 'El registro ya existe de forma idéntica en la cola pendiente local.',
            });
          } else {
            conflictos++;
            detalles.push({
              idLocalCliente: reg.idLocalCliente,
              lote: reg.payload.lote,
              fecha: reg.fechaCapturaDispositivo,
              estadoComparacion: 'CONFLICTO',
              motivo: 'Colisión de identificador local con diferente contenido de inspección.',
            });
          }
        } else if (itemContingencia) {
          duplicados++;
          detalles.push({
            idLocalCliente: reg.idLocalCliente,
            lote: reg.payload.lote,
            fecha: reg.fechaCapturaDispositivo,
            estadoComparacion: 'DUPLICADO',
            motivo: 'El registro ya fue procesado y archivado previamente como contingencia local.',
          });
        } else {
          nuevos++;
          detalles.push({
            idLocalCliente: reg.idLocalCliente,
            lote: reg.payload.lote,
            fecha: reg.fechaCapturaDispositivo,
            estadoComparacion: 'NUEVO',
            motivo: 'Registro nuevo listo para incorporarse a la cola pendiente.',
          });
        }
      }

      return {
        valido: true,
        archivo: parsed,
        resumen: {
          total: parsed.registros.length,
          nuevos,
          duplicados,
          conflictos,
        },
        detallesRegistros: detalles,
      };
    } catch (parseErr: any) {
      return {
        valido: false,
        error: `Error al procesar el archivo JSON: ${parseErr?.message || 'Formato no legible'}`,
        resumen: { total: 0, nuevos: 0, duplicados: 0, conflictos: 0 },
        detallesRegistros: [],
      };
    }
  }

  /**
   * Incorpora los registros válidos y nuevos del archivo de respaldo a la cola local `cola_inspecciones`.
   * Conserva fielmente el offlineToken y metadatos originales de cada captura.
   */
  public async importarRespaldoOffline(archivo: RespaldoOfflineArchivo): Promise<{
    importados: number;
    omitidosDuplicados: number;
    conflictosOmitidos: number;
    total: number;
  }> {
    if (!idbDatabase.getAvailable()) {
      throw new Error('IndexedDB no está disponible en este entorno.');
    }

    const colaExistente = await idbDatabase.getAll<ColaInspeccionStore>('cola_inspecciones');
    const mapaCola = new Map(colaExistente.map((i) => [i.idLocalCliente, i]));

    let importados = 0;
    let omitidosDuplicados = 0;
    let conflictosOmitidos = 0;

    const ahoraIso = new Date().toISOString();

    for (const reg of archivo.registros) {
      const existe = mapaCola.get(reg.idLocalCliente);
      if (existe) {
        if (existe.payloadHash === reg.payloadHash) {
          omitidosDuplicados++;
        } else {
          conflictosOmitidos++;
        }
        continue;
      }

      const nuevoRegistro: ColaInspeccionStore = {
        idLocalCliente: reg.idLocalCliente,
        inspectorId: reg.inspectorId,
        inspectorUsuario: reg.inspectorUsuario || 'INSPECTOR',
        inspectorNombre: reg.inspectorNombre || 'Inspector Desconocido',
        terminalId: reg.terminalId || 0,
        terminalNombre: reg.terminalNombre || 'ESTACION',
        departamentoAuditoriaId: reg.departamentoAuditoriaId,
        offlineToken: reg.offlineToken,
        fechaCapturaDispositivo: reg.fechaCapturaDispositivo,
        esContingencia: reg.esContingencia,
        motivoContingencia: reg.motivoContingencia || 'Restaurado desde respaldo de contingencia .mbcbak',
        payload: {
          lote: reg.payload.lote,
          lineaId: reg.payload.lineaId ?? null,
          lineaTexto: reg.payload.lineaTexto ?? null,
          horma: reg.payload.horma ?? null,
          notas: reg.payload.notas ?? null,
          detalles: reg.payload.detalles.map((d) => ({
            defectoId: d.defectoId,
            defectoClave: d.defectoClave,
            defectoNombre: d.defectoNombre,
            clasificacion: d.clasificacion,
            defDeptoId: d.defDeptoId,
            defDeptoNombre: d.defDeptoNombre,
            paresDefectuosos: d.paresDefectuosos,
            notas: d.notas,
          })),
        },
        payloadHash: reg.payloadHash,
        estado: 'PENDIENTE',
        intentos: 0,
        ultimoError: null,
        proximoReintentoEn: null,
        folioServidor: null,
        inspeccionIdServidor: null,
        legacySincronizado: false,
        actualizadoEn: ahoraIso,
      };

      await idbDatabase.put<ColaInspeccionStore>('cola_inspecciones', nuevoRegistro);
      importados++;
    }

    if (importados > 0) {
      // Disparar sincronización diferida y notificar a los suscriptores de la cola
      void inspeccionesOfflineService.obtenerResumenCola().then(() => {
        window.dispatchEvent(new CustomEvent('offline:queue-updated'));
      });
    }

    return {
      importados,
      omitidosDuplicados,
      conflictosOmitidos,
      total: archivo.registros.length,
    };
  }
}

export const offlineBackupService = new OfflineBackupService();
