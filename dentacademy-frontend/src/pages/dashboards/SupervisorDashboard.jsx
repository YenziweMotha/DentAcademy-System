import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { getAtRiskApprentices } from '../../api/predictions';
import AlertBanner from '../../components/ui/AlertBanner';
import StatCard from '../../components/ui/StatCard';
import { ClipboardList, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SupervisorDashboard() {
  const [data, setData] = useState({
    pending_evaluations: 0,
    avg_completion_pct: 0,
    at_risk_count: 0,
    evaluation_alert_days: 30,
    apprentice_list: [],
  });

  const [apprentices, setApprentices] = useState([]);
  const [atRisk, setAtRisk] = useState([]);

  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const navigate = useNavigate();

  /*
   * Load supervisor dashboard statistics
   */
  useEffect(() => {
    api
      .get('/api/dashboard/supervisor')
      .then((res) => setData(res.data))
      .catch((error) => {
        console.error('Failed to load supervisor dashboard:', error);
      });
  }, []);

  /*
   * Load at-risk apprentices
   */
  useEffect(() => {
    getAtRiskApprentices()
      .then(setAtRisk)
      .catch((error) => {
        console.error('Failed to load at-risk apprentices:', error);
      });
  }, []);

  /*
   * Load paginated apprentices
   */
  useEffect(() => {
    const loadApprentices = async () => {
      try {
        setPageLoading(true);

        const skip = page * limit;

        const params = new URLSearchParams({
          skip: skip.toString(),
          limit: limit.toString(),
        });

        if (search.trim()) {
          params.append('search', search.trim());
        }

        const response = await api.get(
          `/api/apprentices?${params.toString()}`
        );

        /*
         * Backend now returns:
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
        setPageLoading(false);
        setLoading(false);
      }
    };

    loadApprentices();
  }, [page, limit, search]);

  /*
   * Search
   */
  const handleSearch = (e) => {
    e.preventDefault();

    setPage(0);
    setSearch(searchInput);
  };

  /*
   * Clear search
   */
  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Supervisor Dashboard
        </h1>

        <p className="text-gray-500 mt-1">
          Monitor apprentice progress and performance.
        </p>
      </div>

      {/* At Risk Alert */}
      {atRisk.length > 0 && (
        <div className="mb-6">
          <AlertBanner
            type="warning"
            message={`Alert: ${atRisk.length} apprentices are marked as High Risk.`}
          />
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

        <StatCard
          icon={ClipboardList}
          label="Pending Evaluations"
          value={data.pending_evaluations}
          tone="yellow"
        />

        <StatCard
          icon={Users}
          label="Total Apprentices"
          value={total}
          tone="gray"
        />

        <StatCard
          icon={TrendingUp}
          label="Average Completion"
          value={`${data.avg_completion_pct}%`}
          tone="brand"
        />

        <StatCard
          icon={AlertTriangle}
          label="At Risk"
          value={data.at_risk_count}
          tone="red"
        />

      </div>

      {/* Needs evaluation */}
      {data.apprentice_list.filter((a) => a.needs_evaluation).length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              Needs Evaluation
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Apprentices with no evaluation in the last{' '}
              {data.evaluation_alert_days} days.
            </p>
          </div>

          <div className="divide-y">
            {data.apprentice_list
              .filter((a) => a.needs_evaluation)
              .map((apprentice) => (
                <div
                  key={apprentice.apprentice_id}
                  className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {apprentice.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Completion:{' '}
                      <span className="font-medium">
                        {apprentice.completion_pct}%
                      </span>
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
        </div>
      )}

      {/* Apprentice Performance */}
      <div className="bg-white rounded-lg shadow">

        <div className="p-6 border-b">

          <h2 className="text-xl font-semibold text-gray-800">
            Apprentice Performance
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Search for an apprentice and select them to view their
            performance record.
          </p>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row gap-3 mt-5"
          >

            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name or ID number..."
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />

            <button
              type="submit"
              className="bg-brand text-white px-5 py-2 rounded-md hover:bg-brand-dark"
            >
              Search
            </button>

            {search && (
              <button
                type="button"
                onClick={clearSearch}
                className="bg-gray-200 text-gray-700 px-5 py-2 rounded-md hover:bg-gray-300"
              >
                Clear
              </button>
            )}

          </form>

        </div>

        {/* Apprentice List */}
        {loading || pageLoading ? (

          <div className="p-6 text-gray-500">
            Loading apprentices...
          </div>

        ) : apprentices.length === 0 ? (

          <div className="p-6 text-gray-500">
            {search
              ? `No apprentices found matching "${search}".`
              : 'No apprentices found.'}
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
                    Completion:{' '}
                    {apprentice.completion_pct ?? 0}%
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
        {!pageLoading && total > 0 && (
          <div className="p-6 border-t flex flex-col md:flex-row items-center justify-between gap-4">

            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">
                {page * limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min((page + 1) * limit, total)}
              </span>{' '}
              of{' '}
              <span className="font-medium">
                {total}
              </span>{' '}
              apprentices
            </p>

            <div className="flex items-center gap-3">

              <button
                type="button"
                disabled={page === 0 || pageLoading}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>

              <button
                type="button"
                disabled={
                  page >= totalPages - 1 || pageLoading
                }
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}