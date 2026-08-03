# 📘 Smart Attendance App — Complete File-by-File Project Guide

This document explains **every file** in the project: what it does, why it exists, and exactly where/which features use it.

---

## 📂 Complete Project Tree

```
attendence app/
├── package.json                        ← Root: run scripts (dev, seed, setup)
├── README.md                           ← Quick-start guide
├── PROJECT_GUIDE.md                    ← THIS file
├── TODO.md                             ← Build progress checklist
├── test-api.sh                         ← Shell script API tests
├── e2e-test.js                         ← 21 automated end-to-end tests
│
├── server/                             ← BACKEND (Node.js + Express)
│   ├── package.json                    ← Backend dependencies & scripts
│   ├── server.js                       ← ⚡ ENTRY POINT of the backend
│   ├── seed.js                         ← Populates database with demo data
│   ├── data/                           ← (auto-created) SQLite database lives here
│   │   └── attendance.db               ← The actual database file
│   │
│   ├── config/
│   │   └── db.js                       ← Database connection setup
│   ├── models/
│   │   └── schema.js                   ← Creates all 5 database tables (SQL)
│   ├── middleware/
│   │   └── auth.js                     ← JWT token verification + role guards
│   └── routes/
│       ├── auth.js                     ← Login / Register / Profile APIs
│       ├── admin.js                    ← Admin APIs (users, subjects, stats, backup)
│       ├── teacher.js                  ← Teacher APIs (classes, QR, marking)
│       └── student.js                  ← Student APIs (scan, attendance, timetable)
│
└── client/                             ← FRONTEND (React + Vite)
    ├── package.json                    ← Frontend dependencies & scripts
    ├── vite.config.js                  ← Dev server config + API proxy
    ├── index.html                      ← HTML entry point (loads React)
    ├── dist/                           ← (auto-created) Production build output
    └── src/
        ├── main.jsx                    ← ⚡ ENTRY POINT of the frontend
        ├── App.jsx                     ← All page routes defined here
        ├── index.css                   ← All styling (colors, buttons, tables...)
        ├── context/
        │   └── AuthContext.jsx         ← Login state manager (who is logged in)
        ├── services/
        │   └── api.js                  ← All backend calls (20+ functions)
        ├── components/
        │   ├── Layout.jsx              ← Sidebar + top bar around every page
        │   └── QRScanner.jsx           ← Camera QR scanner component
        └── pages/
            ├── Login.jsx               ← Login screen
            ├── Register.jsx            ← Student sign-up screen
            ├── student/
            │   ├── StudentDashboard.jsx  ← Student home (scan QR, stats)
            │   ├── StudentAttendance.jsx ← Per-subject % + CSV download
            │   └── StudentTimetable.jsx  ← Weekly class schedule
            ├── teacher/
            │   ├── TeacherDashboard.jsx  ← Create class + session list
            │   ├── TeacherQRCode.jsx     ← Live rotating QR display
            │   └── TeacherClassDetail.jsx← Mark attendance + reports
            └── admin/
                ├── AdminDashboard.jsx    ← Analytics + backup button
                ├── AdminUsers.jsx        ← Add/delete users
                └── AdminSubjects.jsx     ← Add/delete subjects
```

---

# PART A — BACKEND FILES (server/)

---

## 1. `server/package.json`
**Purpose:** Lists backend dependencies and commands.
**What it contains:**
```json
"dependencies": {
  "express": "^4.18.2",        // Web server framework
  "better-sqlite3": "^9.4.3",  // SQLite database driver
  "bcryptjs": "^2.4.3",        // Password hashing
  "jsonwebtoken": "^9.0.2",    // JWT auth tokens
  "cors": "^2.8.5",            // Allows browser cross-origin requests
  "qrcode": "^1.5.3"           // Generates QR code images
}
```
**Used in:** Every backend file (they all `require()` these packages).
**Commands:**
| Command | What it runs |
|---------|-------------|
| `npm run dev` | `nodemon server.js` — auto-restarts on code changes |
| `npm run seed` | `node seed.js` — fills database with demo data |

---

