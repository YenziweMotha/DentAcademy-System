import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { getAtRiskApprentices } from '../../api/predictions';
import { listEscalations } from '../../api/experienceChat';
import AlertBanner from '../../components/ui/AlertBanner';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import ProgressBar from '../../components/ui/ProgressBar';
import Pagination from '../../components/ui/Pagination';
import SearchBar from '../../components/ui/SearchBar';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonStatGrid, SkeletonTable } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';

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
  const [pendingEscalations, setPendingEscalations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    setStatsLoading(true);
    api
      .get('/api/dashboard/supervisor')
      .then((res) => setData(res.data))
      .catch((err) => console.error('Failed to load supervisor dashboard:', err))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    getAtRiskApprentices()
      .then(setAtRisk)
      .catch((err) => console.error('Failed to load at-risk apprentices:', err));
  }, []);

  useEffect(() => {
    listEscalations({ status: 'PENDING_REVIEW' })
      .then((res) => setPendingEscalations((res.data || []).length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const loadApprentices = async () => {
      try {
        setPageLoading(true);
        setError('');
        const params = new URLSearchParams({
          skip: String(page * limit),
          limit: String(limit),
        });
        if (search.trim()) params.append('search', search.trim());
        const response = await api.get(`/api/apprentices?${params}`);
        setApprentices(response.data.items || []);
        setTotal(response.data.total || 0);
      } catch (err) {
        console.error('Failed to load apprentices:', err);
        setApprentices([]);
        setError(err.response?.data?.detail || 'Failed to load apprentices.');
      } finally {
        setPageLoading(false);
        setLoading(false);
      }
    };
    loadApprentices();
  }, [page, limit, search]);

  const totalPages = Math.ceil(total / limit);
  const needsEval = data.apprentice_list.filter((a) => a.needs_evaluation);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supervisor Dashboard"
        subtitle="Monitor apprentice progress and follow up on evaluations."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" icon={ShieldAlert} onClick={() => navigate('/escalations')}>
              Experience reviews
              {pendingEscalations > 0 ? ` (${pendingEscalations})` : ''}
            </Button>
            <Button onClick={() => navigate('/evaluations/approve')}>
              Approve Evaluations
            </Button>
          </div>
        }
      />

      {pendingEscalations > 0 && (
        <AlertBanner
          type="warning"
          message={`${pendingEscalations} experience report${pendingEscalations === 1 ? '' : 's'} awaiting human review.`}
        />
      )}

      {atRisk.length > 0 && (
        <AlertBanner
          type="warning"
          message={`${atRisk.length} apprentice${atRisk.length === 1 ? '' : 's'} marked as high risk. Review AI Predictions for details.`}
        />
      )}

      {statsLoading ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
          <StatCard
            icon={ClipboardList}
            label="Pending Evaluations"
            value={data.pending_evaluations}
            tone="yellow"
            onClick={() => navigate('/evaluations/approve')}
          />
          <StatCard
            icon={ShieldAlert}
            label="Experience Reviews"
            value={pendingEscalations}
            tone="red"
            onClick={() => navigate('/escalations')}
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
            onClick={() => navigate('/predictions')}
          />
        </div>
      )}

      {needsEval.length > 0 && (
        <Card padding={false} className="overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-line">
            <CardHeader
              title="Needs Evaluation"
              subtitle={`No evaluation in the last ${data.evaluation_alert_days} days.`}
              className="mb-0"
              actions={<Badge text={`${needsEval.length} overdue`} color="yellow" pulse />}
            />
          </div>
          <div className="divide-y divide-line">
            {needsEval.map((apprentice) => (
              <div
                key={apprentice.apprentice_id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <Avatar name={apprentice.full_name} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink">{apprentice.full_name}</h3>
                  <p className="text-sm text-ink-muted mt-0.5">
                    Completion {apprentice.completion_pct}%
                  </p>
                </div>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() =>
                    navigate(`/dashboard/performance/${apprentice.apprentice_id}`)
                  }
                >
                  View Performance <ArrowRight size={14} />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padding={false} className="overflow-hidden">
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
              setPage(0);
              setSearch(searchInput);
            }}
            onClear={() => {
              setSearchInput('');
              setSearch('');
              setPage(0);
            }}
            placeholder="Search by name or ID number..."
            bare
          />
        </div>

        {loading || pageLoading ? (
          <SkeletonTable rows={5} cols={3} />
        ) : error ? (
          <ErrorState description={error} />
        ) : apprentices.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'No matches' : 'No apprentices found'}
            description={
              search
                ? `No apprentices matching “${search}”.`
                : 'Apprentices will appear here once registered.'
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {apprentices.map((apprentice) => (
              <div
                key={apprentice.apprentice_id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-surface-muted/40 transition-colors"
              >
                <Avatar
                  name={`${apprentice.first_name} ${apprentice.surname}`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-ink">
                    {apprentice.first_name} {apprentice.surname}
                  </h3>
                  <p className="text-sm text-ink-muted">
                    ID {apprentice.id_number}
                    {apprentice.province ? ` · ${apprentice.province}` : ''}
                  </p>
                  <div className="mt-2 max-w-xs">
                    <ProgressBar progress={apprentice.completion_pct ?? 0} showLabel />
                  </div>
                </div>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() =>
                    navigate(`/dashboard/performance/${apprentice.apprentice_id}`)
                  }
                >
                  View Performance <ArrowRight size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!pageLoading && total > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            zeroIndexed
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        )}
      </Card>
    </div>
  );
}
