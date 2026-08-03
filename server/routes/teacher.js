const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');
const db = require('../config/db');
const { authRequired, requireRole, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireRole('teacher', 'admin'));

// GET /api/teacher/subjects  -> subjects assigned to this teacher
router.get('/subjects', (req, res) => {
  const subjects = req.userRole === 'admin'
    ? db.prepare(`SELECT * FROM subjects ORDER BY name`).all()
    : db.prepare(`SELECT * FROM subjects WHERE teacher_id = ? ORDER BY name`).all(req.user.id);
  res.json({ subjects });
});

// POST /api/teacher/classes  -> create a class + generate QR
router.post('/classes', async (req, res) => {
  const { subject_id, date, start_time, end_time, room } = req.body;
  if (!subject_id || !date || !start_time || !end_time) {
    return res.status(400).json({ error: 'subject_id, date, start_time, end_time are required' });
  }
  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subject_id);
  if (!subject) return res.status(404).json({ error: 'Subject not found' });
  if (req.userRole !== 'admin' && subject.teacher_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your subject' });
  }

  // Generate rotating QR payload
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 1000).toISOString(); // 30s expiry
  const payload = JSON.stringify({
    type: 'attendance',
    classId: null, // assigned below
    token,
    exp: expiresAt,
    teacher: req.user.name,
    subject: subject.name,
  });

  const info = db.prepare(`
    INSERT INTO classes (name, subject_id, teacher_id, date, start_time, end_time, room, qr_code, qr_expires_at, status)
    VALUES (?,?,?,?,?,?,?,?,?,'active')
  `).run(
    `Lecture: ${start_time}-${end_time}`,
    subject_id,
    subject.teacher_id,
    date,
    start_time,
    end_time,
    room || '',
    token,
    expiresAt
  );

  const classId = info.lastInsertRowid;
  const classRow = db.prepare('SELECT * FROM classes WHERE id = ?').get(classId);

  try {
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ ...JSON.parse(payload), classId }), {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    res.status(201).json({ class: classRow, qrDataUrl, expiresAt });
  } catch (err) {
    res.status(201).json({ class: classRow, qrDataUrl: null, error: 'QR generation failed' });
  }
});

// GET /api/teacher/classes?status=active
router.get('/classes', (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT c.*, s.name as subject_name, s.code as subject_code,
      (SELECT COUNT(*) FROM attendance a WHERE a.class_id = c.id) as marked_count,
      (SELECT COUNT(*) FROM attendance a WHERE a.class_id = c.id AND a.status IN ('present','late')) as present_count
    FROM classes c JOIN subjects s ON s.id = c.subject_id
    WHERE c.teacher_id = ?
  `;
  const params = [req.user.id];
  if (status) {
    query += ` AND c.status = ?`;
    params.push(status);
  }
  query += ` ORDER BY c.date DESC, c.start_time DESC`;
  const classes = db.prepare(query).all(...params);
  res.json({ classes });
});

// GET /api/teacher/classes/:id  -> class detail + attendance list
router.get('/classes/:id', (req, res) => {
  const cls = db.prepare(`
    SELECT c.*, s.name as subject_name, s.code as subject_code, u.name as teacher_name
    FROM classes c JOIN subjects s ON s.id = c.subject_id
    JOIN users u ON u.id = c.teacher_id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });

  const students = db.prepare(`
    SELECT u.id, u.name, u.email, u.student_id,
      a.status, a.method, a.marked_at, a.lat, a.lng
    FROM users u
    LEFT JOIN attendance a ON a.class_id = ? AND a.student_id = u.id
    WHERE u.role = 'student'
    ORDER BY u.name
  `).all(cls.id);

  res.json({ class: cls, students });
});

// PUT /api/teacher/classes/:id/qr  -> rotate QR token (new 30s expiry)
router.put('/classes/:id/qr', async (req, res) => {
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 1000).toISOString();
  db.prepare(`UPDATE classes SET qr_code = ?, qr_expires_at = ? WHERE id = ?`).run(token, expiresAt, cls.id);

  const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(cls.subject_id);
  const payload = { type: 'attendance', classId: cls.id, token, exp: expiresAt, teacher: req.user.name, subject: subject.name };
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload), { width: 300, margin: 2 });
  res.json({ qrDataUrl, expiresAt, classId: cls.id });
});

// GET /api/teacher/classes/:id/attendance  -> export report
router.get('/classes/:id/attendance', (req, res) => {
  const cls = db.prepare(`
    SELECT c.*, s.name as subject_name FROM classes c JOIN subjects s ON s.id = c.subject_id WHERE c.id = ?
  `).get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  const rows = db.prepare(`
    SELECT u.student_id, u.name, u.email, a.status, a.method, a.marked_at
    FROM users u LEFT JOIN attendance a ON a.class_id = ? AND a.student_id = u.id
    WHERE u.role = 'student' ORDER BY u.name
  `).all(cls.id);
  res.json({ class: cls, rows });
});

// POST /api/teacher/classes/:id/attendance  -> mark/edit single student attendance
router.post('/classes/:id/attendance', (req, res) => {
  const { student_id, status, lat, lng } = req.body;
  if (!student_id || !status) {
    return res.status(400).json({ error: 'student_id and status are required' });
  }
  if (!['present', 'absent', 'late'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Class not found' });
  if (cls.status === 'closed' && req.userRole !== 'admin') {
    return res.status(400).json({ error: 'Class is closed' });
  }
  const student = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(student_id, 'student');
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const existing = db.prepare('SELECT * FROM attendance WHERE class_id = ? AND student_id = ?').get(cls.id, student_id);
  if (existing) {
    db.prepare(`UPDATE attendance SET status = ?, marked_at = datetime('now') WHERE id = ?`).run(status, existing.id);
  } else {
    db.prepare(`INSERT INTO attendance (class_id, student_id, status, method, lat, lng) VALUES (?,?,?,?,?,?)`)
      .run(cls.id, student_id, status, 'manual', lat || null, lng || null);
  }
  res.json({ message: 'Attendance updated' });
});

// POST /api/teacher/classes/:id/close
router.post('/classes/:id/close', (req, res) => {
  db.prepare(`UPDATE classes SET status = 'closed', qr_expires_at = ? WHERE id = ?`).run(
    new Date(Date.now() - 1000).toISOString(),
    req.params.id
  );
  res.json({ message: 'Class closed' });
});

module.exports = router;

