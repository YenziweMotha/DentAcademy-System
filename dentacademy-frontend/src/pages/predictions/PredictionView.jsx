import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';

export default function PredictionView() {
  const toast = useToast();
  const [apprentices, setApprentices] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [atRisk, setAtRisk] = useState([]);
  const [latest, setLatest] = useState(null);
  const [history, setHistory] = useState([]);
  const [missing, setMissing] = useState(null);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/apprentices', { params: { skip: 0, limit: 100 } })
      .then((res) => setApprentices(res.data.items || []))
      .catch(() => setError('Failed to load apprentices.'))
      .finally(() => setLoadingApps(false));

    api
      .get('/api/predictions/at-risk')
      .then((res) => setAtRisk(res.data || []))
      .catch(() => {});
  }, []);

  const loadPrediction = async (apprenticeId, options = {}) => {
    setLoadingPrediction(true);
    setError('');
    setMessage('');
    setMissing(null);

    try {
      const res = await api.get(`/api/predictions/${apprenticeId}`);
      setLatest(res.data);
      const hist = await api.get(`/api/predictions/${apprenticeId}/history`);
      setHistory(hist.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'No prediction available yet.');
      setLatest(null);
      setHistory([]);
    } finally {
      setLoadingPrediction(false);
    }
  };

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    if (id) loadPrediction(id);
    else {
      setLatest(null);
      setHistory([]);
    }
  };

  const generate = async () => {
    if (!selectedId) return;

    setGenerating(true);
    setError('');
    setMessage('');
    setMissing(null);

    try {
      const res = await api.post(`/api/predictions/${selectedId}/generate`);
      if (res.data && res.data.missing_features) {
        setMissing(res.data.missing_features);
        setMessage(res.data.message);
      } else {
        setLatest(res.data);
        const hist = await api.get(`/api/predictions/${selectedId}/history`);
        setHistory(hist.data || []);
        setMessage('Prediction generated successfully.');
        toast.success('Prediction generated successfully.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate prediction.');
      toast.error(err.response?.data?.detail || 'Failed to generate prediction.');
    } finally {
      setGenerating(false);
    }
  };

  const riskBadge = (risk) => {
    if (risk === null || risk === undefined) return null;
    let cls = 'bg-green-100 text-green-800';
    if (risk > 60) cls = 'bg-red-100 text-red-800';
    else if (risk > 30) cls = 'bg-yellow-100 text-yellow-800';
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}`}>
        {risk}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">AI Predictions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate dropout-risk predictions and review apprentice outcomes.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md">{error}</div>
      )}

      {/* At-risk overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800">At-Risk Apprentices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Apprentice</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Dropout Risk</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Likelihood</th>
                <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Predicted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {atRisk.map((a) => (
                <tr key={a.apprentice_id}>
                  <td className="p-4">
                    <p className="font-medium text-gray-800">{a.full_name}</p>
                    <p className="text-sm text-gray-500">{a.id_number}</p>
                  </td>
                  <td className="p-4">{riskBadge(a.dropout_risk)}</td>
                  <td className="p-4 text-gray-600">
                    {a.completion_likelihood ?? 'N/A'}%
                  </td>
                  <td className="p-4 text-gray-600">
                    {a.generated_at ? new Date(a.generated_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
              {atRisk.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-4 text-gray-500">
                    No apprentices currently exceed the dropout-risk threshold.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate per apprentice */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Generate Prediction</h2>

        <div className="flex flex-col md:flex-row gap-3">
          {loadingApps ? (
            <SkeletonTable rows={4} cols={4} />
          ) : (
            <select
              value={selectedId}
              onChange={handleSelect}
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select an apprentice...</option>
              {apprentices.map((a) => (
                <option key={a.apprentice_id} value={a.apprentice_id}>
                  {a.first_name} {a.surname}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            disabled={!selectedId || generating}
            onClick={generate}
            className="bg-brand text-white px-5 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate Prediction'}
          </button>
        </div>

        {missing && missing.length > 0 && (
          <div className="mt-4 bg-yellow-50 text-yellow-800 px-4 py-3 rounded-md">
            <p className="font-medium">Insufficient data to generate a prediction.</p>
            <p className="text-sm mt-1">
              Missing: {missing.join(', ')}. Add evaluations, attendance and module
              progress for this apprentice and try again.
            </p>
          </div>
        )}

        {loadingPrediction && (
          <div className="mt-4"><SkeletonCard /></div>
        )}

        {latest && !loadingPrediction && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">
              Latest Prediction
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Dropout Risk</p>
                <p className="text-2xl font-bold text-gray-800">
                  {latest.dropout_risk ?? 'N/A'}
                  {latest.dropout_risk !== null && latest.dropout_risk !== undefined ? '%' : ''}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Completion Likelihood</p>
                <p className="text-2xl font-bold text-gray-800">
                  {latest.completion_likelihood ?? 'N/A'}
                  {latest.completion_likelihood !== null && latest.completion_likelihood !== undefined ? '%' : ''}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Employment Readiness</p>
                <p className="text-2xl font-bold text-gray-800">
                  {latest.employment_readiness ?? 'N/A'}
                  {latest.employment_readiness !== null && latest.employment_readiness !== undefined ? '%' : ''}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Confidence</p>
                <p className="text-2xl font-bold text-gray-800">
                  {latest.confidence_score ?? 'N/A'}
                  {latest.confidence_score !== null && latest.confidence_score !== undefined ? '%' : ''}
                </p>
              </div>
            </div>

            {latest.generated_at && (
              <p className="text-sm text-gray-500 mt-3">
                Generated {new Date(latest.generated_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {history.length > 1 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">
              Prediction History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Dropout Risk</th>
                    <th className="text-left p-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((h) => (
                    <tr key={h.prediction_id}>
                      <td className="p-3 text-gray-600">
                        {new Date(h.generated_at).toLocaleString()}
                      </td>
                      <td className="p-3">{riskBadge(h.dropout_risk)}</td>
                      <td className="p-3 text-gray-600">{h.completion_likelihood ?? 'N/A'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}