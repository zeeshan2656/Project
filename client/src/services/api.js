const API_BASE = '/api';

/**
 * Fetch wrapper that automatically adds Authorization header if token exists
 */
export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('apex_token');
  const headers = options.headers ? { ...options.headers } : {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set JSON Content-Type
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  if (response.status === 401) {
    localStorage.removeItem('apex_token');
    localStorage.removeItem('apex_user');
    sessionStorage.clear();
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
  }

  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response;
}

// 1. Auth API
export const authApi = {
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiRequest('/auth/me'),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }).catch(() => ({}))
};

// 2. Site Settings & Slider CMS API
export const siteApi = {
  getSettings: () => apiRequest('/site-settings'),
  updateSettings: (formData) => apiRequest('/site-settings', { method: 'PUT', body: formData }),
  getAdminSlides: () => apiRequest('/site-settings/slides/admin'),
  createSlide: (formData) => apiRequest('/site-settings/slides', { method: 'POST', body: formData }),
  updateSlide: (id, formData) => apiRequest(`/site-settings/slides/${id}`, { method: 'PUT', body: formData }),
  deleteSlide: (id) => apiRequest(`/site-settings/slides/${id}`, { method: 'DELETE' })
};

// 3. Orders API
export const ordersApi = {
  getOrders: (params = '') => apiRequest(`/orders${params ? '?' + params : ''}`),
  getOrderById: (id) => apiRequest(`/orders/${id}`),
  getOrderInspections: (id) => apiRequest(`/orders/${id}/inspections`),
  createOrder: (orderData) => apiRequest('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  updateOrder: (id, orderData) => apiRequest(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(orderData) }),
  deleteOrder: (id) => apiRequest(`/orders/${id}`, { method: 'DELETE' })
};

// 4. Inspection Templates API
export const templatesApi = {
  getTemplates: () => apiRequest('/templates'),
  getTemplateById: (id) => apiRequest(`/templates/${id}`),
  createTemplate: (data) => apiRequest('/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id, data) => apiRequest(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id) => apiRequest(`/templates/${id}`, { method: 'DELETE' })
};

// 5. Inspections API
export const inspectionsApi = {
  getInspections: (params = '') => apiRequest(`/inspections${params ? '?' + params : ''}`),
  getInspectionById: (id) => apiRequest(`/inspections/${id}`),
  createInspection: (data) => apiRequest('/inspections', { method: 'POST', body: JSON.stringify(data) }),
  startInspection: (id) => apiRequest(`/inspections/${id}/start`, { method: 'PUT' }),
  saveDraft: (id, draftData) => apiRequest(`/inspections/${id}/draft`, { method: 'PUT', body: JSON.stringify(draftData) }),
  submitInspection: (id, submitData) => apiRequest(`/inspections/${id}/submit`, { method: 'POST', body: JSON.stringify(submitData) }),
  reviewInspection: (id, reviewData) => apiRequest(`/inspections/${id}/review`, { method: 'POST', body: JSON.stringify(reviewData) }),
  uploadPhoto: (id, formData) => apiRequest(`/inspections/${id}/photos`, { method: 'POST', body: formData })
};

// 6. User Management API
export const usersApi = {
  getCustomers: () => apiRequest('/users/customers'),
  createCustomer: (data) => apiRequest('/users/customers', { method: 'POST', body: JSON.stringify(data) }),
  getCustomerOrders: (id) => apiRequest(`/users/customers/${id}/orders`),
  getEmployees: () => apiRequest('/users/employees'),
  createEmployee: (data) => apiRequest('/users/employees', { method: 'POST', body: JSON.stringify(data) }),
  getEmployeeInspections: (id) => apiRequest(`/users/employees/${id}/inspections`),
  updateUser: (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updatePassword: (id, password) => apiRequest(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  toggleStatus: (id, status) => apiRequest(`/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) })
};

// 7. Defect Master API
export const defectsApi = {
  getDefects: (params = '') => apiRequest(`/defects${params ? '?' + params : ''}`),
  getCategories: () => apiRequest('/defects/categories'),
  createDefect: (data) => apiRequest('/defects', { method: 'POST', body: JSON.stringify(data) }),
  updateDefect: (id, data) => apiRequest(`/defects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDefect: (id) => apiRequest(`/defects/${id}`, { method: 'DELETE' }),
  uploadReferenceImage: (formData) => apiRequest('/defects/upload-reference-image', { method: 'POST', body: formData })
};

// 8. Report Download Helpers & Fast Dashboard Metrics
export const reportApi = {
  getDashboardMetrics: () => apiRequest('/reports/metrics'),
  getPdfUrl: (id, forceDownload = false) => {
    if (!id) return '#';
    const token = localStorage.getItem('apex_token');
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (forceDownload) params.set('download', 'true');
    const queryString = params.toString();
    return `/api/reports/inspection/${id}/pdf${queryString ? `?${queryString}` : ''}`;
  },
  getExcelUrl: (id) => {
    if (!id) return '#';
    const token = localStorage.getItem('apex_token');
    return `/api/reports/inspection/${id}/excel${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  getOrdersExcelUrl: () => {
    const token = localStorage.getItem('apex_token');
    return `/api/reports/orders/excel${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },
  downloadPdf: async (id, filename) => {
    const token = localStorage.getItem('apex_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/reports/inspection/${id}/pdf`, { headers });
    if (!res.ok) throw new Error('Failed to download PDF report');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Inspection_${id}_Report.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  downloadExcel: async (id, filename) => {
    const token = localStorage.getItem('apex_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/reports/inspection/${id}/excel`, { headers });
    if (!res.ok) throw new Error('Failed to download Excel report');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Inspection_${id}_Report.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
};

