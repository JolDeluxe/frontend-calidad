import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import {
  idbDatabase,
  type ColaInspeccionStore,
  type ContingenciaInspeccionStore,
  type SesionOfflineStore,
  type TerminalProfileStore,
  IdbStorageError,
} from '@/lib/db/idb-database';
import { catalogoOfflineService } from '@/features/catalogo-offline/services/catalogo-offline.service';
import { terminalStorage } from '@/features/terminales/services/terminal-storage';
import type { CreateInspeccionPayload, InspeccionFilaResponse } from '../types/inspecciones.types';

/**
 * Genera un identificador numérico negativo determinístico para representar cada fila de detalle
 * pendiente en la cola local dentro de `InspeccionesTabla`, evitando colisiones con IDs positivos de MySQL.
 */
export function computeLocalRowId(idLocalCliente: string, detailIndex: number): number {
  let hash = 2166136261;
  const input = `${idLocalCliente}:${detailIndex}`;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const positive = Math.abs(hash | 0) || detailIndex + 1;
  return -positive;
}

export interface EncolarInspeccionParams {
  payload: CreateInspeccionPayload;
  inspector: {
    id: number;
    usuario: string;
    nombre: string;
  };
  terminal?: {
    id: number;
    nombre: string;
    departamentoId: number;
  } | null;
  esContingencia?: boolean;
  motivoContingencia?: string | null;
  idLocalClienteOpcional?: string;
  nowMs?: number;
}

export interface SyncOfflineBatchResponse {
  resultados: Array<{
    idLocalCliente: string;
    inspectorId: number;
    estado:
      | 'SINCRONIZADA'
      | 'REPETIDA_IDEMPOTENTE'
      | 'CONFLICTO_IDEMPOTENCIA'
      | 'REQUIERE_REVISION'
      | 'RECHAZADA'
      | 'ERROR_REINTENTABLE';
    folio?: string;
    inspeccionId?: number;
    legacySincronizado: boolean;
    yaEstabaLegacy?: boolean;
    requiereRevision?: boolean;
    motivoRevision?: string;
    mensaje: string;
    codigoHttp: number;
  }>;
  resumen: {
    total: number;
    sincronizadas: number;
    repetidasIdempotentes: number;
    requierenRevision: number;
    rechazadas: number;
    erroresReintentables: number;
  };
}

export interface ResumenColaOffline {
  pendientes: number;
  sincronizando: number;
  erroresReintentables: number;
  requierenRevision: number;
  contingencias: number;
  items: ColaInspeccionStore[];
}

export type OfflineQueueEventListener = (resumen: ResumenColaOffline) => void;

