const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const { generateAccessToken } = require('../src/utils/tokens');

let mongoServer;
let testUserSeq = 1;

const setupTestDB = () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });
};

/**
 * Creates an active, verified test user with a valid access token.
 * Prevents duplicate-key collisions across tests.
 */
const createTestUser = async (overrides = {}) => {
  const seq = testUserSeq++;
  const rawPhone = overrides.phone || `98${String(seq).padStart(8, '0')}`;
  const digits = rawPhone.replace(/\D/g, '');
  const phone = digits.length >= 10 ? digits.slice(-10) : `98765${String(seq).padStart(5, '0')}`;
  const email = overrides.email || `test.user.${seq}.${Date.now()}@safesafar.test`;
  const name = (overrides.name || `Test User ${seq}`).trim();
  const passwordHash = await bcrypt.hash(overrides.pin || overrides.password || '1234', 10);

  const user = await User.create({
    name,
    email: email.toLowerCase().trim(),
    phone,
    passwordHash,
    isEmailVerified: true,
    emergencyNote: overrides.emergencyNote || '',
  });

  const token = generateAccessToken(user);

  return {
    user,
    token,
  };
};

module.exports = {
  setupTestDB,
  createTestUser,
};