## 2. `server/config/db.js`
**Purpose:** Creates and opens the SQLite database connection.
**What it does:**
```js
const db = new Database(path.join(dataDir, 'attendance.db'));
db.pragma('journal_mode = WAL');   // Faster concurrent reads
db.pragma('foreign_keys = ON');    // Enforces table relationships
```
**Used in:** EVERY backend file. All routes and models import `db` from here to run SQL queries.
- `server.js` — imports for initialization
- `seed.js` — imports to insert demo data
- `middleware/auth.js` — imports to look up users
- All `routes/*.js` — imports to query users/classes/attendance

---

## 3. `server/models/schema.js`
**Purpose:** Defines the database structure using SQL `CREATE TABLE` statements.
**What it does:** Creates 5 tables:
1. `users` — accounts (admin/teacher/student)
2. `subjects` — courses
3. `classes` — lecture sessions (with QR token storage)
4. `attendance` — who attended which class (with UNIQUE constraint for one-scan-only)
5. `timetable` — weekly schedule

**Used in:**
- `server.js` — calls `initSchema()` once at startup
- `seed.js` — calls it before inserting demo data

---

## 4. `server/middleware/auth.js`
**Purpose:** Security layer — verifies who is making each request.
**Functions it exports:**

| Function | Purpose | Used by |
|----------|---------|---------|
| `signToken(user)` | Creates a JWT token after login | `routes/auth.js` |
| `authRequired` | Middleware — checks token is valid | ALL routes |
| `requireRole('admin')` | Middleware — only allows certain roles | `routes/admin.js`, `teacher.js`, `student.js` |

**What `authRequired` does step-by-step:**
1. Reads the `Authorization: Bearer <token>` header.
2. Verifies the token's digital signature with the secret key.
3. Looks up the user in the database by the ID inside the token.
4. Attaches `req.user` (full user data) so the route handler knows who is calling.
5. Returns 401 error if any step fails.

**Used in every route file:**
- `routes/auth.js` — for `/me` (get profile)
- `routes/admin.js` — `router.use(authRequired, requireRole('admin'))` blocks non-admins
- `routes/teacher.js` — blocks non-teachers
- `routes/student.js` — blocks non-students

---

## 5. `server/routes/auth.js`
**Purpose:** Handles account login/registration.
**Endpoints defined:**

| Method | Path | What it does | Used by frontend |
|--------|------|-------------|------------------|
| POST | `/api/auth/register` | Creates a new student account | `Register.jsx` |
| POST | `/api/auth/login` | Verifies email+password, returns JWT | `Login.jsx` |
| GET | `/api/auth/me` | Returns current logged-in user | `AuthContext.jsx` (on page refresh) |

**How login works:**
```js
// 1. Find user by email
const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
// 2. Compare entered password with stored hash
const ok = bcrypt.compareSync(password, user.password);
// 3. If match, create a signed JWT token
const token = signToken(safeUser);
// 4. Return token + user to frontend
res.json({ token, user: safeUser });
```

---

## 6. `server/routes/admin.js`
**Purpose:** All admin-only operations.
**Endpoints defined:**

| Method | Path | Frontend page that calls it |
|--------|------|----------------------------|
| GET | `/admin/stats` | `AdminDashboard.jsx` (analytics numbers) |
| GET | `/admin/users?role=` | `AdminDashboard.jsx`, `AdminUsers.jsx`, `AdminSubjects.jsx` |
| POST | `/admin/users` | `AdminUsers.jsx` (Add User form) |
| DELETE | `/admin/users/:id` | `AdminUsers.jsx` (Delete button) |
| GET | `/admin/subjects` | `AdminSubjects.jsx` |
| POST | `/admin/subjects` | `AdminSubjects.jsx` (Add Subject form) |
| DELETE | `/admin/subjects/:id` | `AdminSubjects.jsx` (Delete button) |
| GET | `/admin/backup` | `AdminDashboard.jsx` (Backup Database button) |

**Key logic inside:**
- `/admin/stats` runs aggregate SQL (`COUNT`, `SUM`, `GROUP BY`) to compute:
  - Total students/teachers/subjects/classes
  - Overall attendance percentage
  - 7-day attendance trend
  - Students below 75% attendance
- `/admin/backup` selects ALL data from every table and returns it as a downloadable JSON file.

---

## 7. `server/routes/teacher.js`
**Purpose:** Teacher operations — classes, QR codes, attendance marking.
**Endpoints defined:**

