const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  transferFunds,
  depositFunds,
  getMyTransactions,
  listAllTransactions,
} = require('../controllers/transactionController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

const transferLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  // Per authenticated user (protect() runs first), so users behind one proxy/NAT do not share a bucket.
  keyGenerator: (req) => String(req.user._id),
  message: { message: 'Too many transfer attempts. Please wait a minute and try again.' },
});

router.post(
  '/transfer',
  transferLimiter,
  [
    body('fromAccount').isMongoId().withMessage('fromAccount is required'),
    body('toAccountNumber').isString().notEmpty().withMessage('toAccountNumber is required'),
    body('description').optional().isString().isLength({ max: 200 }),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
    body('clientRef').optional().isString().isLength({ max: 100 }),
  ],
  validate,
  asyncHandler(transferFunds)
);

router.post(
  '/deposit',
  transferLimiter,
  [
    body('account').isMongoId().withMessage('account is required'),
    body('description').optional().isString().isLength({ max: 200 }),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
    body('clientRef').optional().isString().isLength({ max: 100 }),
  ],
  validate,
  asyncHandler(depositFunds)
);

router.get('/mine', asyncHandler(getMyTransactions));
router.get('/all', authorize('employee', 'admin'), asyncHandler(listAllTransactions));

module.exports = router;
