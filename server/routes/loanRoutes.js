const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  applyForLoan,
  getMyLoans,
  listAllLoans,
  getLoanById,
  approveLoan,
  rejectLoan,
  payInstallment,
} = require('../controllers/loanController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

const loanActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many loan actions, please slow down' },
});

router.post(
  '/',
  [
    body('disbursalAccount').notEmpty().withMessage('disbursalAccount is required'),
    body('principal').isFloat({ gt: 0 }).withMessage('principal must be a positive number'),
    body('termMonths').isInt({ min: 1, max: 360 }).withMessage('termMonths must be between 1 and 360'),
  ],
  validate,
  asyncHandler(applyForLoan)
);

router.get('/mine', asyncHandler(getMyLoans));
router.get('/all', authorize('employee', 'admin'), asyncHandler(listAllLoans));
router.get('/:id', asyncHandler(getLoanById));

router.patch(
  '/:id/approve',
  authorize('employee', 'admin'),
  loanActionLimiter,
  [body('annualInterestRate').isFloat({ min: 0, max: 100 }).withMessage('annualInterestRate must be between 0 and 100')],
  validate,
  asyncHandler(approveLoan)
);

router.patch('/:id/reject', authorize('employee', 'admin'), asyncHandler(rejectLoan));

router.post(
  '/:id/pay',
  loanActionLimiter,
  [body('account').notEmpty().withMessage('account is required')],
  validate,
  asyncHandler(payInstallment)
);

module.exports = router;
