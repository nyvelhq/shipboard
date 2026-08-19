import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="shrink-0 text-gray-300" />}
            {crumb.href && !isLast ? (
              <Link href={crumb.href} className="truncate text-gray-500 hover:text-teal-700">
                {crumb.label}
              </Link>
            ) : (
              <span className={`truncate ${isLast ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
