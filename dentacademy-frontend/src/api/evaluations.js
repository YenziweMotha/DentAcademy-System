import api from './axios';

export const submitEvaluation = async (data) => {
  const response = await api.post('/api/evaluations', data);
  return response.data;
};

export const getEvaluations = async (apprenticeId) => {
  const response = await api.get(`/api/evaluations/${apprenticeId}`);
  return response.data;
};

export const getPendingEvaluations = async () => {
  const response = await api.get('/api/evaluations/pending');
  return response.data;
};

export const approveEvaluation = async (id) => {
  const response = await api.put(`/api/evaluations/${id}/approve`);
  return response.data;
};
