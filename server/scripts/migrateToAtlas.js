const mongoose = require('mongoose');
const { MongoClient } = mongoose.mongo;
require('dotenv').config({ path: '../.env' });

async function migrate() {
  const localUri = process.env.MONGO_URI;
  const atlasUri = process.env.ATLAS_URI;

  if (!localUri) {
    console.error('Missing MONGO_URI in .env');
    process.exit(1);
  }
  if (!atlasUri) {
    console.error('Missing ATLAS_URI in .env');
    process.exit(1);
  }

  console.log('Connecting to Local Database...');
  const localClient = new MongoClient(localUri);
  await localClient.connect();
  // If MONGO_URI has a db specified, localClient.db() uses it
  const localDb = localClient.db();
  console.log(`Connected to local DB: ${localDb.databaseName}`);

  console.log('Connecting to Atlas Database...');
  const atlasClient = new MongoClient(atlasUri);
  await atlasClient.connect();
  const atlasDb = atlasClient.db();
  console.log(`Connected to Atlas DB: ${atlasDb.databaseName}`);

  const collections = await localDb.listCollections().toArray();
  
  for (const collInfo of collections) {
    const collName = collInfo.name;
    if (collName.startsWith('system.')) continue;
    
    console.log(`\nProcessing collection: ${collName}`);
    const localColl = localDb.collection(collName);
    const atlasColl = atlasDb.collection(collName);
    
    const docs = await localColl.find({}).toArray();
    if (docs.length > 0) {
      // Clear the target collection safely if it exists to avoid Duplicate Key (_id) collisions
      try {
        await atlasColl.drop();
        console.log(`  -> Cleared existing collection in Atlas.`);
      } catch(e) { 
        // Ignore drop errors (usually means collection doesn't exist yet)
      }

      await atlasColl.insertMany(docs);
      console.log(`  -> Successfully copied ${docs.length} documents.`);
    } else {
      console.log(`  -> Collection is empty, skipping.`);
    }
  }

  console.log('\nMigration completed successfully!');
  await localClient.close();
  await atlasClient.close();
}

migrate().catch(err => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
