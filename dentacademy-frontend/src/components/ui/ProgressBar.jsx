export default function ProgressBar({
  progress = 0,
  color = 'blue',
  showLabel = false,
  className = '',
  animated = true,
}) {
  const bgColors = {
    blue: 'bg-brand',
    green: 'bg-emerald-500',
    red: 'bg-rose-500',
    yellow: 'bg-amber-500',
  };

  const clamped = Math.max(0, Math.min(100, Number(progress) || 0));

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between text-xs text-ink-muted mb-1.5">
          <span>Progress</span>
          <span className="font-semibold text-ink">{clamped}%</span>
        </div>
      )}
      <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden">
        <div
          className={`${bgColors[color] || bgColors.blue} h-2 rounded-full ${
            animated ? 'transition-all duration-700 ease-out' : ''
          }`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
