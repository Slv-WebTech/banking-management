const express = require('express');
const {
  listUsers,
  updateUserStatus,
  updateUserRole,
  systemReport,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/users', asyncHandler(listUsers));
router.patch('/users/:id/status', asyncHandler(updateUserStatus));
router.patch('/users/:id/role', asyncHandler(updateUserRole));
router.get('/report', asyncHandler(systemReport));

module.exports = router;
