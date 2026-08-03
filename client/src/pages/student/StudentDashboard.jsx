import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import QRScanner from '../../components/QRScanner.jsx';

export default function StudentDashboard() {
  const [attendance, setAttendance] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [paused, setPaused] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    api.studentAttendance().then(d => setAttendance(d)).catch(e => setScanError(e.message));
    api.studentAlerts().then(d => setAlerts(d.alerts)).catch(() => {});
  }, []);

  const startScan = () => {
    setScanResult(null);
    setScanError('');
    setScanning(true);
    setPaused(false);
  };

  const handleQRResult = async (decodedText) => {
    if (processingRef.current) return;
    processingRef.current = true;
    setPaused(true);

    let lat = null, lng = null;
    try {
      const pos = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => resolve(null), { timeout: 3000 });
      });
      if (pos) { lat = pos.lat; lng = pos.lng; }
    } catch { /* GPS optional */ }

    try {
      const result = await api.scanQR(decodedText, lat, lng);
      setScanResult({ ok: true, message: result.message, subject: result.subject, time: result.time });
      setTimeout(() => { setScanning(false); }, 3000);
    } catch (err) {
      setScanResult({ ok: false, message: err.message });
      setTimeout(() => setScanning(false), 3500);
    } finally {
      processingRef.current = false;
      setPaused(false);
    }
  };

  const pctColor = (p) => p >= 75 ? 'green' : p >= 50 ? 'amber' : 'red';

  return (
    <div>
      {/* Scan banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary), #7c3aed)', color: 'white', border: 'none' }}>
        <div className="flex-between" style={{ flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ color: 'white', fontSize: '1.2rem' }}>📷 Mark Today's Attendance</h3>
            <p style={{ opacity: 0.85, fontSize: '0.9rem', marginTop: 4 }}>
              Scan the QR code displayed by your teacher to automatically mark yourself present.
            </p>
          </div>
          <button className="btn" style={{ background: 'white', color: 'var(--primary)' }} onClick={startScan} disabled={scanning}>
            {scanning ? 'Scanning...' : '📷 Open Scanner'}
          </button>
        </div>
      </div>

      {scanning && (
        <div className="card">
          <div className="flex-between mb-4">
            <h3>Scan Attendance QR</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => { setScanning(false); setScanResult(null); }}>✕ Close</button>
          </div>
          <QRScanner onResult={handleQRResult} paused={paused} />
          {scanResult && (
            <div className={`alert ${scanResult.ok ? 'alert-success' : 'alert-error'} mt-4`}>
              <strong>{scanResult.ok ? '✅ ' : '⚠️ '}{scanResult.message}</strong>
              {scanResult.subject && <div className="text-sm mt-2">{scanResult.subject} • {scanResult.time}</div>}
            </div>
          )}
        </div>
      )}

      {scanError && scanning && <div className="alert alert-error">{scanError}</div>}

      {/* Stats */}
      {attendance && (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="label">Overall Attendance</div>
              <div className={`value ${pctColor(attendance.overall)}`}>{attendance.overall}%</div>
              <div className="text-sm text-muted">{attendance.attended} of {attendance.total} classes attended</div>
            </div>
            {attendance.subjects.map(s => (
              <div className="stat-card" key={s.subject_id}>
                <div className="label">{s.subject_name} <span className="text-muted">({s.code})</span></div>
                <div className={`value ${pctColor(s.percentage)}`}>{s.percentage}%</div>
                <div className="text-sm text-muted">{s.attended}/{s.total_classes} classes</div>
                <div className="progress-bar mt-4">
                  <div className={`progress-fill ${pctColor(s.percentage)}`} style={{ width: `${Math.min(s.percentage, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="card" style={{ borderColor: '#fecaca' }}>
              <div className="card-header">
                <h3>⚠️ Low Attendance Alerts</h3>
              </div>
              {alerts.map(a => (
                <div key={a.id} className="alert alert-warning">
                  You are below 75% in <strong>{a.name}</strong> ({a.code}) — currently at <strong>{a.percentage}%</strong>. Please attend upcoming classes!
                </div>
              ))}
            </div>
          )}

          {/* Recent */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Attendance</h3>
              <Link to="/student/attendance" className="btn btn-sm btn-outline">View All →</Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Date</th><th>Subject</th><th>Time</th><th>Room</th><th>Status</th><th>Method</th></tr>
                </thead>
                <tbody>
                  {attendance.recent.map(r => (
                    <tr key={r.id}>
                      <td>{r.date}</td>
                      <td className="font-bold">{r.subject_name}</td>
                      <td>{r.start_time} - {r.end_time}</td>
                      <td>{r.room || '—'}</td>
                      <td>
                        <span className={`badge ${r.status === 'present' ? 'badge-success' : r.status === 'late' ? 'badge-warning' : 'badge-danger'}`}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td><span className="badge badge-gray">{r.method === 'qr' ? '📷 QR' : '✍️ Manual'}</span></td>
                    </tr>
                  ))}
                  {attendance.recent.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-muted">No attendance records yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

