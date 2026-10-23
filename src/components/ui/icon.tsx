import { cn } from '@/lib/utils/cn';

/**
 * Diccionario de tallas de icono del Design System.
 * Usa tallas lógicas nombradas o valores directos (ej. "14px", "2rem").
 */
const ICON_SIZES: Record<string, string> = {
  xxs: '12px',
  xs:  '16px',
  sm:  '20px',
  md:  '24px',
  lg:  '32px',
  xl:  '40px',
};

export interface IconProps {
  /** Nombre del icono de Material Symbols (ej. "home", "close", "settings") */
  name: string;
  /** Relleno del icono: false = outline, true = filled */
  fill?: boolean;
  /** Peso tipográfico (100–700) */
  weight?: number;
  /** Gradiente del icono (-25 a 200) */
  grad?: number;
  /** Tamaño óptico (20–48) */
  opsz?: number;
  /** Talla lógica ("xs", "sm", "md"…) o valor CSS directo ("14px", "2rem") */
  size?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Componente para Material Symbols Variable Fonts (variante Rounded).
 * Utiliza la fuente icon local MaterialSymbolsRounded.woff2.
 *
 * Uso:
 *   <Icon name="home" />
 *   <Icon name="close" size="sm" fill weight={600} />
 */
export function Icon({
  name,
  fill = false,
  weight = 400,
  grad = 0,
  opsz = 24,
  size = 'md',
  className = '',
  style = {},
}: IconProps) {
  const resolvedSize = (style as React.CSSProperties & { fontSize?: string }).fontSize
    ?? ICON_SIZES[size]
    ?? size;

  return (
    <span
      className={cn('material-symbols-rounded', className)}
      style={{
        fontSize: resolvedSize,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grad}, 'opsz' ${opsz}`,
        ...style,
      }}
    >
      {name}
    </span>
  );
}
