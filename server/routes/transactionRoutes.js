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
  message: { message: 'Too many transfer attempts, please slow down' },
});

router.post(
  '/transfer',
  transferLimiter,
  [
    body('fromAccount').notEmpty().withMessage('fromAccount is required'),
    body('toAccountNumber').notEmpty().withMessage('toAccountNumber is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  ],
  validate,
  asyncHandler(transferFunds)
);

router.post(
  '/deposit',
  transferLimiter,
  [
    body('account').notEmpty().withMessage('account is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  ],
  validate,
  asyncHandler(depositFunds)
);

router.get('/mine', asyncHandler(getMyTransactions));
router.get('/all', authorize('employee', 'admin'), asyncHandler(listAllTransactions));

module.exports = router;
