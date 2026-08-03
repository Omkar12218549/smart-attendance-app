import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import StudentAttendance from './pages/student/StudentAttendance.jsx';
import StudentTimetable from './pages/student/StudentTimetable.jsx';
import TeacherDashboard from './pages/teacher/TeacherDashboard.jsx';
import TeacherQRCode from './pages/teacher/TeacherQRCode.jsx';
import TeacherClassDetail from './pages/teacher/TeacherClassDetail.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminSubjects from './pages/admin/AdminSubjects.jsx';

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loader">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route path="/student" element={<Protected role="student"><StudentDashboard /></Protected>} />
        <Route path="/student/attendance" element={<Protected role="student"><StudentAttendance /></Protected>} />
        <Route path="/student/timetable" element={<Protected role="student"><StudentTimetable /></Protected>} />
        <Route path="/teacher" element={<Protected role="teacher"><TeacherDashboard /></Protected>} />
        <Route path="/teacher/qr/:id" element={<Protected role="teacher"><TeacherQRCode /></Protected>} />
        <Route path="/teacher/class/:id" element={<Protected role="teacher"><TeacherClassDetail /></Protected>} />
        <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
        <Route path="/admin/users" element={<Protected role="admin"><AdminUsers /></Protected>} />
        <Route path="/admin/subjects" element={<Protected role="admin"><AdminSubjects /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

