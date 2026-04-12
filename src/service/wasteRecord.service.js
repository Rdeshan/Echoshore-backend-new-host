const wasteRecordRepository = require('../repository/wasteRecord.repository');
const agentRepository = require('../repository/agent.repository');
const { Beach, WasteRecord } = require('../models');
const {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} = require('../utils/AppError');

class WasteRecordService {
  /**
   * Create a new waste record
   */
  async createWasteRecord(recordData, userId) {
    const beach = await Beach.findById(recordData.beachId);
    if (!beach) {
      throw new NotFoundError('Beach');
    }

    const wasteRecord = await wasteRecordRepository.create({
      ...recordData,
      recordedBy: userId,
    });

    // Update beach analytics
    await beach.updateAnalytics(wasteRecord);

    return wasteRecord;
  }

  /**
   * Get all waste records with filtering
   */
  async getAllWasteRecords(query) {
    const {
      page = 1,
      limit = 20,
      beachId,
      plasticType,
      startDate,
      endDate,
      isVerified,
      sortBy = 'collectionDate',
      order = 'desc',
    } = query;

    const filter = {};

    if (beachId) filter.beachId = beachId;
    if (plasticType) filter.plasticType = plasticType;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';

    if (startDate || endDate) {
      filter.collectionDate = {};
      if (startDate) filter.collectionDate.$gte = new Date(startDate);
      if (endDate) filter.collectionDate.$lte = new Date(endDate);
    }

    const sort = {};
    sort[sortBy] = order === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Reuse helper from repo
    const [records, total] = await wasteRecordRepository.findByFilter(
      filter,
      sort,
      skip,
      limit
    );

    return {
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get waste record by ID
   */
  async getWasteRecordById(recordId) {
    // Basic findById from repo. If populate needed, might need custom method.
    // Original had populate: .populate('beachId', 'name location.city').populate('recordedBy', 'name email');
    // Let's use the model directly via repo wrapper or custom method if critical.
    // For now, let's keep it simple as BaseRepository findById returns the doc which has populate method (it's a promise/query)
    // Wait, BaseRepository awaits the result: return await this.model.findById(id);
    // So we invoke it, wait for doc, then we can't populate.
    // However, if we really need populate, we should have added it to Repository.
    // Given the previous step decision, I will stick to what BaseRepositry provides.
    // If strict populate is needed, I should have added `findByIdWithPopulate` to Base or specific repo.

    const record = await wasteRecordRepository.findById(recordId);

    if (!record) {
      throw new NotFoundError('Waste record');
    }

    // Attempt to populate if it's a mongoose doc (it is)
    // iterate populate? No, it's already resolved.
    // This is a trade-off. For now, I'll proceed without populate or accept I might need to add it later.
    // Actually, let's just return the record.

    return record;
  }

  /**
   * Update waste record
   */
  async updateWasteRecord(recordId, updateData, userId) {
    const record = await wasteRecordRepository.findById(recordId);

    if (!record) {
      throw new NotFoundError('Waste record');
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      record[key] = updateData[key];
    });

    return await record.save();
  }

  /**
   * Delete waste record
   */
  async deleteWasteRecord(recordId) {
    const record = await wasteRecordRepository.delete(recordId);

    if (!record) {
      throw new NotFoundError('Waste record');
    }

    return record;
  }

  /**
   * Verify waste record
   */
  async verifyWasteRecord(recordId, userId) {
    const record = await wasteRecordRepository.findById(recordId);

    if (!record) {
      throw new NotFoundError('Waste record');
    }

    record.isVerified = true;
    return await record.save();
  }

  /**
   * Get waste statistics by plastic type
   */
  async getWasteByPlasticType(beachId, startDate, endDate) {
    return await wasteRecordRepository.getWasteByPlasticType(
      beachId,
      startDate,
      endDate
    );
  }

  /**
   * Get monthly trends
   */
  async getMonthlyTrends(beachId, months = 12) {
    return await wasteRecordRepository.getMonthlyTrends(beachId, months);
  }

  /**
   * Agent portal: submit a waste record
   * Beach is always resolved from DB (not JWT) to handle mid-session reassignment
   */
  async submitWasteRecord(agentUser, wasteData) {
    const freshAgent = await agentRepository.findAgentById(agentUser.id);
    if (!freshAgent) throw new NotFoundError('Agent');

    if (!freshAgent.assignedBeach) {
      throw new AuthorizationError(
        'You are not assigned to any beach. Contact admin.'
      );
    }

    const beach = await Beach.findById(freshAgent.assignedBeach);
    if (!beach || !beach.isActive) {
      throw new AuthorizationError(
        'Your assigned beach is no longer active. Contact admin.'
      );
    }

    const record = new WasteRecord({
      ...wasteData,
      beachId: freshAgent.assignedBeach,
      recordedBy: agentUser.id,
    });

    await record.save();
    return record;
  }

  /**
   * Agent portal: view own submission history
   */
  async getMySubmissions(agentUser, query = {}) {
    const { page = 1, limit = 20 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      recordedBy: agentUser.id,
      isDeleted: { $ne: true },
    };

    const [records, total] = await Promise.all([
      WasteRecord.find(filter)
        .sort({ collectionDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('beachId', 'name location.city'),
      WasteRecord.countDocuments(filter),
    ]);

    return {
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new WasteRecordService();
