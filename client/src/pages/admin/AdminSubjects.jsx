import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', teacher_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [s, t] = await Promise.all([api.adminSubjects(), api.adminUsers('teacher')]);
      setSubjects(s.subjects);
      setTeachers(t.users);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.adminCreateSubject(form);
      setShowForm(false);
      setForm({ name: '', code: '', teacher_id: '' });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this subject? All its classes and attendance will be removed.')) return;
    try {
      await api.adminDeleteSubject(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="flex-between mb-4">
        <p className="text-sm text-muted">{subjects.length} subjects offered</p>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Subject'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ borderColor: 'var(--primary)' }}>
          <div className="card-header"><h3>Add New Subject</h3></div>
          <form onSubmit={handleCreate} className="grid-2">
            <div className="form-group">
              <label>Subject Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Data Structures" required />
            </div>
            <div className="form-group">
              <label>Subject Code</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CS201" required />
            </div>
            <div className="form-group">
              <label>Assigned Teacher</label>
              <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}>
                <option value="">Unassigned</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                {saving ? 'Creating...' : 'Create Subject'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3>All Subjects</h3></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Code</th><th>Teacher</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.id}>
                  <td className="font-bold">{s.name}</td>
                  <td><span className="badge badge-primary">{s.code}</span></td>
                  <td>{s.teacher_name || <span className="text-muted text-sm">Unassigned</span>}</td>
                  <td className="text-sm text-muted">{s.created_at?.slice(0, 10)}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id)}>Delete</button>
                  </td>
                </tr>
              ))}
              {subjects.length === 0 && <tr><td colSpan={5} className="text-center text-muted">No subjects yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

