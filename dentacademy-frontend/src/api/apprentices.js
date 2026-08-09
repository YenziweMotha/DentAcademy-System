import api from './axios';

export const getApprentices = async () => {
  const response = await api.get('/apprentices');
  return response.data;
};

export const getApprentice = async (id) => {
  const response = await api.get(`api/apprentices/${id}`);
  return response.data;
};

export const createApprentice = async (data) => {
  const response = await api.post('api/apprentices', data);
  return response.data;
};

export const updateApprentice = async (id, data) => {
  const response = await api.put(`api/apprentices/${id}`, data);
  return response.data;
};

export const deactivateApprentice = async (id) => {
  const response = await api.delete(`api/apprentices/${id}`);
  return response.data;
};
