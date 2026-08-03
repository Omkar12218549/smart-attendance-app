const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('attendance_token');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('attendance_token');
    localStorage.removeItem('attendance_user');
    window.dispatchEvent(new CustomEvent('auth-logout'));
  }

  if (!res.ok) {
    let msg = 'Request failed';
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch (e) { /* ignore */ }
    throw new Error(msg);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('text/csv') || ct.includes('json')) {
    const text = await res.text();
    if (ct.includes('text/csv')) return text;
    try { return JSON.parse(text); } catch (e) { return text; }
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),

  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  // Student
  scanQR: (qrData, lat, lng) => request('/student/scan', { method: 'POST', body: JSON.stringify({ qrData, lat, lng }) }),
  studentAttendance: () => request('/student/attendance'),
  studentAlerts: () => request('/student/alerts'),
  studentTimetable: () => request('/student/timetable'),
  studentReport: () => request('/student/report'),

  // Teacher
  teacherSubjects: () => request('/teacher/subjects'),
  teacherCreateClass: (data) => request('/teacher/classes', { method: 'POST', body: JSON.stringify(data) }),
  teacherClasses: (status) => request(`/teacher/classes${status ? `?status=${status}` : ''}`),
  teacherClassDetail: (id) => request(`/teacher/classes/${id}`),
  teacherRotateQR: (id) => request(`/teacher/classes/${id}/qr`, { method: 'PUT' }),
  teacherMarkAttendance: (id, body) => request(`/teacher/classes/${id}/attendance`, { method: 'POST', body: JSON.stringify(body) }),
  teacherCloseClass: (id) => request(`/teacher/classes/${id}/close`, { method: 'POST' }),
  teacherClassAttendance: (id) => request(`/teacher/classes/${id}/attendance`),

  // Admin
  adminStats: () => request('/admin/stats'),
  adminUsers: (role) => request(`/admin/users${role ? `?role=${role}` : ''}`),
  adminCreateUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminSubjects: () => request('/admin/subjects'),
  adminCreateSubject: (data) => request('/admin/subjects', { method: 'POST', body: JSON.stringify(data) }),
  adminDeleteSubject: (id) => request(`/admin/subjects/${id}`, { method: 'DELETE' }),
  adminBackup: () => request('/admin/backup'),
};

