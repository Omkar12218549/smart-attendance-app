import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';

export default function TeacherClassDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);

  const load = () => {
    api.teacherClassDetail(id).then(setData).catch(e => setError(e.message));
  };

  useEffect(() => { load(); }, [id]);

  const mark = async (studentId, status) => {
    setSaving(studentId);
    try {
      await api.teacherMarkAttendance(id, { student_id: studentId, status });
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(null);
    }
  };

  const exportCSV = async () => {
    try {
      const res = await api.teacherClassAttendance(id);
      const { class: cls, rows } = res;
      const header = 'Student ID,Name,Email,Status,Method,Marked At\n';
      const csv = rows.map(r => `${r.student_id || ''},${r.name},${r.email},${r.status || 'unmarked'},${r.method || '-'},${r.marked_at || ''}`).join('\n');
      const blob = new Blob([header + csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${cls.subject_name}-${cls.date}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const print = () => window.print();

  const count = (status) => data?.students.filter(s => s.status === status).length || 0;

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="loader">Loading class...</div>;

  const { class: cls, students } = data;
  const total = students.length;
  const present = count('present');
  const late = count('late');
  const absent = count('absent');
  const unmarked = total - present - late - absent;

  return (
    <div>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap' }}>
        <div className="flex-center">
          <Link to="/teacher" className="btn btn-sm btn-secondary">← Back</Link>
          <div>
            <h3 style={{ fontSize: '1.15rem' }}>{cls.subject_name} <span className="text-sm text-muted">({cls.subject_code})</span></h3>
            <div className="text-sm text-muted">{cls.date} • {cls.start_time}-{cls.end_time} • {cls.room || 'No room'}</div>
          </div>
        </div>
        <div className="flex-center">
          {cls.status === 'active' && <Link to={`/teacher/qr/${cls.id}`} className="btn btn-sm btn-primary">📷 Show QR</Link>}
          <button className="btn btn-sm btn-secondary" onClick={exportCSV}>⬇️ Export CSV</button>
          <button className="btn btn-sm btn-secondary" onClick={print}>🖨️ Print</button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="label">Present</div><div className="value green">{present}</div></div>
        <div className="stat-card"><div className="label">Late</div><div className="value amber">{late}</div></div>
        <div className="stat-card"><div className="label">Absent</div><div className="value red">{absent}</div></div>
        <div className="stat-card"><div className="label">Not Marked</div><div className="value">{unmarked}</div></div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Student Attendance ({total})</h3></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Student ID</th><th>Name</th><th>Method</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.student_id || '—'}</td>
                  <td className="font-bold">{s.name}</td>
                  <td>
                    {s.method
                      ? <span className="badge badge-gray">{s.method === 'qr' ? '📷 QR' : '✍️ Manual'}</span>
                      : <span className="text-muted text-sm">Not scanned</span>}
                  </td>
                  <td>
                    {s.status
                      ? <span className={`badge ${s.status === 'present' ? 'badge-success' : s.status === 'late' ? 'badge-warning' : 'badge-danger'}`}>{s.status.toUpperCase()}</span>
                      : <span className="badge badge-gray">UNMARKED</span>}
                  </td>
                  <td>
                    <div className="flex-center" style={{ gap: 4, flexWrap: 'wrap' }}>
                      {[['present', 'success'], ['late', 'warning'], ['absent', 'danger']].map(([st, color]) => (
                        <button
                          key={st}
                          className={`btn btn-sm ${s.status === st ? `btn-${color === 'warning' ? 'secondary' : color}` : 'btn-outline'}`}
                          style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                          onClick={() => mark(s.id, st)}
                          disabled={saving === s.id}
                        >
                          {st.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

