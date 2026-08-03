import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

export default function StudentAttendance() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reportUrl, setReportUrl] = useState('');

  useEffect(() => {
    api.studentAttendance().then(setData).catch(e => setError(e.message));
  }, []);

  const downloadReport = async () => {
    try {
      const csv = await api.studentReport();
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'attendance-report.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };

  const pctColor = p => p >= 75 ? 'green' : p >= 50 ? 'amber' : 'danger';
  const lastStatus = (status) => status[0];

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <div className="loader">Loading attendance...</div>;

  return (
    <div>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem' }}>Attendance Summary</h3>
          <p className="text-sm text-muted">Overall: <strong style={{ color: data.overall >= 75 ? 'var(--success)' : 'var(--danger)' }}>{data.overall}%</strong> ({data.attended}/{data.total} classes)</p>
        </div>
        <button className="btn btn-success" onClick={downloadReport}>⬇️ Download Report</button>
      </div>

      <div className="card">
        {data.subjects.map(s => (
          <div key={s.subject_id} className="mb-4" style={{ paddingBottom: 16, borderBottom: '1px solid var(--gray-100)' }}>
            <div className="flex-between" style={{ marginBottom: 8 }}>
              <div>
                <strong>{s.subject_name}</strong> <span className="text-sm text-muted">({s.code})</span>
              </div>
              <div className={`font-bold ${pctColor(s.percentage) === 'green' ? 'text-success' : pctColor(s.percentage) === 'amber' ? 'text-warning' : 'text-danger'}`}>
                {s.percentage}%
              </div>
            </div>
            <div className="flex-between" style={{ gap: 12 }}>
              <div className="progress-bar" style={{ flex: 1 }}>
                <div className={`progress-fill ${pctColor(s.percentage) === 'green' ? 'green' : pctColor(s.percentage) === 'amber' ? 'amber' : 'red'}`} style={{ width: `${Math.min(s.percentage, 100)}%` }} />
              </div>
              <span className="text-sm text-muted">{s.attended}/{s.total_classes}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><h3>Recent Records</h3></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Date</th><th>Subject</th><th>Time</th><th>Room</th><th>Status</th><th>Method</th></tr>
            </thead>
            <tbody>
              {data.recent.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td>
                  <td>{r.date}</td>
                  <td className="font-bold">{r.subject_name}</td>
                  <td>{r.start_time} - {r.end_time}</td>
                  <td>{r.room || '—'}</td>
                  <td>
                    <span className={`badge ${r.status === 'present' ? 'badge-success' : r.status === 'late' ? 'badge-warning' : 'badge-danger'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td><span className="badge badge-gray">{r.method === 'qr' ? 'QR' : 'Manual'}</span></td>
                </tr>
              ))}
              {data.recent.length === 0 && <tr><td colSpan={7} className="text-center text-muted">No records yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {reportUrl && <div className="text-sm text-muted">{reportUrl}</div>}
    </div>
  );
}

