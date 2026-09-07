import AnimatedCounter from './AnimatedCounter';

export default function StatCard({
  icon: Icon,
  label,
  value,
  tone = 'brand',
  hint,
  animate = true,
  onClick,
}) {
  const tones = {
    brand: 'bg-brand-light text-brand',
    red: 'bg-rose-50 text-rose-600',
    yellow: 'bg-amber-50 text-amber-600',
    gray: 'bg-slate-100 text-slate-600',
    blue: 'bg-sky-50 text-sky-600',
  };

  const valueColors = {
    brand: 'text-ink',
    red: 'text-rose-600',
    yellow: 'text-amber-600',
    gray: 'text-ink',
    blue: 'text-sky-600',
  };

  const numeric =
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d+%?$/.test(value));
  const numValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? parseInt(value, 10)
        : 0;
  const suffix = typeof value === 'string' && value.endsWith('%') ? '%' : '';

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`card-surface p-5 sm:p-6 flex items-start gap-4 text-left w-full transition-all duration-250 ${
        onClick
          ? 'hover:-translate-y-0.5 hover:shadow-lift hover:border-brand/25 cursor-pointer focus-ring'
          : ''
      }`}
    >
      <div
        className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-250 group-hover:scale-105 ${tones[tone]}`}
      >
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <h2 className="text-ink-subtle text-[11px] font-semibold uppercase tracking-wider">
          {label}
        </h2>
        <p className={`text-3xl font-bold mt-1 tracking-tight ${valueColors[tone]}`}>
          {animate && numeric ? (
            <AnimatedCounter value={numValue} suffix={suffix} />
          ) : (
            value
          )}
        </p>
        {hint &&
          (typeof hint === 'string' ? (
            <p className="text-xs text-ink-subtle mt-0.5">{hint}</p>
          ) : (
            <div className="mt-2">{hint}</div>
          ))}
      </div>
    </Tag>
  );
}
