// End-to-end test for the QR attendance flow
const BASE = 'http://localhost:5000/api';

async function req(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) { json = text; }
  return { status: res.status, json };
}

const log = (...args) => console.log(...args);
const assert = (cond, msg) => {
  if (!cond) { console.error(`❌ FAIL: ${msg}`); process.exit(1); }
  console.log(`✅ ${msg}`);
};

async function main() {
  log('========================================');
  log('🧪 END-TO-END QR ATTENDANCE FLOW TEST');
  log('========================================\n');

  // 1. Login teacher
  const tLogin = await req('/auth/login', 'POST', { email: 'teacher@college.edu', password: 'teacher123' });
  assert(tLogin.status === 200, 'Teacher login');
  const tToken = tLogin.json.token;

  // 2. Login student
  const sLogin = await req('/auth/login', 'POST', { email: 'student@college.edu', password: 'student123' });
  assert(sLogin.status === 200, 'Student login');
  const sToken = sLogin.json.token;
  const studentId = sLogin.json.user.id;

  // 3. Admin login
  const aLogin = await req('/auth/login', 'POST', { email: 'admin@college.edu', password: 'admin123' });
  assert(aLogin.status === 200, 'Admin login');
  const aToken = aLogin.json.token;

  // 4. Admin stats (fix verification)
  const stats = await req('/admin/stats', 'GET', null, aToken);
  assert(stats.status === 200, 'Admin stats endpoint');
  assert(stats.json.totalStudents === 6, `Admin stats shows 6 students (got ${stats.json.totalStudents})`);
  assert(stats.json.overallPct > 0, `Overall attendance computed: ${stats.json.overallPct}%`);

  // 5. Teacher gets subjects
  const subs = await req('/teacher/subjects', 'GET', null, tToken);
  assert(subs.status === 200 && subs.json.subjects.length >= 2, `Teacher has subjects (${subs.json.subjects.length})`);
  const subjectId = subs.json.subjects[0].id;

  // 6. Teacher creates a class
  const today = new Date().toISOString().slice(0, 10);
  const newClass = await req('/teacher/classes', 'POST', {
    subject_id: subjectId, date: today, start_time: '10:00', end_time: '11:00', room: 'E2E Room'
  }, tToken);
  assert(newClass.status === 201, 'Teacher creates class');
  assert(!!newClass.json.qrDataUrl, 'QR data URL generated');
  const classId = newClass.json.class.id;

  // 7. Teacher rotates QR
  const rotated = await req(`/teacher/classes/${classId}/qr`, 'PUT', null, tToken);
  assert(rotated.status === 200 && !!rotated.json.qrDataUrl, 'QR rotation works');

  // 8. Get class detail to extract the token
  const detail = await req(`/teacher/classes/${classId}`, 'GET', null, tToken);
  const cls = detail.json.class;
  assert(cls.qr_code, 'Class has QR token');

  // 9. Student scans QR with valid payload
  const payload = JSON.stringify({
    type: 'attendance',
    classId,
    token: cls.qr_code,
    exp: new Date(Date.now() + 30000).toISOString(),
    teacher: 'Dr. Sarah Johnson',
    subject: cls.subject_name,
  });
  const scan = await req('/student/scan', 'POST', { qrData: payload, lat: 28.6, lng: 77.2 }, sToken);
  assert(scan.status === 200, 'Student scans QR → attendance marked');
  assert(scan.json.subject, `Scan response: ${scan.json.message}`);

  // 10. Duplicate scan should fail (one-scan-only)
  const dup = await req('/student/scan', 'POST', { qrData: payload }, sToken);
  assert(dup.status === 400, 'Duplicate scan rejected (one-scan-only)');

  // 11. Student attendance now includes the new class
  const att = await req('/student/attendance', 'GET', null, sToken);
  assert(att.status === 200, 'Student attendance view');
  const subj = att.json.subjects.find(s => s.subject_id === subjectId);
  assert(subj && subj.attended >= 1, `Student has recorded attendance for subject`);

  // 12. Teacher marks another student manually
  const students = detail.json.students;
  const otherStudent = students.find(s => s.id !== studentId);
  const manual = await req(`/teacher/classes/${classId}/attendance`, 'POST', {
    student_id: otherStudent.id, status: 'late'
  }, tToken);
  assert(manual.status === 200, 'Teacher manually marks student');

  // 13. Teacher exports report
  const report = await req(`/teacher/classes/${classId}/attendance`, 'GET', null, tToken);
  assert(report.status === 200 && report.json.rows.length === 6, 'Teacher report has all students');

  // 14. Teacher closes class
  const close = await req(`/teacher/classes/${classId}/close`, 'POST', null, tToken);
  assert(close.status === 200, 'Teacher closes class');

  // 15. Scan after close should fail
  const scanClosed = await req('/student/scan', 'POST', { qrData: payload }, sToken);
  assert(scanClosed.status === 400, 'Scan after close rejected');

  // 16. Student timetable
  const tt = await req('/student/timetable', 'GET', null, sToken);
  assert(tt.status === 200 && tt.json.timetable.length > 0, `Student timetable (${tt.json.timetable.length} slots)`);

  // 17. Student alerts
  const alerts = await req('/student/alerts', 'GET', null, sToken);
  assert(alerts.status === 200, 'Student alerts endpoint');

  // 18. Student report CSV
  const csv = await req('/student/report', 'GET', null, sToken);
  assert(typeof csv.json === 'string' && csv.json.includes('Date,Subject'), 'Student CSV report downloads');

  // 19. Admin manages users
  const createUser = await req('/admin/users', 'POST', {
    name: 'Test Student', email: 'teststudent@college.edu', password: 'test123', role: 'student', student_id: 'STU999'
  }, aToken);
  assert(createUser.status === 201, 'Admin creates user');

  // 20. Admin creates subject
  const createSubj = await req('/admin/subjects', 'POST', { name: 'AI & ML', code: 'CS401', teacher_id: null }, aToken);
  assert(createSubj.status === 201, 'Admin creates subject');

  // 21. Admin backup
  const backup = await req('/admin/backup', 'GET', null, aToken);
  assert(backup.status === 200 && backup.json.users.length > 0, 'Admin database backup');

  log('\n========================================');
  log('🎉 ALL 21 END-TO-END TESTS PASSED!');
  log('========================================');
}

main().catch(err => {
  console.error('Test crashed:', err.message);
  process.exit(1);
});

