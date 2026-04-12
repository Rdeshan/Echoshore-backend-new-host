const express = require('express');
const organizerRequestController = require('../controller/organizerRequest.controller');
const requireAuth = require('../middleware/requireAuth');
const authorizeRoles = require('../middleware/authorizeRoles');
const validate = require('../middleware/validate');
const {
  createOrganizerRequestSchema,
  reviewOrganizerRequestSchema,
} = require('../validation/organizerRequest.validation');
const { ROLES } = require('../constants/roles');

const router = express.Router();

/**
 * @route   POST /organizer-requests
 * @desc    Create organizer request (VOLUNTEER only)
 * @access  Private (VOLUNTEER)
 */
router.post(
  '/',
  requireAuth,
  authorizeRoles(ROLES.VOLUNTEER),
  validate(createOrganizerRequestSchema),
  organizerRequestController.createRequest
);

/**
 * @route   GET /organizer-requests
 * @desc    Get all organizer requests (ADMIN only)
 * @access  Private (ADMIN)
 */
router.get(
  '/',
  requireAuth,
  authorizeRoles(ROLES.ADMIN),
  organizerRequestController.getAllRequests
);

/**
 * @route   GET /organizer-requests/me
 * @desc    Get user's own request
 * @access  Private
 */
router.get('/me', requireAuth, organizerRequestController.getMyRequest);

/**
 * @route   PATCH /organizer-requests/:id/review
 * @desc    Review (approve/reject) organizer request (ADMIN only)
 * @access  Private (ADMIN)
 */
router.patch(
  '/:id/review',
  requireAuth,
  authorizeRoles(ROLES.ADMIN),
  validate(reviewOrganizerRequestSchema),
  organizerRequestController.reviewRequest
);

/**
 * @route   DELETE /organizer-requests/:id
 * @desc    Delete organizer request
 * @access  Private
 */
router.delete('/:id', requireAuth, organizerRequestController.deleteRequest);

module.exports = router;
