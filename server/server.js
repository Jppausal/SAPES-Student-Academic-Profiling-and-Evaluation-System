const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

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

const connectDB = async () => {
  try {
    console.log('Attempting to connect to primary MongoDB (Atlas)...');
    // It will first try to connect using ATLAS_URI
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('Successfully connected to MongoDB Atlas');
  } catch (err) {
    console.log('Atlas connection failed. Falling back to local MongoDB...');
    try {
      // If Atlas fails, it falls back to LOCAL_MONGO_URI
      await mongoose.connect(process.env.LOCAL_MONGO_URI);
      console.log('Successfully connected to local MongoDB');
    } catch (localErr) {
      console.error('Failed to connect to both Atlas and local databases:', localErr);
    }
  }
};
connectDB();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
