import { SkeletonTable, SkeletonCard } from '../../components/ui/Skeleton';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function Performance() {
  const { apprenticeId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const downloadReport = async () => {
    try {
      setDownloading(true);
      const response = await api.get(
        `/api/reports/apprentice/${apprenticeId}`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `apprentice_${apprenticeId}_report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate the PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const loadPerformance = async () => {
      try {
        setLoading(true);

        const response = await api.get(
          `/api/dashboard/performance/${apprenticeId}`
        );

        setData(response.data);
      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.detail ||
          'Failed to load apprentice performance.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPerformance();
  }, [apprenticeId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 text-red-700 p-4 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { apprentice, summary, modules, evaluations, prediction } = data;

  return (
    <div className="p-6">

      {/* HEADER */}

      <div className="flex justify-between items-center mb-6">

        <div>
          <h1 className="text-2xl font-semibold">
            Apprentice Performance
          </h1>

          <p className="text-gray-500 mt-1">
            {apprentice.first_name} {apprentice.surname}
          </p>

          <button
            type="button"
            onClick={downloadReport}
            disabled={downloading}
            className="mt-2 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back
        </button>

      </div>


      {/* APPRENTICE INFORMATION */}

      <div className="bg-white rounded-lg shadow p-6 mb-6">

        <h2 className="text-lg font-semibold mb-4">
          Apprentice Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>
            <p className="text-sm text-gray-500">
              Name
            </p>
            <p className="font-medium">
              {apprentice.first_name} {apprentice.surname}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              ID Number
            </p>
            <p className="font-medium">
              {apprentice.id_number}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Status
            </p>
            <p className="font-medium">
              {apprentice.status}
            </p>
          </div>

        </div>

      </div>


      {/* PERFORMANCE SUMMARY */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">

        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 uppercase">
            Module Completion
          </p>

          <p className="text-3xl font-bold mt-2">
            {summary.completion_percentage}%
          </p>

          <p className="text-sm text-gray-500 mt-1">
            {summary.completed_modules} / {summary.total_modules}
          </p>
        </div>


        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 uppercase">
            Average Module Score
          </p>

          <p className="text-3xl font-bold mt-2">
            {summary.average_module_score ?? 'N/A'}
          </p>
        </div>


        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 uppercase">
            Evaluation Score
          </p>

          <p className="text-3xl font-bold mt-2">
            {summary.latest_evaluation_score ?? 'N/A'}
          </p>
        </div>


        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm text-gray-500 uppercase">
            Overall Performance
          </p>

          <p className="text-3xl font-bold mt-2">
            {summary.overall_score ?? 'N/A'}
          </p>

          <p className="text-sm text-gray-500 mt-1">
            {summary.performance_status}
          </p>
        </div>

      </div>


      {/* MODULE PERFORMANCE */}

      <div className="bg-white rounded-lg shadow mb-6">

        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            Module Performance
          </h2>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-gray-50">

              <tr>
                <th className="text-left p-4">
                  Module
                </th>

                <th className="text-left p-4">
                  Category
                </th>

                <th className="text-left p-4">
                  Status
                </th>

                <th className="text-left p-4">
                  Score
                </th>

                <th className="text-left p-4">
                  Pass Mark
                </th>
              </tr>

            </thead>

            <tbody>

              {modules.map(module => (

                <tr
                  key={module.module_id}
                  className="border-t"
                >

                  <td className="p-4">
                    {module.module_name}
                  </td>

                  <td className="p-4">
                    {module.category || 'N/A'}
                  </td>

                  <td className="p-4">
                    {module.status}
                  </td>

                  <td className="p-4">
                    {module.assessment_score ?? 'N/A'}
                  </td>

                  <td className="p-4">
                    {module.pass_mark ?? 'N/A'}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>


      {/* EVALUATIONS */}

      <div className="bg-white rounded-lg shadow mb-6">

        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            Evaluations
          </h2>
        </div>

        <div className="p-6">

          {evaluations.length === 0 ? (

            <p className="text-gray-500">
              No evaluations recorded.
            </p>

          ) : (

            evaluations.map(evaluation => (

              <div
                key={evaluation.evaluation_id}
                className="border-b py-4 last:border-b-0"
              >

                <div className="flex justify-between">

                  <span>
                    Evaluation #{evaluation.evaluation_id}
                  </span>

                  <strong>
                    {evaluation.overall_score ?? 'N/A'}
                  </strong>

                </div>

                <p className="text-sm text-gray-500">
                  Submitted: {
                    evaluation.submitted_at
                      ? new Date(
                          evaluation.submitted_at
                        ).toLocaleDateString()
                      : 'N/A'
                  }
                </p>

              </div>

            ))

          )}

        </div>

      </div>


      {/* AI PREDICTION */}

      <div className="bg-white rounded-lg shadow mb-6">

        <div className="p-6 border-b">

          <h2 className="text-lg font-semibold">
            AI Performance Prediction
          </h2>

        </div>

        <div className="p-6">

          {!prediction ? (

            <p className="text-gray-500">
              No AI prediction has been generated.
            </p>

          ) : (

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              <div>
                <p className="text-sm text-gray-500">
                  Dropout Risk
                </p>

                <p className="text-2xl font-bold">
                  {prediction.dropout_risk ?? 'N/A'}%
                </p>

                <p className="text-sm">
                  {prediction.risk_label}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Completion Likelihood
                </p>

                <p className="text-2xl font-bold">
                  {prediction.completion_likelihood ?? 'N/A'}%
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Employment Readiness
                </p>

                <p className="text-2xl font-bold">
                  {prediction.employment_readiness ?? 'N/A'}%
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Confidence
                </p>

                <p className="text-2xl font-bold">
                  {prediction.confidence_score ?? 'N/A'}%
                </p>
              </div>

            </div>

          )}

        </div>

      </div>

    </div>
  );
}