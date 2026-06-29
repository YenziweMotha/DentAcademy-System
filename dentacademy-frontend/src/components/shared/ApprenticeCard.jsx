import Badge from '../ui/Badge';
import AIRiskBadge from './AIRiskBadge';
import { useAuth } from '../../hooks/useAuth';

export default function ApprenticeCard({ apprentice }) {
  const { user } = useAuth();
  
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          {apprentice.photo_url ? (
            <img src={`${import.meta.env.VITE_API_URL}/${apprentice.photo_url}`} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
              {apprentice.first_name[0]}{apprentice.last_name[0]}
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium">{apprentice.first_name} {apprentice.last_name}</h3>
            <p className="text-sm text-gray-500">ID: {apprentice.id_number}</p>
          </div>
        </div>
        <div>
          <Badge text={apprentice.status} color={apprentice.status === 'Active' ? 'green' : 'gray'} />
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <p>Qualification: {apprentice.qualification_type || 'N/A'}</p>
        </div>
        
        {user?.role !== 'Apprentice' && apprentice.dropout_risk !== undefined && (
          <AIRiskBadge risk={apprentice.dropout_risk} />
        )}
      </div>
    </div>
  );
}
