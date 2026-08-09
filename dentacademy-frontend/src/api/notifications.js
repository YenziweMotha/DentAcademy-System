import api from './axios';

// Safe wrapper: returns [] if endpoint fails/missing
export const fetchNotifications = async () => {
  try {
    const res = await api.get('/notifications/');
    return Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    // swallow errors so UI never crashes if backend not ready
    return [];
  }
};

export const markNotificationRead = async (id) => {
  try {
    await api.post(`/notifications/read/${id}`);
  } catch (e) {
    // no-op
  }
};
