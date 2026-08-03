import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleConfig = {
  student: {
    icon: '🎓',
    label: 'Student',
    nav: [
      { to: '/student', label: 'Dashboard', icon: '🏠', end: true },
      { to: '/student/attendance', label: 'Attendance', icon: '📊' },
      { to: '/student/timetable', label: 'Timetable', icon: '🗓️' },
    ],
  },
  teacher: {
    icon: '👨‍🏫',
    label: 'Teacher',
    nav: [
      { to: '/teacher', label: 'Dashboard', icon: '🏠', end: true },
    ],
  },
  admin: {
    icon: '🛡️',
    label: 'Admin',
    nav: [
      { to: '/admin', label: 'Dashboard', icon: '🏠', end: true },
      { to: '/admin/users', label: 'Users', icon: '👥' },
      { to: '/admin/subjects', label: 'Subjects', icon: '📚' },
    ],
  },
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const cfg = roleConfig[user.role];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const pageTitles = {
    '/student': 'Student Dashboard',
    '/student/attendance': 'My Attendance',
    '/student/timetable': 'Timetable',
    '/teacher': 'Teacher Dashboard',
    '/teacher/qr': 'QR Attendance',
    '/teacher/class': 'Class Detail',
    '/admin': 'Admin Dashboard',
    '/admin/users': 'Manage Users',
    '/admin/subjects': 'Manage Subjects',
  };
  const pathname = window.location.pathname;
  const title = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([k]) => pathname.startsWith(k))?.[1] || 'Smart Attendance';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="icon">📋</div>
          <span>SmartAttendance</span>
        </div>
        <nav>
          {cfg.nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="name">{user.name}</div>
              <div className="role">{cfg.label}</div>
            </div>
          </div>
          <button className="btn btn-secondary btn-block btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <div className="topbar">
          <h2>{title}</h2>
          <span className="date">{today}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

