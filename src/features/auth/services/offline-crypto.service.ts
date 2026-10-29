import {
  idbDatabase,
  type InspectorOfflineStore,
  type SesionOfflineStore,
  type TerminalProfileStore,
} from '@/lib/db/idb-database';
import { catalogoOfflineService } from '@/features/catalogo-offline/services/catalogo-offline.service';
import type { UsuarioAuth } from '@/features/auth/types/auth.types';

export const MAX_INTENTOS_OFFLINE = 5;
export const BLOQUEO_OFFLINE_MS = 5 * 60 * 1000; // 5 minutos

export type OfflineLoginErrorCode =
  | 'STORAGE_UNAVAILABLE'
  | 'TERMINAL_NOT_BOUND'
  | 'USER_NOT_PRELOADED'
  | 'USER_INACTIVE_OR_NO_PERMISSION'
  | 'RATE_LIMITED'
  | 'TOKEN_EXPIRED'
  | 'CLOCK_ROLLBACK'
  | 'INVALID_PASSWORD';

export class OfflineAuthError extends Error {
  public readonly code: OfflineLoginErrorCode;
  constructor(code: OfflineLoginErrorCode, message: string) {
    super(message);
    this.name = 'OfflineAuthError';
    this.code = code;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = Number.parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Comparación en tiempo constante de dos cadenas hexadecimales para evitar ataques de temporización.
 */
export function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const a = aHex.trim().toLowerCase();
  const b = bHex.trim().toLowerCase();
  if (a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Deriva el verificador PBKDF2-HMAC-SHA256 en el navegador utilizando WebCrypto API (`crypto.subtle`).
 */
export async function deriveOfflineVerifierBrowser(
  password: string,
  saltHex: string,
  iterations: number = 100000,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );

  const saltBytes = hexToUint8Array(saltHex);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256, // 32 bytes = 256 bits
  );

  return uint8ArrayToHex(new Uint8Array(derivedBits));
}

export class OfflineAuthClientService {
  /**
   * Busca un inspector en `cat_inspectores` ya sea por su código `usuario` o por su `nombre` completo.
   */
  async findInspectorLocal(identificador: string): Promise<InspectorOfflineStore | null> {
    if (!idbDatabase.getAvailable()) return null;
    const limpio = identificador.trim();
    if (!limpio) return null;

    // 1. Intentar por índice `by_usuario` exacto o insensible a mayúsculas
    const porUsuarioDirecto = await idbDatabase.getByIndex<InspectorOfflineStore>(
      'cat_inspectores',
      'by_usuario',
      limpio,
    );
    if (porUsuarioDirecto) return porUsuarioDirecto;

    const todos = await idbDatabase.getAll<InspectorOfflineStore>('cat_inspectores');
    const lower = limpio.toLowerCase();

    return (
      todos.find(
        (i) => i.usuario.toLowerCase() === lower || i.nombre.trim().toLowerCase() === lower,
      ) || null
    );
  }

