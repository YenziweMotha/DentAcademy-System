import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';

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
    const color = risk > 60 ? 'red' : risk > 30 ? 'yellow' : 'green';
    return <Badge text={`${risk}%`} color={color} pulse={risk > 60} />;
  };

  return (
    <div className="page-shell space-y-6">
      <PageHeader title="AI Predictions" subtitle="Generate dropout-risk predictions and review apprentice outcomes." />

      {message && (
        <AlertBanner type="success" message={message} />
      )}
      {error && (
        <AlertBanner type="error" message={error} />
      )}

      {/* At-risk overview */}
      <Card padding={false}>
        <CardHeader title="At-Risk Apprentices" className="p-6 mb-0 border-b border-line" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-muted/60">
              <tr>
                <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Apprentice</th>
                <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Dropout Risk</th>
                <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Completion Likelihood</th>
                <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Predicted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {atRisk.map((a) => (
                <tr key={a.apprentice_id}>
                  <td className="p-4">
                    <div className="flex items-center gap-3"><Avatar name={a.full_name} /><div><p className="font-medium text-ink">{a.full_name}</p><p className="meta-text">{a.id_number}</p></div></div>
                  </td>
                  <td className="p-4">{riskBadge(a.dropout_risk)}</td>
                  <td className="p-4 text-ink-muted">
                    {a.completion_likelihood ?? 'N/A'}%
                  </td>
                  <td className="p-4 text-ink-muted">
                    {a.generated_at ? new Date(a.generated_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
              {atRisk.length === 0 && (
                <tr>
                  <td colSpan="4"><EmptyState title="No high-risk apprentices" description="No apprentices currently exceed the dropout-risk threshold." /></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Generate per apprentice */}
      <Card>
        <CardHeader title="Generate Prediction" />

        <div className="flex flex-col md:flex-row gap-3">
          {loadingApps ? (
            <SkeletonTable rows={4} cols={4} />
          ) : (
            <select
              value={selectedId}
              onChange={handleSelect}
              className="flex-1 border border-line rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="">Select an apprentice...</option>
              {apprentices.map((a) => (
                <option key={a.apprentice_id} value={a.apprentice_id}>
                  {a.first_name} {a.surname}
                </option>
              ))}
            </select>
          )}

          <Button
            type="button"
            disabled={!selectedId}
            loading={generating}
            onClick={generate}
          >
            {generating ? 'Generating...' : 'Generate Prediction'}
          </Button>
        </div>

        {missing && missing.length > 0 && (
          <AlertBanner type="warning" className="mt-4" message={`Insufficient data. Missing: ${missing.join(', ')}. Add evaluations, attendance and module progress, then try again.`} />
        )}

        {loadingPrediction && (
          <div className="mt-4"><SkeletonCard /></div>
        )}

        {latest && !loadingPrediction && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-ink-muted uppercase mb-3">
              Latest Prediction
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-surface-muted/60 p-4 rounded-lg">
                <p className="text-sm text-ink-muted">Dropout Risk</p>
                <p className="text-2xl font-bold text-ink">
                  {latest.dropout_risk ?? 'N/A'}
                  {latest.dropout_risk !== null && latest.dropout_risk !== undefined ? '%' : ''}
                </p>
              </div>
              <div className="bg-surface-muted/60 p-4 rounded-lg">
                <p className="text-sm text-ink-muted">Completion Likelihood</p>
                <p className="text-2xl font-bold text-ink">
                  {latest.completion_likelihood ?? 'N/A'}
                  {latest.completion_likelihood !== null && latest.completion_likelihood !== undefined ? '%' : ''}
                </p>
              </div>
              <div className="bg-surface-muted/60 p-4 rounded-lg">
                <p className="text-sm text-ink-muted">Employment Readiness</p>
                <p className="text-2xl font-bold text-ink">
                  {latest.employment_readiness ?? 'N/A'}
                  {latest.employment_readiness !== null && latest.employment_readiness !== undefined ? '%' : ''}
                </p>
              </div>
              <div className="bg-surface-muted/60 p-4 rounded-lg">
                <p className="text-sm text-ink-muted">Confidence</p>
                <p className="text-2xl font-bold text-ink">
                  {latest.confidence_score ?? 'N/A'}
                  {latest.confidence_score !== null && latest.confidence_score !== undefined ? '%' : ''}
                </p>
              </div>
            </div>

            {latest.generated_at && (
              <p className="text-sm text-ink-muted mt-3">
                Generated {new Date(latest.generated_at).toLocaleString()}
                {latest.model_version ? ` · ${latest.model_version}` : ''}
              </p>
            )}
            {latest.disclaimer_text && (
              <p className="text-xs text-ink-subtle mt-2">{latest.disclaimer_text}</p>
            )}
          </div>
        )}

        {history.length > 1 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-ink-muted uppercase mb-3">
              Prediction History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-muted/60">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium text-ink-muted uppercase tracking-wider">Date</th>
                    <th className="text-left p-3 text-xs font-medium text-ink-muted uppercase tracking-wider">Dropout Risk</th>
                    <th className="text-left p-3 text-xs font-medium text-ink-muted uppercase tracking-wider">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.map((h) => (
                    <tr key={h.prediction_id}>
                      <td className="p-3 text-ink-muted">
                        {new Date(h.generated_at).toLocaleString()}
                      </td>
                      <td className="p-3">{riskBadge(h.dropout_risk)}</td>
                      <td className="p-3 text-ink-muted">{h.completion_likelihood ?? 'N/A'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}