const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const totalStudents = db.prepare(`SELECT COUNT(*) c FROM users WHERE role='student'`).get().c;
  const totalTeachers = db.prepare(`SELECT COUNT(*) c FROM users WHERE role='teacher'`).get().c;
  const totalSubjects = db.prepare(`SELECT COUNT(*) c FROM subjects`).get().c;
  const totalClasses = db.prepare(`SELECT COUNT(*) c FROM classes`).get().c;
  const totalAttendance = db.prepare(`SELECT COUNT(*) c FROM attendance`).get().c;
  const presentCount = db.prepare(`SELECT COUNT(*) c FROM attendance WHERE status IN ('present','late')`).get().c;
  const overallPct = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

  // Attendance trend (last 7 days)
  const trend = db.prepare(`
    SELECT c.date,
      COUNT(*) as total,
      SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as present
    FROM classes c JOIN attendance a ON a.class_id = c.id
    GROUP BY c.date ORDER BY c.date DESC LIMIT 7
  `).all().map(r => ({ date: r.date, percentage: r.total ? Math.round((r.present / r.total) * 100) : 0 }));

  // Students with low attendance (< 75%)
  const lowAttendance = db.prepare(`
    SELECT u.id, u.name, u.student_id,
      COUNT(a.id) as total,
      SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as present
    FROM users u
    LEFT JOIN attendance a ON a.student_id = u.id
    WHERE u.role = 'student'
    GROUP BY u.id
    HAVING total > 0 AND (present * 100.0 / total) < 75
  `).all().map(r => ({ ...r, percentage: Math.round((r.present / r.total) * 100) }));

  res.json({
    totalStudents,
    totalTeachers,
    totalSubjects,
    totalClasses,
    totalAttendance,
    overallPct,
    trend,
    lowAttendance,
  });
});

// GET /api/admin/users?role=student|teacher
router.get('/users', (req, res) => {
  const { role } = req.query;
  const allowed = ['student', 'teacher', 'admin'];
  if (role && !allowed.includes(role)) {
    return res.status(400).json({ error: 'Invalid role filter' });
  }
  const users = role
    ? db.prepare(`SELECT id, name, email, role, student_id, created_at FROM users WHERE role = ? ORDER BY name`).all(role)
    : db.prepare(`SELECT id, name, email, role, student_id, created_at FROM users ORDER BY role, name`).all();
  res.json({ users });
});

// POST /api/admin/users  (create teacher/student/admin)
router.post('/users', (req, res) => {
  const { name, email, password, role, student_id } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password, role are required' });
  }
  if (!['teacher', 'student', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Email already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    `INSERT INTO users (name, email, password, role, student_id) VALUES (?,?,?,?,?)`
  ).run(name, email.toLowerCase().trim(), hash, role, role === 'student' ? (student_id || null) : null);

  res.status(201).json({ message: 'User created', id: info.lastInsertRowid });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM attendance WHERE student_id = ?').run(id);
  db.prepare('DELETE FROM timetable WHERE subject_id IN (SELECT id FROM subjects WHERE teacher_id = ?)').run(id);
  db.prepare('UPDATE subjects SET teacher_id = NULL WHERE teacher_id = ?').run(id);
  db.prepare('DELETE FROM subjects WHERE teacher_id = ?').run(id);
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: 'User deleted', changes: info.changes });
});

// --- Subjects ---

// GET /api/admin/subjects
router.get('/subjects', (req, res) => {
  const subjects = db.prepare(`
    SELECT s.id, s.name, s.code, s.teacher_id, u.name as teacher_name, s.created_at
    FROM subjects s LEFT JOIN users u ON u.id = s.teacher_id
    ORDER BY s.name
  `).all();
  res.json({ subjects });
});

// POST /api/admin/subjects
router.post('/subjects', (req, res) => {
  const { name, code, teacher_id } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'name and code are required' });
  const existing = db.prepare('SELECT id FROM subjects WHERE code = ?').get(code.trim().toUpperCase());
  if (existing) return res.status(400).json({ error: 'Subject code already exists' });
  const info = db.prepare(
    `INSERT INTO subjects (name, code, teacher_id) VALUES (?,?,?)`
  ).run(name, code.trim().toUpperCase(), teacher_id || null);
  res.status(201).json({ message: 'Subject created', id: info.lastInsertRowid });
});

// DELETE /api/admin/subjects/:id
router.delete('/subjects/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM timetable WHERE subject_id = ?').run(id);
  const classes = db.prepare('SELECT id FROM classes WHERE subject_id = ?').all(id);
  classes.forEach(cls => db.prepare('DELETE FROM attendance WHERE class_id = ?').run(cls.id));
  db.prepare('DELETE FROM classes WHERE subject_id = ?').run(id);
  const info = db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
  res.json({ message: 'Subject deleted', changes: info.changes });
});

// --- Backup ---
// GET /api/admin/backup -> download full DB as JSON
router.get('/backup', (req, res) => {
  const backup = {
    generated_at: new Date().toISOString(),
    users: db.prepare(`SELECT id, name, email, role, student_id, created_at FROM users`).all(),
    subjects: db.prepare(`SELECT * FROM subjects`).all(),
    classes: db.prepare(`SELECT * FROM classes`).all(),
    attendance: db.prepare(`SELECT * FROM attendance`).all(),
    timetable: db.prepare(`SELECT * FROM timetable`).all(),
  };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="attendance-backup-${Date.now()}.json"`);
  res.json(backup);
});

// Also expose teachers list for admin dropdowns - will be in /users route with role filter

module.exports = router;

