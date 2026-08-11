import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';

export default function AttendancePage() {
  const [apprentices, setApprentices] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [records, setRecords] = useState([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    period_start: '',
    period_end: '',
    days_expected: '',
    days_present: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();

  useEffect(() => {
    api
      .get('/api/apprentices', { params: { skip: 0, limit: 100 } })
      .then((res) => setApprentices(res.data.items || []))
      .catch(() => setError('Failed to load apprentices.'))
      .finally(() => setLoadingApps(false));
  }, []);

  const loadRecords = async (apprenticeId) => {
    setLoadingRecords(true);
    setError('');
    try {
      const res = await api.get(`/api/attendance/apprentice/${apprenticeId}`);
      setRecords(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load attendance records.');
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleSelect = (e) => {
    const id = e.target.value;
    setSelectedId(id);
    setShowForm(false);
    setMessage('');
    if (id) loadRecords(id);
    else setRecords([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await api.post('/api/attendance', {
        apprentice_id: Number(selectedId),
        period_start: form.period_start,
        period_end: form.period_end,
        days_expected: Number(form.days_expected),
        days_present: Number(form.days_present),
      });
      setMessage('Attendance recorded.');
      toast.success('Attendance recorded.');
      setForm({ period_start: '', period_end: '', days_expected: '', days_present: '' });
      setShowForm(false);
      loadRecords(selectedId);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record attendance.');
      toast.error(err.response?.data?.detail || 'Failed to record attendance.');
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand';
  const label = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Record and review attendance for each apprentice.
        </p>
      </div>

      {message && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-md mb-6">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex-1">
          <label className={label}>Apprentice</label>
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

        {selectedId && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark"
          >
            {showForm ? 'Cancel' : 'Record Attendance'}
          </button>
        )}
      </div>

      {showForm && selectedId && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Record Attendance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Period Start *</label>
              <input type="date" required className={input} value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} />
            </div>
            <div>
              <label className={label}>Period End *</label>
              <input type="date" required className={input} value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} />
            </div>
            <div>
              <label className={label}>Days Expected *</label>
              <input type="number" required min="1" className={input} value={form.days_expected} onChange={(e) => setForm({ ...form, days_expected: e.target.value })} />
            </div>
            <div>
              <label className={label}>Days Present *</label>
              <input type="number" required min="0" className={input} value={form.days_present} onChange={(e) => setForm({ ...form, days_present: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button type="submit" disabled={saving} className="bg-brand text-white px-5 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </form>
      )}

      {selectedId && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Attendance History</h2>
          </div>
          {loadingRecords ? (
            <SkeletonTable rows={3} cols={4} />
          ) : records.length === 0 ? (
            <div className="p-6 text-gray-500">No attendance records for this apprentice.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.attendance_id}>
                      <td className="p-4 text-gray-600">
                        {new Date(record.period_start + 'T00:00:00').toLocaleDateString()} -{' '}
                        {new Date(record.period_end + 'T00:00:00').toLocaleDateString()}
                      </td>
                      <td className="p-4 text-gray-600">
                        {record.days_present} / {record.days_expected}
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-semibold ${
                            record.attendance_rate >= 75
                              ? 'text-green-600'
                              : record.attendance_rate >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {record.attendance_rate}%
                        </span>
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