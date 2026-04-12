const wasteRecordService = require('../service/wasteRecord.service');
const catchAsync = require('../utils/catchAsync');
const ResponseHandler = require('../utils/responseHandler');

class WasteRecordController {
  /**
   * Helper method to format waste record response
   */
  formatWasteRecordResponse(record) {
    return {
      id: record._id,
      beachId: record.beachId,
      beach: record.beachId
        ? {
            id: record.beachId._id || record.beachId,
            name: record.beachId?.name,
          }
        : null,
      eventId: record.eventId,
      plasticType: record.plasticType,
      weight: record.weight,
      source: record.source,
      weather: record.weather,
      collectionDate: record.collectionDate,
      carbonOffset: record.carbonOffset,
      recordedBy: record.recordedBy,
      isVerified: record.isVerified,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Create new waste record
   */
  createWasteRecord = catchAsync(async (req, res) => {
    const record = await wasteRecordService.createWasteRecord(
      req.body,
      req.user.id
    );

    return ResponseHandler.created(
      res,
      {
        record: this.formatWasteRecordResponse(record),
      },
      'Waste record created successfully'
    );
  });

  /**
   * Get all waste records
   */
  getWasteRecords = catchAsync(async (req, res) => {
    const result = await wasteRecordService.getAllWasteRecords(req.query);

    const formattedRecords = result.records.map((record) =>
      this.formatWasteRecordResponse(record)
    );

    return ResponseHandler.paginated(
      res,
      formattedRecords,
      req.query.page || 1,
      req.query.limit || 20,
      result.pagination.total,
      'Waste records retrieved successfully'
    );
  });

  /**
   * Get waste record by ID
   */
  getWasteRecordById = catchAsync(async (req, res) => {
    const record = await wasteRecordService.getWasteRecordById(
      req.params.recordId
    );

    return ResponseHandler.success(
      res,
      {
        record: this.formatWasteRecordResponse(record),
      },
      'Waste record retrieved successfully'
    );
  });

  /**
   * Update waste record
   */
  updateWasteRecord = catchAsync(async (req, res) => {
    const record = await wasteRecordService.updateWasteRecord(
      req.params.recordId,
      req.body,
      req.user.id
    );

    return ResponseHandler.success(
      res,
      {
        record: this.formatWasteRecordResponse(record),
      },
      'Waste record updated successfully'
    );
  });

  /**
   * Delete waste record
   */
  deleteWasteRecord = catchAsync(async (req, res) => {
    await wasteRecordService.deleteWasteRecord(req.params.recordId);

    return ResponseHandler.success(
      res,
      null,
      'Waste record deleted successfully'
    );
  });

  /**
   * Verify waste record
   */
  verifyWasteRecord = catchAsync(async (req, res) => {
    const record = await wasteRecordService.verifyWasteRecord(
      req.params.recordId,
      req.user.id
    );

    return ResponseHandler.success(
      res,
      {
        record: this.formatWasteRecordResponse(record),
      },
      'Waste record verified successfully'
    );
  });

  /**
   * Get waste by plastic type
   */
  getWasteByPlasticType = catchAsync(async (req, res) => {
    const { beachId, startDate, endDate } = req.query;
    const data = await wasteRecordService.getWasteByPlasticType(
      beachId,
      startDate,
      endDate
    );

    return ResponseHandler.success(
      res,
      {
        plasticTypeData: data,
      },
      'Plastic type analytics retrieved successfully'
    );
  });

  /**
   * Get monthly trends
   */
  getMonthlyTrends = catchAsync(async (req, res) => {
    const { beachId, months = 12 } = req.query;
    const trends = await wasteRecordService.getMonthlyTrends(beachId, months);

    return ResponseHandler.success(
      res,
      {
        trends,
      },
      'Monthly trends retrieved successfully'
    );
  });

  /**
   * Agent portal: submit a waste record (agent only)
   */
  submitWasteRecord = catchAsync(async (req, res) => {
    const record = await wasteRecordService.submitWasteRecord(
      req.user,
      req.body
    );
    return ResponseHandler.created(
      res,
      { record },
      'Waste record submitted successfully'
    );
  });

  /**
   * Agent portal: get own submission history (agent only)
   */
  getMySubmissions = catchAsync(async (req, res) => {
    const result = await wasteRecordService.getMySubmissions(
      req.user,
      req.query
    );
    return ResponseHandler.paginated(
      res,
      result.records,
      req.query.page || 1,
      req.query.limit || 20,
      result.pagination.total,
      'Submissions retrieved successfully'
    );
  });
}

module.exports = new WasteRecordController();
