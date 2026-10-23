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

/** Determina si hay algún formulario con datos capturados en el DOM activo */
function hasActiveUnsavedForm(): boolean {
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

  // 2. Verificar si hay modales con formularios abiertos con campos llenos
  const openForms = document.querySelectorAll('form');
  for (const form of openForms) {
    // Si el formulario contiene campos de texto modificados
    const inputs = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea');
    for (const input of inputs) {
      if (input.type !== 'hidden' && input.type !== 'submit' && input.value && input.value.trim().length > 0) {
        // Verificar si está visible en el árbol
        if (input.offsetParent !== null) {
          return true;
        }
      }
    }
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

    if (hasActiveUnsavedForm()) {
      console.warn(
        '[PWA] Nueva versión lista, pero se detectó un formulario abierto con datos. Pospone la recarga automática hasta que el usuario complete o cierre la interacción.',
      );
      isPendingReload = true;

      // Escuchar el submit o reset de formularios para recargar inmediatamente después
      const onFormAction = () => {
        window.removeEventListener('submit', onFormAction, true);
        window.removeEventListener('reset', onFormAction, true);
        setTimeout(() => {
          if (!isRefreshing) {
            isRefreshing = true;
            window.location.reload();
          }
        }, 800);
      };

      window.addEventListener('submit', onFormAction, { capture: true, once: true });
      window.addEventListener('reset', onFormAction, { capture: true, once: true });
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

      // 1. Chequeo periódico cada 30 minutos
      setInterval(() => {
        void registration.update();
      }, 30 * 60 * 1000);

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
