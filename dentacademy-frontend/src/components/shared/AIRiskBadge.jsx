import { StatusBadge } from '../ui/Badge';

export default function AIRiskBadge({ risk }) {
  if (risk === undefined || risk === null) return null;

  let status = 'LOW_RISK';
  if (risk > 60) status = 'HIGH_RISK';
  else if (risk > 30) status = 'MEDIUM_RISK';

  return (
    <div className="flex flex-col items-end gap-1">
      <StatusBadge status={status} />
      <span className="text-xs text-ink-subtle font-medium">Dropout risk {risk}%</span>
    </div>
  );
}