function generateUuidV4(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Calcula un hash SHA-256 determinístico del payload canónico de inspección
 * para detectar colisiones o alteraciones locales/remotas de clave de idempotencia.
 */
export async function computeCanonicalPayloadHash(payload: {
  lote: string;
  lineaId?: number | null;
  detalles: Array<{ defectoId: number; paresDefectuosos: number }>;
}): Promise<string> {
  const canonicalDetalles = [...payload.detalles]
    .map((d) => `${d.defectoId}:${d.paresDefectuosos}`)
    .sort()
    .join('|');
  const canonicalString = `${payload.lote.trim().toUpperCase()}::${payload.lineaId ?? 'null'}::${canonicalDetalles}`;
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalString));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class InspeccionesOfflineService {
  private syncInFlightPromise: Promise<{ sincronizadas: number; pendientes: number }> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<OfflineQueueEventListener>();
  private readonly LOCK_LEASE_MS = 30_000; // 30 segundos por corrida de sincronización

  private scheduleBackoffRetry(delayMs: number): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    const safeDelay = Math.max(2000, Math.min(delayMs, 60_000));
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      void this.sincronizarCola();
    }, safeDelay);
    // Evitar retener el proceso abierto en entornos de pruebas (Node/Bun)
    if (typeof (this.retryTimer as any)?.unref === 'function') {
      (this.retryTimer as any).unref();
    }
  }

  public subscribe(listener: OfflineQueueEventListener): () => void {
    this.listeners.add(listener);
    void this.obtenerResumenCola().then((r) => listener(r));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners(): Promise<void> {
    if (this.listeners.size === 0) return;
    const resumen = await this.obtenerResumenCola();
    for (const listener of this.listeners) {
      try {
        listener(resumen);
      } catch {
        // Ignorar errores en observadores de UI
      }
    }
  }

  /**
   * Al iniciar la aplicación o el sincronizador, recupera cualquier elemento que haya quedado
   * en estado `SINCRONIZANDO` por cierre abrupto del navegador o pérdida de energía,
   * devolviéndolo a `PENDIENTE` para que pueda reintentarse de forma idempotente.
   */
  public async recuperarElementosInterrumpidos(): Promise<number> {
    if (!idbDatabase.getAvailable()) return 0;
    const todos = await idbDatabase.getAll<ColaInspeccionStore>('cola_inspecciones');
    let recuperados = 0;
    const ahoraIso = new Date().toISOString();

    for (const item of todos) {
      if (item.estado === 'SINCRONIZANDO') {
        await idbDatabase.put<ColaInspeccionStore>('cola_inspecciones', {
          ...item,
          estado: 'PENDIENTE',
          actualizadoEn: ahoraIso,
        });
        recuperados += 1;
      }
    }

    if (recuperados > 0) {
      await this.notifyListeners();
    }
    return recuperados;
  }

  /**
   * Valida y encola de forma transaccional una inspección en IndexedDB (`cola_inspecciones`).
   * - Verifica que IndexedDB esté disponible y que la transacción finalice antes de confirmar al usuario.
   * - Verifica que exista una autorización offline vigente (<= 48h y sin retroceso de reloj) para el inspector activo.
   * - Valida el lote contra `cat_lotes` (salvo que se indique explícitamente modo contingencia con motivo obligatorio).
   * - Valida los defectos contra `cat_defectos` de la etapa de la terminal.
   */
  public async encolarCaptura(params: EncolarInspeccionParams): Promise<ColaInspeccionStore> {
    const nowMs = params.nowMs ?? Date.now();
    const nowSec = Math.floor(nowMs / 1000);

    if (!idbDatabase.getAvailable()) {
      throw new IdbStorageError(
        'UNAVAILABLE',
        'No es posible guardar la captura offline: IndexedDB no está disponible en este navegador.',
      );
    }

    // 1. Verificar reloj monotónico
    const clockCheck = await catalogoOfflineService.verificarYActualizarRelojMonotonico(nowMs);
    if (clockCheck.clockRollbackDetected) {
      throw new Error(
        'Se detectó un retroceso anómalo en el reloj del sistema. No se permiten nuevas capturas offline hasta reconectar con el servidor.',
      );
    }

    // 2. Resolver sesión offline / token del inspector
    const sesionActiva = await idbDatabase.get<SesionOfflineStore>('sesion_offline', 'activa');
    const inspectorCat = await idbDatabase.get<any>('cat_inspectores', params.inspector.id);

    const offlineToken =
      (sesionActiva && sesionActiva.inspectorId === params.inspector.id
        ? sesionActiva.offlineToken
        : null) || inspectorCat?.offlineToken;
    const expiraEn =
      (sesionActiva && sesionActiva.inspectorId === params.inspector.id
        ? sesionActiva.expiraEn
        : null) || inspectorCat?.expiraEn;

    if (!offlineToken || typeof expiraEn !== 'number') {
      throw new Error(
        'No se encontró una credencial de autorización offline firmada para este inspector en esta terminal.',
      );
    }

    if (expiraEn < nowSec) {
      throw new Error(
        'Su autorización offline de 48 horas ha vencido. Reconecte al servidor para renovarla antes de registrar nuevas capturas.',
      );
    }

    // 3. Resolver perfil de la terminal física
    const cachedTerminal = await idbDatabase.get<TerminalProfileStore>('terminal_profile', 'local');
    const terminalId = params.terminal?.id ?? cachedTerminal?.terminalId;
    const terminalNombre = params.terminal?.nombre ?? cachedTerminal?.nombre ?? 'Terminal Local';
    const departamentoAuditoriaId =
      params.terminal?.departamentoId ?? cachedTerminal?.departamentoId;

    if (!terminalId || !departamentoAuditoriaId) {
      throw new Error(
        'No es posible capturar en modo offline: la estación de trabajo no tiene un perfil de terminal vinculado.',
      );
    }

    // 4. Validar lote contra `cat_lotes` (o exigir contingencia justificada)
    const codigoLote = params.payload.lote.trim().toUpperCase();
    if (!codigoLote) {
      throw new Error('El código de lote es obligatorio.');
    }

    const loteLocal = await catalogoOfflineService.getLoteLocal(codigoLote);
    const esContingencia = Boolean(params.esContingencia);
    const motivoContingencia = params.motivoContingencia?.trim() || null;

    if (!loteLocal) {
      if (!esContingencia) {
        throw new Error(
          `El lote '${codigoLote}' no existe en el catálogo local de lotes activos. Verifique el número de lote o utilice el registro en contingencia justificada.`,
        );
      }
      if (!motivoContingencia || motivoContingencia.length < 5) {
        throw new Error(
          'Para registrar un lote en modo contingencia es obligatorio indicar el motivo (mínimo 5 caracteres).',
        );
      }
    }

    // 5. Validar defectos y cantidades
    const detalles = params.payload.detalles || [];
    if (detalles.length === 0) {
      throw new Error('Debe agregar al menos un defecto a la inspección.');
    }

    const defectosLocales = await catalogoOfflineService.getDefectosLocales();
    const mapaDefectos = new Map(defectosLocales.map((d) => [d.id, d]));
    if (defectosLocales.length > 0) {
      for (const det of detalles) {
        const defLocal = mapaDefectos.get(det.defectoId);
        if (!defLocal || !defLocal.permitidoEnEtapa) {
          throw new Error(
            `El defecto seleccionado (ID ${det.defectoId}) no está autorizado para la etapa de esta terminal.`,
          );
        }
        if (!Number.isInteger(det.paresDefectuosos) || det.paresDefectuosos < 1) {
          throw new Error('La cantidad de pares defectuosos debe ser un entero mayor o igual a 1.');
        }
        if (loteLocal && det.paresDefectuosos > loteLocal.cantidad) {
          throw new Error(
            `Los pares defectuosos (${det.paresDefectuosos}) exceden la cantidad del lote (${loteLocal.cantidad}).`,
          );
        }
      }
    }

    const idLocalCliente = params.idLocalClienteOpcional || generateUuidV4();
    const payloadHash = await computeCanonicalPayloadHash({
      lote: codigoLote,
      lineaId: params.payload.lineaId ?? null,
      detalles,
    });

    // Verificar si ya existe una captura con el mismo idLocalCliente en la cola local
    const existente = await idbDatabase.get<ColaInspeccionStore>('cola_inspecciones', idLocalCliente);
    if (existente) {
      if (existente.payloadHash !== payloadHash) {
        throw new Error(
          `Conflicto local de idempotencia: el identificador '${idLocalCliente}' ya existe con un payload diferente.`,
        );
      }
      return existente;
    }

    const ahoraIso = new Date(nowMs).toISOString();
    const registroCola: ColaInspeccionStore = {
      idLocalCliente,
      inspectorId: params.inspector.id,
      inspectorUsuario: params.inspector.usuario,
      inspectorNombre: params.inspector.nombre,
      terminalId,
      terminalNombre,
      departamentoAuditoriaId,
      offlineToken,
      fechaCapturaDispositivo: ahoraIso,
      esContingencia,
      motivoContingencia,
      payload: {
        lote: codigoLote,
        lineaId: params.payload.lineaId ?? null,
        lineaTexto: params.payload.lineaTexto ?? null,
        horma: params.payload.horma ?? loteLocal?.horma ?? null,
        notas: params.payload.notas ?? null,
        detalles: detalles.map((d) => {
          const defLocal = mapaDefectos.get(d.defectoId);
          return {
            defectoId: d.defectoId,
            defectoClave: d.defectoClave ?? defLocal?.clave,
            defectoNombre: d.defectoNombre ?? defLocal?.defecto,
            clasificacion: d.clasificacion ?? defLocal?.clasificacion,
            defDeptoId: d.defDeptoId,
            defDeptoNombre: d.defDeptoNombre ?? defLocal?.departamentoNombre,
            paresDefectuosos: d.paresDefectuosos,
            notas: d.notas,
          };
        }),
      },
      payloadHash,
      estado: 'PENDIENTE',
      intentos: 0,
      ultimoError: null,
      proximoReintentoEn: null,
      folioServidor: null,
      inspeccionIdServidor: null,
      legacySincronizado: false,
      actualizadoEn: ahoraIso,
    };

    // Escritura transaccional en IndexedDB: solo resuelve cuando `tx.oncomplete` confirma en disco
    await idbDatabase.put<ColaInspeccionStore>('cola_inspecciones', registroCola);
    await this.notifyListeners();

    // Programar intento inicial de sincronización diferido con backoff (sin bloquear el guardado local)
    this.scheduleBackoffRetry(4000);

    return registroCola;
  }

  /**
   * Construye las filas de tabla (`InspeccionFilaResponse[]`) correspondientes a las capturas
   * pendientes o en revisión almacenadas en `cola_inspecciones`, enriqueciéndolas con los catálogos
   * locales (`cat_lotes`, `cat_defectos`, `terminal_profile`).
   */
  public async obtenerFilasEnColaLocal(filtros?: {
    departamentoAuditoriaId?: number;
    busqueda?: string;
    soloEliminados?: boolean;
  }): Promise<InspeccionFilaResponse[]> {
    if (!idbDatabase.getAvailable()) return [];
    if (filtros?.soloEliminados) return [];

    const [colaItems, defectosLocales, cachedTerminal] = await Promise.all([
      idbDatabase.getAll<ColaInspeccionStore>('cola_inspecciones'),
      catalogoOfflineService.getDefectosLocales(),
      idbDatabase.get<TerminalProfileStore>('terminal_profile', 'local'),
    ]);

    if (colaItems.length === 0) return [];

    const mapaDefectos = new Map(defectosLocales.map((d) => [d.id, d]));

    // Ordenar del más reciente al más antiguo para mostrar al principio de la tabla
    const ordenados = [...colaItems].sort((a, b) =>
      b.fechaCapturaDispositivo.localeCompare(a.fechaCapturaDispositivo),
    );

    const filas: InspeccionFilaResponse[] = [];
    const termBusqueda = filtros?.busqueda?.trim().toUpperCase() || '';

    for (const item of ordenados) {
      if (
        filtros?.departamentoAuditoriaId &&
        item.departamentoAuditoriaId !== filtros.departamentoAuditoriaId
      ) {
        continue;
      }

      const loteLocal = await catalogoOfflineService.getLoteLocal(item.payload.lote);
      const deptoFromDef =
        item.payload.detalles.find((d) => d.defDeptoId === item.departamentoAuditoriaId && d.defDeptoNombre)
          ?.defDeptoNombre ||
        defectosLocales.find((d) => d.departamentoId === item.departamentoAuditoriaId && d.departamentoNombre)
          ?.departamentoNombre;
      const deptoAudNombre =
        cachedTerminal && cachedTerminal.departamentoId === item.departamentoAuditoriaId
          ? cachedTerminal.departamentoNombre
          : deptoFromDef || 'ESTACIÓN LOCAL';
      const deptoAudCodigo =
        cachedTerminal && cachedTerminal.departamentoId === item.departamentoAuditoriaId
          ? cachedTerminal.departamentoCodigo
          : deptoFromDef || 'LOCAL';

      item.payload.detalles.forEach((det, idx) => {
        const defLocal = mapaDefectos.get(det.defectoId);
        const defectoClave = det.defectoClave ?? defLocal?.clave ?? 0;
        const defectoNombre =
          det.defectoNombre ?? defLocal?.defecto ?? `Defecto #${det.defectoId}`;
        const clasificacion = det.clasificacion ?? defLocal?.clasificacion ?? 'MAYOR';
        const defDepto =
          det.defDeptoNombre ?? defLocal?.departamentoNombre ?? deptoAudNombre;

        const fila: InspeccionFilaResponse = {
          id: computeLocalRowId(item.idLocalCliente, idx),
          inspeccionId: computeLocalRowId(item.idLocalCliente, 0),
          folio: item.folioServidor || `LOCAL-${item.idLocalCliente.slice(0, 8).toUpperCase()}`,
          departamentoAuditoria: deptoAudNombre,
          departamentoAuditoriaCodigo: deptoAudCodigo,
          fecha: item.fechaCapturaDispositivo,
          lista: loteLocal?.lista || (item.esContingencia ? 'CONTINGENCIA' : 'LOCAL'),
          lote: item.payload.lote,
          linea: item.payload.lineaTexto || 'L1',
          modelo: loteLocal?.modelo || (item.esContingencia ? 'POR VALIDAR' : 'SINCRONIZACIÓN PENDIENTE'),
          descripcion: item.esContingencia
            ? `Contingencia: ${item.motivoContingencia || 'Lote no precargado'}`
            : (loteLocal?.descripcion ?? null),
          horma: item.payload.horma || loteLocal?.horma || 'N/A',
          cliente: loteLocal?.cliente || 'MBC',
          cantidadLote: loteLocal?.cantidad || 0,
          defDepto,
          defectoId: det.defectoId,
          defectoClave,
          defectoNombre,
          clasificacion,
          paresDefectuosos: det.paresDefectuosos,
          notas: det.notas || item.payload.notas || null,
          usuario: item.inspectorNombre || item.inspectorUsuario,
          terminal: item.terminalNombre,
          terminalId: item.terminalId,
          esLocalPendiente: true,
          idLocalCliente: item.idLocalCliente,
          estadoColaLocal:
            item.estado === 'SINCRONIZADA' ? 'PENDIENTE' : item.estado,
          ultimoErrorSync: item.ultimoError,
          esContingencia: item.esContingencia,
          motivoContingencia: item.motivoContingencia,
        };

        if (termBusqueda) {
          const coincide =
            fila.lote.toUpperCase().includes(termBusqueda) ||
            fila.lista.toUpperCase().includes(termBusqueda) ||
            fila.modelo.toUpperCase().includes(termBusqueda) ||
            fila.defectoNombre.toUpperCase().includes(termBusqueda) ||
            String(fila.defectoClave).includes(termBusqueda) ||
            fila.usuario.toUpperCase().includes(termBusqueda);
          if (!coincide) return;
        }

        filas.push(fila);
      });
    }

    return filas;
  }

  /**
   * Obtiene el resumen actual de la cola de capturas offline y contingencias.
   */
  public async obtenerResumenCola(): Promise<ResumenColaOffline> {
    if (!idbDatabase.getAvailable()) {
      return {
        pendientes: 0,
        sincronizando: 0,
        erroresReintentables: 0,
        requierenRevision: 0,
        contingencias: 0,
        items: [],
      };
    }

    const [items, contingencias] = await Promise.all([
      idbDatabase.getAll<ColaInspeccionStore>('cola_inspecciones'),
      idbDatabase.getAll<ContingenciaInspeccionStore>('contingencias_inspecciones'),
    ]);

    const ordenados = [...items].sort((a, b) =>
      a.fechaCapturaDispositivo.localeCompare(b.fechaCapturaDispositivo),
    );

    return {
      pendientes: ordenados.filter((i) => i.estado === 'PENDIENTE').length,
      sincronizando: ordenados.filter((i) => i.estado === 'SINCRONIZANDO').length,
      erroresReintentables: ordenados.filter((i) => i.estado === 'ERROR_REINTENTABLE').length,
      requierenRevision: ordenados.filter((i) => i.estado === 'REQUIERE_REVISION').length,
      contingencias: contingencias.length,
      items: ordenados,
    };
  }

  private async tryAcquireSyncLock(nowMs: number): Promise<boolean> {
    try {
      const lockMeta = await idbDatabase.get<{ clave: string; valor: number }>(
        'meta_sincronizacion',
        'sync_cola_lock_until_ms',
      );
      if (lockMeta && typeof lockMeta.valor === 'number' && lockMeta.valor > nowMs) {
        return false;
      }
      await idbDatabase.put('meta_sincronizacion', {
        clave: 'sync_cola_lock_until_ms',
        valor: nowMs + this.LOCK_LEASE_MS,
        actualizadoEn: new Date(nowMs).toISOString(),
      });
      return true;
    } catch {
      return true;
    }
  }

  private async releaseSyncLock(): Promise<void> {
    try {
      await idbDatabase.delete('meta_sincronizacion', 'sync_cola_lock_until_ms');
    } catch {
      // Ignorar al liberar lock
    }
  }

  /**
   * Sincroniza la cola local de inspecciones pendientes con el servidor (`POST /api/v1/inspecciones/sync`).
   * - Usa un mutex en memoria y un lease en `meta_sincronizacion` para evitar que dos sincronizadores
   *   procesen el mismo registro en paralelo.
   * - Soporta elementos capturados por múltiples inspectores distintos en la misma PC.
   * - Aplica backoff exponencial ante fallos transitorios de red o de base de datos (`ERROR_REINTENTABLE`).
   * - Mueve rechazos definitivos o conflictos de idempotencia a `contingencias_inspecciones` para no perder trazabilidad.
   * - Elimina un elemento de `cola_inspecciones` ÚNICAMENTE cuando el servidor confirma persistencia en MySQL
   *   (`SINCRONIZADA` o `REPETIDA_IDEMPOTENTE`).
   */
  public async sincronizarCola(options: { forceIgnoreBackoff?: boolean } = {}): Promise<{
    sincronizadas: number;
    pendientes: number;
  }> {
    if (!idbDatabase.getAvailable()) return { sincronizadas: 0, pendientes: 0 };
    if (!terminalStorage.getCredential()) {
      const res = await this.obtenerResumenCola();
      return { sincronizadas: 0, pendientes: res.pendientes + res.erroresReintentables };
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      const res = await this.obtenerResumenCola();
      return { sincronizadas: 0, pendientes: res.pendientes + res.erroresReintentables };
    }

    if (this.syncInFlightPromise) {
      return this.syncInFlightPromise;
    }

    this.syncInFlightPromise = (async () => {
      const nowMs = Date.now();
      const acquired = await this.tryAcquireSyncLock(nowMs);
      if (!acquired) {
        const res = await this.obtenerResumenCola();
        return { sincronizadas: 0, pendientes: res.pendientes + res.erroresReintentables };
      }

      let totalSincronizadas = 0;
      try {
        const todos = await idbDatabase.getAll<ColaInspeccionStore>('cola_inspecciones');
        const candidatos = todos
          .filter((item) => {
            if (item.estado === 'PENDIENTE') return true;
            if (item.estado === 'ERROR_REINTENTABLE') {
              if (options.forceIgnoreBackoff) return true;
              return !item.proximoReintentoEn || item.proximoReintentoEn <= Date.now();
            }
            return false;
          })
          .sort((a, b) => a.fechaCapturaDispositivo.localeCompare(b.fechaCapturaDispositivo));

        if (candidatos.length === 0) {
          const res = await this.obtenerResumenCola();
          return { sincronizadas: 0, pendientes: res.pendientes + res.erroresReintentables };
        }

        // Marcar candidatos como SINCRONIZANDO antes de enviar
        const ahoraIso = new Date().toISOString();
        for (const item of candidatos) {
          await idbDatabase.put<ColaInspeccionStore>('cola_inspecciones', {
            ...item,
            estado: 'SINCRONIZANDO',
            actualizadoEn: ahoraIso,
          });
        }
        await this.notifyListeners();

        // Procesar en lotes de máximo 25 elementos
        const TAM_LOTE = 25;
        for (let i = 0; i < candidatos.length; i += TAM_LOTE) {
          const loteItems = candidatos.slice(i, i + TAM_LOTE);
          try {
            const response = await httpClient.post<ApiResponse<SyncOfflineBatchResponse>>(
              '/inspecciones/sync',
              {
                items: loteItems.map((c) => ({
                  idLocalCliente: c.idLocalCliente,
                  inspectorId: c.inspectorId,
                  offlineToken: c.offlineToken,
                  fechaCapturaDispositivo: c.fechaCapturaDispositivo,
                  esContingencia: c.esContingencia,
                  motivoContingencia: c.motivoContingencia,
                  payload: {
                    lote: c.payload.lote,
                    lineaId: c.payload.lineaId,
                    lineaTexto: c.payload.lineaTexto,
                    horma: c.payload.horma,
                    notas: c.payload.notas,
                    detalles: c.payload.detalles.map((d) => ({
                      defectoId: d.defectoId,
                      defDeptoId: d.defDeptoId,
                      paresDefectuosos: d.paresDefectuosos,
                      notas: d.notas,
                    })),
                  },
                })),
              },
            );

            const resultados = response.data?.resultados || [];
            const mapaResultados = new Map(resultados.map((r) => [r.idLocalCliente, r]));

            for (const item of loteItems) {
              const resItem = mapaResultados.get(item.idLocalCliente);
              if (!resItem) {
                await this.marcarErrorReintentable(
                  item,
                  'El servidor no devolvió confirmación para esta captura.',
                );
                continue;
              }

              if (
                resItem.estado === 'SINCRONIZADA' ||
                resItem.estado === 'REPETIDA_IDEMPOTENTE'
              ) {
                // Confirmado en MySQL: eliminar de la cola pendiente
                await idbDatabase.delete('cola_inspecciones', item.idLocalCliente);
                totalSincronizadas += 1;
              } else if (resItem.estado === 'ERROR_REINTENTABLE') {
                await this.marcarErrorReintentable(
                  item,
                  resItem.mensaje || 'Error temporal al guardar en MySQL; pendiente de reintento.',
                  resItem.folio,
                  resItem.inspeccionId,
                );
              } else if (resItem.estado === 'REQUIERE_REVISION') {
                await idbDatabase.put<ColaInspeccionStore>('cola_inspecciones', {
                  ...item,
                  estado: 'REQUIERE_REVISION',
                  ultimoError: resItem.mensaje,
                  folioServidor: resItem.folio ?? item.folioServidor,
                  inspeccionIdServidor: resItem.inspeccionId ?? item.inspeccionIdServidor,
                  actualizadoEn: new Date().toISOString(),
                });
              } else {
                // RECHAZADA o CONFLICTO_IDEMPOTENCIA: conservar en contingencias_inspecciones para auditoría/revisión sin bloquear la cola
                const contingencia: ContingenciaInspeccionStore = {
                  idLocalCliente: item.idLocalCliente,
                  inspectorId: item.inspectorId,
                  inspectorUsuario: item.inspectorUsuario,
                  inspectorNombre: item.inspectorNombre,
                  terminalId: item.terminalId,
                  departamentoAuditoriaId: item.departamentoAuditoriaId,
                  fechaCapturaDispositivo: item.fechaCapturaDispositivo,
                  codigoError: resItem.estado,
                  mensajeError: resItem.mensaje,
                  esContingencia: item.esContingencia,
                  motivoContingencia: item.motivoContingencia,
                  payload: item.payload,
                  registradoEn: new Date().toISOString(),
                };
                await idbDatabase.put<ContingenciaInspeccionStore>(
                  'contingencias_inspecciones',
                  contingencia,
                );
                await idbDatabase.delete('cola_inspecciones', item.idLocalCliente);
              }
            }
          } catch (batchErr: any) {
            // Fallo de red o caída del servidor durante el envío del lote: conservar todas las capturas con backoff exponencial
            const msg = batchErr?.message || 'Error de conexión al sincronizar con el servidor.';
            for (const item of loteItems) {
              await this.marcarErrorReintentable(item, msg);
            }
          }
        }
      } finally {
        await this.releaseSyncLock();
        await this.notifyListeners();
        this.syncInFlightPromise = null;
      }

      const resumenFinal = await this.obtenerResumenCola();
      return {
        sincronizadas: totalSincronizadas,
        pendientes: resumenFinal.pendientes + resumenFinal.erroresReintentables,
      };
    })();

    return this.syncInFlightPromise;
  }

  private async marcarErrorReintentable(
    item: ColaInspeccionStore,
    mensajeError: string,
    folioServidor?: string,
    inspeccionIdServidor?: number,
  ): Promise<void> {
    const nuevosIntentos = (item.intentos || 0) + 1;
    // Backoff exponencial: 2s, 4s, 8s, 16s, 32s, máx 60s
    const delayMs = Math.min(60_000, Math.pow(2, Math.min(nuevosIntentos, 6)) * 1000);
    await idbDatabase.put<ColaInspeccionStore>('cola_inspecciones', {
      ...item,
      estado: 'ERROR_REINTENTABLE',
      intentos: nuevosIntentos,
      ultimoError: mensajeError,
      proximoReintentoEn: Date.now() + delayMs,
      folioServidor: folioServidor ?? item.folioServidor ?? null,
      inspeccionIdServidor: inspeccionIdServidor ?? item.inspeccionIdServidor ?? null,
      actualizadoEn: new Date().toISOString(),
    });
    this.scheduleBackoffRetry(delayMs);
  }
}

export const inspeccionesOfflineService = new InspeccionesOfflineService();
