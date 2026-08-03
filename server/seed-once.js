const bcrypt = require('bcryptjs');
const db = require('./config/db');

// Inline seed — called by server.js on first run (no process.exit)
function seedOnce() {
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // Users
  const adminId = db.prepare(
    `INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)`
  ).run('System Admin', 'admin@college.edu', hash('admin123'), 'admin').lastInsertRowid;

  const teacherId = db.prepare(
    `INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)`
  ).run('Dr. Sarah Johnson', 'teacher@college.edu', hash('teacher123'), 'teacher').lastInsertRowid;

  const teacher2Id = db.prepare(
    `INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)`
  ).run('Prof. Michael Chen', 'mchen@college.edu', hash('teacher123'), 'teacher').lastInsertRowid;

  const studentNames = [
    ['Alice Brown', 'STU2024001', 'student@college.edu'],
    ['Bob Smith', 'STU2024002', 'bob.smith@college.edu'],
    ['Charlie Davis', 'STU2024003', 'charlie.davis@college.edu'],
    ['Diana Lee', 'STU2024004', 'diana.lee@college.edu'],
    ['Evan Wright', 'STU2024005', 'evan.wright@college.edu'],
    ['Fiona Clark', 'STU2024006', 'fiona.clark@college.edu'],
  ];

  const studentIds = [];
  for (const [name, sid, email] of studentNames) {
    const id = db.prepare(
      `INSERT INTO users (name, email, password, role, student_id) VALUES (?,?,?,?,?)`
    ).run(name, email, hash('student123'), 'student', sid).lastInsertRowid;
    studentIds.push(id);
  }

  // Subjects
  const sub1 = db.prepare(
    `INSERT INTO subjects (name, code, teacher_id) VALUES (?,?,?)`
  ).run('Data Structures', 'CS201', teacherId).lastInsertRowid;

  const sub2 = db.prepare(
    `INSERT INTO subjects (name, code, teacher_id) VALUES (?,?,?)`
  ).run('Database Systems', 'CS202', teacherId).lastInsertRowid;

  const sub3 = db.prepare(
    `INSERT INTO subjects (name, code, teacher_id) VALUES (?,?,?)`
  ).run('Computer Networks', 'CS301', teacher2Id).lastInsertRowid;

  // Timetable
  const tt = db.prepare(
    `INSERT INTO timetable (subject_id, day, start_time, end_time, room) VALUES (?,?,?,?,?)`
  );
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const slots = [
    [sub1, '09:00', '10:00', 'Room 101'],
    [sub2, '10:00', '11:00', 'Room 102'],
    [sub3, '11:00', '12:00', 'Room 103'],
  ];
  slots.forEach(([sid, st, et, room], i) => {
    days.forEach((day, d) => {
      if ((d + i) % 2 === 0) {
        tt.run(sid, day, st, et, room);
      }
    });
  });

  // Past classes & attendance (so students have history)
  const classInsert = db.prepare(
    `INSERT INTO classes (name, subject_id, teacher_id, date, start_time, end_time, room, status) VALUES (?,?,?,?,?,?,?,?)`
  );
  const attInsert = db.prepare(
    `INSERT INTO attendance (class_id, student_id, status, method) VALUES (?,?,?,?)`
  );

  const today = new Date();
  for (let i = 7; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const isWeekend = [0, 6].includes(d.getDay());
    if (isWeekend) continue;

    slots.forEach(([sid, st, et, room]) => {
      const clsId = classInsert.run(
        `Lecture: ${st}-${et}`,
        sid,
        sid === sub1 || sid === sub2 ? teacherId : teacher2Id,
        dateStr,
        st,
        et,
        room,
        'closed'
      ).lastInsertRowid;

      studentIds.forEach((stuId) => {
        const r = Math.random();
        const status = r < 0.85 ? 'present' : r < 0.95 ? 'late' : 'absent';
        attInsert.run(clsId, stuId, status, 'manual');
      });
    });
  }

  console.log('✅ Database auto-seeded. Login accounts: admin@college.edu/admin123, teacher@college.edu/teacher123, student@college.edu/student123');
  return { adminId, teacherId, teacher2Id };
}

module.exports = seedOnce;

