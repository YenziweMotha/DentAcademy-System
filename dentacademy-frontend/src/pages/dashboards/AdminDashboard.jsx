import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, AlertTriangle, ClipboardList } from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import { SkeletonTable } from '../../components/ui/Skeleton';

export default function AdminDashboard() {
  const [data, setData] = useState({
    total_apprentices: 0,
    active_apprentices: 0,
    at_risk_count: 0,
    avg_completion_pct: 0,
    pending_evaluations: 0,
    recent_audit: [],
  });

  const [apprentices, setApprentices] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const limit = 10;

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadApprentices();
  }, [page, search]);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/api/dashboard/admin');
      setData(response.data);
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
    }
  };

  const loadApprentices = async () => {
    setLoading(true);

    try {
      const skip = (page - 1) * limit;

      const response = await api.get('/api/apprentices', {
        params: {
          skip,
          limit,
          search: search || undefined,
        },
      });

      /*
       * Backend pagination response:
       *
       * {
       *   items: [...],
       *   total: 5000,
       *   skip: 0,
       *   limit: 10
       * }
       */

      setApprentices(response.data.items || []);
      setTotal(response.data.total || 0);

    } catch (error) {
      console.error('Failed to load apprentices:', error);
      setApprentices([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const handleSearch = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Admin Dashboard
          </h1>

          <p className="text-gray-500 mt-1">
            Manage apprentices, users and performance records.
          </p>
        </div>

        {/* Admin navigation */}
        <div className="flex gap-3">

          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/users')}
            className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark"
          >
            Users
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/settings')}
            className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark"
          >
            Settings
          </button>

          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/reports')}
            className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800"
          >
            Reports
          </button>

        </div>

      </div>

      {/* Dashboard statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <StatCard
          icon={Users}
          label="Total Apprentices"
          value={data.total_apprentices}
          tone="brand"
        />

        <StatCard
          icon={UserCheck}
          label="Active Apprentices"
          value={data.active_apprentices}
          tone="gray"
        />

        <StatCard
          icon={AlertTriangle}
          label="At Risk"
          value={data.at_risk_count}
          tone="red"
        />

        <StatCard
          icon={ClipboardList}
          label="Pending Evaluations"
          value={data.pending_evaluations}
          tone="yellow"
        />

      </div>

      {/* Apprentice performance */}
      <div className="bg-white rounded-lg shadow">

        <div className="p-6 border-b">

          <h2 className="text-xl font-semibold text-gray-800">
            Apprentice Performance
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Search for an apprentice and generate their performance record.
          </p>

          {/* Search */}
          <div className="mt-4">

            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search by name or ID number..."
              className="w-full md:w-96 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />

          </div>

        </div>

        {/* Apprentice list */}
        {loading ? (

          <SkeletonTable rows={4} cols={3} />

        ) : apprentices.length === 0 ? (

          <div className="p-6 text-gray-500">
            No apprentices found.
          </div>

        ) : (

          <div className="divide-y">

            {apprentices.map((apprentice) => (

              <div
                key={apprentice.apprentice_id}
                className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
              >

                <div>

                  <h3 className="font-semibold text-gray-800">
                    {apprentice.first_name} {apprentice.surname}
                  </h3>

                  <p className="text-sm text-gray-500">
                    ID: {apprentice.id_number}
                  </p>

                  <p className="text-sm text-gray-500">
                    Province: {apprentice.province}
                  </p>

                  <p className="text-sm text-gray-500">
                    Completion: {apprentice.completion_pct ?? 0}%
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/dashboard/performance/${apprentice.apprentice_id}`
                    )
                  }
                  className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark"
                >
                  View Performance
                </button>

              </div>

            ))}

          </div>

        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (

          <div className="flex items-center justify-between p-6 border-t">

            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>

          </div>

        )}

      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Recent Activity
          </h2>
        </div>

        {data.recent_audit.length === 0 ? (
          <div className="p-6 text-gray-500">No recent activity recorded.</div>
        ) : (
          <div className="divide-y">
            {data.recent_audit.map((entry) => (
              <div
                key={entry.log_id}
                className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              >
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{entry.action_type}</span>
                  <span className="text-gray-500">
                    {' '}
                    on {entry.entity_type}
                    {entry.record_id ? ` #${entry.record_id}` : ''}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}