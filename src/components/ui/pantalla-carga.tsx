export interface PantallaCargaProps {
  className?: string;
}

/**
 * Pantalla de carga general institucional de MBC Cuadra.
 * Muestra únicamente el logotipo oficial `01_Cuadra.webp` con una sutil animación de pulso.
 */
export function PantallaCarga({ className }: PantallaCargaProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-cuadra-arena select-none ${className || ''}`}>
      <div className="flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Contenedor del Logo con sutil resplandor */}
        <div className="relative flex items-center justify-center">
          <div className="absolute -inset-6 bg-marca-primario/10 rounded-full blur-2xl animate-pulse" />
          <img
            src="/img/01_Cuadra.webp"
            alt="MBC Cuadra"
            className="relative h-24 sm:h-28 w-auto object-contain drop-shadow-md animate-pulse"
          />
        </div>
      </div>
    </div>
  );
}
