import api from './axios';

export const getModules = async () => {
  const response = await api.get('/api/modules');
  return response.data;
};

export const getModuleProgress = async (apprenticeId) => {
  const response = await api.get(`/api/modules/progress/${apprenticeId}`);
  return response.data;
};

export const updateModuleProgress = async (apprenticeId, moduleId, data) => {
  const response = await api.put(`/api/modules/progress/${apprenticeId}/${moduleId}`, data);
  return response.data;
};
