import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { SkeletonCard } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import AlertBanner from '../../components/ui/AlertBanner';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import StatCard from '../../components/ui/StatCard';
import { BookOpen, ClipboardCheck, CalendarDays } from 'lucide-react';

export default function ApprenticeDetail() {
  const { apprenticeId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [apprentice, setApprentice] = useState(null);
  const [progress, setProgress] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const loadAll = () => {
    setError('');
    Promise.all([
      api.get(`/api/apprentices/${apprenticeId}`),
      api.get(`/api/modules/apprentice/${apprenticeId}`).catch(() => []),
      api.get(`/api/evaluations/apprentice/${apprenticeId}`).catch(() => []),
      api.get(`/api/attendance/apprentice/${apprenticeId}`).catch(() => []),
    ])
      .then(([a, p, e, att]) => {
        setApprentice(a.data);
        setProgress(p.data || []);
        setEvaluations(e.data || []);
        setAttendance(att.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Failed to load apprentice.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
  }, [apprenticeId]);

  const toggleStatus = async () => {
    try {
      await api.patch(
        `/api/apprentices/${apprenticeId}/${
          apprentice.status === 'ACTIVE' ? 'deactivate' : 'reactivate'
        }`
      );
      toast.success(
        apprentice.status === 'ACTIVE'
          ? 'Apprentice deactivated.'
          : 'Apprentice reactivated.'
      );
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status.');
    }
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!photoFile) return;

    setUploading(true);
    setUploadMsg('');

    const formData = new FormData();
    formData.append('file', photoFile);

    try {
      await api.post(`/api/apprentices/${apprenticeId}/photo`, formData);
      setUploadMsg('Photo uploaded successfully.');
      toast.success('Photo uploaded successfully.');
      setPhotoFile(null);
      loadAll();
    } catch (err) {
      setUploadMsg(err.response?.data?.detail || 'Photo upload failed.');
      toast.error(err.response?.data?.detail || 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const completed = progress.filter((p) => p.status === 'Completed').length;

  if (loading) {
    return <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>;
  }

  if (!apprentice) {
    return (
      <ErrorState title="Apprentice unavailable" description={error || 'The apprentice could not be found.'} onRetry={loadAll} />
    );
  }

  return (
    <div className="page-shell space-y-6">
      {apprentice.is_registered === false && (
        <AlertBanner type="warning" message={<span>
            This apprentice has a login account but their registration is not
            complete. Personal and academic details are still missing.
          </span>} />
      )}

      <PageHeader
        title={`${apprentice.first_name} ${apprentice.surname}`}
        subtitle={`${apprentice.qualification_type || 'No qualification recorded'}${apprentice.institution ? ` — ${apprentice.institution}` : ''}`}
        breadcrumbs={[{ label: 'Apprentices', to: '/apprentices' }, { label: 'Profile' }]}
        actions={<>
          {apprentice.is_registered === false && <Button
            type="button"
            onClick={() => navigate(`/apprentices/${apprenticeId}/register`)}
            variant="accent"
          >
            Complete registration
          </Button>}
          <Button type="button" onClick={() => navigate(`/apprentices/${apprenticeId}/edit`)}>
            Edit
          </Button>
          <Button
            type="button"
            onClick={toggleStatus}
            variant={apprentice.status === 'ACTIVE' ? 'danger' : 'soft'}
          >
            {apprentice.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </>}
      />

      {error && <AlertBanner type="error" message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card>
          <CardHeader title="Profile" />
          <Avatar name={`${apprentice.first_name} ${apprentice.surname}`} src={apprentice.photo_url} size="xl" className="mx-auto mb-4 !h-32 !w-32" />

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-muted">ID Number</dt>
              <dd className="font-medium">{apprentice.id_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Gender</dt>
              <dd className="font-medium">{apprentice.gender || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Contact</dt>
              <dd className="font-medium">{apprentice.contact_number || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">City</dt>
              <dd className="font-medium">{apprentice.city || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Province</dt>
              <dd className="font-medium">{apprentice.province || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-muted">Status</dt>
              <dd><StatusBadge status={apprentice.status} /></dd>
            </div>
          </dl>

          <form onSubmit={handlePhotoUpload} className="mt-6 pt-6 border-t">
            <label className="block text-sm font-medium text-ink mb-1">Upload Photo</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setPhotoFile(e.target.files[0])}
              className="block w-full text-sm text-ink-muted mb-2"
            />
            <Button type="submit" disabled={!photoFile} loading={uploading} variant="secondary">
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </Button>
            {uploadMsg && <p className="text-sm text-ink-muted mt-2">{uploadMsg}</p>}
          </form>
        </Card>

        {/* Summary + modules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={BookOpen} label="Module Completion" value={`${progress.length ? Math.round((completed / progress.length) * 100) : 0}%`} hint={`${completed} of ${progress.length} completed`} />
            <StatCard icon={ClipboardCheck} label="Evaluations" value={evaluations.length} tone="blue" />
            <StatCard icon={CalendarDays} label="Attendance" value={attendance.length} hint="records" />
          </div>

          <Card padding={false}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-ink">Module Progress</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-muted/60">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Module</th>
                    <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Category</th>
                    <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-ink-muted uppercase tracking-wider">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {progress.map((p) => (
                    <tr key={p.progress_id}>
                      <td className="p-4 text-ink">{p.module?.module_name || `Module #${p.module_id}`}</td>
                      <td className="p-4 text-ink-muted">{p.module?.category || 'N/A'}</td>
                      <td className="p-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="p-4 text-ink-muted">{p.assessment_score ?? 'N/A'}</td>
                    </tr>
                  ))}
                  {progress.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-4 text-ink-muted">No module progress recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card padding={false}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-ink">Recent Evaluations</h2>
            </div>
            <div className="divide-y">
              {evaluations.length === 0 ? (
                <EmptyState title="No evaluations recorded" description="Evaluations will appear here once submitted." />
              ) : (
                evaluations.slice(0, 5).map((evaluation) => (
                  <div key={evaluation.evaluation_id} className="p-4 flex items-center justify-between">
                    <p className="text-sm text-ink-muted">
                      Submitted {new Date(evaluation.submitted_at).toLocaleDateString()}
                    </p>
                    <div className="text-right">
                      <p className="font-semibold text-ink">{evaluation.overall_score}</p>
                      <p className={`text-xs ${evaluation.approved ? 'text-green-600' : 'text-yellow-600'}`}>
                        {evaluation.approved ? 'Approved' : 'Pending approval'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}