import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL });

function getTokens() {
  return {
    accessToken: localStorage.getItem('crm_access_token'),
    refreshToken: localStorage.getItem('crm_refresh_token'),
  };
}

function setAccessToken(token) {
  localStorage.setItem('crm_access_token', token);
}

export function setTokens({ accessToken, refreshToken }) {
  localStorage.setItem('crm_access_token', accessToken);
  if (refreshToken) localStorage.setItem('crm_refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('crm_access_token');
  localStorage.removeItem('crm_refresh_token');
}

api.interceptors.request.use((config) => {
  const { accessToken } = getTokens();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    if (response?.status === 401 && !config._retry) {
      config._retry = true;
      const { refreshToken } = getTokens();
      if (!refreshToken) {
        clearTokens();
        return Promise.reject(error);
      }
      try {
        refreshPromise =
          refreshPromise ||
          axios.post(`${baseURL}/auth/refresh`, { refreshToken }).finally(() => {
            refreshPromise = null;
          });
        const { data } = await refreshPromise;
        setAccessToken(data.accessToken);
        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(config);
      } catch (refreshError) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
