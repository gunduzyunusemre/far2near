import rateLimit from 'express-rate-limit';

export const httpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 180, // 180 requests per minute
  message: { error: 'Çok fazla istek gönderildi, lütfen biraz bekleyin.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

export const createRoomRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // max 20 rooms created per hour per IP
  message: { error: 'Oda oluşturma sınırına ulaştınız, lütfen daha sonra tekrar deneyin.' },
  validate: { xForwardedForHeader: false },
});
