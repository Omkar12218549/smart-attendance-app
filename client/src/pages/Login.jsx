import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (email, password) => setForm({ email, password });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo-badge">📋</div>
        <h1>Smart Attendance</h1>
        <p className="subtitle">QR-based attendance made smart</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@college.edu"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted">
          New student? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Register here</Link>
        </div>

        <div className="mt-8" style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 16 }}>
          <div className="text-sm text-muted mb-2 font-bold">Demo accounts (quick fill):</div>
          <div className="flex-between" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => quickFill('admin@college.edu', 'admin123')}>🛡️ Admin</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => quickFill('teacher@college.edu', 'teacher123')}>👨‍🏫 Teacher</button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => quickFill('student@college.edu', 'student123')}>🎓 Student</button>
          </div>
        </div>
      </div>
    </div>
  );
}

