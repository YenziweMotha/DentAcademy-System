export default function Card({
  children,
  className = '',
  hover = false,
  padding = true,
  as: Tag = 'div',
  ...props
}) {
  return (
    <Tag
      className={`${hover ? 'card-interactive' : 'card-surface'} ${padding ? 'p-5 sm:p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5 ${className}`}
    >
      <div className="min-w-0">
        {typeof title === 'string' ? (
          <h2 className="section-title">{title}</h2>
        ) : (
          title
        )}
        {subtitle && <p className="meta-text mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
