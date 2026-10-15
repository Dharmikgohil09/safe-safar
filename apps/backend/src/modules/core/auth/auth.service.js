const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../../config/env');
const User = require('../../../models/user.model');

const SALT_ROUNDS = 12;

const hashPin = async (pin) => {
  return await bcrypt.hash(pin, SALT_ROUNDS);
};

const verifyPin = async (pin, hashedPin) => {
  return await bcrypt.compare(pin, hashedPin);
};

const generateToken = (userId, phone) => {
  return jwt.sign(
    { userId, phone },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const registerUser = async ({ phone, name, pin, emergencyNote }) => {
  const normalizedPhone = phone.trim();

  // Check if user already exists
  const existingUser = await User.findOne({ phone: normalizedPhone });
  if (existingUser) {
    const error = new Error('A user with this phone number is already registered.');
    error.statusCode = 409;
    throw error;
  }

  const hashedPin = await hashPin(pin);

  const newUser = await User.create({
    phone: normalizedPhone,
    name: name.trim(),
    pin: hashedPin,
    emergencyNote: emergencyNote ? emergencyNote.trim() : ''
  });

  const token = generateToken(newUser._id.toString(), newUser.phone);

  return {
    user: {
      _id: newUser._id.toString(),
      phone: newUser.phone,
      name: newUser.name,
      emergencyNote: newUser.emergencyNote,
      createdAt: newUser.createdAt
    },
    token
  };
};

const loginUser = async ({ phone, pin }) => {
  const normalizedPhone = phone.trim();

  // Explicitly include +pin which is excluded by default
  const user = await User.findOne({ phone: normalizedPhone }).select('+pin');

  // Prevent account enumeration: do not disclose whether phone or PIN was incorrect
  if (!user) {
    const error = new Error('Invalid phone or PIN.');
    error.statusCode = 401;
    throw error;
  }

  const isPinValid = await verifyPin(pin, user.pin);
  if (!isPinValid) {
    const error = new Error('Invalid phone or PIN.');
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user._id.toString(), user.phone);

  return {
    user: {
      _id: user._id.toString(),
      phone: user.phone,
      name: user.name,
      emergencyNote: user.emergencyNote,
      createdAt: user.createdAt
    },
    token
  };
};

module.exports = {
  registerUser,
  loginUser,
  hashPin,
  verifyPin,
  generateToken
};
