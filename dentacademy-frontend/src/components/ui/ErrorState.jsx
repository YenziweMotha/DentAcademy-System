import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this content. Please try again.',
  onRetry,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-14 px-6 animate-fade-up ${className}`}
    >
      <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mb-4">
        <AlertCircle size={26} className="text-rose-600 dark:text-rose-400" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="text-sm text-ink-muted mt-1 max-w-sm">{description}</p>
      {onRetry && (
        <Button
          variant="secondary"
          className="mt-5"
          icon={RefreshCw}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
