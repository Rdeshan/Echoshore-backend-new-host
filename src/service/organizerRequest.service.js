const OrganizerRequest = require('../models/OrganizerRequest');
const User = require('../models/User');
const chatService = require('./chat.service');
const { ROLES } = require('../constants/roles');
const { AppError } = require('../utils/AppError');
const { validateObjectId } = require('../utils/validators');
const logger = require('../config/logger');

/**
 * OrganizerRequestService (SOLID - Single Responsibility)
 * Handles all business logic for organizer requests
 */
class OrganizerRequestService {
  /**
   * Create a new organizer request
   * Business Rules:
   * - Only VOLUNTEER can apply
   * - Only one pending request per user
   */
  async createRequest(userId, requestData) {
    validateObjectId(userId, 'User ID');

    // Check if user exists and is VOLUNTEER
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.role !== ROLES.VOLUNTEER) {
      throw new AppError('Only volunteers can apply to become organizers', 400);
    }

    // Check for existing pending request
    const existingRequest = await OrganizerRequest.findOne({
      userId,
      status: 'PENDING',
    });

    if (existingRequest) {
      throw new AppError('You already have a pending organizer request', 400);
    }

    // Create request
    const request = await OrganizerRequest.create({
      userId,
      ...requestData,
    });

    return request;
  }

  /**
   * Get all organizer requests (for admin)
   */
  async getAllRequests(filters = {}, page = 1, limit = 10) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      OrganizerRequest.find(query)
        .populate('userId', 'name email phone address nic role')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      OrganizerRequest.countDocuments(query),
    ]);

    return {
      requests,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  /**
   * Get user's own request
   */
  async getUserRequest(userId) {
    validateObjectId(userId, 'User ID');

    const request = await OrganizerRequest.findOne({ userId })
      .populate('userId', 'name email phone address nic role')
      .populate('reviewedBy', 'name email')
      .lean();

    return request;
  }

  /**
   * Review (approve/reject) an organizer request
   * Business Rules:
   * - Only ADMIN can review
   * - On approval: update user role to ORGANIZER
   */
  async reviewRequest(requestId, adminId, action, rejectionReason = null) {
    validateObjectId(requestId, 'Request ID');
    validateObjectId(adminId, 'Admin ID');

    const request = await OrganizerRequest.findById(requestId);

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('This request has already been reviewed', 400);
    }

    const session = await OrganizerRequest.startSession();
    session.startTransaction();

    try {
      // Update request status
      request.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      request.reviewedBy = adminId;
      request.reviewedAt = new Date();

      if (action === 'REJECT' && rejectionReason) {
        request.rejectionReason = rejectionReason;
      }

      await request.save({ session });

      // If approved, update user role
      if (action === 'APPROVE') {
        await User.findByIdAndUpdate(
          request.userId,
          { role: ROLES.ORGANIZER },
          { session }
        );

        // Add to ORGANIZER_PRIVATE group
        try {
          await chatService.addToOrganizerPrivateGroup(
            request.userId.toString()
          );
        } catch (error) {
          logger.error('Failed to add user to organizer private group:', error);
          // Continue even if chat group assignment fails
        }
      }

      await session.commitTransaction();

      // Return populated request
      return await OrganizerRequest.findById(requestId)
        .populate('userId', 'name email phone address nic role')
        .populate('reviewedBy', 'name email')
        .lean();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Delete a pending request
   */
  async deleteRequest(requestId, userId) {
    validateObjectId(requestId, 'Request ID');

    const request = await OrganizerRequest.findById(requestId);

    if (!request) {
      throw new AppError('Request not found', 404);
    }

    if (request.userId.toString() !== userId) {
      throw new AppError('Unauthorized to delete this request', 403);
    }

    if (request.status !== 'PENDING') {
      throw new AppError('Can only delete pending requests', 400);
    }

    await OrganizerRequest.findByIdAndDelete(requestId);

    return { message: 'Request deleted successfully' };
  }
}

module.exports = new OrganizerRequestService();
