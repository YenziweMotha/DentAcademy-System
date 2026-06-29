import api from './axios';

export const getModules = async () => {
  const response = await api.get('/modules');
  return response.data;
};

export const getModuleProgress = async (apprenticeId) => {
  const response = await api.get(`/modules/progress/${apprenticeId}`);
  return response.data;
};

export const updateModuleProgress = async (apprenticeId, moduleId, data) => {
  const response = await api.put(`/modules/progress/${apprenticeId}/${moduleId}`, data);
  return response.data;
};
