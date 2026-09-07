import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';

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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Approve Evaluations</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve evaluations submitted by mentors.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md mb-6">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <SkeletonTable rows={4} cols={6} />
        ) : pending.length === 0 ? (
          <div className="p-6 text-gray-500">No evaluations awaiting approval.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Evaluation</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensions (1-5)</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pending.map((ev) => (
                  <tr key={ev.evaluation_id}>
                    <td className="p-4">
                      <p className="font-medium text-gray-800">#{ev.evaluation_id}</p>
                      <p className="text-sm text-gray-500">Apprentice {ev.apprentice_id}</p>
                    </td>
                    <td className="p-4 text-gray-600">Mentor {ev.mentor_id}</td>
                    <td className="p-4 text-gray-600">
                      <div className="flex gap-2 flex-wrap">
                        {dimensions.map(([key, label]) => (
                          <span key={key} className="text-xs bg-gray-100 rounded px-2 py-1" title={label}>
                            {label}: {ev[key]}
                          </span>
                        ))}
                      </div>
                      {ev.comments && (
                        <p className="text-sm text-gray-500 mt-1 italic">"{ev.comments}"</p>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-gray-800">{ev.overall_score}%</td>
                    <td className="p-4 text-gray-600">
                      {new Date(ev.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        disabled={approvingId === ev.evaluation_id}
                        onClick={() => approve(ev.evaluation_id)}
                        className="bg-green-600 text-white px-4 py-1 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {approvingId === ev.evaluation_id ? 'Approving...' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}