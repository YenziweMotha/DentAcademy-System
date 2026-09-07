import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users as UsersIcon } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import ProgressBar from '../../components/ui/ProgressBar';
import SearchBar from '../../components/ui/SearchBar';
import Pagination from '../../components/ui/Pagination';
import ErrorState from '../../components/ui/ErrorState';
import AlertBanner from '../../components/ui/AlertBanner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

export default function ApprenticeList() {
  const [apprentices, setApprentices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusLoading, setStatusLoading] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
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

  const toggleStatus = async (apprentice) => {
    try {
      setStatusLoading(apprentice.apprentice_id);
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
      setConfirmTarget(null);
      loadApprentices();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status.');
    } finally {
      setStatusLoading(null);
    }
  };

  const requestStatusToggle = (apprentice) => {
    if (apprentice.status === 'ACTIVE') {
      setConfirmTarget(apprentice);
    } else {
      toggleStatus(apprentice);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apprentices"
        subtitle="Register, search and manage apprentices."
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard/admin' },
          { label: 'Apprentices' },
        ]}
        actions={
          <Button icon={Plus} onClick={() => navigate('/apprentices/create')}>
            Register Apprentice
          </Button>
        }
      />

      <SearchBar
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        onClear={() => {
          setSearchInput('');
          setSearch('');
          setPage(1);
        }}
        placeholder="Search by name or ID number..."
      />

      {error && (
        <AlertBanner type="error" message={error} onDismiss={() => setError('')} />
      )}

      <Card padding={false} className="overflow-hidden">
        {loading ? (
          <SkeletonTable rows={6} cols={5} />
        ) : error && apprentices.length === 0 ? (
          <ErrorState description={error} onRetry={loadApprentices} />
        ) : apprentices.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title={search ? 'No apprentices found' : 'No apprentices yet'}
            description={
              search
                ? `No apprentices matching “${search}”.`
                : 'Register the first apprentice to get started.'
            }
            action={
              !search && (
                <Button icon={Plus} onClick={() => navigate('/apprentices/create')}>
                  Register Apprentice
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-muted/60">
                  <tr>
                    {['Name', 'ID Number', 'Province', 'Completion', 'Status', 'Actions'].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-5 py-3 text-[11px] font-semibold text-ink-subtle uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {apprentices.map((apprentice) => (
                    <tr
                      key={apprentice.apprentice_id}
                      className="hover:bg-surface-muted/40 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${apprentice.first_name} ${apprentice.surname}`}
                            size="sm"
                          />
                          <span className="font-semibold text-ink">
                            {apprentice.first_name} {apprentice.surname}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-muted">
                        {apprentice.id_number}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-muted">
                        {apprentice.province || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 w-40">
                        <ProgressBar
                          progress={apprentice.completion_pct ?? 0}
                          showLabel
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <StatusBadge status={apprentice.status} />
                          {apprentice.is_registered === false && (
                            <StatusBadge status="REGISTRATION_PENDING" />
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {apprentice.is_registered === false && (
                            <Button
                              size="sm"
                              variant="accent"
                              onClick={() =>
                                navigate(
                                  `/apprentices/${apprentice.apprentice_id}/register`
                                )
                              }
                            >
                              Complete
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigate(`/apprentices/${apprentice.apprentice_id}`)
                            }
                          >
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              navigate(`/apprentices/${apprentice.apprentice_id}/edit`)
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={statusLoading === apprentice.apprentice_id}
                            className={
                              apprentice.status === 'ACTIVE'
                                ? '!text-rose-600'
                                : '!text-emerald-600'
                            }
                            onClick={() => requestStatusToggle(apprentice)}
                          >
                            {apprentice.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-line">
              {apprentices.map((apprentice) => (
                <div key={apprentice.apprentice_id} className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={`${apprentice.first_name} ${apprentice.surname}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink">
                        {apprentice.first_name} {apprentice.surname}
                      </p>
                      <p className="text-sm text-ink-muted">
                        {apprentice.id_number}
                        {apprentice.province ? ` · ${apprentice.province}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <StatusBadge status={apprentice.status} />
                        {apprentice.is_registered === false && (
                          <StatusBadge status="REGISTRATION_PENDING" />
                        )}
                      </div>
                    </div>
                  </div>
                  <ProgressBar progress={apprentice.completion_pct ?? 0} showLabel />
                  <div className="flex flex-wrap gap-2">
                    {apprentice.is_registered === false && (
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() =>
                          navigate(
                            `/apprentices/${apprentice.apprentice_id}/register`
                          )
                        }
                      >
                        Complete registration
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        navigate(`/apprentices/${apprentice.apprentice_id}`)
                      }
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        navigate(`/apprentices/${apprentice.apprentice_id}/edit`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={statusLoading === apprentice.apprentice_id}
                      className={
                        apprentice.status === 'ACTIVE'
                          ? '!text-rose-600'
                          : '!text-emerald-600'
                      }
                      onClick={() => requestStatusToggle(apprentice)}
                    >
                      {apprentice.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        )}
      </Card>

      <ConfirmDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && toggleStatus(confirmTarget)}
        title="Deactivate apprentice?"
        description={
          confirmTarget
            ? `Deactivate ${confirmTarget.first_name} ${confirmTarget.surname}? They will no longer appear as active in the programme.`
            : ''
        }
        confirmLabel="Deactivate"
        variant="danger"
        loading={!!confirmTarget && statusLoading === confirmTarget.apprentice_id}
      />
    </div>
  );
}
