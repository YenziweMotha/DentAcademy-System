import { SkeletonCard } from '../../components/ui/Skeleton';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import StatCard from '../../components/ui/StatCard';
import { BookOpen, Gauge, ClipboardCheck, TrendingUp, Download, ArrowLeft } from 'lucide-react';

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
        { responseType: 'blob', timeout: 90000 }
      );
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      const surname = data?.apprentice?.surname || apprenticeId;
      link.download = `DentAcademy_Apprentice_Report_${surname}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let message = 'Failed to generate the PDF report.';
      const payload = err.response?.data;
      if (payload instanceof Blob) {
        try {
          const parsed = JSON.parse(await payload.text());
          message = parsed.detail || message;
        } catch {
          /* keep fallback */
        }
      } else if (payload?.detail) {
        message = payload.detail;
      }
      setError(message);
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
      <div>
        <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState title="Could not load performance" description={error} onRetry={() => window.location.reload()} />
    );
  }

  if (!data) {
    return null;
  }

  const { apprentice, summary, modules, evaluations, prediction } = data;

  return (
    <div className="page-shell">

      {/* HEADER */}

      <PageHeader title="Apprentice Performance" subtitle={`${apprentice.first_name} ${apprentice.surname} — official record with AI commentary in the PDF`} actions={<>
          <Button
            type="button"
            onClick={downloadReport}
            loading={downloading}
            icon={Download}
            variant="secondary"
          >
            {downloading ? 'Generating PDF...' : 'Download official PDF'}
          </Button>
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          icon={ArrowLeft}
        >
          Back
        </Button>
      </>} />


      {/* APPRENTICE INFORMATION */}

      <Card className="mb-6">

        <h2 className="text-lg font-semibold mb-4">
          Apprentice Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div>
            <p className="text-sm text-ink-muted">
              Name
            </p>
            <p className="font-medium">
              {apprentice.first_name} {apprentice.surname}
            </p>
          </div>

          <div>
            <p className="text-sm text-ink-muted">
              ID Number
            </p>
            <p className="font-medium">
              {apprentice.id_number}
            </p>
          </div>

          <div>
            <p className="text-sm text-ink-muted">
              Status
            </p>
            <StatusBadge status={apprentice.status} />
          </div>

        </div>

      </Card>


      {/* PERFORMANCE SUMMARY */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">

        <StatCard icon={BookOpen} label="Module Completion" value={`${summary.completion_percentage}%`} hint={`${summary.completed_modules} / ${summary.total_modules}`} />


        <StatCard icon={Gauge} label="Average Module Score" value={summary.average_module_score ?? 'N/A'} tone="blue" />


        <StatCard icon={ClipboardCheck} label="Evaluation Score" value={summary.latest_evaluation_score ?? 'N/A'} />


        <StatCard icon={TrendingUp} label="Overall Performance" value={summary.overall_score ?? 'N/A'} hint={summary.performance_status} />

      </div>


      {/* MODULE PERFORMANCE */}

      <Card padding={false} className="mb-6">

        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            Module Performance
          </h2>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-surface-muted/60">

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

      </Card>


      {/* EVALUATIONS */}

      <Card padding={false} className="mb-6">

        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">
            Evaluations
          </h2>
        </div>

        <div className="p-6">

          {evaluations.length === 0 ? (

            <EmptyState title="No evaluations recorded" description="Evaluation results will appear here once submitted." />

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

                <p className="text-sm text-ink-muted">
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

      </Card>


      {/* AI PREDICTION */}

      <Card padding={false} className="mb-6">

        <div className="p-6 border-b">

          <h2 className="text-lg font-semibold">
            AI Performance Prediction
          </h2>

        </div>

        <div className="p-6">

          {!prediction ? (

            <EmptyState title="No AI prediction" description="Generate a prediction once sufficient performance data is available." />

          ) : (

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

              <div>
                <p className="text-sm text-ink-muted">
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
                <p className="text-sm text-ink-muted">
                  Completion Likelihood
                </p>

                <p className="text-2xl font-bold">
                  {prediction.completion_likelihood ?? 'N/A'}%
                </p>
              </div>

              <div>
                <p className="text-sm text-ink-muted">
                  Employment Readiness
                </p>

                <p className="text-2xl font-bold">
                  {prediction.employment_readiness ?? 'N/A'}%
                </p>
              </div>

              <div>
                <p className="text-sm text-ink-muted">
                  Confidence
                </p>

                <p className="text-2xl font-bold">
                  {prediction.confidence_score ?? 'N/A'}%
                </p>
              </div>

            </div>

          )}

        </div>

      </Card>

    </div>
  );
}