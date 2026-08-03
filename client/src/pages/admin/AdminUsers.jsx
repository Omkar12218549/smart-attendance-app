import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';

export default function AdminUsers() {
  const [params, setParams] = useSearchParams();
  const roleFilter = params.get('role') || 'all';
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', student_id: '' });
  const [saving, setSaving] = useState(false);

  const load = (role) => {
    api.adminUsers(role === 'all' ? null : role).then(d => setUsers(d.users)).catch(e => setError(e.message));
  };

  useEffect(() => { load(roleFilter); }, [roleFilter]);

  const setRole = (r) => { setParams(r === 'all' ? {} : { role: r }); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.adminCreateUser(form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'student', student_id: '' });
      load(roleFilter);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await api.adminDeleteUser(id);
      load(roleFilter);
    } catch (e) {
      setError(e.message);
    }
  };

  const filtered = users;

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="flex-between mb-4" style={{ flexWrap: 'wrap' }}>
        <div className="flex-center" style={{ gap: 6 }}>
          {['all', 'student', 'teacher'].map(r => (
            <button
              key={r}
              className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setRole(r)}
            >
              {r === 'all' ? 'All' : r[0].toUpperCase() + r.slice(1)}s
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add User'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ borderColor: 'var(--primary)' }}>
          <div className="card-header"><h3>Add New User</h3></div>
          <form onSubmit={handleCreate} className="grid-2">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'student' && (
              <div className="form-group">
                <label>Student ID</label>
                <input type="text" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="STU2024001" />
              </div>
            )}
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>{roleFilter === 'all' ? 'All Users' : roleFilter[0].toUpperCase() + roleFilter.slice(1) + 's'}</h3>
          <span className="badge badge-primary">{filtered.length}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Student ID</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td className="font-bold">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-danger' : u.role === 'teacher' ? 'badge-warning' : 'badge-primary'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.student_id || '—'}</td>
                  <td className="text-sm text-muted">{u.created_at?.slice(0, 10)}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)} disabled={u.id === Number(localStorage.getItem('attendance_user') ? JSON.parse(localStorage.getItem('attendance_user')).id : -1)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-muted">No users found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

