const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Avoid logging sensitive credentials or PINs in error traces
  const safeMessage = err.message || 'An unexpected server error occurred';

  // Specific handling for MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    const keys = Object.keys(err.keyPattern || {});
    const duplicateField = keys[0] || 'field';
    return res.status(409).json({
      success: false,
      error: `A record with this ${duplicateField} already exists.`
    });
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid format for resource identifier: ${err.value}`
    });
  }

  // Handle SyntaxError for bad JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON payload in request body'
    });
  }

  if (process.env.NODE_ENV !== 'test' && statusCode >= 500) {
    console.error('[ServerError]', safeMessage, err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    error: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error. Please try again later.'
      : safeMessage
  });
};

const notFoundHandler = (req, res) => {
  return res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
