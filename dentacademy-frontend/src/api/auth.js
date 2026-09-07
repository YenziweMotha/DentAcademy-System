import api from './axios';

export const login = async (username, password) => {
    const response = await api.post("/api/auth/login", {
        username,
        password
    });

    localStorage.setItem("access_token", response.data.access_token);

    return response.data;
};
export const logout = async () => {
    localStorage.removeItem("access_token");

    const response = await api.post("/api/auth/logout");

    return response.data;
};
export const getMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};
