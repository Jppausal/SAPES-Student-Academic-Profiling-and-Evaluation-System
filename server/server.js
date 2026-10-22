const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('node:dns');
const { connectCloudDatabase } = require('./utils/database');
const studentRoutes = require('./routes/studentRoutes');
const facultyEvaluationRoutes = require('./routes/facultyEvaluationRoutes');
const authRoutes = require('./routes/authRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const userRoutes = require('./routes/userRoutes');
const meRoutes = require('./routes/meRoutes');
const permissionRoutes = require('./routes/permissionRoutes');
const { syncAllDepartmentMetrics } = require('./utils/departmentMetrics');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'degraded',
    database: databaseConnected ? mongoose.connection.name : 'disconnected'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/students', studentRoutes);
app.use('/api/faculty-evaluations', facultyEvaluationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/me', meRoutes);
app.use('/api/permissions', permissionRoutes);

const startServer = async () => {
  if (!process.env.JWT_SECRET?.trim()) {
    throw new Error('JWT_SECRET is required. Set a unique secret in server/.env before starting the API.');
  }

  const dnsServers = (process.env.MONGO_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
  }

  await connectCloudDatabase({ serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to the cloud database: ${mongoose.connection.name}`);
  await syncAllDepartmentMetrics();
  console.log('Synchronized department enrollment metrics');

  const port = Number(process.env.PORT || 5001);
  const server = app.listen(port, () => console.log(`Server running on port ${port}`));
  server.on('error', (error) => {
    console.error(`Server listen failed: ${error.message}`);
    process.exitCode = 1;
  });
};

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exitCode = 1;
});
