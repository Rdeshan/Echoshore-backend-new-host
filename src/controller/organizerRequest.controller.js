const organizerRequestService = require('../service/organizerRequest.service');
const { AppError } = require('../utils/AppError');

class OrganizerRequestController {
  /**
   * Create organizer request
   * POST /organizer-requests
   */
  async createRequest(req, res, next) {
    try {
      const {
        reason,
        currentWorkingDetails,
        pastEventsOrganized,
        experience,
        workedOrganizations,
      } = req.body;
      const userId = req.user.id;

      const requestData = {
        reason,
        currentWorkingDetails,
        pastEventsOrganized,
        experience,
        workedOrganizations,
      };

      const request = await organizerRequestService.createRequest(
        userId,
        requestData
      );

      res.status(201).json({
        success: true,
        message: 'Organizer request submitted successfully',
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all organizer requests (Admin only)
   * GET /organizer-requests
   */
  async getAllRequests(req, res, next) {
    try {
      const { status, page = 1, limit = 10 } = req.query;

      const filters = {};
      if (status) filters.status = status;

      const result = await organizerRequestService.getAllRequests(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's own request
   * GET /organizer-requests/me
   */
  async getMyRequest(req, res, next) {
    try {
      const userId = req.user.id;

      const request = await organizerRequestService.getUserRequest(userId);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'No organizer request found',
        });
      }

      res.status(200).json({
        success: true,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Review organizer request (Admin only)
   * PATCH /organizer-requests/:id/review
   */
  async reviewRequest(req, res, next) {
    try {
      const { id } = req.params;
      const { action, rejectionReason } = req.body;
      const adminId = req.user.id;

      const request = await organizerRequestService.reviewRequest(
        id,
        adminId,
        action,
        rejectionReason
      );

      res.status(200).json({
        success: true,
        message: `Request ${action.toLowerCase()}ed successfully`,
        data: request,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete organizer request
   * DELETE /organizer-requests/:id
   */
  async deleteRequest(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await organizerRequestService.deleteRequest(id, userId);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OrganizerRequestController();
