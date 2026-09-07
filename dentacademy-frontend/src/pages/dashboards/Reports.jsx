import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { getAtRiskApprentices } from '../../api/predictions';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { SkeletonTable } from '../../components/ui/Skeleton';

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  // ---------------------------------------------------------
  // STATE
  // ---------------------------------------------------------

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
  const [downloading, setDownloading] = useState(false);

  // ---------------------------------------------------------
  // PDF DOWNLOAD
  // ---------------------------------------------------------

  const downloadSummary = async () => {
    try {
      setDownloading(true);
      setError('');
      const response = await api.get('/api/reports/programme-summary', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'programme_summary.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Summary report downloaded.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate the PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  // ---------------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------------

  const totalPages = Math.max(
    1,
    Math.ceil(totalApprentices / limit)
  );

  // ---------------------------------------------------------
  // LOAD REPORT DATA
  // ---------------------------------------------------------

  const loadReports = async (currentPage = page) => {
    try {
      setLoading(true);
      setError('');

      const skip = (currentPage - 1) * limit;

      const isSupervisor = user?.role === 'Supervisor';

      const [
        dashboardResponse,
        apprenticesResponse,
        atRiskResponse,
      ] = await Promise.all([
        api.get(isSupervisor ? '/api/dashboard/supervisor' : '/api/dashboard/admin'),

        api.get('/api/apprentices', {
          params: {
            skip,
            limit,
          },
        }),

        getAtRiskApprentices(),
      ]);

      // -----------------------------------------------------
      // DASHBOARD
      // -----------------------------------------------------

      setDashboard({
        total_apprentices:
          dashboardResponse.data?.total_apprentices ??
          dashboardResponse.data?.apprentice_list?.length ??
          0,

        active_apprentices:
          dashboardResponse.data?.active_apprentices ??
          dashboardResponse.data?.apprentice_list?.length ??
          0,

        at_risk_count:
          dashboardResponse.data?.at_risk_count ?? 0,

        avg_completion_pct:
          dashboardResponse.data?.avg_completion_pct ?? 0,

        pending_evaluations:
          dashboardResponse.data?.pending_evaluations ??
          dashboardResponse.data?.pending_approvals ??
          0,
      });

      // -----------------------------------------------------
      // APPRENTICES
      //
      // Backend returns:
      //
      // {
      //   items: [...],
      //   total: 100,
      //   skip: 0,
      //   limit: 10
      // }
      // -----------------------------------------------------

      const apprenticeData =
        apprenticesResponse.data;

      if (
        apprenticeData &&
        Array.isArray(apprenticeData.items)
      ) {
        setApprentices(apprenticeData.items);

        setTotalApprentices(
          apprenticeData.total ?? 0
        );
      } else if (
        Array.isArray(apprenticeData)
      ) {
        // Fallback in case the backend returns
        // a normal array.
        setApprentices(apprenticeData);

        setTotalApprentices(
          apprenticeData.length
        );
      } else {
        setApprentices([]);
        setTotalApprentices(0);
      }

      // -----------------------------------------------------
      // AI AT-RISK APPRENTICES
      // -----------------------------------------------------

      const riskData =
        atRiskResponse?.items ??
        atRiskResponse ??
        [];

      setAtRiskApprentices(
        Array.isArray(riskData)
          ? riskData
          : []
      );

    } catch (err) {
      console.error(
        'Failed to load reports:',
        err
      );

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

  // ---------------------------------------------------------
  // INITIAL LOAD / PAGE CHANGE
  // ---------------------------------------------------------

  useEffect(() => {
    loadReports(page);
  }, [page]);

  // ---------------------------------------------------------
  // RESET PAGE WHEN SEARCH OR FILTER CHANGES
  // ---------------------------------------------------------

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [search, filter]);

  // ---------------------------------------------------------
  // AI RISK HELPERS
  // ---------------------------------------------------------

  const isAtRisk = (apprenticeId) => {
    return atRiskApprentices.some(
      (risk) =>
        Number(risk.apprentice_id) ===
        Number(apprenticeId)
    );
  };

  const getRiskRecord = (apprenticeId) => {
    return atRiskApprentices.find(
      (risk) =>
        Number(risk.apprentice_id) ===
        Number(apprenticeId)
    );
  };

  // ---------------------------------------------------------
  // SEARCH + FILTER
  //
  // NOTE:
  // This currently filters the apprentices loaded on the
  // current page.
  // ---------------------------------------------------------

  const searchTerm =
    search.toLowerCase().trim();

  const filteredApprentices =
    apprentices.filter((apprentice) => {
      const firstName =
        apprentice.first_name
          ?.toLowerCase() || '';

      const surname =
        apprentice.surname
          ?.toLowerCase() || '';

      const idNumber =
        apprentice.id_number
          ?.toLowerCase() || '';

      const matchesSearch =
        !searchTerm ||
        firstName.includes(searchTerm) ||
        surname.includes(searchTerm) ||
        idNumber.includes(searchTerm);

      let matchesFilter = true;

      // ---------------------------------------------------
      // AT RISK
      // ---------------------------------------------------

      if (filter === 'At Risk') {
        matchesFilter = isAtRisk(
          apprentice.apprentice_id
        );
      }

      // ---------------------------------------------------
      // COMPLETED
      // ---------------------------------------------------

      if (filter === 'Completed') {
        const completion =
          Number(
            apprentice.completion_pct ?? 0
          );

        matchesFilter =
          completion >= 100;
      }

      // ---------------------------------------------------
      // IN PROGRESS
      // ---------------------------------------------------

      if (filter === 'In Progress') {
        const completion =
          Number(
            apprentice.completion_pct ?? 0
          );

        matchesFilter =
          completion > 0 &&
          completion < 100;
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  // ---------------------------------------------------------
  // PAGINATION CONTROLS
  // ---------------------------------------------------------

  const goToPreviousPage = () => {
    if (page > 1) {
      setPage((currentPage) =>
        currentPage - 1
      );
    }
  };

  const goToNextPage = () => {
    if (page < totalPages) {
      setPage((currentPage) =>
        currentPage + 1
      );
    }
  };

  // ---------------------------------------------------------
  // CURRENT RANGE
  // ---------------------------------------------------------

  const firstRecord =
    totalApprentices === 0
      ? 0
      : (page - 1) * limit + 1;

  const lastRecord =
    Math.min(
      page * limit,
      totalApprentices
    );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">

        <div>
          <h1 className="text-2xl font-semibold text-gray-800">
            Reports
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Overview of apprentice performance and
            programme progress.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <button
            type="button"
            onClick={() => loadReports(page)}
            disabled={loading}
            className="bg-brand text-white px-4 py-2 rounded-md hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? 'Refreshing...'
              : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={downloadSummary}
            disabled={downloading}
            className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading
              ? 'Generating...'
              : 'Download Summary PDF'}
          </button>
        </div>

      </div>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">

          <p className="font-medium">
            Error loading reports
          </p>

          <p className="text-sm mt-1">
            {error}
          </p>

        </div>
      )}


      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

        {/* Total */}

        <div className="bg-white p-5 rounded-lg shadow">

          <p className="text-xs font-medium text-gray-500 uppercase">
            Total Apprentices
          </p>

          <p className="text-3xl font-bold text-gray-800 mt-2">
            {dashboard.total_apprentices}
          </p>

        </div>


        {/* Active */}

        <div className="bg-white p-5 rounded-lg shadow">

          <p className="text-xs font-medium text-gray-500 uppercase">
            Active
          </p>

          <p className="text-3xl font-bold text-green-600 mt-2">
            {dashboard.active_apprentices}
          </p>

        </div>


        {/* At Risk */}

        <div className="bg-white p-5 rounded-lg shadow">

          <p className="text-xs font-medium text-gray-500 uppercase">
            At Risk
          </p>

          <p className="text-3xl font-bold text-red-600 mt-2">
            {dashboard.at_risk_count}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            Dropout risk &gt; 60%
          </p>

        </div>


        {/* Completion */}

        <div className="bg-white p-5 rounded-lg shadow">

          <p className="text-xs font-medium text-gray-500 uppercase">
            Avg Completion
          </p>

          <p className="text-3xl font-bold text-brand mt-2">
            {dashboard.avg_completion_pct}%
          </p>

        </div>


        {/* Pending evaluations */}

        <div className="bg-white p-5 rounded-lg shadow">

          <p className="text-xs font-medium text-gray-500 uppercase">
            Pending Evaluations
          </p>

          <p className="text-3xl font-bold text-yellow-600 mt-2">
            {dashboard.pending_evaluations}
          </p>

        </div>

      </div>


      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="bg-white rounded-lg shadow mb-6 p-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Search */}

          <div>

            <label
              htmlFor="search-apprentice"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Search apprentice
            </label>

            <input
              id="search-apprentice"
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search by name or ID number..."
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand"
            />

          </div>


          {/* Filter */}

          <div>

            <label
              htmlFor="report-filter"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Report filter
            </label>

            <select
              id="report-filter"
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
              className="w-full border border-gray-300 rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand"
            >

              <option value="All">
                All Apprentices
              </option>

              <option value="At Risk">
                At Risk
              </option>

              <option value="In Progress">
                In Progress
              </option>

              <option value="Completed">
                Completed
              </option>

            </select>

          </div>

        </div>

      </div>


      {/* =====================================================
          REPORT TABLE
      ===================================================== */}

      <div className="bg-white rounded-lg shadow overflow-hidden">

        {/* Table heading */}

        <div className="p-6 border-b">

          <h2 className="text-xl font-semibold text-gray-800">
            Apprentice Performance Reports
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Select an apprentice to view their
            detailed performance record.
          </p>

        </div>


        {/* Loading */}

        {loading ? (

          <SkeletonTable rows={6} cols={5} />

        ) : filteredApprentices.length === 0 ? (

          /* Empty */

          <div className="p-6 text-gray-500">

            {search || filter !== 'All'
              ? 'No apprentices match your search or filter.'
              : 'No apprentices found.'}

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full">

              {/* =================================================
                  HEADER
              ================================================= */}

              <thead className="bg-gray-50 border-b">

                <tr>

                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Apprentice
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    ID Number
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Completion
                  </th>

                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Risk
                  </th>

                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Report
                  </th>

                </tr>

              </thead>


              {/* =================================================
                  BODY
              ================================================= */}

              <tbody className="divide-y">

                {filteredApprentices.map(
                  (apprentice) => {

                    const completion =
                      Number(
                        apprentice.completion_pct ?? 0
                      );

                    const riskRecord =
                      getRiskRecord(
                        apprentice.apprentice_id
                      );

                    const isHighRisk =
                      !!riskRecord;

                    return (

                      <tr
                        key={
                          apprentice.apprentice_id
                        }
                        className="hover:bg-gray-50"
                      >

                        {/* -----------------------------------------
                            Apprentice
                        ----------------------------------------- */}

                        <td className="px-6 py-4">

                          <div className="font-medium text-gray-800">

                            {apprentice.first_name}{' '}

                            {apprentice.surname}

                          </div>

                        </td>


                        {/* -----------------------------------------
                            ID
                        ----------------------------------------- */}

                        <td className="px-6 py-4 text-sm text-gray-600">

                          {apprentice.id_number || 'N/A'}

                        </td>


                        {/* -----------------------------------------
                            Status
                        ----------------------------------------- */}

                        <td className="px-6 py-4">

                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              apprentice.status ===
                              'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >

                            {apprentice.status ||
                              'UNKNOWN'}

                          </span>

                        </td>


                        {/* -----------------------------------------
                            Completion
                        ----------------------------------------- */}

                        <td className="px-6 py-4">

                          <div className="flex items-center gap-3">

                            <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">

                              <div
                                className="bg-brand h-2 rounded-full"
                                style={{
                                  width: `${Math.min(
                                    Math.max(
                                      completion,
                                      0
                                    ),
                                    100
                                  )}%`,
                                }}
                              />

                            </div>

                            <span className="text-sm text-gray-600 whitespace-nowrap">

                              {completion}%

                            </span>

                          </div>

                        </td>


                        {/* -----------------------------------------
                            Risk
                        ----------------------------------------- */}

                        <td className="px-6 py-4">

                          {isHighRisk ? (

                            <div>

                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">

                                High Risk

                              </span>

                              <p className="text-xs text-red-600 mt-1">

                                {riskRecord.dropout_risk}%

                              </p>

                            </div>

                          ) : (

                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">

                              No High Risk

                            </span>

                          )}

                        </td>


                        {/* -----------------------------------------
                            Report
                        ----------------------------------------- */}

                        <td className="px-6 py-4 text-right">

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/dashboard/performance/${apprentice.apprentice_id}`
                              )
                            }
                            className="bg-brand text-white px-3 py-2 rounded-md text-sm hover:bg-brand-dark transition-colors"
                          >

                            View Report

                          </button>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}


        {/* =====================================================
            PAGINATION
        ===================================================== */}

        {!loading &&
          totalApprentices > 0 && (

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t">

              {/* Range */}

              <div className="text-sm text-gray-500">

                Showing{' '}

                <span className="font-medium text-gray-700">

                  {firstRecord}

                </span>

                {' '}to{' '}

                <span className="font-medium text-gray-700">

                  {lastRecord}

                </span>

                {' '}of{' '}

                <span className="font-medium text-gray-700">

                  {totalApprentices}

                </span>

                {' '}apprentices

              </div>


              {/* Controls */}

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={
                    page === 1 ||
                    loading
                  }
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >

                  Previous

                </button>


                <span className="px-4 py-2 text-sm text-gray-600">

                  Page {page} of {totalPages}

                </span>


                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={
                    page >= totalPages ||
                    loading
                  }
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >

                  Next

                </button>

              </div>

            </div>

          )}

      </div>


      {/* =====================================================
          FILTER/PAGE INFORMATION
      ===================================================== */}

      {!loading &&
        totalApprentices > 0 && (
          <p className="text-sm text-gray-500 mt-4">

            Showing{' '}

            {filteredApprentices.length}

            {' '}matching apprentices on this page.

          </p>
        )}

    </div>
  );
}