import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonCard } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import AlertBanner from '../../components/ui/AlertBanner';
import Avatar from '../../components/ui/Avatar';
import PredictionSignal, { riskTone } from '../../components/shared/PredictionSignal';

const TONE_BAR = {
  steady: 'bg-emerald-300',
  watch: 'bg-amber-300',
  alert: 'bg-rose-300',
  idle: 'bg-white/30',
};

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

  const refreshAtRisk = () => {
    api
      .get('/api/predictions/at-risk')
      .then((res) => setAtRisk(res.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    api
      .get('/api/apprentices', { params: { skip: 0, limit: 500 } })
      .then((res) => setApprentices(res.data.items || []))
      .catch(() => setError('Failed to load apprentices.'))
      .finally(() => setLoadingApps(false));
    refreshAtRisk();
  }, []);

  const loadPrediction = async (apprenticeId) => {
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

  const handleSelect = (id) => {
    setSelectedId(id);
    if (id) loadPrediction(id);
    else {
      setLatest(null);
      setHistory([]);
      setMissing(null);
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
        setLatest(null);
      } else {
        setLatest(res.data);
        const hist = await api.get(`/api/predictions/${selectedId}/history`);
        setHistory(hist.data || []);
        setMessage('A new reading is ready.');
        toast.success('Prediction generated successfully.');
        refreshAtRisk();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate prediction.');
      toast.error(err.response?.data?.detail || 'Failed to generate prediction.');
    } finally {
      setGenerating(false);
    }
  };

  const selected = apprentices.find((row) => String(row.apprentice_id) === String(selectedId));
  const selectedName = selected ? `${selected.first_name} ${selected.surname}` : '';

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="Signal bay"
        subtitle="A live reading of who is likely to finish, who needs a watch, and who should be called in."
      />

      {message && <AlertBanner type="success" message={message} />}
      {error && <AlertBanner type="error" message={error} />}

      <section className="bay-wall p-6 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200/70">Above the threshold</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-white">
              {atRisk.length === 0 ? 'The bay is clear' : `${atRisk.length} need a closer look`}
            </h2>
          </div>
          <p className="max-w-sm text-sm text-emerald-50/70">
            Open a name to pull their latest reading, or run a fresh one from the console below.
          </p>
        </div>
        {atRisk.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-black/20 px-4 py-6 text-sm text-emerald-50/75 ring-1 ring-white/10">
            Nobody currently sits above the dropout-risk threshold.
          </p>
        ) : (
          <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
            {atRisk.map((row) => {
              const tone = riskTone(row.dropout_risk);
              const active = String(selectedId) === String(row.apprentice_id);
              return (
                <button
                  key={row.apprentice_id}
                  type="button"
                  onClick={() => handleSelect(String(row.apprentice_id))}
                  className={`min-w-[220px] rounded-2xl bg-black/25 p-4 text-left ring-1 transition hover:-translate-y-0.5 ${
                    active ? 'ring-emerald-300/80' : 'ring-white/10 hover:ring-white/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={row.full_name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{row.full_name}</p>
                      <p className="truncate text-xs text-white/50">{row.id_number}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-white">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-white/55">Dropout</span>
                      <span className="text-lg font-extrabold tabular-nums">{row.dropout_risk ?? '—'}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full ${TONE_BAR[tone]}`} style={{ width: `${Math.min(100, Number(row.dropout_risk) || 0)}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="card-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-sm font-medium text-ink">Apprentice</span>
            {loadingApps ? (
              <div className="skeleton-shimmer h-11 rounded-xl" />
            ) : (
              <select
                value={selectedId}
                onChange={(event) => handleSelect(event.target.value)}
                className="field-control"
              >
                <option value="">Choose someone to read…</option>
                {apprentices.map((row) => (
                  <option key={row.apprentice_id} value={row.apprentice_id}>
                    {row.first_name} {row.surname}
                  </option>
                ))}
              </select>
            )}
          </label>
          <Button type="button" disabled={!selectedId} loading={generating} onClick={generate} icon={Sparkles}>
            {generating ? 'Reading…' : 'Take a reading'}
          </Button>
        </div>
        {missing && missing.length > 0 && (
          <AlertBanner
            type="warning"
            className="mt-4"
            message={`Not enough to read yet. Missing: ${missing.join(', ')}. Add evaluations, attendance, and module progress, then try again.`}
          />
        )}
      </section>

      {loadingPrediction && <SkeletonCard />}

      {latest && !loadingPrediction && (
        <PredictionSignal prediction={latest} history={history} name={selectedName} />
      )}
    </div>
  );
}
