import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Download,
  Eye,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { getAuditLogs, getAuditMeta } from '../../api/audit';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import SearchBar from '../../components/ui/SearchBar';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Pagination from '../../components/ui/Pagination';
import StatCard from '../../components/ui/StatCard';
import Modal from '../../components/ui/Modal';
import { SkeletonStatGrid, SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';

const ACTION_COLORS = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'brand',
  LOGOUT: 'gray',
  ACCESS: 'gray',
  LOGIN_FAILED: 'yellow',
  ACCOUNT_LOCKED: 'red',
  PASSWORD_RESET_REQUEST: 'yellow',
  PASSWORD_RESET_DONE: 'green',
  PREDICTION_GENERATED: 'blue',
  EVALUATION_APPROVED: 'green',
  REPORT_GENERATED: 'gray',
  PHOTO_UPLOADED: 'blue',
};

function actionColor(action) {
  return ACTION_COLORS[action] || 'gray';
}

function formatAction(action) {
  return String(action || '').replace(/_/g, ' ');
}

function formatTimestamp(value) {
  if (!value) return '—';
  const raw = String(value);
  const iso = /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

function prettyJson(value) {
  if (value == null) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toCsv(rows) {
  const headers = [
    'Timestamp',
    'Action',
    'User',
    'Username',
    'Role',
    'Entity',
    'Record ID',
    'IP address',
  ];
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [
      formatTimestamp(row.timestamp),
      row.action_type,
      row.user_name,
      row.user_username,
      row.user_role,
      row.entity_type,
      row.record_id,
      row.ip_address,
    ]
      .map(escape)
      .join(',')
  );
  return [headers.join(','), ...lines].join('\n');
}

const emptyFilters = {
  search: '',
  action_type: '',
  entity_type: '',
  from_date: '',
  to_date: '',
};

export default function AuditLogs() {
  const toast = useToast();
  const [filters, setFilters] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [meta, setMeta] = useState({ action_types: [], entity_types: [] });
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    security_events: 0,
    auth_events: 0,
    data_changes: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState(false);
  const limit = 25;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const params = useMemo(() => {
    const skip = (page - 1) * limit;
    const next = { skip, limit };
    if (applied.search) next.search = applied.search;
    if (applied.action_type) next.action_type = applied.action_type;
    if (applied.entity_type) next.entity_type = applied.entity_type;
    if (applied.from_date) next.from_date = applied.from_date;
    if (applied.to_date) next.to_date = applied.to_date;
    return next;
  }, [applied, page]);

  const loadMeta = async () => {
    try {
      const res = await getAuditMeta();
      setMeta(res.data || { action_types: [], entity_types: [] });
    } catch {
      // Filters still work with typed action values even if meta fails.
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAuditLogs(params);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setSummary({
        total: res.data.summary?.total ?? res.data.total ?? 0,
        security_events: res.data.summary?.security_events ?? 0,
        auth_events: res.data.summary?.auth_events ?? 0,
        data_changes: res.data.summary?.data_changes ?? 0,
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load audit logs.');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [params]);

  const applyFilters = (event) => {
    event?.preventDefault?.();
    setPage(1);
    setApplied({ ...filters, search: filters.search.trim() });
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setPage(1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await getAuditLogs({ ...params, skip: 0, limit: 200 });
      const rows = res.data.items || [];
      if (!rows.length) {
        toast.error('No log entries to export for the current filters.');
        return;
      }
      const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Audit log CSV downloaded.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to export audit logs.');
    } finally {
      setExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    applied.search ||
      applied.action_type ||
      applied.entity_type ||
      applied.from_date ||
      applied.to_date
  );

  return (
    <div className="page-shell space-y-6">
      <PageHeader
        title="Audit Logs"
        subtitle="Review system activity, sign-ins, and data changes across DentAcademy."
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={loadLogs}>
              Refresh
            </Button>
            <Button
              variant="outline"
              icon={Download}
              loading={exporting}
              onClick={exportCsv}
            >
              Export CSV
            </Button>
          </>
        }
      />

      {loading && items.length === 0 ? (
        <SkeletonStatGrid count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 stagger-children">
          <StatCard icon={ScrollText} label="Matching events" value={summary.total} tone="brand" />
          <StatCard icon={UserCheck} label="Sign-in activity" value={summary.auth_events} tone="blue" />
          <StatCard icon={Activity} label="Data changes" value={summary.data_changes} tone="gray" />
          <StatCard
            icon={ShieldAlert}
            label="Security events"
            value={summary.security_events}
            tone={summary.security_events > 0 ? 'red' : 'gray'}
          />
        </div>
      )}

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          <div className="md:col-span-2 xl:col-span-2">
            <label className="block text-sm font-medium text-ink mb-2">Search</label>
            <SearchBar
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              onSubmit={applyFilters}
              onClear={() => setFilters((prev) => ({ ...prev, search: '' }))}
              placeholder="User, action, entity, or IP..."
              bare
            />
          </div>
          <div>
            <label htmlFor="audit-action" className="block text-sm font-medium text-ink mb-2">
              Action
            </label>
            <select
              id="audit-action"
              value={filters.action_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, action_type: e.target.value }))}
              className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface-raised text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="">All actions</option>
              {meta.action_types.map((action) => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-entity" className="block text-sm font-medium text-ink mb-2">
              Entity
            </label>
            <select
              id="audit-entity"
              value={filters.entity_type}
              onChange={(e) => setFilters((prev) => ({ ...prev, entity_type: e.target.value }))}
              className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface-raised text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            >
              <option value="">All entities</option>
              {meta.entity_types.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="audit-from" className="block text-sm font-medium text-ink mb-2">
              From
            </label>
            <input
              id="audit-from"
              type="date"
              value={filters.from_date}
              onChange={(e) => setFilters((prev) => ({ ...prev, from_date: e.target.value }))}
              className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface-raised text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div>
            <label htmlFor="audit-to" className="block text-sm font-medium text-ink mb-2">
              To
            </label>
            <input
              id="audit-to"
              type="date"
              value={filters.to_date}
              onChange={(e) => setFilters((prev) => ({ ...prev, to_date: e.target.value }))}
              className="w-full border border-line rounded-xl px-4 py-2.5 bg-surface-raised text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>
          <div className="xl:col-span-6 flex flex-wrap gap-2">
            <Button type="button" onClick={applyFilters}>
              Apply filters
            </Button>
            {hasActiveFilters && (
              <Button type="button" variant="secondary" onClick={clearFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card padding={false} className="overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonTable rows={6} cols={6} />
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={loadLogs} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No audit events found"
            description={
              hasActiveFilters
                ? 'Try widening the date range or clearing a filter.'
                : 'Activity will appear here as users sign in and change records.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-surface-muted/60 border-b border-line">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    When
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Action
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Actor
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Target
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    IP
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-ink-muted uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((entry) => (
                  <tr key={entry.log_id} className="hover:bg-surface-muted/60">
                    <td className="px-6 py-4 text-sm text-ink whitespace-nowrap">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        text={formatAction(entry.action_type)}
                        color={actionColor(entry.action_type)}
                        soft
                      />
                    </td>
                    <td className="px-6 py-4">
                      {entry.user_name || entry.user_username ? (
                        <div className="flex items-center gap-3">
                          <Avatar name={entry.user_name || entry.user_username} />
                          <div>
                            <div className="font-medium text-ink">
                              {entry.user_name || entry.user_username}
                            </div>
                            <div className="meta-text">
                              {entry.user_username ? `@${entry.user_username}` : ''}
                              {entry.user_role ? ` · ${entry.user_role}` : ''}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-ink-muted">System / unknown</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink">
                      {entry.entity_type || '—'}
                      {entry.record_id != null ? ` #${entry.record_id}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-muted font-mono">
                      {entry.ip_address || '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="soft"
                        size="sm"
                        icon={Eye}
                        onClick={() => setSelected(entry)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </Card>

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Audit event"
        size="lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                text={formatAction(selected.action_type)}
                color={actionColor(selected.action_type)}
                soft
              />
              <span className="text-sm text-ink-muted">
                {formatTimestamp(selected.timestamp)}
              </span>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-ink-subtle font-medium">Actor</dt>
                <dd className="text-ink mt-1">
                  {selected.user_name || selected.user_username || 'Unknown'}
                  {selected.user_role ? ` (${selected.user_role})` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-ink-subtle font-medium">Username</dt>
                <dd className="text-ink mt-1">{selected.user_username || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle font-medium">Target</dt>
                <dd className="text-ink mt-1">
                  {selected.entity_type || '—'}
                  {selected.record_id != null ? ` #${selected.record_id}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-ink-subtle font-medium">IP address</dt>
                <dd className="text-ink mt-1 font-mono">{selected.ip_address || '—'}</dd>
              </div>
              <div>
                <dt className="text-ink-subtle font-medium">Log ID</dt>
                <dd className="text-ink mt-1 font-mono">{selected.log_id}</dd>
              </div>
            </dl>
            {(selected.old_value_json || selected.new_value_json) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selected.old_value_json != null && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle mb-2">
                      Previous value
                    </p>
                    <pre className="text-xs bg-surface-muted rounded-xl p-3 overflow-x-auto text-ink">
                      {prettyJson(selected.old_value_json)}
                    </pre>
                  </div>
                )}
                {selected.new_value_json != null && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle mb-2">
                      New value
                    </p>
                    <pre className="text-xs bg-surface-muted rounded-xl p-3 overflow-x-auto text-ink">
                      {prettyJson(selected.new_value_json)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
