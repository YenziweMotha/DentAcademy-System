import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import AlertBanner from '../../components/ui/AlertBanner';
import EmptyState from '../../components/ui/EmptyState';

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

  const input = 'w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand';
  const label = 'block text-sm font-medium text-ink mb-1';

  return (
    <div className="page-shell">
      <PageHeader title="Attendance" subtitle="Record and review attendance for each apprentice." />

      {message && (
        <AlertBanner type="success" message={message} className="mb-6" />
      )}
      {error && (
        <AlertBanner type="error" message={error} className="mb-6" />
      )}

      <Card className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex-1">
          <label className={label}>Apprentice</label>
          {loadingApps ? (
            <SkeletonTable rows={4} cols={4} />
          ) : (
            <select
              value={selectedId}
              onChange={handleSelect}
              className="w-full md:w-96 border border-line rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
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
          <Button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            variant={showForm ? 'secondary' : 'primary'}
          >
            {showForm ? 'Cancel' : 'Record Attendance'}
          </Button>
        )}
      </Card>

      {showForm && selectedId && (
        <Card as="form" onSubmit={handleSubmit} className="mb-6 animate-fade-up">
          <CardHeader title="Record Attendance" />
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
            <Button type="submit" loading={saving}>
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </Card>
      )}

      {selectedId && (
        <Card padding={false}>
          <CardHeader title="Attendance History" className="p-6 mb-0 border-b border-line" />
          {loadingRecords ? (
            <SkeletonTable rows={3} cols={4} />
          ) : records.length === 0 ? (
            <EmptyState title="No attendance records" description="Record the first attendance period for this apprentice." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-muted/60">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Period</th>
                    <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Days</th>
                    <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {records.map((record) => (
                    <tr key={record.attendance_id}>
                      <td className="p-4 text-ink-muted">
                        {new Date(record.period_start + 'T00:00:00').toLocaleDateString()} -{' '}
                        {new Date(record.period_end + 'T00:00:00').toLocaleDateString()}
                      </td>
                      <td className="p-4 text-ink-muted">
                        {record.days_present} / {record.days_expected}
                      </td>
                      <td className="p-4">
                        <Badge text={`${record.attendance_rate}%`} color={record.attendance_rate >= 75 ? 'green' : record.attendance_rate >= 50 ? 'yellow' : 'red'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}