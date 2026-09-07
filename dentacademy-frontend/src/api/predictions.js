import api from './axios';

export const generatePrediction = async (apprenticeId) => {
  const response = await api.post(`/api/predictions/${apprenticeId}/generate`);
  return response.data;
};

export const getPrediction = async (apprenticeId) => {
  const response = await api.get(`/api/predictions/${apprenticeId}`);
  return response.data;
};

export const getAtRiskApprentices = async () => {
  const response = await api.get('/api/predictions/at-risk');
  return response.data;
};
