import Badge from '../ui/Badge';

export default function ModuleStatusBadge({ status }) {
  const colors = {
    'Not Started': 'gray',
    'In Progress': 'yellow',
    'Completed': 'green'
  };
  
  return <Badge text={status} color={colors[status] || 'gray'} />;
}
