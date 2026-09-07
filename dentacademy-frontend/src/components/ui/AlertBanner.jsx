import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';

const config = {
  info: {
    wrap: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-100 dark:border-sky-800',
    icon: Info,
  },
  success: {
    wrap: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  warning: {
    wrap: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800',
    icon: AlertTriangle,
  },
  error: {
    wrap: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800',
    icon: XCircle,
  },
};

export default function AlertBanner({ type = 'info', message, onDismiss, className = '' }) {
  const { wrap, icon: Icon } = config[type] || config.info;

  return (
    <div
      className={`flex items-start gap-3 p-4 border rounded-xl animate-fade-up ${wrap} ${className}`}
      role="alert"
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <p className="text-sm flex-1 leading-relaxed">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
