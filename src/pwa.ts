import { registerSW } from 'virtual:pwa-register';

/**
 * Registro de Service Worker para Materia Prima MBC (PWA).
 *
 * Implementa auto-actualización transparente e inmediata al desplegar cambios:
 * 1. immediate: true registra el SW en el arranque.
 * 2. onNeedRefresh activa de inmediato la nueva versión sin requerir confirmación manual.
 * 3. controllerchange recarga la pestaña de forma segura:
 *    - Si el usuario está operando activamente en un formulario abierto (<form> o modal con inputs modificados),
 *      se pospone la recarga hasta que termine o se envíe el formulario para no destruir datos operativos en curso.
 * 4. Verificación periódica cada 30 minutos y ante reactivación de ventana/pestaña (focus/visibilitychange).
 */

/** Determina si el usuario está realizando una interacción u operación activa en pantalla */
function isUserActivelyInteracting(): boolean {
  if (typeof document === 'undefined') return false;

  // 1. Verificar si hay un elemento activo enfocado que sea input, textarea o select con valor no vacío
  const activeEl = document.activeElement;
  if (
    activeEl &&
    (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')
  ) {
    const input = activeEl as HTMLInputElement;
    if (input.value && input.value.trim().length > 0) {
      return true;
    }
  }

  // 2. Verificar si hay modales o diálogos abiertos en el DOM (role="dialog" o aria-modal="true")
  const openModals = document.querySelectorAll('[role="dialog"], [aria-modal="true"]');
  if (openModals.length > 0) {
    return true;
  }

  // 3. Verificar si el teclado numérico flotante está activo en pantalla
  if (document.querySelector('.numpad-drag-handle')) {
    return true;
  }

  // 4. Verificar si hay algún formulario con inputs modificados visibles
  const openForms = document.querySelectorAll('form');
  for (const form of openForms) {
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    for (const input of inputs) {
      if (input.type !== 'hidden' && input.type !== 'submit' && input.value && input.value.trim().length > 0) {
        if (input.offsetParent !== null) {
          return true;
        }
      }
    }
  }

  // 5. Verificar si hay borradores activos de captura en localStorage
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('calidad_captura_borrador_')) {
        const item = window.localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (
            (parsed.loteInput && parsed.loteInput.trim().length > 0) ||
            (Array.isArray(parsed.defectosCapturados) && parsed.defectosCapturados.length > 0)
          ) {
            return true;
          }
        }
      }
    }
  } catch {
    // Continuar si falla lectura de localStorage
  }

  return false;
}

export function registerPwaServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Bandera para evitar bucle de recargas ante múltiples eventos controllerchange
  let isRefreshing = false;
  let isPendingReload = false;

  const performReload = () => {
    if (isRefreshing || isPendingReload) return;

    if (isUserActivelyInteracting()) {
      console.warn(
        '[PWA] Nueva versión lista, pero se detectó una operación activa en curso (modal, formulario o lote). Pospone la recarga automática hasta que el usuario termine su captura.',
      );
      isPendingReload = true;

      // Escuchar eventos clave de finalización o cierre para ejecutar la recarga pospuesta
      const onInteractionComplete = () => {
        // Verificar nuevamente si ya no hay interacción activa
        setTimeout(() => {
          if (!isUserActivelyInteracting() && !isRefreshing) {
            isRefreshing = true;
            window.location.reload();
          }
        }, 1200);
      };

      window.addEventListener('submit', onInteractionComplete, { capture: true });
      window.addEventListener('reset', onInteractionComplete, { capture: true });

      // Observador de cambios en el DOM para cuando se cierre el modal de captura o el teclado flotante
      const observer = new MutationObserver(() => {
        if (!isUserActivelyInteracting() && !isRefreshing) {
          observer.disconnect();
          isRefreshing = true;
          window.location.reload();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      return;
    }

    isRefreshing = true;
    console.log('[PWA] Nuevo Service Worker en control. Recargando aplicación con la versión actualizada...');
    window.location.reload();
  };

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      // Activa de inmediato el nuevo worker (skipWaiting forzado desde cliente)
      console.log('[PWA] Nueva versión disponible. Aplicando actualización automática...');
      void updateSW(true);
    },
    onOfflineReady() {
      console.log('[PWA] Aplicación lista y precacheada para funcionamiento continuo.');
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // 1. Chequeo periódico cada 60 segundos (para detectar nuevos despliegues de inmediato sin F5)
      setInterval(() => {
        void registration.update();
      }, 60 * 1000);

      // 2. Chequeo automático cuando la ventana recupera el foco o la pestaña se vuelve visible
      window.addEventListener('focus', () => {
        void registration.update();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update();
        }
      });
    },
    onRegisterError(error) {
      console.error('[PWA] Error en el registro del Service Worker:', error);
    },
  });

  // Cuando el nuevo Service Worker toma el control (clientsClaim), ejecutamos la recarga segura
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    performReload();
  });
}
