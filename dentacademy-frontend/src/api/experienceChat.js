import api from './axios';

export function openConversation(channel = 'WEB') {
  return api.post('/api/experience-chat/conversations', { channel });
}

export function listConversations() {
  return api.get('/api/experience-chat/conversations');
}

export function getConversation(conversationId) {
  return api.get(`/api/experience-chat/conversations/${conversationId}`);
}

export function sendConversationMessage(conversationId, content, channel = 'WEB') {
  return api.post(`/api/experience-chat/conversations/${conversationId}/messages`, {
    content,
    channel,
  });
}

export function listMyExperiences() {
  return api.get('/api/experience-chat/experiences/me');
}

export function listEscalations(params = {}) {
  return api.get('/api/experience-chat/escalations', { params });
}

export function getEscalation(escalationId) {
  return api.get(`/api/experience-chat/escalations/${escalationId}`);
}

export function updateEscalation(escalationId, payload) {
  return api.patch(`/api/experience-chat/escalations/${escalationId}`, payload);
}

export function getExperienceAnalytics(days = 30) {
  return api.get('/api/experience-chat/analytics', { params: { days } });
}