| Method | Path | Frontend page |
|--------|------|---------------|
| GET | `/teacher/subjects` | `TeacherDashboard.jsx` (subject dropdown) |
| POST | `/teacher/classes` | `TeacherDashboard.jsx` (Create Class button) |
| GET | `/teacher/classes` | `TeacherDashboard.jsx` (Active/Completed tables) |
| GET | `/teacher/classes/:id` | `TeacherQRCode.jsx`, `TeacherClassDetail.jsx` |
| PUT | `/teacher/classes/:id/qr` | `TeacherQRCode.jsx` (Rotate/Refresh QR) |
| GET | `/teacher/classes/:id/attendance` | `TeacherClassDetail.jsx` (Export CSV) |
| POST | `/teacher/classes/:id/attendance` | `TeacherClassDetail.jsx` (mark present/late/absent) |
| POST | `/teacher/classes/:id/close` | `TeacherQRCode.jsx` (Close Session button) |

**The QR generation logic (most important part):**
```js
// 1. Create a random 48-character security token
const token = crypto.randomBytes(24).toString('hex');
// 2. Set expiry = now + 30 seconds
const expiresAt = new Date(Date.now() + 30 * 1000).toISOString();
// 3. Build JSON payload
const payload = { type: 'attendance', classId, token, exp: expiresAt, ... };
// 4. Convert to QR image
const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload));
```

**The class list enhancement** (present/marked counts):
```sql
SELECT c.*, s.name as subject_name,
  (SELECT COUNT(*) FROM attendance a WHERE a.class_id = c.id) as marked_count,
  (SELECT COUNT(*) FROM attendance a WHERE a.class_id = c.id 
     AND a.status IN ('present','late')) as present_count
```

---

## 8. `server/routes/student.js`
**Purpose:** Student operations — QR scanning, viewing attendance, timetable.
**Endpoints defined:**

| Method | Path | Frontend page |
|--------|------|---------------|
| POST | `/student/scan` | `StudentDashboard.jsx` (QR scanner) |
| GET | `/student/attendance` | `StudentDashboard.jsx`, `StudentAttendance.jsx` |
| GET | `/student/alerts` | `StudentDashboard.jsx` (low attendance warnings) |
| GET | `/student/timetable` | `StudentTimetable.jsx` |
| GET | `/student/report` | `StudentAttendance.jsx` (Download Report button) |

**The 4 QR security checks in `/student/scan`:**
```js
// Check 1: Is the payload valid attendance JSON?
if (payload.type !== 'attendance' || !payload.classId || !payload.token) → reject

// Check 2: Does the class exist and is it still active?
if (cls.status !== 'active') → reject

// Check 3: Does the token match the current stored QR code?
if (cls.qr_code !== payload.token) → reject

// Check 4: Has 30 seconds expired?
if (Date.now() > expiresAt) → reject

// One-scan-only: UNIQUE(class_id, student_id) in database → duplicate INSERT fails
```

---

## 9. `server/seed.js`
**Purpose:** Populates the database with realistic demo data.
**What it creates:**
- 1 admin user
- 2 teachers
- 6 students
- 3 subjects
- 8 timetable slots
- ~90 past classes with random attendance records (85-95% present rate)

**Used when:** Run `npm run seed` (or `npm --prefix server run seed`) — resets the DB to clean demo state.
**Used by:** You (the developer), to get a working demo.

---

## 10. `server/server.js`
**Purpose:** THE BACKEND ENTRY POINT — starts the entire API.
**What it does:**
```js
// 1. Import Express + all route files
// 2. Initialize database schema (creates tables if missing)
// 3. Enable CORS + JSON body parsing
// 4. Register routes at their paths:
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
// 5. Serve the built React app (production mode)
// 6. Start listening on port 5000
app.listen(5000);
```

---

# PART B — FRONTEND FILES (client/)

---

## 11. `client/package.json`
**Purpose:** Frontend dependencies and commands.
```json
"dependencies": {
  "react": "^18.2.0",           // UI library
  "react-dom": "^18.2.0",       // React browser renderer
  "react-router-dom": "^6.21.3",// Page navigation/routing
  "html5-qrcode": "^2.3.8"      // Camera QR scanning
}
```
**Used in:** All frontend files.

---

## 12. `client/vite.config.js`
**Purpose:** Configures the Vite dev server.
**Key part — the API proxy:**
```js
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://localhost:5000', changeOrigin: true }
  }
}
```
**Why it matters:** When the React app (port 5173) requests `/api/...`, Vite automatically forwards it to the backend (port 5000). This avoids CORS errors.
**Used by:** The whole frontend — every API call goes through this proxy in development.

