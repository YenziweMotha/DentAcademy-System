import api from './axios';

export function getAuditLogs(params = {}) {
  return api.get('/api/audit', { params });
}

export function getAuditMeta() {
  return api.get('/api/audit/meta');
}

export function getAuditLog(logId) {
  return api.get(`/api/audit/${logId}`);
}
