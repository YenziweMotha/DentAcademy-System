import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Flag,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  getEscalation,
  getExperienceAnalytics,
  listEscalations,
  updateEscalation,
} from '../../api/experienceChat';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { SkeletonStatGrid, SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ESCALATED_FURTHER', label: 'Escalated further' },
];

function severityColor(severity) {
  switch (severity) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'yellow';
    case 'MEDIUM':
      return 'blue';
    default:
      return 'gray';
  }
}

function statusColor(status) {
  switch (status) {
    case 'PENDING_REVIEW':
      return 'yellow';
    case 'UNDER_REVIEW':
      return 'blue';
    case 'RESOLVED':
      return 'green';
    case 'ESCALATED_FURTHER':
      return 'red';
    default:
      return 'gray';
  }
}

export default function EscalationReview() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING_REVIEW');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const [analyticsRes, listRes] = await Promise.all([
        getExperienceAnalytics(30),
        listEscalations(params),
      ]);
      setAnalytics(analyticsRes.data);
      setItems(listRes.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load escalation dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const openDetail = async (escalationId) => {
    setDetailLoading(true);
    try {
      const res = await getEscalation(escalationId);
      setSelected(res.data);
      setNotes(res.data.supervisor_notes || '');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not open escalation.');
    } finally {
      setDetailLoading(false);
    }
  };

  const save = async (nextStatus) => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = { supervisor_notes: notes };
      if (nextStatus) payload.status = nextStatus;
      const res = await updateEscalation(selected.escalation_id, payload);
      setSelected(res.data);
      toast.success('Escalation updated.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (error && !analytics) {
    return (
      <div className="page-shell">
        <PageHeader
          title="Experience Escalations"
          subtitle="Review AI-triaged apprenticeship experience reports."
        />
        <ErrorState description={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Experience Escalations"
        subtitle="Human review of AI-triaged daily experience reports. The AI does not make disciplinary decisions."
      />

      {loading && !analytics ? (
        <>
          <SkeletonStatGrid count={4} />
          <SkeletonTable rows={5} cols={5} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
            <StatCard
              icon={ClipboardList}
              label="Reports (30d)"
              value={analytics?.total_reports ?? 0}
              tone="brand"
            />
            <StatCard
              icon={Flag}
              label="Pending review"
              value={analytics?.pending_escalations ?? 0}
              tone="yellow"
            />
            <StatCard
              icon={ShieldAlert}
              label="Mentor-related"
              value={analytics?.mentor_related ?? 0}
              tone="red"
            />
            <StatCard
              icon={AlertTriangle}
              label="Emergency flags"
              value={analytics?.emergency ?? 0}
              tone="red"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={CheckCircle2}
              label="Positive"
              value={analytics?.positive ?? 0}
              tone="brand"
            />
            <StatCard
              icon={Users}
              label="Negative"
              value={analytics?.negative ?? 0}
              tone="gray"
            />
            <StatCard
              icon={Flag}
              label="Behaviour concerns"
              value={analytics?.apprentice_misconduct ?? 0}
              tone="yellow"
            />
            <StatCard
              icon={AlertTriangle}
              label="High / critical"
              value={analytics?.high_severity ?? 0}
              tone="red"
            />
          </div>

          {analytics?.recent_days?.length > 0 && (
            <Card>
              <CardHeader title="Daily volume" subtitle="Aggregates only — report content is not shown here." />
              <div className="flex items-end gap-1.5 h-28 overflow-x-auto px-1">
                {analytics.recent_days.map((d) => {
                  const max = Math.max(...analytics.recent_days.map((x) => x.total), 1);
                  const h = Math.max(8, Math.round((d.total / max) * 100));
                  return (
                    <div
                      key={d.date}
                      className="flex flex-col items-center gap-1 min-w-[28px] flex-1"
                      title={`${d.date}: ${d.total} reports, ${d.escalated} escalated`}
                    >
                      <div
                        className="w-full rounded-t-md bg-brand/80 relative"
                        style={{ height: `${h}%` }}
                      >
                        {d.emergency > 0 && (
                          <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-rose-500" />
                        )}
                      </div>
                      <span className="text-[9px] text-ink-subtle rotate-0 truncate w-full text-center">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card padding={false}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-line">
              <div>
                <h3 className="section-title text-base">Escalation queue</h3>
                <p className="meta-text">Potential concerns requiring supervisor verification.</p>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm focus-ring"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {error && <AlertBanner type="error" message={error} className="m-4" />}

            {items.length === 0 ? (
              <EmptyState
                title="No escalations"
                description="Nothing in this queue right now."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-muted/60">
                    <tr>
                      <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Case
                      </th>
                      <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Apprentice
                      </th>
                      <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Classification
                      </th>
                      <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((item) => (
                      <tr key={item.escalation_id} className="hover:bg-surface-muted/40">
                        <td className="p-4">
                          <p className="font-medium text-ink">#{item.escalation_id}</p>
                          <p className="text-xs text-ink-muted line-clamp-2 max-w-xs">
                            {item.ai_summary || item.reason}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.mentor_related && <Badge text="Mentor-related" color="red" />}
                            {item.is_emergency && <Badge text="Emergency" color="red" pulse />}
                            {item.apprentice_misconduct && (
                              <Badge text="Behaviour" color="yellow" />
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-ink">
                          {item.apprentice_name || `Apprentice #${item.apprentice_id}`}
                        </td>
                        <td className="p-4">
                          <Badge text={item.classification} color="gray" />
                        </td>
                        <td className="p-4">
                          <StatusBadge status={item.severity} />
                        </td>
                        <td className="p-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="p-4">
                          <Button size="sm" variant="outline" onClick={() => openDetail(item.escalation_id)}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        isOpen={!!selected || detailLoading}
        onClose={() => {
          setSelected(null);
          setNotes('');
        }}
        title={selected ? `Escalation #${selected.escalation_id}` : 'Loading…'}
        size="xl"
        footer={
          selected ? (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={() => save('UNDER_REVIEW')} loading={saving}>
                Mark under review
              </Button>
              <Button variant="secondary" onClick={() => save('ESCALATED_FURTHER')} loading={saving}>
                Escalate further
              </Button>
              <Button variant="primary" onClick={() => save('RESOLVED')} loading={saving}>
                Resolve
              </Button>
              <Button variant="soft" onClick={() => save(null)} loading={saving}>
                Save notes
              </Button>
            </div>
          ) : null
        }
      >
        {detailLoading && !selected ? (
          <p className="text-sm text-ink-muted">Loading secure case details…</p>
        ) : selected ? (
          <div className="space-y-4">
            <AlertBanner
              type="info"
              message="AI output assists triage only. Verify facts before any disciplinary action. Mentors are not automatically notified of confidential complaints about themselves."
            />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-ink-subtle text-xs uppercase tracking-wide">Apprentice</p>
                <p className="font-medium text-ink">
                  {selected.apprentice_name || `#${selected.apprentice_id}`}
                </p>
              </div>
              <div>
                <p className="text-ink-subtle text-xs uppercase tracking-wide">Severity</p>
                <StatusBadge status={selected.severity} />
              </div>
              <div>
                <p className="text-ink-subtle text-xs uppercase tracking-wide">Classification</p>
                <Badge text={selected.classification} color="gray" />
              </div>
              <div>
                <p className="text-ink-subtle text-xs uppercase tracking-wide">Status</p>
                <StatusBadge status={selected.status} />
              </div>
            </div>

            <div>
              <p className="text-ink-subtle text-xs uppercase tracking-wide mb-1">AI summary</p>
              <p className="text-sm text-ink bg-surface-muted rounded-xl p-3">
                {selected.ai_summary || '—'}
              </p>
            </div>

            <div>
              <p className="text-ink-subtle text-xs uppercase tracking-wide mb-1">Reason for escalation</p>
              <p className="text-sm text-ink bg-surface-muted rounded-xl p-3">{selected.reason}</p>
            </div>

            <div>
              <p className="text-ink-subtle text-xs uppercase tracking-wide mb-1">Original report</p>
              <p className="text-sm text-ink whitespace-pre-wrap border border-line rounded-xl p-3">
                {selected.original_message}
              </p>
            </div>

            <div>
              <label htmlFor="supervisor-notes" className="text-ink-subtle text-xs uppercase tracking-wide mb-1 block">
                Supervisor notes
              </label>
              <textarea
                id="supervisor-notes"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm focus-ring"
                placeholder="Internal notes for this case…"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
