import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  AlertTriangle,
  ClipboardList,
  Settings,
  FileText,
  ScrollText,
  ArrowRight,
  Activity,
} from 'lucide-react';
import StatCard from '../../components/ui/StatCard';
import { SkeletonTable, SkeletonStatGrid } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import ProgressBar from '../../components/ui/ProgressBar';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import ErrorState from '../../components/ui/ErrorState';
import { useToast } from '../../context/ToastContext';

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
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const toast = useToast();
  const limit = 10;

  const loadDashboard = async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/api/dashboard/admin');
      setData(response.data);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
      toast.error('Failed to load dashboard statistics.');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadApprentices = async () => {
    setLoading(true);
    setError('');
    try {
      const skip = (page - 1) * limit;
      const response = await api.get('/api/apprentices', {
        params: { skip, limit, search: search || undefined },
      });
      setApprentices(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      console.error('Failed to load apprentices:', err);
      setApprentices([]);
      setError(err.response?.data?.detail || 'Failed to load apprentices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    loadApprentices();
  }, [page, search]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Overview of apprentices, evaluations, and recent activity."
        actions={
          <>
            <Button variant="secondary" icon={Users} onClick={() => navigate('/dashboard/admin/users')}>
              Users
            </Button>
            <Button variant="secondary" icon={Settings} onClick={() => navigate('/dashboard/admin/settings')}>
              Settings
            </Button>
            <Button variant="outline" icon={FileText} onClick={() => navigate('/dashboard/admin/reports')}>
              Reports
            </Button>
            <Button variant="outline" icon={ScrollText} onClick={() => navigate('/dashboard/admin/logs')}>
              Logs
            </Button>
          </>
        }
      />

      {statsLoading ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
          <StatCard
            icon={Users}
            label="Total Apprentices"
            value={data.total_apprentices}
            tone="brand"
            onClick={() => navigate('/apprentices')}
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
            onClick={() => navigate('/predictions')}
          />
          <StatCard
            icon={ClipboardList}
            label="Pending Evaluations"
            value={data.pending_evaluations}
            tone="yellow"
            onClick={() => navigate('/evaluations/approve')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card padding={false} className="xl:col-span-2 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-line">
            <CardHeader
              title="Apprentice Performance"
              subtitle="Search and open a performance record."
              className="mb-4"
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
              bare
            />
          </div>

          {loading ? (
            <SkeletonTable rows={4} cols={3} />
          ) : error ? (
            <ErrorState description={error} onRetry={loadApprentices} />
          ) : apprentices.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? 'No apprentices found' : 'No apprentices yet'}
              description={
                search
                  ? `No results matching “${search}”.`
                  : 'Register an apprentice to see them here.'
              }
              action={
                !search && (
                  <Button onClick={() => navigate('/apprentices/create')}>
                    Register Apprentice
                  </Button>
                )
              }
            />
          ) : (
            <div className="divide-y divide-line">
              {apprentices.map((apprentice, i) => (
                <div
                  key={apprentice.apprentice_id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-surface-muted/40 transition-colors"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Avatar
                    name={`${apprentice.first_name} ${apprentice.surname}`}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink truncate">
                      {apprentice.first_name} {apprentice.surname}
                    </h3>
                    <p className="text-sm text-ink-muted mt-0.5">
                      ID {apprentice.id_number}
                      {apprentice.province ? ` · ${apprentice.province}` : ''}
                    </p>
                    <div className="mt-2 max-w-xs">
                      <ProgressBar
                        progress={apprentice.completion_pct ?? 0}
                        color={
                          (apprentice.completion_pct ?? 0) >= 75
                            ? 'green'
                            : (apprentice.completion_pct ?? 0) >= 50
                              ? 'blue'
                              : 'yellow'
                        }
                        showLabel
                      />
                    </div>
                  </div>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() =>
                      navigate(`/dashboard/performance/${apprentice.apprentice_id}`)
                    }
                  >
                    View Performance
                    <ArrowRight size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && (
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

        <Card padding={false} className="overflow-hidden h-fit">
          <div className="p-5 sm:p-6 border-b border-line">
            <CardHeader
              title="Recent Activity"
              subtitle="Latest system audit events."
              className="mb-0"
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard/admin/logs')}
                >
                  View all
                </Button>
              }
            />
          </div>
          {data.recent_audit.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent activity"
              description="Audit events will appear here as actions are taken."
            />
          ) : (
            <div className="divide-y divide-line max-h-[28rem] overflow-y-auto">
              {data.recent_audit.map((entry) => (
                <div key={entry.log_id} className="p-4 flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-brand shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-ink">
                      <span className="font-semibold">{entry.action_type}</span>
                      <span className="text-ink-muted">
                        {' '}
                        on {entry.entity_type}
                        {entry.record_id ? ` #${entry.record_id}` : ''}
                      </span>
                    </p>
                    <p className="text-xs text-ink-subtle mt-1">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
