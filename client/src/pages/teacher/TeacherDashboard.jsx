import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';

export default function TeacherDashboard() {
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject_id: '', date: '', start_time: '', end_time: '', room: '' });
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [subs, cls] = await Promise.all([api.teacherSubjects(), api.teacherClasses()]);
      setSubjects(subs.subjects);
      setClasses(cls.classes);
    } catch (e) {
      setError(e.message);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await api.teacherCreateClass(form);
      navigate(`/teacher/qr/${res.class.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const active = classes.filter(c => c.status === 'active');
  const past = classes.filter(c => c.status === 'closed');

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="flex-between mb-4" style={{ flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem' }}>My Classes</h3>
          <p className="text-sm text-muted">{active.length} active, {past.length} completed</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ New Class / QR Session'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ borderColor: 'var(--primary)' }}>
          <div className="card-header"><h3>Create Class & Generate QR</h3></div>
          <form onSubmit={handleCreate} className="grid-2">
            <div className="form-group">
              <label>Subject</label>
              <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} required>
                <option value="">Select subject...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Room</label>
              <input type="text" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Room 101" />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} min={today} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn-primary btn-block" disabled={creating}>
                {creating ? 'Creating...' : '⚡ Create Class + QR'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Active Sessions</h3>
          <span className="badge badge-success">{active.length} running</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Subject</th><th>Date</th><th>Time</th><th>Room</th><th>Students</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {active.map(c => (
                <tr key={c.id}>
                  <td className="font-bold">{c.subject_name} <span className="text-sm text-muted">({c.subject_code})</span></td>
                  <td>{c.date}</td>
                  <td>{c.start_time} - {c.end_time}</td>
                  <td>{c.room || '—'}</td>
                  <td>
                    <span className="badge badge-primary">{c.present_count || 0} present</span>
                    <span className="text-muted text-sm"> / {c.marked_count || 0} marked</span>
                  </td>
                  <td><span className="badge badge-success">● Active</span></td>
                  <td>
                    <div className="flex-center" style={{ gap: 6 }}>
                      <Link to={`/teacher/qr/${c.id}`} className="btn btn-sm btn-primary">📷 QR</Link>
                      <Link to={`/teacher/class/${c.id}`} className="btn btn-sm btn-secondary">Manage</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {active.length === 0 && (
                <tr><td colSpan={7} className="text-center text-muted">No active sessions. Create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Completed Classes</h3></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Subject</th><th>Date</th><th>Time</th><th>Room</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {past.map(c => (
                <tr key={c.id}>
                  <td className="font-bold">{c.subject_name}</td>
                  <td>{c.date}</td>
                  <td>{c.start_time} - {c.end_time}</td>
                  <td>{c.room || '—'}</td>
                  <td><span className="badge badge-gray">Closed</span></td>
                  <td><Link to={`/teacher/class/${c.id}`} className="btn btn-sm btn-outline">View / Edit</Link></td>
                </tr>
              ))}
              {past.length === 0 && <tr><td colSpan={6} className="text-center text-muted">No completed classes yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

