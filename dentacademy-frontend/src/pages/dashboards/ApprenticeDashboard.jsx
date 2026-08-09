import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ApprenticeDashboard() {
  const [data, setData] = useState({ completed_modules: 0 });

  useEffect(() => {
    api.get('api/dashboard/apprentice').then(res => setData(res.data)).catch(console.error);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">My Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Completed Modules</h2>
          <p className="text-3xl font-bold text-green-600 mt-2">{data.completed_modules}</p>
        </div>
      </div>
    </div>
  );
}
