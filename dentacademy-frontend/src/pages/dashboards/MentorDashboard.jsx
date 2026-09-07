import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, TrendingUp, PenLine, ClipboardCheck } from 'lucide-react';
import api from '../../api/axios';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonStatGrid, SkeletonCard } from '../../components/ui/Skeleton';

export default function MentorDashboard() {
  const [data, setData] = useState({
    assigned_apprentices: 0,
    apprentice_list: [],
  });
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    setError(false);
    api
      .get('api/dashboard/mentor')
      .then((res) => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const avgCompletion =
    data.apprentice_list.length > 0
      ? Math.round(
          data.apprentice_list.reduce(
            (sum, a) => sum + (a.completion_pct || 0),
            0
          ) / data.apprentice_list.length
        )
      : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mentor Dashboard" subtitle="Your assigned apprentices and progress." />
        <SkeletonStatGrid count={2} />
        <SkeletonCard lines={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mentor Dashboard" />
        <Card>
          <ErrorState
            title="Could not load dashboard"
            description="Failed to load your mentor dashboard data."
            onRetry={load}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentor Dashboard"
        subtitle="Track assigned apprentices and submit evaluations."
        actions={
          <>
            <Button variant="secondary" icon={ClipboardCheck} onClick={() => navigate('/evaluations')}>
              My Evaluations
            </Button>
            <Button icon={PenLine} onClick={() => navigate('/evaluations/submit')}>
              Submit Evaluation
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
        <StatCard
          icon={Users}
          label="Assigned Apprentices"
          value={data.assigned_apprentices}
          tone="brand"
        />
        <StatCard
          icon={TrendingUp}
          label="Average Completion"
          value={`${avgCompletion}%`}
          tone="gray"
          hint={
            <ProgressBar progress={avgCompletion} className="mt-2" />
          }
        />
      </div>

      <Card padding={false} className="overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-line">
          <CardHeader title="My Apprentices" subtitle="Progress across your assignments." className="mb-0" />
        </div>

        {data.apprentice_list.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No apprentices assigned"
            description="When apprentices are assigned to you, they will appear here."
            action={
              <Button icon={PenLine} onClick={() => navigate('/evaluations/submit')}>
                Submit Evaluation
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {data.apprentice_list.map((apprentice, i) => (
              <div
                key={apprentice.apprentice_id}
                className="p-5 sm:p-6 animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <Avatar name={apprentice.full_name} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-ink">{apprentice.full_name}</h3>
                    <p className="text-sm text-ink-muted mt-0.5">
                      {apprentice.in_progress_modules} in progress ·{' '}
                      {apprentice.completed_modules} completed
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-2xl font-bold text-ink tabular-nums">
                      {apprentice.completion_pct}%
                    </p>
                    <p className="text-sm text-ink-muted">
                      {apprentice.latest_evaluation_score !== null
                        ? `Latest score: ${apprentice.latest_evaluation_score}`
                        : 'No evaluations yet'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <ProgressBar
                    progress={apprentice.completion_pct}
                    color={
                      apprentice.completion_pct >= 75
                        ? 'green'
                        : apprentice.completion_pct >= 50
                          ? 'blue'
                          : 'yellow'
                    }
                  />
                  {apprentice.pending_evaluations > 0 && (
                    <Badge
                      text={`${apprentice.pending_evaluations} pending evaluation${
                        apprentice.pending_evaluations === 1 ? '' : 's'
                      }`}
                      color="yellow"
                      pulse
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
