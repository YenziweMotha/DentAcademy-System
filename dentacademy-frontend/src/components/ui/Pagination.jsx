import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPrev,
  onNext,
  pageLabel,
  zeroIndexed = false,
}) {
  if (totalPages <= 1 && !total) return null;

  const displayPage = zeroIndexed ? page + 1 : page;
  const from = zeroIndexed ? page * limit + 1 : (page - 1) * limit + 1;
  const to = zeroIndexed
    ? Math.min((page + 1) * limit, total)
    : Math.min(page * limit, total);

  return (
    <div className="px-5 py-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
      {typeof total === 'number' && total > 0 ? (
        <p className="text-sm text-ink-muted">
          Showing <span className="font-semibold text-ink">{from}</span> to{' '}
          <span className="font-semibold text-ink">{to}</span> of{' '}
          <span className="font-semibold text-ink">{total}</span>
        </p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={zeroIndexed ? page === 0 : page === 1}
          onClick={onPrev}
          icon={ChevronLeft}
        >
          Previous
        </Button>
        <span className="text-sm text-ink-muted px-2 tabular-nums">
          {pageLabel || `Page ${displayPage} of ${Math.max(totalPages, 1)}`}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={
            zeroIndexed
              ? page >= totalPages - 1 || totalPages === 0
              : page >= totalPages
          }
          onClick={onNext}
        >
          Next
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
}
