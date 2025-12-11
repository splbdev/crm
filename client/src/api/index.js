import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const auth = {
    login: (email, password) => api.post('/auth/login', { email, password }),
    register: (data) => api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
    updateProfile: (data) => api.put('/auth/profile', data)
};

// Dashboard
export const dashboard = {
    getStats: () => api.get('/dashboard')
};

// Clients
export const clients = {
    getAll: (params) => api.get('/clients', { params }),
    get: (id) => api.get(`/clients/${id}`),
    create: (data) => api.post('/clients', data),
    update: (id, data) => api.put(`/clients/${id}`, data),
    delete: (id) => api.delete(`/clients/${id}`)
};

// Invoices
export const invoices = {
    getAll: (params) => api.get('/invoices', { params }),
    get: (id) => api.get(`/invoices/${id}`),
    create: (data) => api.post('/invoices', data),
    update: (id, data) => api.put(`/invoices/${id}`, data),
    delete: (id) => api.delete(`/invoices/${id}`),
    markPaid: (id) => api.post(`/invoices/${id}/paid`)
};

// Estimates
export const estimates = {
    getAll: (params) => api.get('/estimates', { params }),
    get: (id) => api.get(`/estimates/${id}`),
    create: (data) => api.post('/estimates', data),
    update: (id, data) => api.put(`/estimates/${id}`, data),
    delete: (id) => api.delete(`/estimates/${id}`),
    convert: (id) => api.post(`/estimates/${id}/convert`)
};

// Proposals
export const proposals = {
    getAll: (params) => api.get('/proposals', { params }),
    get: (id) => api.get(`/proposals/${id}`),
    create: (data) => api.post('/proposals', data),
    update: (id, data) => api.put(`/proposals/${id}`, data),
    delete: (id) => api.delete(`/proposals/${id}`)
};

// Templates
export const templates = {
    getAll: (type) => api.get('/templates', { params: { type } }),
    get: (id) => api.get(`/templates/${id}`),
    create: (data) => api.post('/templates', data),
    update: (id, data) => api.put(`/templates/${id}`, data),
    delete: (id) => api.delete(`/templates/${id}`),
    getDefault: (type) => api.get(`/templates/default/${type}`)
};

// Providers
export const providers = {
    getAll: (type) => api.get('/providers', { params: { type } }),
    get: (id) => api.get(`/providers/${id}`),
    create: (data) => api.post('/providers', data),
    update: (id, data) => api.put(`/providers/${id}`, data),
    delete: (id) => api.delete(`/providers/${id}`),
    activate: (id) => api.post(`/providers/${id}/activate`)
};

// Messages
export const messages = {
    getAll: (params) => api.get('/messages', { params }),
    sendSMS: (data) => api.post('/messages/sms', data),
    sendEmail: (data) => api.post('/messages/email', data),
    sendWhatsApp: (data) => api.post('/messages/whatsapp', data),
    sendBulk: (data) => api.post('/messages/bulk', data)
};

export default api;
