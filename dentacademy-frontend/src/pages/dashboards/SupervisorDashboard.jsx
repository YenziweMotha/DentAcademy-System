import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { getAtRiskApprentices } from '../../api/predictions';
import AlertBanner from '../../components/ui/AlertBanner';
import { fetchNotifications, markNotificationRead } from '../../api/notifications';
import { useNavigate } from 'react-router-dom';

export default function SupervisorDashboard() {
  const [data, setData] = useState({ pending_evaluations: 0 });
  const [atRisk, setAtRisk] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/supervisor').then(res => setData(res.data)).catch(console.error);
    getAtRiskApprentices().then(setAtRisk).catch(console.error);
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    const res = await fetchNotifications();
    // supervisors see their own alerts; keep warnings and latest 5
    const warnings = res.filter(n => n.type === 'warning').slice(0, 5);
    setAlerts(warnings);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Supervisor Dashboard</h1>

      {/* High Risk Banner */}
      {atRisk.length > 0 && (
        <AlertBanner type="warning" message={`Alert: ${atRisk.length} apprentices are marked as High Risk.`} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <h2 className="text-gray-500 text-sm uppercase">Pending Evaluations</h2>
          <p className="text-3xl font-bold mt-2">{data.pending_evaluations}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm uppercase">High Risk Apprentices</h2>
          <p className="text-3xl font-bold mt-2">{atRisk.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm uppercase">Status</h2>
          <p className="text-green-600 font-semibold mt-2">Monitoring</p>
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Alerts</h2>
        {alerts.length === 0 && (
          <p className="text-sm text-gray-500">No active alerts</p>
        )}
        {alerts.map(a => (
          <div
            key={a.id}
            className="p-3 border-b cursor-pointer hover:bg-gray-50"
            onClick={async () => {
              await markNotificationRead(a.id);
              if (a.link) navigate(a.link);
            }}
          >
            <div className="text-sm font-medium">{a.message}</div>
            <div className="text-xs text-gray-400">
              {new Date(a.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* High Risk List */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">High Risk Apprentices</h2>
        {atRisk.length === 0 && (
          <p className="text-sm text-gray-500">No high risk apprentices</p>
        )}
        {atRisk.map(a => (
          <div
            key={a.apprentice_id}
            className="p-3 border-b cursor-pointer hover:bg-gray-50"
            onClick={() => navigate(`/apprentices/${a.apprentice_id}`)}
          >
            <div className="font-medium">{a.first_name} {a.surname}</div>
            <div className="text-xs text-gray-400">Risk: {a.dropout_risk ?? 'N/A'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
