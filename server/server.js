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
  const fallbackUri = process.env.LOCAL_MONGO_URI || (process.env.ATLAS_URI ? process.env.MONGO_URI : null);

  if (process.env.ATLAS_URI) {
    try {
      console.log('Attempting to connect to primary MongoDB (Atlas)...');
      await mongoose.connect(process.env.ATLAS_URI, { serverSelectionTimeoutMS: 5000 });
      console.log(`Successfully connected to MongoDB Atlas (Database: ${mongoose.connection.name})`);
      return;
    } catch (err) {
      console.log(`Atlas connection failed (${err.message}). Falling back to local MongoDB...`);
    }
  }

  if (fallbackUri) {
    try {
      await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 5000 });
      console.log(`Successfully connected to local MongoDB (Database: ${mongoose.connection.name})`);
      return;
    } catch (localErr) {
      console.error('Failed to connect to local database:', localErr.message);
    }
  } else if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
      console.log(`Successfully connected to MongoDB (Database: ${mongoose.connection.name})`);
      return;
    } catch (mongoErr) {
      console.error('Failed to connect to MongoDB:', mongoErr.message);
    }
  }

  console.error('No valid database connection could be established.');
};
connectDB();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
