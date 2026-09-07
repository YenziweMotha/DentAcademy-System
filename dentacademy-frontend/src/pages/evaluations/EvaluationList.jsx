import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';
import { useEffect, useState } from 'react';
import api from '../../api/axios';

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
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Evaluations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Evaluation history for your apprentices.
          </p>
        </div>

        <div className="flex gap-2 mt-4 md:mt-0">
          {[
            ['all', 'All'],
            ['pending', 'Pending'],
            ['approved', 'Approved'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-4 py-2 rounded-md text-sm ${
                filter === value
                  ? 'bg-brand text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : evaluations.length === 0 ? (
          <div className="p-6 text-gray-500">No evaluations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Evaluation</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Apprentice ID</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {evaluations.map((ev) => (
                  <tr key={ev.evaluation_id}>
                    <td className="p-4 font-medium text-gray-800">#{ev.evaluation_id}</td>
                    <td className="p-4 text-gray-600">{ev.apprentice_id}</td>
                    <td className="p-4 font-semibold text-gray-800">{ev.overall_score}%</td>
                    <td className="p-4">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ev.approved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {ev.approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600">
                      {new Date(ev.submitted_at).toLocaleDateString()}
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