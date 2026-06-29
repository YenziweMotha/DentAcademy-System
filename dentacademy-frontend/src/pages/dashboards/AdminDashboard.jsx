import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [data, setData] = useState({ total_users: 0, active_apprentices: 0 });

  useEffect(() => {
    api.get('/dashboard/admin').then(res => setData(res.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Total Users</h2>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.total_users}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Active Apprentices</h2>
          <p className="text-3xl font-bold text-gray-800 mt-2">{data.active_apprentices}</p>
        </div>
      </div>
    </div>
  );
}
