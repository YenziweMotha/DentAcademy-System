import { Search, X } from 'lucide-react';
import Button from './Button';

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder = 'Search...',
  className = '',
  bare = false,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`${
        bare ? '' : 'card-surface p-3 sm:p-4'
      } flex flex-col sm:flex-row gap-2 sm:gap-3 ${className}`}
    >
      <div className="relative flex-1">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
        />
        <input
          type="search"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full border border-line rounded-xl bg-surface-raised pl-10 pr-3 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all duration-180"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" icon={Search}>
          Search
        </Button>
        {onClear && value && (
          <Button type="button" variant="secondary" icon={X} onClick={onClear}>
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
