const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./config/db');
const { initSchema } = require('./models/schema');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');

const app = express();
const PORT = process.env.PORT || 5000;

// Init DB schema
initSchema();

// Auto-seed if the database is empty (first run on hosted platforms with ephemeral storage)
function ensureSeedData() {
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    if (count === 0) {
      console.log('🌱 Database empty — running auto-seed...');
      // Run seed inline (don't exit process)
      require('./seed-once')();
    }
  } catch (err) {
    console.error('Auto-seed check failed:', err.message);
  }
}
ensureSeedData();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), app: 'Smart Attendance API' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);

// Serve client build in production
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));

  // SPA fallback — send index.html for any non-API route
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Smart Attendance API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

