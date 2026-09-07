import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';

export default function EvaluationApprove() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  const loadPending = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/evaluations/pending');
      setPending(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load pending evaluations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const approve = async (evaluationId) => {
    setApprovingId(evaluationId);
    setError('');
    setMessage('');

    try {
      await api.put(`/api/evaluations/${evaluationId}/approve`);
      setMessage('Evaluation approved.');
      toast.success('Evaluation approved.');
      loadPending();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to approve evaluation.');
      toast.error(err.response?.data?.detail || 'Failed to approve evaluation.');
    } finally {
      setApprovingId(null);
    }
  };

  const dimensions = [
    ['discipline', 'Discipline'],
    ['commitment', 'Commitment'],
    ['willingness', 'Willingness'],
    ['teamwork', 'Teamwork'],
    ['time_management', 'Time Mgmt'],
    ['professional_conduct', 'Conduct'],
  ];

  return (
    <div className="page-shell">
      <PageHeader title="Approve Evaluations" subtitle="Review and approve evaluations submitted by mentors." />

      {message && (
        <AlertBanner type="success" message={message} className="mb-6" />
      )}
      {error && (
        <AlertBanner type="error" message={error} className="mb-6" />
      )}

      <Card padding={false}>
        {loading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : pending.length === 0 ? (
          <EmptyState title="All caught up" description="There are no evaluations awaiting approval." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-muted/60">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Evaluation</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Mentor</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Dimensions (1-5)</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Score</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Submitted</th>
                  <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pending.map((ev) => (
                  <tr key={ev.evaluation_id}>
                    <td className="p-4">
                      <p className="font-medium text-ink">#{ev.evaluation_id}</p>
                      <p className="text-sm text-ink-muted">Apprentice {ev.apprentice_id}</p>
                    </td>
                    <td className="p-4 text-ink-muted">Mentor {ev.mentor_id}</td>
                    <td className="p-4 text-ink-muted">
                      <div className="flex gap-2 flex-wrap">
                        {dimensions.map(([key, label]) => (
                          <Badge key={key} text={`${label}: ${ev[key]}`} color="gray" />
                        ))}
                      </div>
                      {ev.comments && (
                        <p className="text-sm text-ink-muted mt-1 italic">"{ev.comments}"</p>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-ink">{ev.overall_score}</td>
                    <td className="p-4 text-ink-muted">
                      {new Date(ev.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Button
                        type="button"
                        loading={approvingId === ev.evaluation_id}
                        onClick={() => approve(ev.evaluation_id)}
                        variant="soft"
                        size="sm"
                      >
                        Approve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}