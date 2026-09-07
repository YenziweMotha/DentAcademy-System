export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  error,
  hint,
  className = '',
  inputClassName = '',
  leftIcon: LeftIcon,
  rightElement,
  id,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <LeftIcon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
          />
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          className={`w-full rounded-xl border bg-surface-raised text-ink placeholder:text-ink-subtle shadow-sm transition-all duration-180 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:opacity-60 disabled:cursor-not-allowed ${
            LeftIcon ? 'pl-9' : 'pl-3.5'
          } ${rightElement ? 'pr-10' : 'pr-3.5'} py-2.5 text-sm ${
            error
              ? 'border-rose-400 focus:ring-rose-300 focus:border-rose-500'
              : 'border-line hover:border-slate-300 dark:hover:border-slate-500'
          } ${inputClassName}`}
          aria-invalid={!!error}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && <p className="text-rose-600 dark:text-rose-400 text-xs mt-1.5">{error}</p>}
      {!error && hint && <p className="text-ink-subtle text-xs mt-1.5">{hint}</p>}
    </div>
  );
}
