function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  const status = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  console.error(err);
  res.status(status).json({
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

module.exports = { notFound, errorHandler };
