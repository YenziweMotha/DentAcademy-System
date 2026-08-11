import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';

const STATUSES = ['Not Started', 'In Progress', 'Completed'];

export default function ModuleProgress() {
  const toast = useToast();
  const [apprentices, setApprentices] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [rows, setRows] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/apprentices', { params: { skip: 0, limit: 100 } })
      .then((res) => setApprentices(res.data.items || []))
      .catch(() => setError('Failed to load apprentices.'))
      .finally(() => setLoadingApps(false));
  }, []);

  const loadProgress = async (apprenticeId) => {
    setLoadingProgress(true);
    setError('');
    setMessage('');
    try {
      const res = await api.get(`/api/modules/apprentice/${apprenticeId}`);
      const existing = res.data || [];
      const modulesRes = await api.get('/api/modules', {
        params: { active_only: false },
      });
      const modules = modulesRes.data || [];

      const byModule = {};
      existing.forEach((row) => {
        byModule[row.module_id] = row;
      });

      const merged = modules.map((mod) => {
        const row = byModule[mod.module_id];
        return {
          module_id: mod.module_id,
          module_name: mod.module_name,
          category: mod.category,
          pass_mark: mod.pass_mark,
          is_active: mod.is_active,
          status: row?.status || 'Not Started',
          assessment_score: row?.assessment_score ?? '',
          completion_date: row?.completion_date || '',
        };
      });

      setRows(merged);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load module progress.');
      setRows([]);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    if (id) loadProgress(id);
    else setRows([]);
  };

  const updateRow = (moduleId, field, value) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.module_id !== moduleId) return r;
        const next = { ...r, [field]: value };
        if (field === 'status' && value === 'Completed' && !next.completion_date) {
          next.completion_date = new Date().toISOString().slice(0, 10);
        }
        return next;
      })
    );
  };

  const handleSave = async (row) => {
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (row.status === 'Completed' && (row.assessment_score === '' || row.assessment_score === null)) {
        throw new Error({ detail: 'Assessment score is required when status is Completed.' });
      }
      await api.put(`/api/modules/apprentice/${selectedId}/${row.module_id}`, {
        status: row.status,
        assessment_score:
          row.assessment_score === '' ? undefined : Number(row.assessment_score),
        completion_date: row.completion_date || undefined,
      });
      setMessage(`Saved "${row.module_name}".`);
      toast.success(`Saved "${row.module_name}".`);
      loadProgress(selectedId);
    } catch (err) {
      const detail =
        typeof err?.message === 'string' && err.message
          ? err.message
          : err.response?.data?.detail;
      setError(detail || 'Failed to save progress.');
      toast.error(detail || 'Failed to save progress.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Module Progress</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track each apprentice's status, assessment scores and completion dates.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apprentice
        </label>
        {loadingApps ? (
          <SkeletonTable rows={4} cols={4} />
        ) : (
          <select
            value={selectedId}
            onChange={handleSelect}
            className="w-full md:w-96 border border-gray-300 rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
          >
            <option value="">Select an apprentice...</option>
            {apprentices.map((a) => (
              <option key={a.apprentice_id} value={a.apprentice_id}>
                {a.first_name} {a.surname}
              </option>
            ))}
          </select>
        )}
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md mb-6">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
      )}

      {selectedId && (
        <div className="bg-white rounded-lg shadow">
          {loadingProgress ? (
            <SkeletonTable rows={4} cols={4} />
          ) : rows.length === 0 ? (
            <div className="p-6 text-gray-500">No modules found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Score (%)</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Date</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {rows.map((row) => (
                    <tr key={row.module_id} className={row.is_active ? '' : 'opacity-50'}>
                      <td className="p-4">
                        <p className="font-medium text-gray-800">{row.module_name}</p>
                        {!row.is_active && <p className="text-xs text-gray-500">Inactive</p>}
                      </td>
                      <td className="p-4 text-gray-600">{row.category || 'N/A'}</td>
                      <td className="p-4">
                        <select
                          value={row.status}
                          onChange={(e) => updateRow(row.module_id, 'status', e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.assessment_score}
                          onChange={(e) => updateRow(row.module_id, 'assessment_score', e.target.value)}
                          className="w-24 border border-gray-300 rounded-md px-2 py-1"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="date"
                          value={row.completion_date}
                          onChange={(e) => updateRow(row.module_id, 'completion_date', e.target.value)}
                          className="border border-gray-300 rounded-md px-2 py-1"
                        />
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleSave(row)}
                          className="bg-brand text-white px-3 py-1 rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}