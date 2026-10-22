const path = require('node:path');
const mongoose = require('mongoose');
require('dotenv').config({
  path: path.resolve(__dirname, '..', '.env'),
  quiet: true
});

const EXPECTED_DATABASE = 'sapes_dev';

const getCloudMongoUri = () => {
  // Support two environment variables:
  // - MONGO_URI: preferred; must point to cloud (not localhost)
  // - ATLAS_URI: optional fallback when MONGO_URI points to a local dev server
  const rawMongo = process.env.MONGO_URI?.trim();
  const rawAtlas = (process.env.ATLAS_URI || '').trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

  const parseCandidate = (uri) => {
    if (!uri) return null;
    try {
      const parsed = new URL(uri);
      if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) return null;
      const hostname = parsed.hostname.toLowerCase();
      const dbName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '').split('/')[0] || '');
      return { uri, parsed, hostname, dbName };
    } catch {
      return null;
    }
  };

  let candidate = parseCandidate(rawMongo);

  // If MONGO_URI is missing or invalid and ATLAS_URI is provided, use ATLAS_URI
  if (!candidate && rawAtlas) {
    candidate = parseCandidate(rawAtlas);
  }

  if (!candidate) {
    throw new Error('MONGO_URI is required in server/.env');
  }

  const localhostHosts = ['localhost', '127.0.0.1', '::1'];
  const isLocal = localhostHosts.includes(candidate.hostname) || candidate.hostname.endsWith('.local');

  if (isLocal) {
    if (!rawAtlas) {
      throw new Error('MONGO_URI must point to the cloud database, not a local MongoDB server');
    }

    const atlasCandidate = parseCandidate(rawAtlas);
    if (!atlasCandidate) {
      throw new Error('ATLAS_URI is present but invalid');
    }

    candidate = atlasCandidate;
    console.warn('MONGO_URI pointed to localhost; falling back to ATLAS_URI');
  }

  // If the chosen URI doesn't include an explicit database, append the expected database name.
  if (candidate.dbName !== EXPECTED_DATABASE) {
    if (candidate.dbName === '') {
      // Insert the expected database before any query string
      let newUri;
      if (candidate.uri.includes('/?')) {
        newUri = candidate.uri.replace('/?', `/${EXPECTED_DATABASE}?`);
      } else if (candidate.uri.includes('?')) {
        newUri = candidate.uri.replace('?', `/${EXPECTED_DATABASE}?`);
      } else if (candidate.uri.endsWith('/')) {
        newUri = `${candidate.uri}${EXPECTED_DATABASE}`;
      } else {
        newUri = `${candidate.uri}/${EXPECTED_DATABASE}`;
      }
      console.warn(`No database selected in URI — using ${EXPECTED_DATABASE}`);
      return newUri;
    }

    throw new Error(`MONGO_URI must select the ${EXPECTED_DATABASE} database`);
  }

  return candidate.uri;
};

const connectCloudDatabase = (options = {}) =>
  mongoose.connect(getCloudMongoUri(), options);

module.exports = { connectCloudDatabase, getCloudMongoUri };
