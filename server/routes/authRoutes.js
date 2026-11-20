const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { register, login, me } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many attempts, please try again later' },
});

router.post(
  '/register',
  authLimiter,
  [
    body('name').isString().trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    // bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
    body('password').isString().isLength({ min: 8, max: 72 }).withMessage('Password must be 8-72 characters'),
    body('phone').optional().isString().isLength({ max: 30 }),
  ],
  validate,
  asyncHandler(register)
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  validate,
  asyncHandler(login)
);

router.get('/me', protect, asyncHandler(me));

module.exports = router;
