import Badge from '../ui/Badge';

export default function AIRiskBadge({ risk }) {
  if (risk === undefined || risk === null) return null;
  
  let color = 'green';
  let text = 'Low Risk';
  
  if (risk > 60) {
    color = 'red';
    text = 'High Risk';
  } else if (risk > 30) {
    color = 'yellow';
    text = 'Medium Risk';
  }
  
  return (
    <div className="flex flex-col items-end">
      <Badge text={text} color={color} />
      <span className="text-xs text-gray-500 mt-1">Dropout Risk: {risk}%</span>
    </div>
  );
}