---

## 13. `client/index.html`
**Purpose:** The single HTML page that loads the React app.
```html
<div id="root"></div>                    <!-- React renders here -->
<script type="module" src="/src/main.jsx"></script>
```
**Used by:** Vite serves this at `http://localhost:5173`.

---

## 14. `client/src/main.jsx`
**Purpose:** THE FRONTEND ENTRY POINT.
**What it does:**
```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>          {/* Enables URL routing */}
      <AuthProvider>         {/* Provides login state to all pages */}
        <App />              {/* The actual app with all routes */}
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```
**Used by:** `index.html` loads this file. It wraps everything so all pages can access auth state and routing.

---

## 15. `client/src/App.jsx`
**Purpose:** The route map — connects URL paths to page components.
**The routes defined:**
```jsx
<Route path="/login" element={<Login />} />
<Route path="/register" element={<Register />} />
<Route path="/student" element={<StudentDashboard />} />          // role-protected
<Route path="/student/attendance" element={<StudentAttendance />} />
<Route path="/student/timetable" element={<StudentTimetable />} />
<Route path="/teacher" element={<TeacherDashboard />} />
<Route path="/teacher/qr/:id" element={<TeacherQRCode />} />      // :id = class ID
<Route path="/teacher/class/:id" element={<TeacherClassDetail />} />
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/admin/users" element={<AdminUsers />} />
<Route path="/admin/subjects" element={<AdminSubjects />} />
```
**Also contains the `Protected` component** that:
- Redirects to `/login` if not logged in.
- Redirects to the correct role dashboard if the wrong role tries to access a page.
**Used by:** Every navigation in the app.

---

## 16. `client/src/index.css`
**Purpose:** All styling — 400+ lines of CSS.
**What it defines:**
| Category | Classes | Used by |
|----------|---------|---------|
| CSS variables | `--primary`, `--success`, `--danger` etc. | Every page |
| Buttons | `.btn-primary`, `.btn-secondary`, `.btn-sm` | All pages |
| Cards | `.card`, `.stat-card`, `.card-header` | All dashboards |
| Tables | `table`, `th`, `td`, `.table-wrap` | Attendance lists |
| Badges | `.badge-success`, `.badge-danger` | Status labels |
| Progress bars | `.progress-bar`, `.progress-fill` | Attendance % |
| Alerts | `.alert-error`, `.alert-success` | Error/success messages |
| Auth pages | `.auth-page`, `.auth-card` | Login/Register |
| QR display | `.qr-display`, `.countdown` | TeacherQRCode, QRScanner |
| Responsive | `@media (max-width: 768px)` | Mobile view |

---

## 17. `client/src/context/AuthContext.jsx`
**Purpose:** Central login state management (React Context).
**What it provides to every page:**
| Value | Purpose | Used by |
|-------|---------|---------|
| `user` | The logged-in user object | Layout, all dashboards |
| `login(email, password)` | Calls API, stores token | Login.jsx |
| `logout()` | Clears token + user | Layout.jsx (Logout button) |
| `loading` | True while checking saved session | App.jsx (Protected) |

**Key feature:** On page refresh, it reads the saved JWT from `localStorage`, calls `/api/auth/me` to confirm it's valid, and restores the user session automatically.

---

## 18. `client/src/services/api.js`
**Purpose:** THE bridge between frontend and backend — all API calls.
**Structure:**
```js
async function request(path, options) {
  // 1. Add JWT token to headers (from localStorage)
  // 2. fetch() to the API
  // 3. If 401 → auto logout
  // 4. If error → throw with message
  // 5. Parse JSON/CSV response
}
```
**Every function and where it's called:**

