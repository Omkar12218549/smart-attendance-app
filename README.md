# 📱 Smart Attendance App

A full-stack Smart Attendance System with **QR-based attendance marking**, role-based dashboards (Admin / Teacher / Student), analytics, and report exports.

## ✨ Features

### 🎓 Student
- Login / Register
- View attendance & percentage per subject
- View timetable
- Low attendance alerts (< 75%)
- Scan QR code to mark attendance (camera)
- Download attendance report (CSV)

### 👨‍🏫 Teacher
- Login
- Create classes & subjects
- Generate **rotating QR codes** (changes every 30s)
- Manually mark / edit attendance
- Export reports (CSV / Print)

### 🛡️ Admin
- Manage teachers, students, subjects
- View analytics dashboard
- Backup database (download JSON)

### 🤖 Smart Attendance (QR)
- QR token expires every **30 seconds**
- **One-scan-only** enforcement (unique record per student/day/subject)
- Optional **GPS verification** when enabled

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcrypt |
| QR | qrcode + html5-qrcode |

## 🚀 Getting Started

### 1. Install dependencies
```bash
cd "attendence app"
npm run setup
```

### 2. Seed the database (creates default users)
```bash
npm run seed
```

### 3. Start server (port 5000) and client (port 5173)
```bash
npm run dev
```

Open **http://localhost:5173**

### Default Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@college.edu` | `admin123` |
| Teacher | `teacher@college.edu` | `teacher123` |
| Student | `student@college.edu` | `student123` |

## 📁 Project Structure

```
attendence app/
├── client/              # React frontend
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
├── server/              # Express backend
│   ├── config/          # DB connection
│   ├── middleware/      # Auth
│   ├── models/          # SQLite schema
│   ├── routes/          # API routes
│   ├── seed.js          # Sample data
│   └── server.js
└── package.json         # Root scripts
```

