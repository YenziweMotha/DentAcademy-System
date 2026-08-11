import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Plus, Users as UsersIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';

export default function ApprenticeList() {
  const [apprentices, setApprentices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const navigate = useNavigate();
  const toast = useToast();

  const loadApprentices = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/api/apprentices', {
        params: {
          skip: (page - 1) * limit,
          limit,
          search: search || undefined,
        },
      });

      setApprentices(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Failed to load apprentices:', err);
      setError(err.response?.data?.detail || 'Failed to load apprentices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprentices();
  }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const toggleStatus = async (apprentice) => {
    try {
      const isDeactivating = apprentice.status === 'ACTIVE';
      await api.patch(
        `/api/apprentices/${apprentice.apprentice_id}/${
          isDeactivating ? 'deactivate' : 'reactivate'
        }`
      );
      toast.success(
        isDeactivating
          ? `${apprentice.first_name} ${apprentice.surname} deactivated.`
          : `${apprentice.first_name} ${apprentice.surname} activated.`
      );
      loadApprentices();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status.');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <PageHeader
        title="Apprentices"
        subtitle="Register, search and manage apprentices."
        actions={
          <button
            type="button"
            onClick={() => navigate('/apprentices/create')}
            className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus size={16} /> Register Apprentice
          </button>
        }
      />

      <form
        onSubmit={handleSearch}
        className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name or ID number..."
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2 rounded-md hover:bg-brand-dark transition-colors"
        >
          <Search size={15} /> Search
        </button>
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex items-center gap-2 bg-gray-200 text-gray-700 px-5 py-2 rounded-md hover:bg-gray-300 transition-colors"
          >
            <X size={15} /> Clear
          </button>
        )}
      </form>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : apprentices.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={search ? 'No apprentices found' : 'No apprentices yet'}
            description={
              search
                ? `No apprentices matching "${search}".`
                : 'Register the first apprentice to get started.'
            }
            action={
              !search && (
                <button
                  type="button"
                  onClick={() => navigate('/apprentices/create')}
                  className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark transition-colors"
                >
                  <Plus size={16} /> Register Apprentice
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Province</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apprentices.map((apprentice) => (
                  <tr key={apprentice.apprentice_id}>
                    <td className="p-4 font-medium text-gray-800">
                      {apprentice.first_name} {apprentice.surname}
                    </td>
                    <td className="p-4 text-gray-600">
                      {apprentice.id_number}
                    </td>
                    <td className="p-4 text-gray-600">
                      {apprentice.province || 'N/A'}
                    </td>
                    <td className="p-4 text-gray-600">
                      {apprentice.completion_pct ?? 0}%
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          apprentice.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {apprentice.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/apprentices/${apprentice.apprentice_id}`
                            )
                          }
                          className="text-brand hover:underline text-sm"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/apprentices/${apprentice.apprentice_id}/edit`
                            )
                          }
                          className="text-brand hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(apprentice)}
                          className={`hover:underline text-sm ${
                            apprentice.status === 'ACTIVE'
                              ? 'text-red-600'
                              : 'text-green-600'
                          }`}
                        >
                          {apprentice.status === 'ACTIVE'
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="p-6 border-t flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              Showing{' '}
              <span className="font-medium">
                {(page - 1) * limit + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-medium">{total}</span> apprentices
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center gap-1 px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}