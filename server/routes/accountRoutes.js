const express = require('express');
const { body } = require('express-validator');
const {
  createAccount,
  getMyAccounts,
  getAccountById,
  listAllAccounts,
  requestClosure,
  approveClosure,
  rejectClosure,
} = require('../controllers/accountController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect);

router.post(
  '/',
  [body('accountType').optional().isIn(['Savings', 'Current'])],
  validate,
  asyncHandler(createAccount)
);
router.get('/mine', asyncHandler(getMyAccounts));
router.get('/all', authorize('employee', 'admin'), asyncHandler(listAllAccounts));
router.get('/:id', asyncHandler(getAccountById));
router.post('/:id/request-closure', asyncHandler(requestClosure));
router.post('/:id/approve-closure', authorize('employee', 'admin'), asyncHandler(approveClosure));
router.post('/:id/reject-closure', authorize('employee', 'admin'), asyncHandler(rejectClosure));

module.exports = router;
