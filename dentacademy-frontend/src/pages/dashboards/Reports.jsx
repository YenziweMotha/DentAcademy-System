import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { getAtRiskApprentices } from '../../api/predictions';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable } from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import AlertBanner from '../../components/ui/AlertBanner';
import StatCard from '../../components/ui/StatCard';
import ProgressBar from '../../components/ui/ProgressBar';
import Pagination from '../../components/ui/Pagination';
import {
  Users,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  ClipboardClock,
  Download,
  RefreshCw,
  FileText,
  Eye,
} from 'lucide-react';

const PDF_TIMEOUT_MS = 90000;

async function readApiError(err, fallback) {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed.detail || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.detail || data?.message || fallback;
}

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [dashboard, setDashboard] = useState({
    total_apprentices: 0,
    active_apprentices: 0,
    at_risk_count: 0,
    avg_completion_pct: 0,
    pending_evaluations: 0,
  });
  const [apprentices, setApprentices] = useState([]);
  const [atRiskApprentices, setAtRiskApprentices] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalApprentices, setTotalApprentices] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const downloadSummary = async () => {
    try {
      setDownloadingSummary(true);
      setError('');
      setLoadFailed(false);
      const response = await api.get('/api/reports/programme-summary', {
        responseType: 'blob',
        timeout: PDF_TIMEOUT_MS,
      });
      triggerBlobDownload(response.data, 'DentAcademy_Programme_Summary.pdf');
      toast.success('Programme summary report downloaded.');
    } catch (err) {
      const message = await readApiError(err, 'Failed to generate the programme summary PDF.');
      setError(message);
      toast.error(message);
    } finally {
      setDownloadingSummary(false);
    }
  };

  const downloadApprenticePdf = async (apprentice) => {
    const id = apprentice.apprentice_id;
    try {
      setDownloadingId(id);
      setError('');
      setLoadFailed(false);
      const response = await api.get(`/api/reports/apprentice/${id}`, {
        responseType: 'blob',
        timeout: PDF_TIMEOUT_MS,
      });
      const slug = `${apprentice.surname || 'apprentice'}_${apprentice.first_name || id}`
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_-]/g, '');
      triggerBlobDownload(response.data, `DentAcademy_Apprentice_Report_${slug}.pdf`);
      toast.success('Apprentice progress report downloaded.');
    } catch (err) {
      const message = await readApiError(err, 'Failed to generate the apprentice PDF report.');
      setError(message);
      toast.error(message);
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalApprentices / limit));

  const loadReports = async (currentPage = page) => {
    try {
      setLoading(true);
      setError('');
      setLoadFailed(false);

      const skip = (currentPage - 1) * limit;
      const isSupervisor = user?.role === 'Supervisor';

      const [dashboardResponse, apprenticesResponse, atRiskResponse] = await Promise.all([
        api.get(isSupervisor ? '/api/dashboard/supervisor' : '/api/dashboard/admin'),
        api.get('/api/apprentices', { params: { skip, limit } }),
        getAtRiskApprentices(),
      ]);

      setDashboard({
        total_apprentices:
          dashboardResponse.data?.total_apprentices ??
          dashboardResponse.data?.apprentice_list?.length ??
          0,
        active_apprentices:
          dashboardResponse.data?.active_apprentices ??
          dashboardResponse.data?.apprentice_list?.length ??
          0,
        at_risk_count: dashboardResponse.data?.at_risk_count ?? 0,
        avg_completion_pct: dashboardResponse.data?.avg_completion_pct ?? 0,
        pending_evaluations:
          dashboardResponse.data?.pending_evaluations ??
          dashboardResponse.data?.pending_approvals ??
          0,
      });

      const apprenticeData = apprenticesResponse.data;
      if (apprenticeData && Array.isArray(apprenticeData.items)) {
        setApprentices(apprenticeData.items);
        setTotalApprentices(apprenticeData.total ?? 0);
      } else if (Array.isArray(apprenticeData)) {
        setApprentices(apprenticeData);
        setTotalApprentices(apprenticeData.length);
      } else {
        setApprentices([]);
        setTotalApprentices(0);
      }

      const riskData = atRiskResponse?.items ?? atRiskResponse ?? [];
      setAtRiskApprentices(Array.isArray(riskData) ? riskData : []);
    } catch (err) {
      setLoadFailed(true);
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          'Failed to load report data.'
      );
      setApprentices([]);
      setTotalApprentices(0);
      setAtRiskApprentices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(page);
  }, [page]);

  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [search, filter]);

  const getRiskRecord = (apprenticeId) =>
    atRiskApprentices.find((risk) => Number(risk.apprentice_id) === Number(apprenticeId));

  const searchTerm = search.toLowerCase().trim();
  const filteredApprentices = apprentices.filter((apprentice) => {
    const firstName = apprentice.first_name?.toLowerCase() || '';
    const surname = apprentice.surname?.toLowerCase() || '';
    const idNumber = apprentice.id_number?.toLowerCase() || '';
    const matchesSearch =
      !searchTerm ||
      firstName.includes(searchTerm) ||
      surname.includes(searchTerm) ||
      idNumber.includes(searchTerm);

    let matchesFilter = true;
    const completion = Number(apprentice.completion_pct ?? 0);
    if (filter === 'At Risk') matchesFilter = Boolean(getRiskRecord(apprentice.apprentice_id));
    if (filter === 'Completed') matchesFilter = completion >= 100;
    if (filter === 'In Progress') matchesFilter = completion > 0 && completion < 100;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page-shell">
      <PageHeader
        title="Official Reports"
        subtitle="Generate confidential PDF progress reports for the DentAcademy apprenticeship programme. Each file includes identification, attendance, modules, evaluations and AI commentary."
        actions={
          <>
            <Button
              type="button"
              onClick={() => loadReports(page)}
              loading={loading}
              icon={RefreshCw}
              variant="secondary"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              type="button"
              onClick={downloadSummary}
              loading={downloadingSummary}
              icon={Download}
            >
              {downloadingSummary ? 'Generating...' : 'Download programme PDF'}
            </Button>
          </>
        }
      />

      {error && loadFailed && (
        <ErrorState
          title="Could not load reports"
          description={error}
          onRetry={() => loadReports(page)}
        />
      )}
      {error && !loadFailed && (
        <AlertBanner
          type="error"
          message={error}
          onDismiss={() => setError('')}
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard icon={Users} label="Total apprentices" value={dashboard.total_apprentices} />
        <StatCard icon={UserCheck} label="Active" value={dashboard.active_apprentices} tone="brand" />
        <StatCard
          icon={AlertTriangle}
          label="At risk"
          value={dashboard.at_risk_count}
          tone="red"
          hint="Dropout risk above threshold"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg completion"
          value={`${dashboard.avg_completion_pct}%`}
          tone="blue"
        />
        <StatCard
          icon={ClipboardClock}
          label="Pending evaluations"
          value={dashboard.pending_evaluations}
          tone="yellow"
        />
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="search-apprentice" className="block text-sm font-medium text-ink mb-2">
              Search apprentice
            </label>
            <input
              id="search-apprentice"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID number..."
              className="w-full border border-line rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div>
            <label htmlFor="report-filter" className="block text-sm font-medium text-ink mb-2">
              Report filter
            </label>
            <select
              id="report-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full border border-line rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value="All">All apprentices</option>
              <option value="At Risk">At risk</option>
              <option value="In Progress">In progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </Card>

      <Card padding={false} className="overflow-hidden">
        <CardHeader
          title="Apprentice progress reports"
          subtitle="Download the official PDF (with AI comments) or open the on-screen performance record."
          className="p-6 mb-0 border-b border-line"
        />

        {loading ? (
          <SkeletonTable rows={6} cols={6} />
        ) : filteredApprentices.length === 0 ? (
          <EmptyState
            title="No apprentices found"
            description={
              search || filter !== 'All'
                ? 'No apprentices match your search or filter.'
                : 'Apprentices will appear here once registered.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-surface-muted/60 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Apprentice
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    ID number
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Completion
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Risk
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Official report
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredApprentices.map((apprentice) => {
                  const completion = Number(apprentice.completion_pct ?? 0);
                  const riskRecord = getRiskRecord(apprentice.apprentice_id);
                  const isDownloading = downloadingId === apprentice.apprentice_id;

                  return (
                    <tr key={apprentice.apprentice_id} className="hover:bg-surface-muted/60">
                      <td className="px-6 py-4">
                        <div className="font-medium text-ink">
                          {apprentice.first_name} {apprentice.surname}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-muted">
                        {apprentice.id_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={apprentice.status || 'UNKNOWN'} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ProgressBar progress={completion} className="w-32" />
                          <span className="text-sm text-ink-muted whitespace-nowrap">
                            {completion}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {riskRecord ? (
                          <div>
                            <StatusBadge status="HIGH_RISK" />
                            <p className="text-xs text-rose-600 font-semibold mt-1.5">
                              {riskRecord.dropout_risk}%
                            </p>
                          </div>
                        ) : (
                          <StatusBadge status="LOW_RISK" />
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            icon={Eye}
                            onClick={() =>
                              navigate(`/dashboard/performance/${apprentice.apprentice_id}`)
                            }
                          >
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            icon={isDownloading ? undefined : FileText}
                            loading={isDownloading}
                            onClick={() => downloadApprenticePdf(apprentice)}
                          >
                            {isDownloading ? 'PDF...' : 'PDF'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalApprentices > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={totalApprentices}
            limit={limit}
            onPrev={() => page > 1 && setPage((p) => p - 1)}
            onNext={() => page < totalPages && setPage((p) => p + 1)}
          />
        )}
      </Card>
    </div>
  );
}
