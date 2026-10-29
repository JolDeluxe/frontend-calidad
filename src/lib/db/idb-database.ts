/**
 * Gestor tipado de IndexedDB para el Modo Offline de Calidad MBC.
 * Base de datos: mbc_calidad_offline_v1
 * Version: 2 (migración aditiva sin pérdida de datos desde v1)
 */

export const IDB_NAME = 'mbc_calidad_offline_v1';
export const IDB_VERSION = 2;

export interface SesionOfflineStore {
  id: string; // Fijo "activa"
  inspectorId: number;
  usuario: string;
  nombre: string;
  rolCodigo?: string;
  permisos?: string[];
  terminalId?: number;
  terminalNombre?: string;
  departamentoId?: number;
  offlineToken: string;
  emitidoEn?: number;
  expiraEn: number; // timestamp segundos UTC (48 horas = 172,800s tras emisión)
  vigenciaSegundos: number;
  guardadoEn: string; // ISO
}

export interface InspectorOfflineStore {
  inspectorId: number; // Clave primaria
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
  intentosFallidos: number;
  bloqueadoHasta: number | null; // timestamp ms si excede intentos
  actualizadoEn: string;
}

export interface TerminalProfileStore {
  id: string; // Fijo "local"
  terminalId: number;
  nombre: string;
  departamentoId: number;
  departamentoCodigo: string;
  departamentoNombre: string;
  numeroLineas?: number;
  guardadoEn: string;
}

export interface DefectoOfflineStore {
  id: number;
  clave: number;
  defecto: string;
  clasificacion: 'CRITICO' | 'MAYOR' | 'MENOR';
  departamentoId: number; // Propietario
  departamentoCodigo?: string;
  departamentoNombre?: string;
  etapaId?: number;
  etapasPermitidasIds?: number[];
  lineasIds?: number[];
  activo?: boolean;
  permitidoEnEtapa: boolean;
}

export interface LoteOfflineStore {
  lote: string; // Clave primaria natural
  id: number;
  lista: string;
  idProducto: string;
  modelo: string;
  cantidad: number;
  horma: string | null;
  cliente: string;
  actualizadoEn: string;
}

export type EstadoColaInspeccion =
  | 'PENDIENTE'
  | 'SINCRONIZANDO'
  | 'SINCRONIZADA'
  | 'ERROR_REINTENTABLE'
  | 'REQUIERE_REVISION'
  | 'RECHAZADA';

export interface ColaInspeccionStore {
  idLocalCliente: string; // UUID v4 usado como claveIdempotencia
  inspectorId: number;
  inspectorUsuario: string;
  inspectorNombre: string;
  terminalId: number;
  terminalNombre: string;
  departamentoAuditoriaId: number;
  offlineToken: string;
  fechaCapturaDispositivo: string; // ISO UTC
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
  estado: EstadoColaInspeccion;
  intentos: number;
  ultimoError: string | null;
  proximoReintentoEn: number | null;
  folioServidor?: string | null;
  inspeccionIdServidor?: number | null;
  legacySincronizado?: boolean;
  actualizadoEn: string;
}

export interface ContingenciaInspeccionStore {
  idLocalCliente: string;
  inspectorId: number;
  inspectorUsuario: string;
  inspectorNombre: string;
  terminalId: number;
  departamentoAuditoriaId: number;
  fechaCapturaDispositivo: string;
  codigoError: string;
  mensajeError: string;
  esContingencia: boolean;
  motivoContingencia: string | null;
  payload: ColaInspeccionStore['payload'];
  registradoEn: string;
}

export interface MetaSincronizacionStore {
  clave: string;
  valor: string | number;
  actualizadoEn: string;
}

export type IdbErrorKind = 'UNAVAILABLE' | 'QUOTA_EXCEEDED' | 'UPGRADE_FAILED' | 'TRANSACTION_FAILED';

