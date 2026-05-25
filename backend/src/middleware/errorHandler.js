const { NODE_ENV } = require('../config/env');

module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}: ${message}`);
  if (NODE_ENV === 'development' && err.stack) console.error(err.stack);

  res.status(status).json({
    error: message,
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
};
