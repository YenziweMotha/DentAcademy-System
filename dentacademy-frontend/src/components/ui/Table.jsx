export default function Table({ headers, children, className = '' }) {
  return (
    <div className={`overflow-x-auto card-surface ${className}`}>
      <table className="min-w-full divide-y divide-line">
        <thead className="bg-surface-muted/60">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-5 py-3 text-left text-[11px] font-semibold text-ink-subtle uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors duration-150 ${
        onClick ? 'cursor-pointer hover:bg-brand-light/40 dark:hover:bg-emerald-950/30' : 'hover:bg-surface-muted/40'
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`px-5 py-3.5 text-sm text-ink ${className}`}>{children}</td>;
}
