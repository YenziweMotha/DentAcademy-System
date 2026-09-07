import { useEffect, useState } from 'react';
import api from '../../api/axios';
import EvaluationForm from '../../components/shared/EvaluationForm';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';

export default function EvaluationSubmit() {
  const [assigned, setAssigned] = useState([]);
  const [apprenticeId, setApprenticeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    api
      .get('/api/dashboard/mentor')
      .then((res) => setAssigned(res.data.apprentice_list || []))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load your assigned apprentices.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (formData) => {
    if (!apprenticeId) {
      setError('Please select an apprentice to evaluate.');
      return;
    }

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      await api.post('/api/evaluations', {
        apprentice_id: Number(apprenticeId),
        ...formData,
        comments: formData.comments || undefined,
      });
      setMessage('Evaluation submitted successfully.');
      toast.success('Evaluation submitted successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit evaluation.');
      toast.error(err.response?.data?.detail || 'Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell">
      <PageHeader title="Submit Evaluation" subtitle="Assess your assigned apprentice across the six performance dimensions." />

      {message && (
        <AlertBanner type="success" message={message} className="mb-6" />
      )}
      {error && (
        <AlertBanner type="error" message={error} className="mb-6" />
      )}

      <Card className="mb-6">
        <label className="block text-sm font-medium text-ink mb-2">
          Apprentice
        </label>
        {loading ? (
          <SkeletonTable rows={3} cols={4} />
        ) : assigned.length === 0 ? (
          <EmptyState title="No assigned apprentices" description="An apprentice must be assigned before you can submit an evaluation." />
        ) : (
          <select
            value={apprenticeId}
            onChange={(e) => setApprenticeId(e.target.value)}
            className="w-full md:w-96 border border-line rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">Select an apprentice...</option>
            {assigned.map((a) => (
              <option key={a.apprentice_id} value={a.apprentice_id}>
                {a.full_name}
              </option>
            ))}
          </select>
        )}
      </Card>

      {apprenticeId && (
        <Card className="animate-fade-up">
          <EvaluationForm onSubmit={handleSubmit} loading={submitting} />
        </Card>
      )}
    </div>
  );
}