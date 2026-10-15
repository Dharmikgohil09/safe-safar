/**
 * SafeSafar - Landmark Mongo Seeding Script
 * Owner: Dhruv Raval (Maps and Routing)
 *
 * Seeds the extracted Surat safety landmarks into MongoDB Atlas collection 'landmarks'
 * with a 2dsphere geospatial index on 'location'.
 */

const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/safesafar';
const JSON_PATH = path.join(__dirname, 'surat_landmarks.json');

async function seedLandmarks() {
  console.log('Seeding SafeSafar Landmarks to MongoDB...');
  console.log(`Connecting to: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);

  if (!fs.existsSync(JSON_PATH)) {
    console.error(`Error: Landmarks file not found at ${JSON_PATH}. Run fetch_landmarks.js first.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_PATH, 'utf8');
  const landmarks = JSON.parse(raw);

  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('landmarks');

    // Create 2dsphere geospatial index
    await collection.createIndex({ location: '2dsphere' });
    console.log('Ensured 2dsphere index on "location" field.');

    let insertedCount = 0;
    for (const item of landmarks) {
      const doc = {
        landmarkId: item.id,
        name: item.name,
        type: item.type,
        location: {
          type: 'Point',
          coordinates: item.coordinates // [lng, lat]
        },
        address: item.address,
        phone: item.phone,
        isOpen24Hours: Boolean(item.isOpen24Hours),
        zone: item.zone,
        updatedAt: new Date()
      };

      await collection.updateOne(
        { landmarkId: item.id },
        { $set: doc },
        { upsert: true }
      );
      insertedCount++;
    }

    console.log(`Successfully seeded ${insertedCount} landmarks into MongoDB 'landmarks' collection.`);
  } catch (err) {
    console.error('Mongo seeding error:', err.message);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  seedLandmarks();
}

module.exports = { seedLandmarks };
