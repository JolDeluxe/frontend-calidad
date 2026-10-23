/**
 * Escucha global de errores de importación dinámica (ChunkLoadError).
 *
 * Cuando se publica una nueva versión de la aplicación en producción, los hashes
 * de los bundles cambian. Si un usuario tiene la aplicación abierta y navega a una ruta
 * con lazy loading cuyo chunk antiguo fue reemplazado en el servidor/CDN, el navegador
 * lanza un error de carga de módulo dinámico.
 *
 * Este listener intercepta dicho error y fuerza una recarga limpia para obtener la versión
 * más reciente, evitando que la aplicación quede congelada con pantalla en blanco.
 */
export function setupChunkErrorListener(): void {
  if (typeof window === 'undefined') return;

  const CHUNK_FAILED_KEY = 'materia_prima_chunk_reload';

  window.addEventListener('error', (event) => {
    const errorMsg = event?.message || '';
    const isChunkError =
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('error loading dynamically imported module');

    if (isChunkError) {
      console.warn('[ChunkLoader] Error al cargar chunk dinámico (posible nueva versión desplegada).');
      const lastReload = sessionStorage.getItem(CHUNK_FAILED_KEY);
      const now = Date.now();

      // Evitar bucle si por algún fallo de red real sigue fallando dentro de 10 segundos
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem(CHUNK_FAILED_KEY, String(now));
        window.location.reload();
      }
    }
  });
}
