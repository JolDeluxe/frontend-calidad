import { httpClient, type ApiResponse } from '@/lib/api/http-client';
import {
  idbDatabase,
  type DefectoOfflineStore,
  type InspectorOfflineStore,
  type LoteOfflineStore,
  type MatrizVisibilidadOfflineStore,
  type SesionOfflineStore,
  type TerminalProfileStore,
} from '@/lib/db/idb-database';
import type { Defecto } from '@/features/defectos/types/defectos.types';
import {
  terminalStorage,
  type TerminalPublicInfo,
} from '@/features/terminales/services/terminal-storage';

export interface LotesOfflineResponse {
  items: Array<{
    id: number;
    lote: string;
    lista: string;
    idProducto: string;
    modelo: string;
    descripcion: string | null;
    cantidad: number;
    horma: string | null;
    cliente: string;
    activo: boolean;
    actualizadoEn: string;
  }>;
  hasMore: boolean;
  nextCursor: number | null;
  totalLote: number;
  servidorTimestamp: string;
}

export interface OfflineTokenResponse {
  offlineToken: string;
  emitidoEn?: number;
  expiraEn: number;
  vigenciaSegundos: number;
  inspector: {
    id: number;
    usuario: string;
    nombre: string;
  };
  terminal: {
    id: number;
    nombre: string;
    departamentoId: number;
  };
}

export interface InspectoresOfflineCatalogResponse {
  inspectores: Array<{
    inspectorId: number;
    usuario: string;
    nombre: string;
    rolCodigo: string;
    activo: boolean;
    permisos: string[];
    saltOffline: string;
    verifierOffline: string;
    iteracionesPbkdf2: number;
    offlineToken: string;
    emitidoEn: number;
    expiraEn: number;
    vigenciaSegundos: number;
  }>;
  terminal: {
    id: number;
    nombre: string;
    departamentoId: number;
  };
  vigenciaSegundos: number;
  servidorTimestamp: string;
}

