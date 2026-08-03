import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function StudentTimetable() {
  const [timetable, setTimetable] = useState([]);
  const [error, setError] = useState('');
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    api.studentTimetable().then(d => setTimetable(d.timetable)).catch(e => setError(e.message));
  }, []);

  return (
    <div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>
        📅 Today is <strong>{today}</strong>. Check your scheduled classes below.
      </div>

      <div className="grid-2">
        {days.map(day => {
          const slots = timetable.filter(t => t.day === day);
          return (
            <div className="card" key={day} style={{ borderLeft: today === day ? '4px solid var(--primary)' : '4px solid transparent' }}>
              <div className="timetable-day">
                {day} {today === day && <span className="badge badge-primary" style={{ marginLeft: 6 }}>Today</span>}
              </div>
              {slots.length === 0 && <div className="text-sm text-muted">No classes</div>}
              {slots.map(t => (
                <div key={t.id} className="mb-2" style={{ padding: '10px 12px', background: 'var(--gray-50)', borderRadius: 8 }}>
                  <div className="flex-between">
                    <strong style={{ fontSize: '0.9rem' }}>{t.subject_name}</strong>
                    <span className="badge badge-primary">{t.start_time}-{t.end_time}</span>
                  </div>
                  <div className="text-sm text-muted mt-4">
                    {t.room || 'No room'} • {t.teacher_name || 'TBA'}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

