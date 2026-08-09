import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { getAnalytics } from '../../api/analytics';
import { fetchNotifications, markNotificationRead } from '../../api/notifications';

export default function AdminDashboard() {
  const [data, setData] = useState({ total_users: 0, active_apprentices: 0 });
  const [alerts, setAlerts] = useState([]);
  const [analytics, setAnalytics] = useState({ avg_attendance: 0, trend: [], risk_distribution: { low: 0, medium: 0, high: 0 } });
  const [filters, setFilters] = useState({ start_date: '', end_date: '' });
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/admin').then(res => setData(res.data)).catch(console.error);
    loadAlerts();
    loadAnalytics();
  }, []);

  const loadAlerts = async () => {
    const res = await fetchNotifications();
    const warnings = res.filter(n => n.type === 'warning').slice(0, 5);
    setAlerts(warnings);
  };

  const loadAnalytics = async () => {
    try {
      const res = await getAnalytics({
        ...(filters.start_date && { start_date: filters.start_date }),
        ...(filters.end_date && { end_date: filters.end_date }),
      });
      setAnalytics(res);
    } catch (e) {
      console.error('analytics failed');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      {/* Analytics Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Start Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={filters.start_date}
            onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">End Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-sm"
            value={filters.end_date}
            onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
          />
        </div>
        <button
          onClick={loadAnalytics}
          className="px-4 py-1.5 bg-primary-600 text-white rounded text-sm"
        >
          Apply
        </button>
        {(filters.start_date || filters.end_date) && (
          <button
            onClick={() => {
              setFilters({ start_date: '', end_date: '' });
              setTimeout(loadAnalytics, 0);
            }}
            className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm uppercase">Total Users</h2>
          <p className="text-3xl font-bold mt-2">{data.total_users}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm uppercase">Active Apprentices</h2>
          <p className="text-3xl font-bold mt-2">{data.active_apprentices}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm uppercase">System Status</h2>
          <p className="text-green-600 font-semibold mt-2">Operational</p>
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">System Alerts</h2>
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

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attendance Trend (simple) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Attendance Trend</h2>
          <div className="flex items-end gap-2 h-40">
            {(analytics.trend?.length ? analytics.trend : [40,60,55,70,65,80]).map((v, i) => (
              <div key={i} className="bg-primary-500 w-6 rounded" style={{ height: `${v}%` }} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Last 6 periods</p>
        </div>

        {/* Dropout Risk Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Dropout Risk</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Low</span>
              <span className="text-green-600">{analytics.risk_distribution.low}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Medium</span>
              <span className="text-yellow-600">{analytics.risk_distribution.medium}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>High</span>
              <span className="text-red-600">{analytics.risk_distribution.high}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Performance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded">
            <p className="text-sm text-gray-500">Avg Attendance</p>
            <p className="text-xl font-bold text-green-700">{analytics.avg_attendance}%</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded">
            <p className="text-sm text-gray-500">Completion Rate</p>
            <p className="text-xl font-bold text-yellow-700">65%</p>
          </div>
          <div className="p-4 bg-red-50 rounded">
            <p className="text-sm text-gray-500">Dropout Risk</p>
            <p className="text-xl font-bold text-red-700">High</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => navigate('/users/new')}
            className="px-4 py-2 bg-primary-600 text-white rounded"
          >
            Create User
          </button>
          <button
            onClick={() => navigate('/apprentices')}
            className="px-4 py-2 bg-gray-800 text-white rounded"
          >
            Manage Apprentices
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            View Reports
          </button>
        </div>
      </div>
    </div>
  );
}
