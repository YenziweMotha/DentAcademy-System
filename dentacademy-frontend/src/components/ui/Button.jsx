import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-brand text-white hover:bg-brand-dark shadow-sm hover:shadow-lift active:scale-[0.98]',
  secondary:
    'bg-surface-muted text-ink hover:bg-[#dbe3f0] border border-line',
  outline:
    'bg-transparent text-ink border border-line hover:bg-surface-muted hover:border-brand/30',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink',
  accent: 'bg-accent text-white hover:bg-accent-dark shadow-sm hover:shadow-md active:scale-[0.98]',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.98]',
  soft: 'bg-brand-light text-brand-dark hover:bg-[#d9e6ff]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-5 py-2.5 text-sm rounded-xl gap-2',
};

export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-180 focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin shrink-0" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : 16} className="shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
