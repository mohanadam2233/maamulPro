export function notFound(req, _res, next) {
  next(Object.assign(new Error(`Route not found: ${req.method} ${req.originalUrl}`), { status: 404, code: 'NOT_FOUND' }));
}

export function errorHandler(error, _req, res, _next) {
  if (error.name === 'ValidationError') {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: error.errors } });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, error: { code: 'DUPLICATE_RECORD', message: 'This record already exists', details: error.keyValue } });
  }
  const status = error.status || 500;
  return res.status(status).json({
    success: false,
    error: { code: error.code || 'INTERNAL_ERROR', message: status === 500 ? 'Unexpected server error' : error.message, details: error.details },
  });
}
