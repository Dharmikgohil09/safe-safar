const authService = require('./auth.service');

const register = async (req, res, next) => {
  try {
    const { phone, name, pin, emergencyNote } = req.body;
    const result = await authService.registerUser({ phone, name, pin, emergencyNote });

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { phone, pin } = req.body;
    const result = await authService.loginUser({ phone, pin });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
};

module.exports = {
  register,
  login,
  me
};
