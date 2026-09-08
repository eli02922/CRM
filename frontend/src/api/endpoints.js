import api from './client';

export const authApi = {
  login: (payload) => api.post('/auth/login', payload).then((r) => r.data),
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
};

export const leadsApi = {
  list: (params) => api.get('/leads', { params }).then((r) => r.data),
  get: (id) => api.get(`/leads/${id}`).then((r) => r.data),
  create: (payload) => api.post('/leads', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/leads/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/leads/${id}`),
  convert: (id, payload) => api.post(`/leads/${id}/convert`, payload).then((r) => r.data),
};

export const customersApi = {
  list: (params) => api.get('/customers', { params }).then((r) => r.data),
  get: (id) => api.get(`/customers/${id}`).then((r) => r.data),
  timeline: (id) => api.get(`/customers/${id}/timeline`).then((r) => r.data),
  create: (payload) => api.post('/customers', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/customers/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/customers/${id}`),
  uploadCv: (id, file) => {
    const formData = new FormData();
    formData.append('cv', file);
    return api.post(`/customers/${id}/cv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  cvUrl: (id) => `${api.defaults.baseURL}/customers/${id}/cv`,
  removeCv: (id) => api.delete(`/customers/${id}/cv`),
};

export const opportunitiesApi = {
  list: (params) => api.get('/opportunities', { params }).then((r) => r.data),
  pipeline: (params) => api.get('/opportunities/pipeline', { params }).then((r) => r.data),
  get: (id) => api.get(`/opportunities/${id}`).then((r) => r.data),
  create: (payload) => api.post('/opportunities', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/opportunities/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/opportunities/${id}`),
};

export const activitiesApi = {
  list: (params) => api.get('/activities', { params }).then((r) => r.data),
  reminders: (params) => api.get('/activities/reminders', { params }).then((r) => r.data),
  create: (payload) => api.post('/activities', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/activities/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/activities/${id}`),
};

export const hubspotApi = {
  syncContacts: () => api.post('/hubspot/contacts/sync').then((r) => r.data),
  syncDeals: () => api.post('/hubspot/deals/sync').then((r) => r.data),
  logs: (params) => api.get('/hubspot/logs', { params }).then((r) => r.data),
};

export const reportsApi = {
  summary: () => api.get('/reports/summary').then((r) => r.data),
  leadConversion: (params) => api.get('/reports/lead-conversion', { params }).then((r) => r.data),
  salesPerformance: () => api.get('/reports/sales-performance').then((r) => r.data),
  customerEngagement: (params) => api.get('/reports/customer-engagement', { params }).then((r) => r.data),
  revenueTrend: (params) => api.get('/reports/revenue-trend', { params }).then((r) => r.data),
};