export class IdbStorageError extends Error {
  public readonly kind: IdbErrorKind;
  constructor(kind: IdbErrorKind, message: string) {
    super(message);
    this.name = 'IdbStorageError';
    this.kind = kind;
  }
}

export class IdbDatabase {
  private db: IDBDatabase | null = null;
  private isAvailable: boolean = true;
  private isPersisted: boolean = false;
  private lastError: IdbStorageError | null = null;
  private initPromise: Promise<IDBDatabase | null> | null = null;

  constructor() {
    this.checkAvailability();
  }

  public checkAvailability(): boolean {
    if (typeof indexedDB === 'undefined') {
      this.isAvailable = false;
      this.lastError = new IdbStorageError(
        'UNAVAILABLE',
        'IndexedDB no está disponible en este navegador o contexto.',
      );
      return false;
    }
    this.isAvailable = true;
    return true;
  }

  public getAvailable(): boolean {
    return this.isAvailable;
  }

  public getPersisted(): boolean {
    return this.isPersisted;
  }

  public getLastError(): IdbStorageError | null {
    return this.lastError;
  }

  /**
   * Permite reiniciar la conexión (por ejemplo en pruebas de actualización de esquema v1 -> v2).
   */
  public closeConnection(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
    this.checkAvailability();
  }

