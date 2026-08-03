import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminStats().then(setStats).catch(e => setError(e.message));
  }, []);

  const backup = async () => {
    try {
      const data = await api.adminBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) return <div className="loader">Loading analytics...</div>;

  return (
    <div>
      <div className="flex-between mb-4">
        <div>
          <h3 style={{ fontSize: '1.1rem' }}>System Overview</h3>
          <p className="text-sm text-muted">Real-time attendance analytics</p>
        </div>
        <button className="btn btn-success" onClick={backup}>💾 Backup Database</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label">Students</div>
          <div className="value">{stats.totalStudents}</div>
          <Link to="/admin/users?role=student" className="text-sm text-muted">Manage →</Link>
        </div>
        <div className="stat-card">
          <div className="label">Teachers</div>
          <div className="value">{stats.totalTeachers}</div>
          <Link to="/admin/users?role=teacher" className="text-sm text-muted">Manage →</Link>
        </div>
        <div className="stat-card">
          <div className="label">Subjects</div>
          <div className="value">{stats.totalSubjects}</div>
          <Link to="/admin/subjects" className="text-sm text-muted">Manage →</Link>
        </div>
        <div className="stat-card">
          <div className="label">Overall Attendance</div>
          <div className={`value ${stats.overallPct >= 75 ? 'green' : 'amber'}`}>{stats.overallPct}%</div>
          <div className="text-sm text-muted">{stats.totalAttendance} records</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Trend */}
        <div className="card">
          <div className="card-header"><h3>📈 Attendance Trend (Last 7 Days)</h3></div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, padding: '8px 0' }}>
            {[...stats.trend].reverse().map((t, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-sm font-bold" style={{ color: t.percentage >= 75 ? 'var(--success)' : 'var(--warning)' }}>{t.percentage}%</div>
                <div style={{
                  height: `${Math.max(t.percentage, 4)}%`,
                  maxHeight: 110,
                  minHeight: 8,
                  background: t.percentage >= 75 ? 'var(--success)' : 'var(--warning)',
                  borderRadius: '6px 6px 0 0',
                  opacity: 0.85,
                }} />
                <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: 4 }}>{t.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Low attendance */}
        <div className="card" style={{ borderColor: stats.lowAttendance.length ? '#fecaca' : 'transparent' }}>
          <div className="card-header">
            <h3>⚠️ Students Below 75%</h3>
            <span className="badge badge-danger">{stats.lowAttendance.length}</span>
          </div>
          {stats.lowAttendance.length === 0 && <div className="text-muted text-sm">All students are above 75% attendance 🎉</div>}
          {stats.lowAttendance.map(s => (
            <div key={s.id} className="flex-between mb-2" style={{ padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 8 }}>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{s.name}</strong>
                <div className="text-sm text-muted">{s.student_id}</div>
              </div>
              <span className="badge badge-danger">{s.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Quick Actions</h3>
        </div>
        <div className="flex-center" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
          <Link to="/admin/users" className="btn btn-secondary">👥 Manage Users</Link>
          <Link to="/admin/subjects" className="btn btn-secondary">📚 Manage Subjects</Link>
        </div>
      </div>
    </div>
  );
}

