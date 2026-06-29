import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { getAtRiskApprentices } from '../../api/predictions';
import AlertBanner from '../../components/ui/AlertBanner';

export default function SupervisorDashboard() {
  const [data, setData] = useState({ pending_evaluations: 0 });
  const [atRisk, setAtRisk] = useState([]);

  useEffect(() => {
    api.get('/dashboard/supervisor').then(res => setData(res.data)).catch(console.error);
    getAtRiskApprentices().then(setAtRisk).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Supervisor Dashboard</h1>
      
      {atRisk.length > 0 && (
        <AlertBanner type="warning" message={`Alert: ${atRisk.length} apprentices are marked as High Risk.`} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Pending Evaluations</h2>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.pending_evaluations}</p>
        </div>
      </div>
    </div>
  );
}
