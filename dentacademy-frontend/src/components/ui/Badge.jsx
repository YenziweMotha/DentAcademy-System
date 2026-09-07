const tones = {
  // Solid, high-contrast — default for status chips
  green:
    'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 ring-1 ring-emerald-700/15',
  red: 'bg-rose-600 text-white shadow-sm shadow-rose-600/25 ring-1 ring-rose-700/15',
  yellow:
    'bg-amber-500 text-white shadow-sm shadow-amber-500/25 ring-1 ring-amber-600/20',
  blue: 'bg-sky-600 text-white shadow-sm shadow-sky-600/25 ring-1 ring-sky-700/15',
  brand:
    'bg-brand text-white shadow-sm shadow-brand/25 ring-1 ring-brand-dark/20',
  gray: 'bg-slate-600 text-white shadow-sm shadow-slate-600/20 ring-1 ring-slate-700/15',
  // Soft surfaces when solid would be too loud
  'green-soft': 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
  'red-soft': 'bg-rose-50 text-rose-800 ring-1 ring-rose-200',
  'yellow-soft': 'bg-amber-50 text-amber-900 ring-1 ring-amber-200',
  'blue-soft': 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
  'brand-soft': 'bg-brand-light text-brand-dark ring-1 ring-brand/20',
  'gray-soft': 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

const dotColors = {
  green: 'bg-white',
  red: 'bg-white',
  yellow: 'bg-white',
  blue: 'bg-white',
  brand: 'bg-white',
  gray: 'bg-slate-200',
  'green-soft': 'bg-emerald-500',
  'red-soft': 'bg-rose-500',
  'yellow-soft': 'bg-amber-500',
  'blue-soft': 'bg-sky-500',
  'brand-soft': 'bg-brand',
  'gray-soft': 'bg-slate-400',
};

export default function Badge({
  text,
  color = 'blue',
  className = '',
  pulse = false,
  soft = false,
  showDot = true,
}) {
  const toneKey = soft && !String(color).endsWith('-soft') ? `${color}-soft` : color;
  const tone = tones[toneKey] || tones.gray;
  const dot = dotColors[toneKey] || 'bg-white';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] leading-none font-bold uppercase tracking-wide rounded-lg transition-colors ${tone} ${className}`}
    >
      {showDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-70`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dot}`} />
        </span>
      )}
      {text}
    </span>
  );
}

/** Maps common domain statuses to a clear Badge. */
export function StatusBadge({ status, className = '' }) {
  const raw = String(status || 'UNKNOWN').trim();
  const key = raw.toUpperCase().replace(/\s+/g, '_');

  const map = {
    ACTIVE: { text: 'Active', color: 'green', pulse: true },
    INACTIVE: { text: 'Inactive', color: 'gray', pulse: false },
    PENDING: { text: 'Pending', color: 'yellow', pulse: true },
    PENDING_REVIEW: { text: 'Pending review', color: 'yellow', pulse: true },
    APPROVED: { text: 'Approved', color: 'brand', pulse: false },
    REJECTED: { text: 'Rejected', color: 'red', pulse: false },
    COMPLETED: { text: 'Completed', color: 'green', pulse: false },
    IN_PROGRESS: { text: 'In progress', color: 'yellow', pulse: true },
    NOT_STARTED: { text: 'Not started', color: 'gray', pulse: false },
    UNDER_REVIEW: { text: 'Under review', color: 'blue', pulse: true },
    RESOLVED: { text: 'Resolved', color: 'green', pulse: false },
    ESCALATED_FURTHER: { text: 'Escalated further', color: 'red', pulse: true },
    HIGH_RISK: { text: 'High risk', color: 'red', pulse: true },
    MEDIUM_RISK: { text: 'Medium risk', color: 'yellow', pulse: false },
    LOW_RISK: { text: 'Low risk', color: 'green', pulse: false },
    REGISTRATION_PENDING: { text: 'Registration pending', color: 'yellow', pulse: true },
    CRITICAL: { text: 'Critical', color: 'red', pulse: true },
    HIGH: { text: 'High', color: 'yellow', pulse: false },
    MEDIUM: { text: 'Medium', color: 'blue', pulse: false },
    LOW: { text: 'Low', color: 'gray', pulse: false },
  };

  // Human labels like "In Progress" / "Not Started"
  const labelMap = {
    'IN PROGRESS': 'IN_PROGRESS',
    'NOT STARTED': 'NOT_STARTED',
    'HIGH RISK': 'HIGH_RISK',
    'MEDIUM RISK': 'MEDIUM_RISK',
    'LOW RISK': 'LOW_RISK',
    'REGISTRATION PENDING': 'REGISTRATION_PENDING',
    'PENDING APPROVAL': 'PENDING',
  };

  const resolved = map[key] || map[labelMap[key]] || {
    text: raw.replace(/_/g, ' '),
    color: 'gray',
    pulse: false,
  };

  return (
    <Badge
      text={resolved.text}
      color={resolved.color}
      pulse={resolved.pulse}
      className={className}
    />
  );
}
