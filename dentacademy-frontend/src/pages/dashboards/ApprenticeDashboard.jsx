import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Layers, MessageSquareHeart, Trophy, User } from 'lucide-react';
import api from '../../api/axios';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import AlertBanner from '../../components/ui/AlertBanner';
import ErrorState from '../../components/ui/ErrorState';
import Button from '../../components/ui/Button';
import { SkeletonStatGrid, SkeletonCard } from '../../components/ui/Skeleton';

const EMPTY_DASHBOARD = {
  full_name: '',
  status: '',
  completion_pct: 0,
  completed_modules: 0,
  in_progress_modules: 0,
  total_modules: 0,
  qualification_type: null,
  institution: null,
  academic_average: null,
  recent_evaluations: [],
};

export default function ApprenticeDashboard() {
  const [data, setData] = useState(EMPTY_DASHBOARD);
  const [error, setError] = useState(false);
  const [noProfile, setNoProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(false);
    setNoProfile(false);
    api
      .get('/api/dashboard/apprentice')
      .then((res) => {
        const payload = res.data || {};
        if (!payload.apprentice_id) {
          setNoProfile(true);
          return;
        }
        setData({
          ...EMPTY_DASHBOARD,
          ...payload,
          recent_evaluations: payload.recent_evaluations || [],
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString() : 'N/A';

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Dashboard" subtitle="Your programme progress and evaluations." />
        <SkeletonCard lines={2} />
        <SkeletonStatGrid count={3} />
        <SkeletonCard lines={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Dashboard"
        subtitle="Your programme progress and recent evaluations."
        actions={
          !noProfile ? (
            <Link to="/experience-chat">
              <Button icon={MessageSquareHeart} variant="primary">
                Tell us about today
              </Button>
            </Link>
          ) : null
        }
      />

      {!error && !noProfile && (
        <Card className="bg-gradient-to-r from-brand-light/80 to-surface-raised dark:from-emerald-950/40 border-brand/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
                <MessageSquareHeart size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-ink">AI Experience Assistant</h3>
                <p className="text-sm text-ink-muted mt-0.5">
                  Privately share how your day went. Serious concerns are escalated for human review —
                  mentors are not automatically shown confidential complaints.
                </p>
              </div>
            </div>
            <Link to="/experience-chat" className="shrink-0">
              <Button variant="soft">Open chat</Button>
            </Link>
          </div>
        </Card>
      )}

      {error && (
        <Card>
          <ErrorState
            title="Could not load dashboard"
            description="Failed to load your apprentice dashboard data."
            onRetry={load}
          />
        </Card>
      )}

      {noProfile && (
        <AlertBanner
          type="warning"
          message="Your apprentice profile has not been set up yet. Please contact an administrator to link your account."
        />
      )}

      {!error && !noProfile && (
        <>
          <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar name={data.full_name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-ink tracking-tight">
                    {data.full_name}
                  </h2>
                  <StatusBadge status={data.status} />
                </div>
                <p className="text-sm text-ink-muted mt-1">
                  {data.qualification_type || 'No qualification recorded'}
                  {data.institution ? ` · ${data.institution}` : ''}
                  {data.academic_average !== null
                    ? ` · Academic average ${data.academic_average}%`
                    : ''}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-3xl font-bold text-brand tabular-nums">
                  {data.completion_pct}%
                </p>
                <p className="text-xs text-ink-subtle font-medium uppercase tracking-wider">
                  Complete
                </p>
              </div>
            </div>
            <ProgressBar
              progress={data.completion_pct}
              className="mt-5"
              color={
                data.completion_pct >= 75
                  ? 'green'
                  : data.completion_pct >= 50
                    ? 'blue'
                    : 'yellow'
              }
            />
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
            <StatCard
              icon={Trophy}
              label="Completed Modules"
              value={`${data.completed_modules}`}
              hint={`of ${data.total_modules} total`}
              tone="brand"
            />
            <StatCard
              icon={Layers}
              label="In Progress"
              value={data.in_progress_modules}
              tone="yellow"
            />
            <StatCard
              icon={BookOpen}
              label="Programme Completion"
              value={`${data.completion_pct}%`}
              tone="gray"
            />
          </div>

          <Card padding={false} className="overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-line">
              <CardHeader
                title="Recent Evaluations"
                subtitle="Scores submitted by your mentor."
                className="mb-0"
              />
            </div>

            {(data.recent_evaluations || []).length === 0 ? (
              <EmptyState
                icon={User}
                title="No evaluations yet"
                description="Evaluations submitted by your mentor will show up here."
              />
            ) : (
              <div className="divide-y divide-line">
                {(data.recent_evaluations || []).map((evaluation) => (
                  <div
                    key={evaluation.evaluation_id}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div>
                      <p className="text-3xl font-bold text-ink tabular-nums">
                        {evaluation.overall_score}
                      </p>
                      <p className="text-sm text-ink-muted mt-1">
                        Submitted {formatDate(evaluation.submitted_at)}
                      </p>
                    </div>
                    <StatusBadge status={evaluation.approved ? 'APPROVED' : 'PENDING'} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
