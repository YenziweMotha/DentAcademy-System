import { useEffect, useState } from 'react';
import api from '../../api/axios';
import ProgressBar from '../../components/ui/ProgressBar';
import Badge from '../../components/ui/Badge';

export default function MentorDashboard() {
  const [data, setData] = useState({
    assigned_apprentices: 0,
    apprentice_list: [],
  });

  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get('api/dashboard/mentor')
      .then((res) => setData(res.data))
      .catch(() => setError(true));
  }, []);

  const avgCompletion =
    data.apprentice_list.length > 0
      ? Math.round(
          data.apprentice_list.reduce(
            (sum, a) => sum + (a.completion_pct || 0),
            0
          ) / data.apprentice_list.length
        )
      : 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Mentor Dashboard</h1>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md mb-6">
          Failed to load your dashboard data.
        </div>
      )}

      {!error && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase">
                Assigned Apprentices
              </h2>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {data.assigned_apprentices}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-gray-500 text-sm font-medium uppercase">
                Average Completion
              </h2>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {avgCompletion}%
              </p>
              <div className="mt-3">
                <ProgressBar progress={avgCompletion} />
              </div>
            </div>
          </div>

          {/* Assigned apprentices */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                My Apprentices
              </h2>
            </div>

            {data.apprentice_list.length === 0 ? (
              <div className="p-6 text-gray-500">
                No apprentices are currently assigned to you.
              </div>
            ) : (
              <div className="divide-y">
                {data.apprentice_list.map((apprentice) => (
                  <div
                    key={apprentice.apprentice_id}
                    className="p-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {apprentice.full_name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {apprentice.in_progress_modules} in progress ·{' '}
                          {apprentice.completed_modules} completed
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-800">
                          {apprentice.completion_pct}%
                        </p>
                        {apprentice.latest_evaluation_score !== null ? (
                          <p className="text-sm text-gray-500">
                            Latest score:{' '}
                            {apprentice.latest_evaluation_score}%
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No evaluations yet
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <ProgressBar
                        progress={apprentice.completion_pct}
                        color={
                          apprentice.completion_pct >= 75
                            ? 'green'
                            : apprentice.completion_pct >= 50
                            ? 'blue'
                            : 'yellow'
                        }
                      />
                      {apprentice.pending_evaluations > 0 && (
                        <Badge
                          text={`${apprentice.pending_evaluations} pending evaluation${
                            apprentice.pending_evaluations === 1 ? '' : 's'
                          }`}
                          color="yellow"
                        />
                      )}
                    </div>
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