  /**
   * Solicita persistencia de almacenamiento permanente (evita que el navegador purgue IndexedDB por cuota)
   */
  public async requestPersistence(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const persisted = await navigator.storage.persist();
        this.isPersisted = persisted;
        return persisted;
      } catch {
        this.isPersisted = false;
        return false;
      }
    }
    return false;
  }

  /**
   * Inicializa la base de datos IndexedDB con versión 2 y migración aditiva que preserva todos los datos previos.
   * Si IndexedDB no está disponible, no rompe el modo online.
   */
  public async getDb(): Promise<IDBDatabase | null> {
    if (!this.checkAvailability()) return null;
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(IDB_NAME, IDB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const req = event.target as IDBOpenDBRequest;
          const db = req.result;
          const upgradeTx = req.transaction;

          // 1. Store de Sesión Offline Activa (Vigencia 48 horas)
          if (!db.objectStoreNames.contains('sesion_offline')) {
            db.createObjectStore('sesion_offline', { keyPath: 'id' });
          }

          // 2. Store de Perfil de Terminal Local
          if (!db.objectStoreNames.contains('terminal_profile')) {
            db.createObjectStore('terminal_profile', { keyPath: 'id' });
          }

          // 3. Catálogo de Defectos para la Etapa/Terminal
          if (!db.objectStoreNames.contains('cat_defectos')) {
            const defStore = db.createObjectStore('cat_defectos', { keyPath: 'id' });
            defStore.createIndex('by_clave', 'clave', { unique: true });
            defStore.createIndex('by_departamento', 'departamentoId', { unique: false });
          } else if (upgradeTx) {
            const defStore = upgradeTx.objectStore('cat_defectos');
            if (!defStore.indexNames.contains('by_clave')) {
              defStore.createIndex('by_clave', 'clave', { unique: true });
            }
            if (!defStore.indexNames.contains('by_departamento')) {
              defStore.createIndex('by_departamento', 'departamentoId', { unique: false });
            }
          }

          // 4. Catálogo de Lotes Activos
          if (!db.objectStoreNames.contains('cat_lotes')) {
            const loteStore = db.createObjectStore('cat_lotes', { keyPath: 'lote' });
            loteStore.createIndex('by_modelo', 'modelo', { unique: false });
            loteStore.createIndex('by_id', 'id', { unique: true });
          } else if (upgradeTx) {
            const loteStore = upgradeTx.objectStore('cat_lotes');
            if (!loteStore.indexNames.contains('by_modelo')) {
              loteStore.createIndex('by_modelo', 'modelo', { unique: false });
            }
            if (!loteStore.indexNames.contains('by_id')) {
              loteStore.createIndex('by_id', 'id', { unique: true });
            }
          }

          // 5. Cola de Inspecciones Pendientes (Preserva registros de v1 sin recrear ni vaciar)
          if (!db.objectStoreNames.contains('cola_inspecciones')) {
            const colaStore = db.createObjectStore('cola_inspecciones', { keyPath: 'idLocalCliente' });
            colaStore.createIndex('by_estado', 'estado', { unique: false });
            colaStore.createIndex('by_fecha', 'fechaCapturaDispositivo', { unique: false });
            colaStore.createIndex('by_inspector', 'inspectorId', { unique: false });
          } else if (upgradeTx) {
            const colaStore = upgradeTx.objectStore('cola_inspecciones');
            if (!colaStore.indexNames.contains('by_estado')) {
              colaStore.createIndex('by_estado', 'estado', { unique: false });
            }
            if (!colaStore.indexNames.contains('by_fecha')) {
              colaStore.createIndex('by_fecha', 'fechaCapturaDispositivo', { unique: false });
            }
            if (!colaStore.indexNames.contains('by_inspector')) {
              colaStore.createIndex('by_inspector', 'inspectorId', { unique: false });
            }
          }

          // 6. Contingencias y Rechazos (Preserva registros de v1)
          if (!db.objectStoreNames.contains('contingencias_inspecciones')) {
            const contStore = db.createObjectStore('contingencias_inspecciones', { keyPath: 'idLocalCliente' });
            contStore.createIndex('by_codigo', 'codigoError', { unique: false });
          } else if (upgradeTx) {
            const contStore = upgradeTx.objectStore('contingencias_inspecciones');
            if (!contStore.indexNames.contains('by_codigo')) {
              contStore.createIndex('by_codigo', 'codigoError', { unique: false });
            }
          }

          // 7. Metadatos de Sincronización y Versionado
          if (!db.objectStoreNames.contains('meta_sincronizacion')) {
            db.createObjectStore('meta_sincronizacion', { keyPath: 'clave' });
          }

          // 8. Nuevo en v2: Catálogo de Inspectores Autorizados para Multiusuario Offline
          if (!db.objectStoreNames.contains('cat_inspectores')) {
            const inspStore = db.createObjectStore('cat_inspectores', { keyPath: 'inspectorId' });
            inspStore.createIndex('by_usuario', 'usuario', { unique: true });
            inspStore.createIndex('by_nombre', 'nombre', { unique: false });
          } else if (upgradeTx) {
            const inspStore = upgradeTx.objectStore('cat_inspectores');
            if (!inspStore.indexNames.contains('by_usuario')) {
              inspStore.createIndex('by_usuario', 'usuario', { unique: true });
            }
            if (!inspStore.indexNames.contains('by_nombre')) {
              inspStore.createIndex('by_nombre', 'nombre', { unique: false });
            }
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.lastError = null;
          void this.requestPersistence();
          resolve(this.db);
        };

        request.onerror = () => {
          console.warn('[IndexedDB] No fue posible abrir la base de datos local:', request.error);
          this.isAvailable = false;
          this.lastError = new IdbStorageError(
            'UPGRADE_FAILED',
            request.error?.message || 'No fue posible abrir IndexedDB.',
          );
          resolve(null);
        };

        request.onblocked = () => {
          console.warn('[IndexedDB] Apertura bloqueada por otra pestaña abierta.');
        };
      } catch (err: any) {
        console.warn('[IndexedDB] Excepción en inicialización:', err);
        this.isAvailable = false;
        this.lastError = new IdbStorageError(
          'UNAVAILABLE',
          err?.message || 'Excepción al inicializar IndexedDB.',
        );
        resolve(null);
      }
    });

    return this.initPromise;
  }

  private normalizeDomError(err: any, storeName: string): IdbStorageError {
    if (err instanceof IdbStorageError) return err;
    const name = err?.name || '';
    const message = err?.message || '';
    if (name === 'QuotaExceededError' || /quota/i.test(message)) {
      const quotaErr = new IdbStorageError(
        'QUOTA_EXCEEDED',
        `Espacio insuficiente en el dispositivo al guardar en '${storeName}'. Libere espacio o sincronice las capturas pendientes.`,
      );
      this.lastError = quotaErr;
      return quotaErr;
    }
    return new IdbStorageError(
      'TRANSACTION_FAILED',
      message || `Error transaccional en el almacén '${storeName}'.`,
    );
  }

  // Métodos genéricos transaccionales seguros

  public async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDb();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) || null);
        req.onerror = () => reject(this.normalizeDomError(req.error, storeName));
      } catch (err) {
        reject(this.normalizeDomError(err, storeName));
      }
    });
  }

  public async getByIndex<T>(storeName: string, indexName: string, key: IDBValidKey): Promise<T | null> {
    const db = await this.getDb();
    if (!db) return null;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const req = index.get(key);
        req.onsuccess = () => resolve((req.result as T) || null);
        req.onerror = () => reject(this.normalizeDomError(req.error, storeName));
      } catch (err) {
        reject(this.normalizeDomError(err, storeName));
      }
    });
  }

  public async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      throw new IdbStorageError(
        'UNAVAILABLE',
        'El almacenamiento local IndexedDB no está disponible en este navegador.',
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        tx.oncomplete = () => resolve();
        req.onerror = () => reject(this.normalizeDomError(req.error, storeName));
        tx.onerror = () => reject(this.normalizeDomError(tx.error, storeName));
        tx.onabort = () => reject(this.normalizeDomError(tx.error, storeName));
      } catch (err) {
        reject(this.normalizeDomError(err, storeName));
      }
    });
  }

  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        tx.oncomplete = () => resolve();
        req.onerror = () => reject(this.normalizeDomError(req.error, storeName));
      } catch (err) {
        reject(this.normalizeDomError(err, storeName));
      }
    });
  }

  public async putBatch<T>(storeName: string, values: T[]): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      throw new IdbStorageError(
        'UNAVAILABLE',
        'El almacenamiento local IndexedDB no está disponible en este navegador.',
      );
    }
    if (values.length === 0) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const item of values) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(this.normalizeDomError(tx.error, storeName));
        tx.onabort = () => reject(this.normalizeDomError(tx.error, storeName));
      } catch (err) {
        reject(this.normalizeDomError(err, storeName));
      }
    });
  }

  /**
   * Reemplaza de forma atómica el contenido de un almacén en una única transacción readwrite.
   * Si cualquier escritura falla o la transacción aborta, el navegador revierte el `clear()`
   * automáticamente y el catálogo anterior permanece intacto.
   */
  public async replaceAllAtomic<T>(storeName: string, values: T[]): Promise<void> {
    const db = await this.getDb();
    if (!db) {
      throw new IdbStorageError(
        'UNAVAILABLE',
        'El almacenamiento local IndexedDB no está disponible en este navegador.',
      );
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        for (const item of values) {
          store.put(item);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(this.normalizeDomError(tx.error, storeName));
        tx.onabort = () => reject(this.normalizeDomError(tx.error, storeName));
      } catch (err) {
        reject(this.normalizeDomError(err, storeName));
      }
    });
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDb();
    if (!db) return [];

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => reject(this.normalizeDomError(req.error, storeName));
      } catch (err) {
        reject(this.normalizeDomError(err, storeName));
      }
    });
  }

  public async clear(storeName: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return;

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        tx.oncomplete = () => resolve();
        req.onerror = () => reject(this.normalizeDomError(req.error, storeName));
      } catch (err) {
        reject(this.normalizeDomError(err, storeName));
      }
    });
  }
}

export const idbDatabase = new IdbDatabase();
