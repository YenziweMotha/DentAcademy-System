import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { SkeletonCard } from '../../components/ui/Skeleton';

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
      <div>
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">{error}</div>
        <button onClick={() => navigate('/apprentices')} className="text-brand hover:underline">Back to apprentices</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {apprentice.is_registered === false && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-md flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm">
            This apprentice has a login account but their registration is not
            complete. Personal and academic details are still missing.
          </p>
          <button
            type="button"
            onClick={() => navigate(`/apprentices/${apprenticeId}/register`)}
            className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 whitespace-nowrap"
          >
            Complete registration
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            {apprentice.first_name} {apprentice.surname}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {apprentice.qualification_type || 'No qualification recorded'}
            {apprentice.institution ? ` - ${apprentice.institution}` : ''}
          </p>
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => navigate(`/apprentices/${apprenticeId}/edit`)} className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark">
            Edit
          </button>
          <button
            type="button"
            onClick={toggleStatus}
            className={`px-4 py-2 rounded-md ${
              apprentice.status === 'ACTIVE'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {apprentice.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile</h2>

          {apprentice.photo_url ? (
            <img src={apprentice.photo_url} alt="Apprentice" className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 mx-auto mb-4 flex items-center justify-center text-gray-500">
              No photo
            </div>
          )}

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">ID Number</dt>
              <dd className="font-medium">{apprentice.id_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Gender</dt>
              <dd className="font-medium">{apprentice.gender || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Contact</dt>
              <dd className="font-medium">{apprentice.contact_number || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">City</dt>
              <dd className="font-medium">{apprentice.city || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Province</dt>
              <dd className="font-medium">{apprentice.province || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd className="font-medium">{apprentice.status}</dd>
            </div>
          </dl>

          <form onSubmit={handlePhotoUpload} className="mt-6 pt-6 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photo</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setPhotoFile(e.target.files[0])}
              className="block w-full text-sm text-gray-600 mb-2"
            />
            <button type="submit" disabled={!photoFile || uploading} className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed">
              {uploading ? 'Uploading...' : 'Upload Photo'}
            </button>
            {uploadMsg && <p className="text-sm text-gray-600 mt-2">{uploadMsg}</p>}
          </form>
        </div>

        {/* Summary + modules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase">Module Completion</h2>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {progress.length ? Math.round((completed / progress.length) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500 mt-1">{completed} of {progress.length} completed</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase">Evaluations</h2>
              <p className="text-3xl font-bold text-gray-800 mt-2">{evaluations.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase">Attendance</h2>
              <p className="text-3xl font-bold text-gray-800 mt-2">{attendance.length} records</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Module Progress</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {progress.map((p) => (
                    <tr key={p.progress_id}>
                      <td className="p-4 text-gray-800">{p.module?.module_name || `Module #${p.module_id}`}</td>
                      <td className="p-4 text-gray-600">{p.module?.category || 'N/A'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            p.status === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : p.status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600">{p.assessment_score ?? 'N/A'}</td>
                    </tr>
                  ))}
                  {progress.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-4 text-gray-500">No module progress recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Recent Evaluations</h2>
            </div>
            <div className="divide-y">
              {evaluations.length === 0 ? (
                <div className="p-6 text-gray-500">No evaluations recorded.</div>
              ) : (
                evaluations.slice(0, 5).map((evaluation) => (
                  <div key={evaluation.evaluation_id} className="p-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Submitted {new Date(evaluation.submitted_at).toLocaleDateString()}
                    </p>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{evaluation.overall_score}%</p>
                      <p className={`text-xs ${evaluation.approved ? 'text-green-600' : 'text-yellow-600'}`}>
                        {evaluation.approved ? 'Approved' : 'Pending approval'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}