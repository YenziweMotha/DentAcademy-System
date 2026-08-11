import { useEffect, useState } from 'react';
import api from '../../api/axios';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';

export default function ApprenticeDashboard() {
  const [data, setData] = useState({
    full_name: '',
    status: '',
    completion_pct: 0,
    completed_modules: 0,
    in_progress_modules: 0,
    total_modules: 0,
    qualification_type: null,
    institution: null,
    academic_average: null,
    recent_evaluations: [],
  });

  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get('api/dashboard/apprentice')
      .then((res) => setData(res.data))
      .catch(() => setError(true));
  }, []);

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString() : 'N/A';

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">My Dashboard</h1>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">
          Failed to load your dashboard data.
        </div>
      )}

      {!error && (
        <div className="space-y-6">
          {/* Profile */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  {data.full_name}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {data.qualification_type || 'No qualification recorded'}
                  {data.institution ? ` - ${data.institution}` : ''}
                  {data.academic_average !== null
                    ? ` - Academic average: ${data.academic_average}%`
                    : ''}
                </p>
              </div>
              <Badge
                text={data.status}
                color={
                  data.status === 'ACTIVE'
                    ? 'green'
                    : data.status === 'INACTIVE'
                    ? 'red'
                    : 'gray'
                }
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase">
                Completed Modules
              </h2>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {data.completed_modules}
                <span className="text-gray-500 text-lg font-normal">
                  {' '}
                  / {data.total_modules}
                </span>
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase">
                In Progress
              </h2>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {data.in_progress_modules}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase">
                Programme Completion
              </h2>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {data.completion_pct}%
              </p>
              <div className="mt-3">
                <ProgressBar
                  progress={data.completion_pct}
                  color={
                    data.completion_pct >= 75
                      ? 'green'
                      : data.completion_pct >= 50
                      ? 'blue'
                      : 'yellow'
                  }
                />
              </div>
            </div>
          </div>

          {/* Recent evaluations */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Recent Evaluations
              </h2>
            </div>

            {data.recent_evaluations.length === 0 ? (
              <div className="p-6 text-gray-500">
                No evaluations have been submitted for you yet.
              </div>
            ) : (
              <div className="divide-y">
                {data.recent_evaluations.map((evaluation) => (
                  <div
                    key={evaluation.evaluation_id}
                    className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div>
                      <p className="text-2xl font-bold text-gray-800">
                        {evaluation.overall_score}%
                      </p>
                      <p className="text-sm text-gray-500">
                        Submitted {formatDate(evaluation.submitted_at)}
                      </p>
                    </div>
                    <Badge
                      text={evaluation.approved ? 'Approved' : 'Pending Approval'}
                      color={evaluation.approved ? 'green' : 'yellow'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}