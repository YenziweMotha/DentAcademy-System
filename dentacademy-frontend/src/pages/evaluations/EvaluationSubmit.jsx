import { useEffect, useState } from 'react';
import api from '../../api/axios';
import EvaluationForm from '../../components/shared/EvaluationForm';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Submit Evaluation</h1>
        <p className="text-sm text-gray-500 mt-1">
          Assess your assigned apprentice across the six performance dimensions.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md mb-6">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apprentice
        </label>
        {loading ? (
          <SkeletonTable rows={3} cols={4} />
        ) : assigned.length === 0 ? (
          <p className="text-gray-500">No apprentices are currently assigned to you.</p>
        ) : (
          <select
            value={apprenticeId}
            onChange={(e) => setApprenticeId(e.target.value)}
            className="w-full md:w-96 border border-gray-300 rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">Select an apprentice...</option>
            {assigned.map((a) => (
              <option key={a.apprentice_id} value={a.apprentice_id}>
                {a.full_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {apprenticeId && (
        <div className="bg-white rounded-lg shadow p-6">
          <EvaluationForm onSubmit={handleSubmit} loading={submitting} />
        </div>
      )}
    </div>
  );
}