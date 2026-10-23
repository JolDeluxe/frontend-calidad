import { NavLink } from 'react-router';
import { cn } from '@/lib/utils/cn';
import { Icon } from '@/components/ui/icon';

export interface SectionTabItem {
  id: string;
  label: string;
  to: string;
  icon?: string;
  end?: boolean;
}

export interface SectionTabsProps {
  tabs: SectionTabItem[];
  className?: string;
  label?: string;
}

export function SectionTabs({ tabs = [], className = '', label = 'Submódulos' }: SectionTabsProps) {
  if (!tabs.length) return null;

  return (
    <div className="min-w-0 w-full py-1">
      <nav
        aria-label={label}
        className={cn(
          'inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200/80 bg-white/90 p-1 shadow-xs backdrop-blur-sm',
          className,
        )}
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to || tab.id}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              cn(
                'inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-all duration-150 motion-reduce:transition-none',
                isActive
                  ? 'bg-marca-primario text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-marca-primario',
              )
            }
          >
            {tab.icon && (
              <Icon
                name={tab.icon}
                size="15px"
                className="shrink-0"
              />
            )}
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
