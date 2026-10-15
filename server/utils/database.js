const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
  quiet: true
});

const EXPECTED_DATABASE = 'sapes_dev';

const getCloudMongoUri = () => {
  const uri = process.env.MONGO_URI?.trim();
  if (!uri) {
    throw new Error('MONGO_URI is required in server/.env');
  }

  let parsedUri;
  try {
    parsedUri = new URL(uri);
  } catch {
    throw new Error('MONGO_URI must be a valid MongoDB connection string');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(parsedUri.protocol)) {
    throw new Error('MONGO_URI must use the MongoDB protocol');
  }

  if (
    ['localhost', '127.0.0.1', '::1'].includes(parsedUri.hostname.toLowerCase())
    || parsedUri.hostname.toLowerCase().endsWith('.local')
  ) {
    throw new Error('MONGO_URI must point to the cloud database, not a local MongoDB server');
  }

  const databaseName = decodeURIComponent(parsedUri.pathname.replace(/^\/+/, '').split('/')[0] || '');
  if (databaseName !== EXPECTED_DATABASE) {
    throw new Error(`MONGO_URI must select the ${EXPECTED_DATABASE} database`);
  }

  return uri;
};

const connectCloudDatabase = (options = {}) =>
  mongoose.connect(getCloudMongoUri(), options);

module.exports = { connectCloudDatabase, getCloudMongoUri };