  /**
   * Autentica localmente a un inspector contra `cat_inspectores` en IndexedDB cuando no hay red.
   * Verifica:
   * 1. Terminal vinculada localmente (`terminal_profile`).
   * 2. Existencia del inspector en `cat_inspectores`.
   * 3. Estado activo, rol INSPECTOR y permiso `defectos.capturar`.
   * 4. Límite de intentos fallidos (`intentosFallidos` / `bloqueadoHasta`).
   * 5. Reloj monotónico (`max_observed_timestamp_ms`) y vigencia de 48 horas (`expiraEn`).
   *    NOTA DE SEGURIDAD: La hora del navegador y los datos almacenados en IndexedDB NO son una
   *    prueba criptográfica del instante real de captura ni del reloj del sistema; la marca
   *    `max_observed_timestamp_ms` mitiga retrocesos accidentales o casuales del reloj local,
   *    mientras que el backend valida la firma HMAC-SHA256 y audita el vencimiento del token.
   * 6. Verificador criptográfico PBKDF2-HMAC-SHA256 con salt aleatorio único.
   */
  async authenticateOffline(params: {
    usuario: string;
    password: string;
    nowMs?: number;
  }): Promise<{ user: UsuarioAuth; sesionOffline: SesionOfflineStore }> {
    const nowMs = params.nowMs ?? Date.now();
    const nowSec = Math.floor(nowMs / 1000);

    if (!idbDatabase.getAvailable()) {
      throw new OfflineAuthError(
        'STORAGE_UNAVAILABLE',
        'El almacenamiento local IndexedDB no está disponible en este navegador para iniciar sesión sin conexión.',
      );
    }

    const terminalProfile = await idbDatabase.get<TerminalProfileStore>('terminal_profile', 'local');
    if (!terminalProfile) {
      throw new OfflineAuthError(
        'TERMINAL_NOT_BOUND',
        'Esta estación física no cuenta con perfil de terminal vinculado localmente para operar en modo offline.',
      );
    }

    const inspector = await this.findInspectorLocal(params.usuario);
    if (!inspector) {
      throw new OfflineAuthError(
        'USER_NOT_PRELOADED',
        `El usuario '${params.usuario}' no está precargado en esta terminal para acceso sin conexión. Se requiere conexión al servidor para su primer ingreso o es una cuenta administrativa que requiere conexión en línea.`,
      );
    }

    if (
      !inspector.activo ||
      inspector.rolCodigo.toUpperCase() !== 'INSPECTOR' ||
      !inspector.permisos.includes('defectos.capturar')
    ) {
      throw new OfflineAuthError(
        'USER_INACTIVE_OR_NO_PERMISSION',
        'Este usuario no está activo o no cuenta con permisos de captura para operar en modo offline.',
      );
    }

    // Verificar bloqueo temporal por intentos fallidos
    if (inspector.bloqueadoHasta && inspector.bloqueadoHasta > nowMs) {
      const segundosRestantes = Math.ceil((inspector.bloqueadoHasta - nowMs) / 1000);
      throw new OfflineAuthError(
        'RATE_LIMITED',
        `Cuenta bloqueada temporalmente en esta terminal por demasiados intentos fallidos. Intente de nuevo en ${segundosRestantes} segundos.`,
      );
    }

    // Verificar retroceso anómalo de reloj del sistema
    const clockCheck = await catalogoOfflineService.verificarYActualizarRelojMonotonico(nowMs);
    if (clockCheck.clockRollbackDetected) {
      throw new OfflineAuthError(
        'CLOCK_ROLLBACK',
        'Se detectó un retroceso anómalo en el reloj de esta estación. Reconecte al servidor para revalidar la hora y las credenciales offline.',
      );
    }

    // Verificar vigencia de 48 horas de la credencial offline del inspector
    if (inspector.expiraEn < nowSec) {
      throw new OfflineAuthError(
        'TOKEN_EXPIRED',
        'La autorización offline de 48 horas para este inspector ha vencido. Reconecte al servidor para renovarla.',
      );
    }

    // Derivar y comparar PBKDF2-HMAC-SHA256 en tiempo constante
    const derivedHex = await deriveOfflineVerifierBrowser(
      params.password,
      inspector.saltOffline,
      inspector.iteracionesPbkdf2 || 100000,
    );

    if (!timingSafeEqualHex(derivedHex, inspector.verifierOffline)) {
      const nuevosIntentos = (inspector.intentosFallidos || 0) + 1;
      const bloqueadoHasta =
        nuevosIntentos >= MAX_INTENTOS_OFFLINE ? nowMs + BLOQUEO_OFFLINE_MS : null;

      await idbDatabase.put<InspectorOfflineStore>('cat_inspectores', {
        ...inspector,
        intentosFallidos: nuevosIntentos,
        bloqueadoHasta,
        actualizadoEn: new Date(nowMs).toISOString(),
      });

      if (bloqueadoHasta) {
        throw new OfflineAuthError(
          'RATE_LIMITED',
          'Se alcanzó el límite de 5 intentos fallidos. Acceso offline bloqueado por 5 minutos para este inspector.',
        );
      }

      throw new OfflineAuthError(
        'INVALID_PASSWORD',
        `Contraseña incorrecta para '${inspector.nombre}'. Intentos restantes: ${MAX_INTENTOS_OFFLINE - nuevosIntentos}.`,
      );
    }

    // Contraseña válida: reiniciar contador de intentos fallidos y activar sesión offline de este inspector
    await idbDatabase.put<InspectorOfflineStore>('cat_inspectores', {
      ...inspector,
      intentosFallidos: 0,
      bloqueadoHasta: null,
      actualizadoEn: new Date(nowMs).toISOString(),
    });

    const sesionActiva: SesionOfflineStore = {
      id: 'activa',
      inspectorId: inspector.inspectorId,
      usuario: inspector.usuario,
      nombre: inspector.nombre,
      rolCodigo: inspector.rolCodigo,
      permisos: inspector.permisos,
      terminalId: terminalProfile.terminalId,
      terminalNombre: terminalProfile.nombre,
      departamentoId: terminalProfile.departamentoId,
      offlineToken: inspector.offlineToken,
      emitidoEn: inspector.emitidoEn,
      expiraEn: inspector.expiraEn,
      vigenciaSegundos: inspector.vigenciaSegundos,
      guardadoEn: new Date(nowMs).toISOString(),
    };

    await idbDatabase.put<SesionOfflineStore>('sesion_offline', sesionActiva);

    const user: UsuarioAuth = {
      id: inspector.inspectorId,
      usuario: inspector.usuario,
      nombre: inspector.nombre,
      rol: {
        id: 0,
        codigo: inspector.rolCodigo,
        nombre: inspector.rolCodigo,
      },
    };

    return { user, sesionOffline: sesionActiva };
  }
}

export const offlineAuthClientService = new OfflineAuthClientService();
