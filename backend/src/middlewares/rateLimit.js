function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000;
  const maxRequests = options.maxRequests || 10;
  const message = options.message || "Too many requests. Please try again later.";
  const buckets = new Map();

  function getClientKey(req) {
    return req.ip || req.socket?.remoteAddress || "unknown";
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = getClientKey(req);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;

    if (current.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        message,
        status: 429,
      });
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
};
