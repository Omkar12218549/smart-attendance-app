import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../services/api.js';

const QR_ROTATION_SECONDS = 30;

export default function TeacherQRCode() {
  const { id } = useParams();
  const [classInfo, setClassInfo] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [countdown, setCountdown] = useState(QR_ROTATION_SECONDS);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const loadQR = async () => {
    try {
      const res = await api.teacherRotateQR(id);
      setQrDataUrl(res.qrDataUrl);
      setCountdown(QR_ROTATION_SECONDS);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    api.teacherClassDetail(id).then(d => setClassInfo(d.class)).catch(e => setError(e.message));
    loadQR();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id]);

  // Countdown timer that auto-rotates QR
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          loadQR();
          return QR_ROTATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const closeClass = async () => {
    if (!window.confirm('Close this attendance session? Students will no longer be able to scan.')) return;
    try {
      await api.teacherCloseClass(id);
      window.location.href = `/teacher/class/${id}`;
    } catch (e) {
      setError(e.message);
    }
  };

  const copyPayload = () => {
    // Allow testing by copying raw payload
    navigator.clipboard.writeText(JSON.stringify({ type: 'attendance', classId: Number(id), token: classInfo?.qr_code || '', exp: new Date(Date.now() + QR_ROTATION_SECONDS * 1000).toISOString(), teacher: classInfo?.teacher_name, subject: classInfo?.subject_name }))
      .then(() => alert('QR payload copied! (For testing with simulated scanner)'))
      .catch(() => {});
  };

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}

      <div className="flex-between mb-4">
        <div>
          <Link to="/teacher" className="btn btn-sm btn-secondary">← Back</Link>
        </div>
        <button className="btn btn-sm btn-danger" onClick={closeClass}>Close Session</button>
      </div>

      {classInfo && (
        <div className="card text-center" style={{ maxWidth: 520, margin: '0 auto' }}>
          <div className="mb-2">
            <span className="badge badge-success">● LIVE — Students can scan</span>
          </div>
          <h3 style={{ fontSize: '1.3rem' }}>{classInfo.subject_name}</h3>
          <p className="text-sm text-muted mb-4">
            {classInfo.date} • {classInfo.start_time}-{classInfo.end_time} • {classInfo.room || 'No room'}
          </p>

          <div className="qr-display">
            {qrDataUrl ? <img src={qrDataUrl} alt="Attendance QR" /> : <div className="loader">Generating QR...</div>}
          </div>

          <div className="countdown">
            ⏱️ QR refreshes in <strong>{countdown}s</strong>
          </div>

          <div className="alert alert-warning mt-4" style={{ textAlign: 'left', fontSize: '0.85rem' }}>
            💡 <strong>How it works:</strong> This QR code auto-refreshes every {QR_ROTATION_SECONDS} seconds for security.
            Students scan it with their camera to mark attendance instantly. Each student can only scan once per class.
          </div>

          <div className="mt-4 flex-between" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={loadQR}>🔄 Refresh Now</button>
            <Link to={`/teacher/class/${id}`} className="btn btn-secondary">👥 View Attendance</Link>
          </div>

          <button className="btn btn-sm btn-outline mt-4" onClick={copyPayload} style={{ fontSize: '0.75rem' }}>
            Copy QR payload (testing)
          </button>
        </div>
      )}
    </div>
  );
}