| Function | Calls endpoint | Used in page |
|----------|---------------|--------------|
| `login()` | POST /auth/login | Login.jsx |
| `register()` | POST /auth/register | Register.jsx |
| `me()` | GET /auth/me | AuthContext.jsx |
| `scanQR()` | POST /student/scan | StudentDashboard.jsx |
| `studentAttendance()` | GET /student/attendance | StudentDashboard, StudentAttendance |
| `studentAlerts()` | GET /student/alerts | StudentDashboard.jsx |
| `studentTimetable()` | GET /student/timetable | StudentTimetable.jsx |
| `studentReport()` | GET /student/report | StudentAttendance.jsx |
| `teacherSubjects()` | GET /teacher/subjects | TeacherDashboard.jsx |
| `teacherCreateClass()` | POST /teacher/classes | TeacherDashboard.jsx |
| `teacherClasses()` | GET /teacher/classes | TeacherDashboard.jsx |
| `teacherClassDetail()` | GET /teacher/classes/:id | TeacherQRCode, TeacherClassDetail |
| `teacherRotateQR()` | PUT /teacher/classes/:id/qr | TeacherQRCode.jsx |
| `teacherMarkAttendance()` | POST /teacher/classes/:id/attendance | TeacherClassDetail.jsx |
| `teacherCloseClass()` | POST /teacher/classes/:id/close | TeacherQRCode.jsx |
| `teacherClassAttendance()` | GET /teacher/classes/:id/attendance | TeacherClassDetail.jsx |
| `adminStats()` | GET /admin/stats | AdminDashboard.jsx |
| `adminUsers()` | GET /admin/users | AdminUsers, AdminSubjects |
| `adminCreateUser()` | POST /admin/users | AdminUsers.jsx |
| `adminDeleteUser()` | DELETE /admin/users/:id | AdminUsers.jsx |
| `adminSubjects()` | GET /admin/subjects | AdminSubjects.jsx |
| `adminCreateSubject()` | POST /admin/subjects | AdminSubjects.jsx |
| `adminDeleteSubject()` | DELETE /admin/subjects/:id | AdminSubjects.jsx |
| `adminBackup()` | GET /admin/backup | AdminDashboard.jsx |

---

## 19. `client/src/components/Layout.jsx`
**Purpose:** The shared page frame — sidebar + top bar + content area.
**Used by:** Wraps every dashboard page (see App.jsx — routes nested inside `<Layout>`).

**What it renders:**
1. **Sidebar** (left):
   - Brand logo "📋 SmartAttendance"
   - Navigation links — **changes by role**:
     - Student: Dashboard, Attendance, Timetable
     - Teacher: Dashboard
     - Admin: Dashboard, Users, Subjects
   - User chip (avatar + name + role)
   - Logout button
2. **Main content** (right): the current page via `<Outlet />`
3. **Top bar**: page title + today's date

**Role detection:**
```jsx
const cfg = roleConfig[user.role];  // picks nav items based on user.role
```

---

## 20. `client/src/components/QRScanner.jsx`
**Purpose:** Reusable camera-based QR scanner component.
**Used by:** `StudentDashboard.jsx` (when student clicks "Open Scanner").

**How it works:**
```jsx
// 1. Create scanner instance on mount
scannerRef.current = new Html5Qrcode('qr-reader');
// 2. Start camera with back-facing lens
scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250x250 },
  (decodedText) => onResult(decodedText)  // 3. When QR found, send text up
);
// 4. On unmount → stop camera and clean up
```

**Props it accepts:**
| Prop | Purpose | Passed by |
|------|---------|-----------|
| `onResult(text)` | Called when QR is decoded | StudentDashboard |
| `paused` | Stops scanning (while processing) | StudentDashboard |

---

# PART C — PAGE FILES (client/src/pages/)

---

## 21. `client/src/pages/Login.jsx`
**Purpose:** The login screen.
**Features:**
- Email + password form
- Error message display (`.alert-error`)
- Loading state ("Signing in...")
- Redirects to the correct role dashboard after login
- **Demo account quick-fill buttons** (Admin/Teacher/Student) — fills the form with demo credentials
- Link to Register page

**Used by:** Accessed at `/login`. Default redirect when not authenticated.

---

## 22. `client/src/pages/Register.jsx`
**Purpose:** New student registration.
**Features:**
- Fields: name, email, student ID, password, confirm password
- Client-side validation (min 6 chars, passwords match)
- Calls `api.register()` then auto-logs-in and redirects to student dashboard

---

## 23. `client/src/pages/student/StudentDashboard.jsx`
**Purpose:** Student home page — QR scanning + attendance overview.
**Features in order:**
1. **QR Scan banner** — gradient card with "📷 Open Scanner" button.
2. **Scanner card** — renders `<QRScanner>`, handles the decoded result:
   - Gets GPS coordinates (optional)
   - Calls `api.scanQR(decodedText, lat, lng)`
   - Shows success (green) or error (red) message
