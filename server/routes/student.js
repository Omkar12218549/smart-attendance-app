const express = require('express');
const db = require('../config/db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireRole('student'));

// POST /api/student/scan  -> validate QR payload & mark attendance
router.post('/scan', (req, res) => {
  const { qrData, lat, lng } = req.body;
  if (!qrData) return res.status(400).json({ error: 'No QR data received' });

  let payload;
  try {
    payload = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
  } catch (err) {
    return res.status(400).json({ error: 'Invalid QR code format' });
  }

  if (payload.type !== 'attendance' || !payload.classId || !payload.token) {
    return res.status(400).json({ error: 'Not a valid attendance QR code' });
  }

  const cls = db.prepare(`
    SELECT c.*, s.name as subject_name FROM classes c JOIN subjects s ON s.id = c.subject_id WHERE c.id = ?
  `).get(payload.classId);

  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (cls.status !== 'active') return res.status(400).json({ error: 'This attendance session has been closed' });

  // Validate token match
  if (cls.qr_code !== payload.token) {
    return res.status(400).json({ error: 'QR code is no longer valid. Please ask the teacher to refresh it.' });
  }

  // Validate expiry
  const expiresAt = new Date(payload.exp || cls.qr_expires_at).getTime();
  if (Date.now() > expiresAt) {
    return res.status(400).json({ error: 'QR code has expired. Please scan a fresh one.' });
  }

  // One-scan-only enforcement
  const existing = db.prepare('SELECT * FROM attendance WHERE class_id = ? AND student_id = ?').get(cls.id, req.user.id);
  if (existing) {
    return res.status(400).json({ error: `You already marked attendance for ${cls.subject_name} (${existing.status})` });
  }

  db.prepare(`INSERT INTO attendance (class_id, student_id, status, method, lat, lng) VALUES (?,?,?,?,?,?)`)
    .run(cls.id, req.user.id, 'present', 'qr', lat || null, lng || null);

  res.json({
    message: '✅ Attendance marked successfully!',
    subject: cls.subject_name,
    className: cls.name,
    date: cls.date,
    time: `${cls.start_time} - ${cls.end_time}`,
    markedAt: new Date().toISOString(),
  });
});

// GET /api/student/attendance  -> per-subject attendance + percentage
router.get('/attendance', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id as subject_id, s.name as subject_name, s.code,
      COUNT(a.id) as total_classes,
      SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended
    FROM subjects s
    LEFT JOIN classes c ON c.subject_id = s.id
    LEFT JOIN attendance a ON a.class_id = c.id AND a.student_id = ?
    GROUP BY s.id
    ORDER BY s.name
  `).all(req.user.id);

  const result = rows.map(r => ({
    ...r,
    total_classes: Number(r.total_classes) || 0,
    attended: Number(r.attended) || 0,
    percentage: r.total_classes > 0 ? Math.round((r.attended / r.total_classes) * 100) : 0,
  }));

  // Aggregate
  const total = result.reduce((s, r) => s + r.total_classes, 0);
  const attended = result.reduce((s, r) => s + r.attended, 0);
  const overall = total > 0 ? Math.round((attended / total) * 100) : 0;

  // Recent records
  const recent = db.prepare(`
    SELECT a.*, c.date, c.start_time, c.end_time, s.name as subject_name, c.room
    FROM attendance a
    JOIN classes c ON c.id = a.class_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE a.student_id = ?
    ORDER BY a.marked_at DESC LIMIT 20
  `).all(req.user.id);

  res.json({ subjects: result, overall, total, attended, recent });
});

// GET /api/student/alerts  -> subjects below 75%
router.get('/alerts', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.name, s.code,
      COUNT(a.id) as total,
      SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as present
    FROM subjects s
    LEFT JOIN classes c ON c.subject_id = s.id
    LEFT JOIN attendance a ON a.class_id = c.id AND a.student_id = ?
    GROUP BY s.id
    HAVING total > 0
  `).all(req.user.id);

  const alerts = rows
    .map(r => ({ ...r, total: Number(r.total), present: Number(r.present), percentage: Math.round((r.present / r.total) * 100) }))
    .filter(r => r.percentage < 75);

  res.json({ alerts, threshold: 75 });
});

// GET /api/student/timetable
router.get('/timetable', (req, res) => {
  const subjects = db.prepare(`SELECT id, name, code FROM subjects`).all();
  const timetable = db.prepare(`
    SELECT t.*, s.name as subject_name, s.code, u.name as teacher_name
    FROM timetable t
    JOIN subjects s ON s.id = t.subject_id
    LEFT JOIN users u ON u.id = s.teacher_id
    ORDER BY CASE day
      WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 ELSE 6 END, t.start_time
  `).all();
  res.json({ timetable, subjects });
});

// GET /api/student/report  -> download CSV report
router.get('/report', (req, res) => {
  const rows = db.prepare(`
    SELECT c.date, s.name as subject, c.start_time, c.end_time, c.room, a.status, a.method
    FROM attendance a
    JOIN classes c ON c.id = a.class_id
    JOIN subjects s ON s.id = c.subject_id
    WHERE a.student_id = ?
    ORDER BY c.date DESC
  `).all(req.user.id);

  const csvHeader = 'Date,Subject,Start,End,Room,Status,Method\n';
  const csv = rows.map(r =>
    `${r.date},${r.subject},${r.start_time},${r.end_time},${r.room || ''},${r.status},${r.method}`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${req.user.name.replace(/\s+/g,'-')}.csv"`);
  res.send(csvHeader + csv);
});

module.exports = router;

