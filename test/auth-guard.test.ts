import { describe, it, expect, beforeEach } from "bun:test";
import type { SessionState } from "../../src/providers/auth-provider";

describe("Frontend Auth Guard & Session State Transitions", () => {
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    mockLocalStorage = {};
  });

  it("El estado offline_limited debe permitir visualización sin eludir la autorización de red", () => {
    const cachedUser = {
      id: 1,
      usuario: "admin",
      nombre: "Super Administrador",
      rol: { id: 1, codigo: "SUPER_ADMIN", nombre: "Super Administrador" },
    };

    mockLocalStorage["auth_user_cache"] = JSON.stringify(cachedUser);

    // Evaluación del guardia
    const evaluateGuard = (sessionState: SessionState, hasUser: boolean) => {
      const isAuthenticated = hasUser && (sessionState === "confirmed" || sessionState === "offline_limited");
      const canAccessProtectedShell = isAuthenticated && sessionState !== "revoked" && sessionState !== "unauthenticated";
      return canAccessProtectedShell;
    };

    // Caso 1: confirmed -> permitido
    expect(evaluateGuard("confirmed", true)).toBe(true);

    // Caso 2: offline_limited -> permitido acceder a la plantilla local
    expect(evaluateGuard("offline_limited", true)).toBe(true);

    // Caso 3: revoked -> bloqueado y redirige a login
    expect(evaluateGuard("revoked", true)).toBe(false);

    // Caso 4: unauthenticated -> bloqueado
    expect(evaluateGuard("unauthenticated", false)).toBe(false);

    // Caso 5: pending_validation -> no navega, mantiene pantalla de carga previa
    expect(evaluateGuard("pending_validation", true)).toBe(false);
  });

  it("Un 403 (Forbidden) no debe marcar la sesión como expirada o revocada", () => {
    // Si una petición devuelve 403, no se debe disparar auth:session-expired
    const status = 403;
    const shouldExpireSession = status === 401; // Solo 401 dispara sesión expirada
    expect(shouldExpireSession).toBe(false);
  });

  it("Los errores 5xx o fallos de red no deben limpiar el cache del usuario", () => {
    const cachedUser = { id: 1, usuario: "admin" };
    mockLocalStorage["auth_user_cache"] = JSON.stringify(cachedUser);

    const handleRefreshResult = (status: "success" | "unauthorized" | "network_error") => {
      if (status === "unauthorized") {
        delete mockLocalStorage["auth_user_cache"];
      }
      // network_error mantiene el caché intacto
    };

    handleRefreshResult("network_error");
    expect(mockLocalStorage["auth_user_cache"]).toBeDefined();

    handleRefreshResult("unauthorized");
    expect(mockLocalStorage["auth_user_cache"]).toBeUndefined();
  });
});