interface DefectosPaginatedResponse {
  items: Defecto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CatalogoOfflineService {
  private sincronizandoLotes: boolean = false;
  private sincronizandoDefectos: boolean = false;
  private sincronizandoInspectores: boolean = false;
  private sincronizandoTodoPromise: Promise<void> | null = null;

  /**
   * Registra y verifica la marca temporal monotónica local (`max_observed_timestamp_ms`).
   * Si el reloj del dispositivo retrocede de forma anómala (> 5 minutos respecto al máximo observado),
   * devuelve `clockRollbackDetected: true` para impedir extender artificialmente la ventana de 48h.
   */
  async verificarYActualizarRelojMonotonico(nowMs: number = Date.now()): Promise<{
    clockRollbackDetected: boolean;
    maxObservedMs: number;
  }> {
    if (!idbDatabase.getAvailable()) {
      return { clockRollbackDetected: false, maxObservedMs: nowMs };
    }

    try {
      const meta = await idbDatabase.get<{ clave: string; valor: number }>(
        'meta_sincronizacion',
        'max_observed_timestamp_ms',
      );
      const prevMax = typeof meta?.valor === 'number' ? meta.valor : 0;
      const TOLERANCIA_DERIVA_MS = 5 * 60 * 1000; // 5 minutos

      if (prevMax > 0 && nowMs + TOLERANCIA_DERIVA_MS < prevMax) {
        return { clockRollbackDetected: true, maxObservedMs: prevMax };
      }

      const nextMax = Math.max(prevMax, nowMs);
      await idbDatabase.put('meta_sincronizacion', {
        clave: 'max_observed_timestamp_ms',
        valor: nextMax,
        actualizadoEn: new Date(nowMs).toISOString(),
      });

      return { clockRollbackDetected: false, maxObservedMs: nextMax };
    } catch {
      return { clockRollbackDetected: false, maxObservedMs: nowMs };
    }
  }

  /**
   * Solicita al servidor un token offline de 48 horas y lo guarda en IndexedDB.
   * Solo aplica cuando el navegador tiene credencial de terminal vinculada (`x-terminal-credential`).
   */
  async sincronizarSesionOffline(): Promise<SesionOfflineStore | null> {
    if (!idbDatabase.getAvailable()) return null;
    if (!terminalStorage.getCredential()) return null;

    try {
      const res = await httpClient.post<ApiResponse<OfflineTokenResponse>>('/auth/offline-token');
      if (!res.data?.offlineToken) return null;

      const data = res.data;
      const registro: SesionOfflineStore = {
        id: 'activa',
        inspectorId: data.inspector.id,
        usuario: data.inspector.usuario,
        nombre: data.inspector.nombre,
        terminalId: data.terminal.id,
        terminalNombre: data.terminal.nombre,
        departamentoId: data.terminal.departamentoId,
        offlineToken: data.offlineToken,
        emitidoEn: data.emitidoEn ?? Math.floor(Date.now() / 1000),
        expiraEn: data.expiraEn,
        vigenciaSegundos: data.vigenciaSegundos,
        guardadoEn: new Date().toISOString(),
      };

      await idbDatabase.put('sesion_offline', registro);
      await this.verificarYActualizarRelojMonotonico();
      return registro;
    } catch (err) {
      console.warn('[Offline] No se pudo obtener el token offline:', err);
      return null;
    }
  }

  /**
   * Guarda el perfil de la terminal física en IndexedDB.
   */
  async sincronizarTerminalProfile(term: TerminalPublicInfo): Promise<void> {
    if (!idbDatabase.getAvailable()) return;

    const profile: TerminalProfileStore = {
      id: 'local',
      terminalId: term.id,
      nombre: term.nombre,
      departamentoId: term.departamentoId,
      departamentoCodigo: term.departamentoCodigo,
      departamentoNombre: term.departamentoNombre,
      guardadoEn: new Date().toISOString(),
    };

    await idbDatabase.put('terminal_profile', profile);
  }

  /**
   * Descarga y sincroniza el catálogo de inspectores activos autorizados para capturar offline en esta terminal.
   * - Agrega inspectores nuevos.
   * - Actualiza verificadores PBKDF2, salts y tokens de 48h de los inspectores existentes.
   * - Elimina del catálogo de acceso local a los inspectores dados de baja o sin permiso `defectos.capturar`.
   */
  async sincronizarInspectoresOffline(): Promise<number> {
    if (!idbDatabase.getAvailable()) return 0;
    if (!terminalStorage.getCredential()) return 0;
    if (this.sincronizandoInspectores) return 0;

    this.sincronizandoInspectores = true;
    try {
      const res = await httpClient.get<ApiResponse<InspectoresOfflineCatalogResponse>>(
        '/auth/inspectores-offline',
      );
      const data = res.data;
      if (!data || !Array.isArray(data.inspectores)) {
        return 0;
      }

      const ahoraIso = new Date().toISOString();
      const existentes = await idbDatabase.getAll<InspectorOfflineStore>('cat_inspectores');
      const mapaExistentes = new Map(existentes.map((i) => [i.inspectorId, i]));

      const registrosActualizados: InspectorOfflineStore[] = [];

      for (const item of data.inspectores) {
        if (
          typeof item.inspectorId !== 'number' ||
          !item.usuario ||
          !item.nombre ||
          !item.saltOffline ||
          !item.verifierOffline ||
          !item.offlineToken
        ) {
          continue;
        }

        const previo = mapaExistentes.get(item.inspectorId);
        // Si el salt cambió (hubo cambio de contraseña en el servidor), se reinician los intentos fallidos locales
        const mismoSalt = previo && previo.saltOffline === item.saltOffline;

        registrosActualizados.push({
          inspectorId: item.inspectorId,
          usuario: item.usuario,
          nombre: item.nombre,
          rolCodigo: item.rolCodigo,
          activo: Boolean(item.activo),
          permisos: Array.isArray(item.permisos) ? item.permisos : ['defectos.capturar'],
          saltOffline: item.saltOffline,
          verifierOffline: item.verifierOffline,
          iteracionesPbkdf2: item.iteracionesPbkdf2 || 100000,
          offlineToken: item.offlineToken,
          emitidoEn: item.emitidoEn,
          expiraEn: item.expiraEn,
          vigenciaSegundos: item.vigenciaSegundos,
          intentosFallidos: mismoSalt ? previo.intentosFallidos : 0,
          bloqueadoHasta: mismoSalt ? previo.bloqueadoHasta : null,
          actualizadoEn: ahoraIso,
        });
      }

      // Reemplazo atómico en una sola transacción: purga automáticamente inspectores desactivados/revocados
      await idbDatabase.replaceAllAtomic('cat_inspectores', registrosActualizados);

      // Si hay una sesión offline activa en esta terminal y el inspector sigue en el catálogo, renovar su token
      const sesionActiva = await idbDatabase.get<SesionOfflineStore>('sesion_offline', 'activa');
      if (sesionActiva) {
        const inspectorRenovado = registrosActualizados.find(
          (i) => i.inspectorId === sesionActiva.inspectorId,
        );
        if (inspectorRenovado) {
          await idbDatabase.put<SesionOfflineStore>('sesion_offline', {
            ...sesionActiva,
            offlineToken: inspectorRenovado.offlineToken,
            emitidoEn: inspectorRenovado.emitidoEn,
            expiraEn: inspectorRenovado.expiraEn,
            vigenciaSegundos: inspectorRenovado.vigenciaSegundos,
            guardadoEn: ahoraIso,
          });
        } else {
          // El inspector de la sesión offline activa fue desactivado en el servidor: cerrar sesión local
          await idbDatabase.delete('sesion_offline', 'activa');
        }
      }

      await idbDatabase.put('meta_sincronizacion', {
        clave: 'inspectores_actualizado_en',
        valor: data.servidorTimestamp || ahoraIso,
        actualizadoEn: ahoraIso,
      });

      if (data.servidorTimestamp) {
        const serverMs = Date.parse(data.servidorTimestamp);
        if (!Number.isNaN(serverMs)) {
          await this.verificarYActualizarRelojMonotonico(serverMs);
        }
      }

      return registrosActualizados.length;
    } catch (err) {
      console.warn('[Offline] Error sincronizando catálogo de inspectores offline:', err);
      return 0;
    } finally {
      this.sincronizandoInspectores = false;
    }
  }

  /**
   * Descarga todas las páginas de los defectos autorizados para la etapa del departamento auditor.
   * Valida la estructura de cada elemento y solo reemplaza `cat_defectos` cuando todas las páginas
   * se descargaron exitosamente (preservando el catálogo previo si ocurre un fallo a mitad).
   */
  async sincronizarDefectos(etapaId?: number): Promise<number> {
    if (!idbDatabase.getAvailable()) return 0;
    if (this.sincronizandoDefectos) return 0;

    this.sincronizandoDefectos = true;
    try {
      // 1. Verificación de versión del catálogo offline para purga de defectos obsoletos
      const metaVersion = await idbDatabase.get<{ clave: string; valor: number }>(
        'meta_sincronizacion',
        'defectos_cache_version',
      );
      if (metaVersion?.valor !== 3) {
        // Purga preventiva de defectos residuales o corruptos
        await idbDatabase.clear('cat_defectos');
      }

      const acumulados: DefectoOfflineStore[] = [];
      let page = 1;
      let totalPages = 1;
      const limit = 200;

      // Descargamos todo el universo de defectos activos oficiales
      while (page <= totalPages) {
        const queryParams = new URLSearchParams();
        queryParams.set('activo', 'true');
        queryParams.set('page', String(page));
        queryParams.set('limit', String(limit));

        const res = await httpClient.get<ApiResponse<DefectosPaginatedResponse | Defecto[]>>(
          `/defectos?${queryParams.toString()}`,
        );

        const rawData = res.data;
        if (!rawData) {
          throw new Error('Respuesta vacía al consultar catálogo de defectos');
        }

        let pageItems: Defecto[];
        if (Array.isArray(rawData)) {
          pageItems = rawData;
          totalPages = 1;
        } else if (Array.isArray(rawData.items)) {
          pageItems = rawData.items;
          totalPages = Math.max(1, Number(rawData.totalPages) || 1);
        } else {
          throw new Error('Contrato de respuesta de defectos no válido');
        }

        for (const d of pageItems) {
          const deptoId = Number(d.departamentoId || d.departamento?.id || 0);
          if (
            typeof d.id !== 'number' ||
            typeof d.clave !== 'number' ||
            typeof d.defecto !== 'string' ||
            !d.defecto.trim() ||
            !['CRITICO', 'MAYOR', 'MENOR'].includes(d.clasificacion) ||
            deptoId <= 0
          ) {
            continue;
          }

          const etapasPermitidasIds = Array.isArray(d.etapas)
            ? d.etapas.filter((e) => e.permitido).map((e) => Number(e.departamentoId))
            : [];

          const lineasSet = new Set<number>();
          d.departamentos?.forEach((dep) => {
            if (dep.activo) {
              dep.departamento?.lineasAsociadas?.forEach((la) => {
                if (la.activo && la.linea?.id) {
                  lineasSet.add(Number(la.linea.id));
                }
              });
            }
          });

          acumulados.push({
            id: d.id,
            clave: d.clave,
            defecto: d.defecto,
            clasificacion: d.clasificacion,
            departamentoId: deptoId,
            departamentoCodigo: d.departamento?.codigo,
            departamentoNombre: d.departamento?.nombre,
            etapaId,
            etapasPermitidasIds,
            lineasIds: Array.from(lineasSet),
            activo: d.activo !== false && !d.eliminadoEn,
            permitidoEnEtapa: true,
          });
        }

        page += 1;
      }

      // Reemplazo atómico autoritativo total: solo conserva los defectos activos reales del servidor
      if (acumulados.length > 0) {
        await idbDatabase.replaceAllAtomic('cat_defectos', acumulados);

        await idbDatabase.put('meta_sincronizacion', {
          clave: 'defectos_cache_version',
          valor: 3,
          actualizadoEn: new Date().toISOString(),
        });

        await idbDatabase.put('meta_sincronizacion', {
          clave: 'defectos_actualizado_en',
          valor: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
        });

        if (etapaId && etapaId > 0) {
          await idbDatabase.put('meta_sincronizacion', {
            clave: 'defectos_etapa_id',
            valor: etapaId,
            actualizadoEn: new Date().toISOString(),
          });
        }
      }

      return acumulados.length;
    } catch (err) {
      console.warn('[Offline] Error sincronizando defectos (se conserva catálogo local previo):', err);
      return 0;
    } finally {
      this.sincronizandoDefectos = false;
    }
  }

  /**
   * Guarda en `cat_defectos` una colección de defectos obtenida por una consulta en línea exitosa,
   * garantizando que si el backend se apaga antes de que finalice `sincronizarTodoEnBackground`,
   * el catálogo local ya cuente con los defectos de la etapa consultada.
   */
  async guardarDefectosEnCacheLocal(items: Defecto[], etapaId?: number): Promise<void> {
    if (!idbDatabase.getAvailable() || !Array.isArray(items) || items.length === 0) return;

    try {
      const registros: DefectoOfflineStore[] = [];
      for (const d of items) {
        const deptoId = Number(d.departamentoId || d.departamento?.id || 0);
        if (
          typeof d.id !== 'number' ||
          typeof d.clave !== 'number' ||
          typeof d.defecto !== 'string' ||
          !d.defecto.trim() ||
          !['CRITICO', 'MAYOR', 'MENOR'].includes(d.clasificacion) ||
          deptoId <= 0
        ) {
          continue;
        }

        const etapasPermitidasIds = Array.isArray(d.etapas)
          ? d.etapas.filter((e) => e.permitido).map((e) => Number(e.departamentoId))
          : etapaId
          ? [etapaId]
          : [];
        if (etapaId && !etapasPermitidasIds.includes(etapaId)) {
          etapasPermitidasIds.push(etapaId);
        }

        const lineasSet = new Set<number>();
        d.departamentos?.forEach((dep) => {
          if (dep.activo) {
            dep.departamento?.lineasAsociadas?.forEach((la) => {
              if (la.activo && la.linea?.id) {
                lineasSet.add(Number(la.linea.id));
              }
            });
          }
        });

        // Ignorar defectos eliminados o inactivos para evitar ensuciar el catálogo local
        if (d.activo === false || Boolean(d.eliminadoEn)) {
          continue;
        }

        registros.push({
          id: d.id,
          clave: d.clave,
          defecto: d.defecto,
          clasificacion: d.clasificacion,
          departamentoId: deptoId,
          departamentoCodigo: d.departamento?.codigo,
          departamentoNombre: d.departamento?.nombre,
          etapaId,
          etapasPermitidasIds,
          lineasIds: Array.from(lineasSet),
          activo: Boolean(d.activo) && !d.eliminadoEn,
          permitidoEnEtapa: true,
        });
      }

      if (registros.length > 0) {
        await idbDatabase.putBatch('cat_defectos', registros);
        if (etapaId && etapaId > 0) {
          await idbDatabase.put('meta_sincronizacion', {
            clave: 'defectos_etapa_id',
            valor: etapaId,
            actualizadoEn: new Date().toISOString(),
          });
        }
      }
    } catch {
      // No interrumpir flujo principal si falla caché oportunista
    }
  }

  /**
   * Sincroniza la matriz maestra de visibilidad de defectos desde el backend y la almacena en IndexedDB
   * para resolución local sin conexión de reglas generales y compatibilidad de departamentos.
   */
  async sincronizarMatrizVisibilidad(): Promise<number> {
    if (!idbDatabase.getAvailable()) return 0;
    try {
      const res = await httpClient.get<ApiResponse<{
        departamentos: Array<{ id: number; codigo: string; nombre: string }>;
        matrices: Array<{
          departamentoOrigenId: number;
          departamentoOrigenCodigo: string;
          departamentoOrigenNombre: string;
          destinos: Array<{
            departamentoDestinoId: number;
            departamentoDestinoCodigo: string;
            departamentoDestinoNombre: string;
            permitido: boolean;
            configurado: boolean;
          }>;
        }>;
      }>>('/defectos/matriz-visibilidad');

      if (!res.data?.matrices || !Array.isArray(res.data.matrices)) {
        return 0;
      }

      const ahoraIso = new Date().toISOString();
      const versionConfiguracion = `v_${Date.now()}`;
      const registros: MatrizVisibilidadOfflineStore[] = [];

      for (const m of res.data.matrices) {
        const origenId = Number(m.departamentoOrigenId);
        if (!origenId || !Array.isArray(m.destinos)) continue;

        for (const d of m.destinos) {
          const destinoId = Number(d.departamentoDestinoId);
          if (!destinoId) continue;

          const key = `${origenId}_${destinoId}`;
          const hashIntegridad = `${key}:${d.permitido ? '1' : '0'}:${versionConfiguracion}`;

          registros.push({
            key,
            departamentoOrigenId: origenId,
            departamentoDestinoId: destinoId,
            permitido: Boolean(d.permitido),
            versionConfiguracion,
            actualizadoEn: ahoraIso,
            hashIntegridad,
          });
        }
      }

      if (registros.length > 0) {
        await idbDatabase.replaceAllAtomic('matriz_visibilidad', registros);
        await idbDatabase.put('meta_sincronizacion', {
          clave: 'matriz_visibilidad_actualizado_en',
          valor: ahoraIso,
          actualizadoEn: ahoraIso,
        });
      }

      return registros.length;
    } catch (err) {
      console.warn('[Offline] No fue posible sincronizar la matriz de visibilidad de defectos:', err);
      return 0;
    }
  }

  /**
   * Descarga completa paginada y/o sincronización diferencial del maestro de lotes activos.
   * - Fija la marca temporal `inicioSyncTimestamp` tomada de la primera página ANTES de recorrer el resto,
   *   garantizando que modificaciones concurrentes durante la descarga no se omitan en la siguiente corrida.
   * - Solo persiste `lotes_ultimo_sync` cuando todas las páginas finalizan sin errores.
   */
  async sincronizarLotes(): Promise<{ descargados: number; eliminados: number; completado: boolean }> {
    if (!idbDatabase.getAvailable()) return { descargados: 0, eliminados: 0, completado: false };
    if (!terminalStorage.getCredential()) return { descargados: 0, eliminados: 0, completado: false };
    if (this.sincronizandoLotes) return { descargados: 0, eliminados: 0, completado: false };

    this.sincronizandoLotes = true;
    let totalDescargados = 0;
    let totalEliminados = 0;

    try {
      // 1. Verificar si tenemos una marca temporal previa para sync diferencial
      const meta = await idbDatabase.get<{ clave: string; valor: string }>(
        'meta_sincronizacion',
        'lotes_ultimo_sync',
      );
      // Migración de esquema local: si nunca se ha hecho sync completo con descripción de lotes,
      // invalidar el watermark para forzar una sincronización limpia que pueble 'descripcion'.
      const metaVersionDesc = await idbDatabase.get<{ clave: string; valor: number }>(
        'meta_sincronizacion',
        'lotes_sync_schema_version',
      );
      const desdeTimestamp = metaVersionDesc?.valor === 2 ? meta?.valor : undefined;

      let cursor = 0;
      let hasMore = true;
      let inicioSyncTimestamp: string | null = null;

      while (hasMore) {
        const queryParams = new URLSearchParams();
        queryParams.set('limit', '500');
        if (cursor > 0) queryParams.set('cursor', String(cursor));
        if (desdeTimestamp) queryParams.set('desde', desdeTimestamp);

        const res = await httpClient.get<ApiResponse<LotesOfflineResponse>>(
          `/lotes/catalogo-offline?${queryParams.toString()}`,
        );

        if (!res.data || !Array.isArray(res.data.items)) {
          throw new Error('Respuesta inválida en sincronización de catálogo de lotes');
        }

        const data = res.data;
        // Tomamos el timestamp del servidor de la PRIMERA página para no avanzar el watermark más allá
        // de cambios ocurridos en páginas ya leídas mientras se leían las siguientes páginas.
        if (!inicioSyncTimestamp && data.servidorTimestamp) {
          inicioSyncTimestamp = data.servidorTimestamp;
        }

        const loteItems = data.items;
        if (loteItems.length === 0) {
          hasMore = false;
          break;
        }

        // Separar altas/modificaciones de bajas/inactivaciones
        const paraGuardar: LoteOfflineStore[] = [];
        const paraEliminar: string[] = [];

        for (const item of loteItems) {
          if (!item || typeof item.lote !== 'string' || !item.lote.trim()) continue;
          const loteNormalizado = item.lote.trim().toUpperCase();

          if (item.activo) {
            paraGuardar.push({
              lote: loteNormalizado,
              id: Number(item.id),
              lista: String(item.lista || ''),
              idProducto: String(item.idProducto || ''),
              modelo: String(item.modelo || ''),
              descripcion: item.descripcion ?? null,
              cantidad: Number(item.cantidad) || 0,
              horma: item.horma ?? null,
              cliente: String(item.cliente || ''),
              actualizadoEn: String(item.actualizadoEn || new Date().toISOString()),
            });
          } else {
            paraEliminar.push(loteNormalizado);
          }
        }

        if (paraGuardar.length > 0) {
          await idbDatabase.putBatch('cat_lotes', paraGuardar);
          totalDescargados += paraGuardar.length;
        }

        for (const loteKey of paraEliminar) {
          await idbDatabase.delete('cat_lotes', loteKey);
          totalEliminados += 1;
        }

        hasMore = Boolean(data.hasMore);
        cursor = data.nextCursor || 0;
      }

      // Solo actualizamos la marca temporal cuando TODAS las páginas finalizaron con éxito
      const watermarkFinal = inicioSyncTimestamp || new Date().toISOString();
      await idbDatabase.put('meta_sincronizacion', {
        clave: 'lotes_ultimo_sync',
        valor: watermarkFinal,
        actualizadoEn: new Date().toISOString(),
      });
      await idbDatabase.put('meta_sincronizacion', {
        clave: 'lotes_sync_schema_version',
        valor: 2,
        actualizadoEn: new Date().toISOString(),
      });

      return { descargados: totalDescargados, eliminados: totalEliminados, completado: true };
    } catch (err) {
      console.warn('[Offline] Error en sincronización de lotes (watermark anterior conservado):', err);
      return { descargados: totalDescargados, eliminados: totalEliminados, completado: false };
    } finally {
      this.sincronizandoLotes = false;
    }
  }

  /**
   * Orquesta la precarga y actualización en segundo plano de todos los catálogos de la terminal
   * (perfil de terminal, inspectores autorizados, defectos de la etapa y lotes activos),
   * evitando ejecuciones duplicadas simultáneas.
   */
  async sincronizarTodoEnBackground(terminal?: TerminalPublicInfo | null): Promise<void> {
    if (!idbDatabase.getAvailable()) return;
    if (!terminalStorage.getCredential()) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    if (this.sincronizandoTodoPromise) {
      return this.sincronizandoTodoPromise;
    }

    this.sincronizandoTodoPromise = (async () => {
      try {
        let deptoId = terminal?.departamentoId;
        if (terminal) {
          await this.sincronizarTerminalProfile(terminal);
        } else {
          const cachedTerm = await idbDatabase.get<TerminalProfileStore>('terminal_profile', 'local');
          deptoId = cachedTerm?.departamentoId;
        }

        await Promise.allSettled([
          this.sincronizarInspectoresOffline(),
          this.sincronizarMatrizVisibilidad(),
          deptoId ? this.sincronizarDefectos(deptoId) : Promise.resolve(0),
          this.sincronizarLotes(),
        ]);
      } catch (err) {
        console.warn('[Offline] Error en sincronización integral en segundo plano:', err);
      } finally {
        this.sincronizandoTodoPromise = null;
      }
    })();

    return this.sincronizandoTodoPromise;
  }

  /**
   * Consulta rápida de un lote en la base local IndexedDB.
   */
  async getLoteLocal(codigoLote: string): Promise<LoteOfflineStore | null> {
    if (!idbDatabase.getAvailable()) return null;
    const key = codigoLote.trim().toUpperCase();
    const directo = await idbDatabase.get<LoteOfflineStore>('cat_lotes', key);
    if (directo) return directo;
    // Fallback por si el lote fue almacenado con casing original
    return idbDatabase.get<LoteOfflineStore>('cat_lotes', codigoLote.trim());
  }

  /**
   * Búsqueda local de lotes por coincidencia parcial de código o modelo.
   */
  async buscarLotesLocales(query: string, limit: number = 20): Promise<LoteOfflineStore[]> {
    if (!idbDatabase.getAvailable()) return [];
    const q = query.trim().toUpperCase();
    const todos = await idbDatabase.getAll<LoteOfflineStore>('cat_lotes');
    if (!q) return todos.slice(0, limit);
    return todos
      .filter(
        (l) =>
          l.lote.toUpperCase().includes(q) ||
          l.modelo.toUpperCase().includes(q) ||
          l.lista.toUpperCase().includes(q),
      )
      .slice(0, limit);
  }

  /**
   * Valida un defecto en el almacenamiento local IndexedDB (`cat_defectos`) para una etapa dada.
   * Permite distinguir sin conexión entre:
   * - 'VALIDO': el defecto existe, está activo y está autorizado en la etapa.
   * - 'INACTIVO': el defecto existe localmente pero está marcado inactivo.
   * - 'NO_PERMITIDO': el defecto existe localmente, está activo, pero no incluye la etapa actual.
   * - 'INEXISTENTE': la etapa fue sincronizada formalmente y la clave no existe en el catálogo.
   * - 'SIN_CATALOGO': no hay catálogo sincronizado en el dispositivo para emitir un juicio concluyente.
   */
  async validarDefectoLocalParaCaptura(
    clave: number,
    etapaId?: number,
  ): Promise<{
    estado: 'VALIDO' | 'INEXISTENTE' | 'INACTIVO' | 'NO_PERMITIDO' | 'SIN_CATALOGO';
    mensaje: string;
    defecto: Defecto | null;
  }> {
    if (!idbDatabase.getAvailable()) {
      return {
        estado: 'SIN_CATALOGO',
        mensaje: 'Sin conexión y almacenamiento local no disponible.',
        defecto: null,
      };
    }

    const [todos, metaEtapa] = await Promise.all([
      idbDatabase.getAll<DefectoOfflineStore>('cat_defectos'),
      idbDatabase.get<{ clave: string; valor: number }>('meta_sincronizacion', 'defectos_etapa_id'),
    ]);

    if (!todos || todos.length === 0) {
      return {
        estado: 'SIN_CATALOGO',
        mensaje: 'Sin conexión al servidor y no hay catálogo de defectos guardado en este equipo.',
        defecto: null,
      };
    }

    const encontrado = todos.find((d) => d.clave === clave);
    if (!encontrado) {
      // Si la terminal tiene su catálogo sincronizado para esta etapa o general, sabemos que no existe
      return {
        estado: 'INEXISTENTE',
        mensaje: 'Defecto inexistente',
        defecto: null,
      };
    }

    if (encontrado.activo === false) {
      return {
        estado: 'INACTIVO',
        mensaje: 'Defecto inactivo',
        defecto: null,
      };
    }

    if (etapaId && etapaId > 0) {
      const etapaSincronizadaId = typeof metaEtapa?.valor === 'number' ? metaEtapa.valor : null;
      let permiteEtapa =
        (Array.isArray(encontrado.etapasPermitidasIds) &&
          encontrado.etapasPermitidasIds.includes(etapaId)) ||
        encontrado.etapaId === etapaId ||
        (etapaSincronizadaId === etapaId && encontrado.permitidoEnEtapa);

      // Si no tiene excepción local explícita en cat_defectos, consultar la matriz maestra en IndexedDB
      if (!permiteEtapa && encontrado.departamentoId) {
        const reglaLocal = await idbDatabase.get<MatrizVisibilidadOfflineStore>(
          'matriz_visibilidad',
          `${encontrado.departamentoId}_${etapaId}`,
        );
        if (reglaLocal) {
          permiteEtapa = reglaLocal.permitido;
        } else if (encontrado.departamentoId === etapaId) {
          permiteEtapa = true; // Compatibilidad por defecto en su propio departamento
        }
      }

      if (!permiteEtapa) {
        return {
          estado: 'NO_PERMITIDO',
          mensaje: 'Defecto no permitido',
          defecto: null,
        };
      }
    }

    const etapaSincronizadaId = typeof metaEtapa?.valor === 'number' ? metaEtapa.valor : null;
    const etapasIds =
      Array.isArray(encontrado.etapasPermitidasIds) && encontrado.etapasPermitidasIds.length > 0
        ? encontrado.etapasPermitidasIds
        : encontrado.etapaId
        ? [encontrado.etapaId]
        : etapaSincronizadaId
        ? [etapaSincronizadaId]
        : [];

    const defectoObj: Defecto = {
      id: encontrado.id,
      clave: encontrado.clave,
      defecto: encontrado.defecto,
      clasificacion: encontrado.clasificacion,
      departamentoId: encontrado.departamentoId,
      activo: Boolean(encontrado.activo),
      creadoPor: 0,
      creadoEn: new Date(0).toISOString(),
      departamento: {
        id: encontrado.departamentoId,
        codigo: encontrado.departamentoCodigo || encontrado.departamentoNombre || 'GENERAL',
        nombre: encontrado.departamentoNombre || 'GENERAL',
      },
      etapas: etapasIds.map((etId, idx) => ({
        id: idx + 1,
        departamentoId: etId,
        permitido: true,
      })),
    };

    return {
      estado: 'VALIDO',
      mensaje: 'Defecto válido',
      defecto: defectoObj,
    };
  }

  /**
   * Consulta rápida de los defectos locales en IndexedDB.
   */
  async getDefectosLocales(): Promise<DefectoOfflineStore[]> {
    if (!idbDatabase.getAvailable()) return [];
    return idbDatabase.getAll<DefectoOfflineStore>('cat_defectos');
  }

  /**
   * Consulta paginada y filtrada del catálogo local de defectos en IndexedDB (`cat_defectos`).
   * Respeta `etapaId`, `activo`, `soloEliminados`, `clave`, `busqueda`, `clasificacion`,
   * `departamentoId`, `lineaId`, `lineasIds`, `page` y `limit`.
   */
  async consultarDefectosLocales(filtros: {
    etapaId?: number;
    clave?: number;
    busqueda?: string;
    clasificacion?: string;
    departamentoId?: number;
    lineaId?: number;
    lineasIds?: number[];
    activo?: boolean;
    soloEliminados?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    items: Defecto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    esCacheLocal: boolean;
    etapaSincronizadaId: number | null;
    actualizadoEn: string | null;
  }> {
    const page = Math.max(1, filtros.page || 1);
    const limit = Math.max(1, filtros.limit || 100);

    if (!idbDatabase.getAvailable()) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
        esCacheLocal: true,
        etapaSincronizadaId: null,
        actualizadoEn: null,
      };
    }

    const [todos, metaEtapa, metaFecha] = await Promise.all([
      idbDatabase.getAll<DefectoOfflineStore>('cat_defectos'),
      idbDatabase.get<{ clave: string; valor: number }>('meta_sincronizacion', 'defectos_etapa_id'),
      idbDatabase.get<{ clave: string; valor: string }>(
        'meta_sincronizacion',
        'defectos_actualizado_en',
      ),
    ]);

    const etapaSincronizadaId =
      typeof metaEtapa?.valor === 'number' ? metaEtapa.valor : null;
    const actualizadoEn =
      typeof metaFecha?.valor === 'string' ? metaFecha.valor : null;

    if (filtros.soloEliminados) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 1,
        esCacheLocal: true,
        etapaSincronizadaId,
        actualizadoEn,
      };
    }

    const q = filtros.busqueda?.trim().toLowerCase() || '';

    const filtrados = todos
      .filter((d) => {
        if (filtros.activo !== false && d.activo === false) return false;
        if (!d.permitidoEnEtapa) return false;

        if (filtros.etapaId && filtros.etapaId > 0) {
          const permiteEtapa =
            (Array.isArray(d.etapasPermitidasIds) &&
              d.etapasPermitidasIds.includes(filtros.etapaId)) ||
            d.etapaId === filtros.etapaId;
          if (!permiteEtapa) return false;
        }

        if (filtros.clave !== undefined && d.clave !== filtros.clave) {
          return false;
        }

        if (filtros.clasificacion && d.clasificacion !== filtros.clasificacion) {
          return false;
        }

        if (filtros.departamentoId && d.departamentoId !== filtros.departamentoId) {
          return false;
        }

        if (filtros.lineaId && Array.isArray(d.lineasIds) && d.lineasIds.length > 0) {
          if (!d.lineasIds.includes(filtros.lineaId)) return false;
        } else if (
          filtros.lineasIds &&
          filtros.lineasIds.length > 0 &&
          Array.isArray(d.lineasIds) &&
          d.lineasIds.length > 0
        ) {
          if (!d.lineasIds.some((lid) => filtros.lineasIds!.includes(lid))) return false;
        }

        if (q) {
          const matchClave = String(d.clave).includes(q);
          const matchTexto = d.defecto.toLowerCase().includes(q);
          const matchDepto = (d.departamentoNombre || '').toLowerCase().includes(q);
          if (!matchClave && !matchTexto && !matchDepto) return false;
        }

        return true;
      })
      .sort((a, b) => a.clave - b.clave);

    const total = filtrados.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginados = filtrados.slice(start, start + limit);

    const items: Defecto[] = paginados.map((d) => {
      const etapasIds =
        Array.isArray(d.etapasPermitidasIds) && d.etapasPermitidasIds.length > 0
          ? d.etapasPermitidasIds
          : d.etapaId
          ? [d.etapaId]
          : etapaSincronizadaId
          ? [etapaSincronizadaId]
          : [];

      return {
        id: d.id,
        clave: d.clave,
        defecto: d.defecto,
        clasificacion: d.clasificacion,
        departamentoId: d.departamentoId,
        activo: d.activo !== false,
        creadoPor: 0,
        creadoEn: actualizadoEn || new Date(0).toISOString(),
        departamento: {
          id: d.departamentoId,
          codigo: d.departamentoCodigo || d.departamentoNombre || 'GENERAL',
          nombre: d.departamentoNombre || 'GENERAL',
        },
        etapas: etapasIds.map((etId, idx) => ({
          id: idx + 1,
          departamentoId: etId,
          permitido: true,
        })),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      esCacheLocal: true,
      etapaSincronizadaId,
      actualizadoEn,
    };
  }

  /**
   * Obtiene la lista de inspectores precargados en IndexedDB para el selector de login de la terminal.
   */
  async getInspectoresLocales(): Promise<InspectorOfflineStore[]> {
    if (!idbDatabase.getAvailable()) return [];
    const todos = await idbDatabase.getAll<InspectorOfflineStore>('cat_inspectores');
    return todos
      .filter((i) => i.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  /**
   * Consulta si la sesión offline actual está vigente (<= 48h y sin retroceso anómalo de reloj).
   */
  async getSesionOfflineVigente(): Promise<SesionOfflineStore | null> {
    if (!idbDatabase.getAvailable()) return null;
    const sesion = await idbDatabase.get<SesionOfflineStore>('sesion_offline', 'activa');
    if (!sesion) return null;

    const clockCheck = await this.verificarYActualizarRelojMonotonico();
    if (clockCheck.clockRollbackDetected) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (sesion.expiraEn < now) {
      return null; // Expirada (> 48 horas)
    }
    return sesion;
  }
}

export const catalogoOfflineService = new CatalogoOfflineService();
