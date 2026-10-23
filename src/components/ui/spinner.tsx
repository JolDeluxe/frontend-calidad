import { cn } from '@/lib/utils/cn';
import { Icon } from './icon';

/** Spinner: indicador de carga circular con herencia natural de color. */
export interface SpinnerProps {
  className?: string;
  size?: string;
  iconClassName?: string;
}

export function Spinner({ className, size = '24px', iconClassName }: SpinnerProps) {
  return (
    <div className={cn('flex justify-center items-center', className)}>
      <Icon
        name="progress_activity"
        size={size}
        className={cn('animate-spin text-current', iconClassName)}
      />
    </div>
  );
}

export { Skeleton, type SkeletonProps } from './skeleton';
