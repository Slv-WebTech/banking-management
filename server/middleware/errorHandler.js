function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  // Malformed ids / wrongly-typed fields are client errors, not server faults.
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({ message: err.name === 'CastError' ? `Invalid value for ${err.path}` : 'Invalid input' });
  }
  const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  if (status >= 500) console.error(err);
  const expose = status < 500 || process.env.NODE_ENV !== 'production';
  res.status(status).json({
    message: expose ? err.message || 'Server error' : 'Server error',
    // Stack traces only in explicit development; an unset NODE_ENV must not leak them.
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