3. **Stat cards** — overall attendance % + per-subject % with colored progress bars.
4. **Low attendance alerts** — warning cards for subjects below 75%.
5. **Recent attendance table** — last 20 records with status badges.

**Uses:** `api.studentAttendance()`, `api.studentAlerts()`, `api.scanQR()`, `QRScanner` component.

---

## 24. `client/src/pages/student/StudentAttendance.jsx`
**Purpose:** Detailed attendance view + report download.
**Features:**
- Per-subject progress bars with percentages
- Color coding: green ≥75%, amber ≥50%, red <50%
- Full history table (date, subject, time, room, status, method)
- **"⬇️ Download Report"** button — calls `api.studentReport()`, receives CSV, triggers browser download.

---

## 25. `client/src/pages/student/StudentTimetable.jsx`
**Purpose:** Weekly class schedule.
**Features:**
- Grid of cards for Monday–Friday
- Each day shows scheduled classes with subject, time, room, teacher
- **Today is highlighted** with a blue border + "Today" badge
- "No classes" shown for empty days

**Uses:** `api.studentTimetable()` → returns timetable rows joined with subject + teacher names.

---

## 26. `client/src/pages/teacher/TeacherDashboard.jsx`
**Purpose:** Teacher home — create QR sessions + manage classes.
**Features:**
1. **"+ New Class / QR Session"** button → toggles a form:
   - Subject dropdown (from `api.teacherSubjects()`)
   - Room, Date, Start/End time
   - Submit → calls `api.teacherCreateClass()` → redirects to `/teacher/qr/:id`
2. **Active Sessions table**:
   - Subject, Date, Time, Room
   - **Students column**: `present / marked` live counts (NEW — verified)
   - Status badge (● Active)
   - Actions: 📷 QR button, Manage button
3. **Completed Classes table**:
   - Closed sessions, viewable/editable via "View / Edit"

**Uses:** `api.teacherSubjects()`, `api.teacherClasses()`, `api.teacherCreateClass()`.

---

## 27. `client/src/pages/teacher/TeacherQRCode.jsx`
**Purpose:** The live rotating QR code display.
**Features:**
1. Loads class info + generates QR on mount (`api.teacherRotateQR(id)`)
2. **30-second countdown timer** — auto-calls `loadQR()` when it hits 0 (new token every 30s)
3. Big QR image in `.qr-display`
4. **"🔄 Refresh Now"** button — manual rotation
5. **"👥 View Attendance"** button → links to class detail
6. **"Close Session"** button → calls `api.teacherCloseClass(id)`, then navigates to class detail
7. Info box explaining the security features
8. **"Copy QR payload"** — developer/testing tool that copies the raw JSON for simulated scanning

**Key timer logic:**
```jsx
useEffect(() => {
  timerRef.current = setInterval(() => {
    setCountdown(prev => {
      if (prev <= 1) { loadQR(); return 30; }  // auto-rotate
      return prev - 1;
    });
  }, 1000);
}, []);
```

---

## 28. `client/src/pages/teacher/TeacherClassDetail.jsx`
**Purpose:** Full attendance management for one class.
**Features:**
1. **Stat cards** — present / late / absent / unmarked counts
2. **Student table** — every student with:
   - Student ID, Name
   - Marking method (📷 QR or ✍️ Manual)
   - Current status badge
   - **3 action buttons**: Present / Late / Absent → calls `api.teacherMarkAttendance(id, {student_id, status})`
3. **"⬇️ Export CSV"** — calls `api.teacherClassAttendance(id)`, builds CSV client-side, downloads
4. **"🖨️ Print"** — opens browser print dialog (print-friendly page)
5. **"📷 Show QR"** — link back to QR page (if active)

---

## 29. `client/src/pages/admin/AdminDashboard.jsx`
**Purpose:** Admin analytics + system management.
**Features:**
1. **Stat cards**: Students, Teachers, Subjects, Overall Attendance %
2. **Attendance trend chart** — last 7 days as bar chart (pure CSS/DIVs, no chart library)
3. **Low attendance list** — students below 75% with red badges
4. **"💾 Backup Database"** button → calls `api.adminBackup()`, downloads JSON file
5. **Quick actions** — links to Users and Subjects pages

