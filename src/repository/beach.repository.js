const BaseRepository = require('./base.repository');
const { Beach } = require('../models');

class BeachRepository extends BaseRepository {
  constructor() {
    super(Beach);
  }

  async findActiveBeaches(query) {
    const {
      page = 1,
      limit = 10,
      city,
      isActive = true,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const filter = { isActive };
    if (city) filter['location.city'] = city;

    const sort = {};
    sort[sortBy] = order === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [beaches, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email'),
      this.model.countDocuments(filter),
    ]);

    return {
      beaches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get beaches ranked by severity score
   */
  async getSeverityRanking(limit = 10) {
    return this.model
      .find({ isActive: true })
      .sort({ 'analytics.severityScore': -1 })
      .limit(limit)
      .select(
        'name location.city analytics.severityScore analytics.severityLevel analytics.totalWasteCollected'
      );
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    const stats = await this.model.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalBeaches: { $sum: 1 },
          totalWasteAll: { $sum: '$analytics.totalWasteCollected' },
          totalCleanupsAll: { $sum: '$analytics.totalCleanups' },
          avgSeverity: { $avg: '$analytics.severityScore' },
          mostPolluted: { $max: '$analytics.severityScore' },
        },
      },
    ]);

    return stats[0] || null;
  }
}

module.exports = new BeachRepository();
