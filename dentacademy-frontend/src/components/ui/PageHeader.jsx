import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PageHeader({ title, subtitle, actions, breadcrumbs }) {
  return (
    <div className="mb-6 animate-fade-up">
      {breadcrumbs?.length > 0 && (
        <nav className="flex items-center flex-wrap gap-1 text-xs text-ink-subtle mb-2">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.label} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} className="opacity-60" />}
              {crumb.to ? (
                <Link
                  to={crumb.to}
                  className="hover:text-brand transition-colors font-medium"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-ink-muted font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[1.65rem] font-bold text-ink tracking-tight">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
}
