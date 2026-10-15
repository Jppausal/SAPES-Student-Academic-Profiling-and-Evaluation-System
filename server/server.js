const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('node:path');
const dns = require('node:dns');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const studentRoutes = require('./routes/studentRoutes');
const facultyEvaluationRoutes = require('./routes/facultyEvaluationRoutes');
const authRoutes = require('./routes/authRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const userRoutes = require('./routes/userRoutes');
const meRoutes = require('./routes/meRoutes');
const permissionRoutes = require('./routes/permissionRoutes');

const app = express();

app.use(cors());
app.use(express.json());


app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  return res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'degraded',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty-evaluations', facultyEvaluationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/me', meRoutes);
app.use('/api/permissions', permissionRoutes);

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  const jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required. Set a unique secret in server/.env before starting the API.');
  }

  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    throw new Error('MONGO_URI is required. Copy server/.env.example to server/.env and configure a MongoDB connection.');
  }

  const dnsServers = (process.env.MONGO_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
  }

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exitCode = 1;
});
