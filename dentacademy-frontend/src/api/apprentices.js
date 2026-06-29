import api from './axios';

export const getApprentices = async () => {
  const response = await api.get('/apprentices');
  return response.data;
};

export const getApprentice = async (id) => {
  const response = await api.get(`/apprentices/${id}`);
  return response.data;
};

export const createApprentice = async (data) => {
  const response = await api.post('/apprentices', data);
  return response.data;
};

export const updateApprentice = async (id, data) => {
  const response = await api.put(`/apprentices/${id}`, data);
  return response.data;
};

export const deactivateApprentice = async (id) => {
  const response = await api.delete(`/apprentices/${id}`);
  return response.data;
};
