const { requireAuth } = require('../src/middleware/auth.middleware');
const { generateAccessToken, ACCESS_SECRET } = require('../src/utils/tokens');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user.model');

jest.mock('../src/models/user.model');

describe('HTTP Authentication Middleware (auth.middleware.js)', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('rejects requests with missing Authorization header', async () => {
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.stringContaining('Missing or malformed Bearer token'),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts access token signed with JWT_ACCESS_SECRET and populates req.user', async () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      name: 'Priyavardhan Singh',
      email: 'priyavardhan@safesafar.test',
      phone: '9876543210',
    };

    User.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(mockUser),
    });

    const token = generateAccessToken(mockUser);
    req.headers.authorization = `Bearer ${token}`;

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user._id).toBe(mockUser._id);
    expect(req.user.id).toBe(mockUser._id);
    expect(req.user.name).toBe(mockUser.name);
    expect(req.user.phone).toBe(mockUser.phone);
    expect(req.user.email).toBe(mockUser.email);
  });

  it('rejects token signed with an invalid/unrelated secret', async () => {
    const fakeToken = jwt.sign(
      { userId: '507f1f77bcf86cd799439011' },
      'wrong_unrelated_secret_key_12345678'
    );
    req.headers.authorization = `Bearer ${fakeToken}`;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Authentication failed. Token is invalid.',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects expired access token with appropriate error message', async () => {
    const expiredToken = jwt.sign(
      { userId: '507f1f77bcf86cd799439011' },
      ACCESS_SECRET,
      { expiresIn: '-1s' }
    );
    req.headers.authorization = `Bearer ${expiredToken}`;

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Authentication failed. Token has expired.',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
