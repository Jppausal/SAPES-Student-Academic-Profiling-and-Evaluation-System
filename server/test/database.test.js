const assert = require('node:assert/strict');
const test = require('node:test');
const { getCloudMongoUri } = require('../utils/database');

function setMongoUri(t, uri) {
  const previous = process.env.MONGO_URI;
  const previousAtlas = process.env.ATLAS_URI;
  delete process.env.ATLAS_URI;
  if (uri === undefined) delete process.env.MONGO_URI;
  else process.env.MONGO_URI = uri;
  t.after(() => {
    if (previous === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previous;
    if (previousAtlas === undefined) delete process.env.ATLAS_URI;
    else process.env.ATLAS_URI = previousAtlas;
  });
}

test('requires the cloud connection string', t => {
  setMongoUri(t, undefined);
  assert.throws(() => getCloudMongoUri(), /MONGO_URI is required/);
});

test('rejects local MongoDB hosts and any database other than sapes_dev', t => {
  setMongoUri(t, 'mongodb://127.0.0.1:27017/sapes_dev');
  assert.throws(() => getCloudMongoUri(), /not a local MongoDB server/);

  process.env.MONGO_URI = 'mongodb+srv://test:password@cluster.example.mongodb.net/other';
  assert.throws(() => getCloudMongoUri(), /must select the sapes_dev database/);
});

test('accepts a cloud MongoDB URI targeting sapes_dev', t => {
  const uri = 'mongodb+srv://test:password@cluster.example.mongodb.net/sapes_dev?retryWrites=true&w=majority';
  setMongoUri(t, uri);
  assert.equal(getCloudMongoUri(), uri);
});
