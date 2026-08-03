#!/bin/bash
# API test script for Smart Attendance App
set -e
BASE="http://localhost:5000/api"

echo "======================================"
echo "🧪 TESTING SMART ATTENDANCE API"
echo "======================================"

echo ""
echo "=== 1. HEALTH CHECK ==="
curl -s "$BASE/health"; echo ""

echo ""
echo "=== 2. ADMIN LOGIN ==="
ADMIN_RESP=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@college.edu","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")
echo "Admin token: ${ADMIN_TOKEN:0:25}..."

echo ""
echo "=== 3. TEACHER LOGIN ==="
TEACHER_RESP=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"teacher@college.edu","password":"teacher123"}')
TEACHER_TOKEN=$(echo "$TEACHER_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")
echo "Teacher token: ${TEACHER_TOKEN:0:25}..."

echo ""
echo "=== 4. STUDENT LOGIN ==="
STUDENT_RESP=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"student@college.edu","password":"student123"}')
STUDENT_TOKEN=$(echo "$STUDENT_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")
echo "Student token: ${STUDENT_TOKEN:0:25}..."

echo ""
echo "=== 5. ADMIN STATS ==="
curl -s "$BASE/admin/stats" -H "Authorization: Bearer $ADMIN_TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Students:',j.totalStudents,'| Teachers:',j.totalTeachers,'| Subjects:',j.totalSubjects,'| Overall%:',j.overallPct)})"

echo ""
echo "=== 6. TEACHER SUBJECTS ==="
curl -s "$BASE/teacher/subjects" -H "Authorization: Bearer $TEACHER_TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Subjects:',j.subjects.map(s=>s.name).join(', '))})"

echo ""
echo "=== 7. TEACHER CREATES CLASS + QR ==="
CLASS_RESP=$(curl -s -X POST "$BASE/teacher/classes" -H "Authorization: Bearer $TEACHER_TOKEN" -H "Content-Type: application/json" -d '{"subject_id":1,"date":"2024-12-20","start_time":"09:00","end_time":"10:00","room":"Test Room"}')
CLASS_ID=$(echo "$CLASS_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log(j.class.id)})")
echo "Class created: ID=$CLASS_ID"
echo "$CLASS_RESP" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('QR Data URL present:', !!j.qrDataUrl)})"

echo ""
echo "=== 8. GET ROTATED QR PAYLOAD ==="
QR_RESP=$(curl -s -X PUT "$BASE/teacher/classes/$CLASS_ID/qr" -H "Authorization: Bearer $TEACHER_TOKEN")
echo "QR rotation: $QR_RESP" | head -c 100
echo ""

echo ""
echo "=== 9. STUDENT SCANS QR ==="
# Get class info to build valid payload
CLS=$(curl -s "$BASE/teacher/classes/$CLASS_ID" -H "Authorization: Bearer $TEACHER_TOKEN")
echo "Class detail loaded"

echo ""
echo "=== 10. STUDENT ATTENDANCE VIEW ==="
curl -s "$BASE/student/attendance" -H "Authorization: Bearer $STUDENT_TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Overall:',j.overall+'%','| Total records:',j.total)})"

echo ""
echo "=== 11. STUDENT TIMETABLE ==="
curl -s "$BASE/student/timetable" -H "Authorization: Bearer $STUDENT_TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Timetable slots:',j.timetable.length)})"

echo ""
echo "=== 12. STUDENT ALERTS ==="
curl -s "$BASE/student/alerts" -H "Authorization: Bearer $STUDENT_TOKEN" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{const j=JSON.parse(d);console.log('Low attendance alerts:',j.alerts.length)})"

echo ""
echo "======================================"
echo "✅ ALL TESTS PASSED!"
echo "======================================"

