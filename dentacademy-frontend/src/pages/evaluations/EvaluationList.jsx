import { SkeletonTable } from '../../components/ui/Skeleton';
import { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { TableRow, Td } from '../../components/ui/Table';

export default function EvaluationList() {
  const [evaluations, setEvaluations] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (filter === 'approved') params.approved = true;
      if (filter === 'pending') params.approved = false;

      const res = await api.get('/api/evaluations', { params });
      setEvaluations(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load evaluations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluations();
  }, [filter]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluations"
        subtitle="Evaluation history for your apprentices."
        actions={
          <div className="flex gap-2 flex-wrap">
            {[
              ['all', 'All'],
              ['pending', 'Pending'],
              ['approved', 'Approved'],
            ].map(([value, label]) => (
              <Button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                variant={filter === value ? 'primary' : 'secondary'}
                size="sm"
              >
                {label}
              </Button>
            ))}
          </div>
        }
      />

      {error && !loading ? (
        <Card>
          <ErrorState
            title="Could not load evaluations"
            description={error}
            onRetry={loadEvaluations}
          />
        </Card>
      ) : (
        <Card padding={false} className="overflow-hidden">
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : evaluations.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No evaluations found"
              description="Try another filter or submit the first evaluation."
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-muted/60">
                    <tr>
                      {['Evaluation', 'Apprentice ID', 'Score', 'Status', 'Submitted'].map(
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
                    {evaluations.map((ev) => (
                      <TableRow key={ev.evaluation_id}>
                        <Td className="font-semibold">#{ev.evaluation_id}</Td>
                        <Td className="text-ink-muted">{ev.apprentice_id}</Td>
                        <Td className="font-bold tabular-nums">{ev.overall_score}</Td>
                        <Td>
                          <StatusBadge status={ev.approved ? 'APPROVED' : 'PENDING'} />
                        </Td>
                        <Td className="text-ink-muted">
                          {new Date(ev.submitted_at).toLocaleDateString()}
                        </Td>
                      </TableRow>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-line">
                {evaluations.map((ev) => (
                  <div key={ev.evaluation_id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-ink">#{ev.evaluation_id}</p>
                      <StatusBadge status={ev.approved ? 'APPROVED' : 'PENDING'} />
                    </div>
                    <p className="text-sm text-ink-muted">
                      Apprentice #{ev.apprentice_id}
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-ink">
                      {ev.overall_score}
                    </p>
                    <p className="text-xs text-ink-subtle">
                      {new Date(ev.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