**Uses:** `api.adminStats()`, `api.adminBackup()`.

---

## 30. `client/src/pages/admin/AdminUsers.jsx`
**Purpose:** Manage all user accounts.
**Features:**
1. **Role filter tabs**: All / Students / Teachers
2. **"+ Add User"** button → form with name, email, password, role, student ID
3. **User table**: name, email, role badge, student ID, created date, Delete button
4. Delete is disabled for your own account (can't delete yourself)
5. Uses URL query param `?role=` to persist the filter (works with back/forward buttons)

**Uses:** `api.adminUsers(role)`, `api.adminCreateUser()`, `api.adminDeleteUser()`.

---

## 31. `client/src/pages/admin/AdminSubjects.jsx`
**Purpose:** Manage subjects and teacher assignments.
**Features:**
1. **"+ Add Subject"** button → form with name, code, assigned teacher dropdown
2. **Subject table**: name, code badge, teacher name, created date, Delete button
3. Delete confirmation warns it removes all related classes/attendance

**Uses:** `api.adminSubjects()`, `api.adminUsers('teacher')`, `api.adminCreateSubject()`, `api.adminDeleteSubject()`.

---

# PART D — ROOT & TEST FILES

---

## 32. `package.json` (root)
**Purpose:** Master commands that tie frontend + backend together.
| Command | What it does |
|---------|-------------|
| `npm run setup` | Installs server + client dependencies |
| `npm run seed` | Fills DB with demo data |
| `npm run server` | Starts backend only (port 5000) |
| `npm run client` | Starts frontend only (port 5173) |
| `npm run dev` | **Starts both together** (using `concurrently`) |
| `npm start` | Backend production mode |

---

## 33. `test-api.sh`
**Purpose:** Quick shell-based API sanity checks.
**What it tests:** health check, all 3 role logins, admin stats, teacher subjects, class creation, QR rotation, student views.
**Run with:** `bash test-api.sh`

---

## 34. `e2e-test.js`
**Purpose:** The complete automated test suite — 21 end-to-end tests.
**What it verifies (each is a separate `assert`):**
1. Teacher login
2. Student login
3. Admin login
4. Admin stats endpoint works
5. Stats shows 6 students
6. Overall attendance computed
7. Teacher has subjects
8. Teacher creates class
9. QR data URL generated
10. QR rotation works
11. Class has QR token
12. Student scans QR → attendance marked
13. Duplicate scan rejected (one-scan-only)
14. Student attendance view
15. Student has recorded attendance
16. Teacher manually marks student
17. Teacher report has all students
18. Teacher closes class
19. Scan after close rejected
20. Student timetable
21. Admin creates user + subject + backup

**Run with:** `node e2e-test.js` (requires server running)

---

# PART E — HOW IT ALL CONNECTS (One Complete Example)

Let's trace one complete user action — **"Teacher creates a QR session"**:

| Step | File | What happens |
|------|------|-------------|
| 1 | `TeacherDashboard.jsx` | User clicks "+ New Class / QR Session", form appears |
| 2 | `TeacherDashboard.jsx` | User fills form, clicks "Create Class + QR" |
| 3 | `services/api.js` | `teacherCreateClass()` sends POST /api/teacher/classes |
| 4 | `vite.config.js` | Proxy forwards request to localhost:5000 |
| 5 | `routes/teacher.js` | Verifies teacher role (middleware), inserts class row, generates QR token + image |
| 6 | `config/db.js` | Saves class to SQLite database |
| 7 | `TeacherDashboard.jsx` | Redirects to `/teacher/qr/:id` |
| 8 | `TeacherQRCode.jsx` | Displays QR with 30s countdown, auto-rotates via `teacherRotateQR()` |
| 9 | **Student phone:** `StudentDashboard.jsx` | Clicks "Open Scanner" |
| 10 | `components/QRScanner.jsx` | Camera activates, decodes QR JSON |
| 11 | `services/api.js` | `scanQR()` sends POST /api/student/scan |
| 12 | `routes/student.js` | Runs 4 security checks, inserts attendance record |
| 13 | `StudentDashboard.jsx` | Shows ✅ success message |
| 14 | `TeacherDashboard.jsx` (refreshed) | Active Sessions shows present count incremented |

That single flow touches **12 different files** working together — this is the full-stack architecture in action.

