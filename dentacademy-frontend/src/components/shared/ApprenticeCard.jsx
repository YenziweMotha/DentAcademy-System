import { StatusBadge } from '../ui/Badge';
import AIRiskBadge from './AIRiskBadge';
import { useAuth } from '../../hooks/useAuth';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';

export default function ApprenticeCard({ apprentice }) {
  const { user } = useAuth();

  return (
    <Card hover className="p-4 mb-4 animate-fade-up">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <Avatar
            size="lg"
            name={`${apprentice.first_name || ''} ${apprentice.last_name || apprentice.surname || ''}`}
            src={
              apprentice.photo_url
                ? (apprentice.photo_url.startsWith('http')
                    ? apprentice.photo_url
                    : `/${String(apprentice.photo_url).replace(/^\//, '')}`)
                : undefined
            }
          />
          <div>
            <h3 className="text-lg font-semibold text-ink">
              {apprentice.first_name} {apprentice.last_name || apprentice.surname}
            </h3>
            <p className="meta-text">ID: {apprentice.id_number}</p>
          </div>
        </div>
        <StatusBadge status={apprentice.status} />
      </div>

      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-ink-muted">
          <p>Qualification: {apprentice.qualification_type || 'N/A'}</p>
        </div>

        {user?.role !== 'Apprentice' && apprentice.dropout_risk !== undefined && (
          <AIRiskBadge risk={apprentice.dropout_risk} />
        )}
      </div>
    </Card>
  );
}
