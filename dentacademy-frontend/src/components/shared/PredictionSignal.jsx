const TONES = {
  steady: { stroke: '#34d399', ink: '#d1fae5', label: 'Hold the line' },
  watch: { stroke: '#fbbf24', ink: '#fef3c7', label: 'Watch the bay' },
  alert: { stroke: '#fb7185', ink: '#ffe4e6', label: 'Call them in' },
  idle: { stroke: '#94a3b8', ink: '#e2e8f0', label: 'No reading' },
};

const SIGNALS = [
  ['academic_avg_mark', 'Academics'],
  ['module_completion_pct', 'Modules'],
  ['avg_assessment_score', 'Assessments'],
  ['attendance_rate', 'Attendance'],
];

export function riskTone(risk) {
  if (risk === null || risk === undefined || Number.isNaN(Number(risk))) return 'idle';
  const value = Number(risk);
  if (value > 60) return 'alert';
  if (value > 30) return 'watch';
  return 'steady';
}

function reading(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (Number.isNaN(number)) return null;
  return Math.round(number * 10) / 10;
}

function story(tone, name) {
  const who = name || 'This apprentice';
  if (tone === 'alert') {
    return `${who} is reading as unlikely to finish. Attendance, modules, and assessments are the levers.`;
  }
  if (tone === 'watch') {
    return `${who} is between paths. A few weak weeks could tip the reading.`;
  }
  if (tone === 'steady') {
    return `${who} is on a completion path. Keep the same rhythm.`;
  }
  return 'Generate a reading once education, attendance, modules, and two approved evaluations are on file.';
}

function Arc({ value, tone, size = 168, stroke = 12, caption }) {
  const shown = reading(value);
  const amount = shown == null ? 0 : Math.max(0, Math.min(100, shown));
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const color = TONES[tone].stroke;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(255 255 255 / 0.12)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${(amount / 100) * circ} ${circ}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold tracking-tight tabular-nums text-white">
          {shown == null ? '—' : shown}
          {shown != null && <span className="text-base font-semibold text-white/70">%</span>}
        </span>
        {caption && (
          <span className="mt-1 max-w-[7rem] text-[10px] font-bold uppercase tracking-[0.16em] text-white/60">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniArc({ value, label }) {
  const shown = reading(value);
  const tone = label === 'Dropout risk' ? riskTone(shown) : shown != null && shown < 45 ? 'watch' : 'steady';
  const amount = shown == null ? 0 : Math.max(0, Math.min(100, shown));
  const size = 92;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const color = TONES[tone].stroke;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(amount / 100) * circ} ${circ}`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-white">
          {shown == null ? '—' : `${shown}%`}
        </span>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/65">{label}</span>
    </div>
  );
}

function HistoryTrace({ history }) {
  const points = [...history].reverse().filter((row) => reading(row.dropout_risk) != null);
  if (points.length < 2) return null;
  const width = 280;
  const height = 72;
  const values = points.map((row) => Number(row.dropout_risk));
  const step = width / (values.length - 1);
  const coords = values.map((value, index) => {
    const x = index * step;
    const y = height - (Math.max(0, Math.min(100, value)) / 100) * (height - 8) - 4;
    return [x, y];
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">Risk over time</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full" role="img" aria-label="Dropout risk history">
        <polyline fill="none" stroke="#fb7185" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={line} />
        {coords.map(([x, y], index) => (
          <circle key={points[index].prediction_id || index} cx={x} cy={y} r="3.5" fill="#fff" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-white/45">
        <span>{new Date(points[0].generated_at).toLocaleDateString()}</span>
        <span>{new Date(points[points.length - 1].generated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export default function PredictionSignal({ prediction, history = [], name }) {
  const risk = reading(prediction?.dropout_risk);
  const tone = riskTone(risk);
  const palette = TONES[tone];
  const snapshot = prediction?.feature_snapshot_json || {};
  const seen = SIGNALS.filter(([key]) => reading(snapshot[key]) != null);

  return (
    <div className="bay-wall p-6 sm:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
        <div className="flex shrink-0 flex-col items-center">
          <Arc value={risk} tone={tone} caption="Dropout risk" />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: palette.ink }}>
            {palette.label}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200/70">Latest reading</p>
          <h3 className="mt-1 text-2xl font-extrabold tracking-tight text-white">{palette.label}</h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/80">{story(tone, name)}</p>
          <div className="mt-6 flex flex-wrap gap-6">
            <MiniArc value={prediction?.completion_likelihood} label="Completion" />
            <MiniArc value={prediction?.employment_readiness} label="Work ready" />
            <MiniArc value={prediction?.confidence_score} label="Confidence" />
          </div>
          {prediction?.generated_at && (
            <p className="mt-5 text-xs text-white/50">
              Taken {new Date(prediction.generated_at).toLocaleString()}
              {prediction.model_version ? ` · ${prediction.model_version}` : ''}
            </p>
          )}
          {prediction?.disclaimer_text && (
            <p className="mt-2 text-xs text-white/40">{prediction.disclaimer_text}</p>
          )}
        </div>
        {history.length > 1 && (
          <div className="w-full max-w-xs shrink-0">
            <HistoryTrace history={history} />
          </div>
        )}
      </div>
      {seen.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {seen.map(([key, label]) => {
            const amount = reading(snapshot[key]);
            return (
              <div key={key} className="rounded-2xl bg-black/25 px-4 py-3 ring-1 ring-white/10">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">{label}</span>
                  <span className="text-sm font-bold tabular-nums text-white">{amount}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-300 transition-all duration-700"
                    style={{ width: `${Math.max(0, Math.min(100, amount))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
