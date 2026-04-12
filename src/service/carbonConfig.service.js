const { CarbonConfig } = require('../models');
const { NotFoundError, ValidationError } = require('../utils/AppError');

class CarbonConfigService {
  /**
   * Get active carbon configuration
   */
  async getActiveConfig() {
    const config = await CarbonConfig.getActiveConfig();

    if (!config) {
      // Create default config if none exists
      return await this.createDefaultConfig();
    }

    return config;
  }

  /**
   * Create default configuration
   */
  async createDefaultConfig(userId = null) {
    const config = new CarbonConfig({
      emissionFactor: 2.5,
      name: 'Default Configuration',
      description: 'System default carbon emission factor',
      createdBy: userId || '000000000000000000000000', // System user ID
      isActive: true,
    });

    await config.save();
    return config;
  }

  /**
   * Create new configuration
   */
  async createConfig(configData, userId) {
    const config = await CarbonConfig.createNewConfig(configData, userId);
    return config;
  }

  /**
   * Get all configurations with pagination
   */
  async getAllConfigs(query) {
    const {
      page = 1,
      limit = 10,
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
    } = query;

    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const sort = {};
    sort[sortBy] = order === 'desc' ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [configs, total] = await Promise.all([
      CarbonConfig.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email'),
      CarbonConfig.countDocuments(filter),
    ]);

    return {
      configs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get config by ID
   */
  async getConfigById(configId) {
    const config = await CarbonConfig.findById(configId)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!config) {
      throw new NotFoundError('Carbon configuration');
    }

    return config;
  }

  /**
   * Update config
   */
  async updateConfig(configId, updateData, userId) {
    const config = await CarbonConfig.findById(configId);

    if (!config) {
      throw new NotFoundError('Carbon configuration');
    }

    // Don't allow updating isActive directly - use activate endpoint
    if (updateData.isActive !== undefined) {
      delete updateData.isActive;
    }

    Object.keys(updateData).forEach((key) => {
      config[key] = updateData[key];
    });

    config.updatedBy = userId;
    await config.save();

    return config;
  }

  /**
   * Activate a specific configuration
   */
  async activateConfig(configId, userId) {
    const config = await CarbonConfig.findById(configId);

    if (!config) {
      throw new NotFoundError('Carbon configuration');
    }

    config.isActive = true;
    config.updatedBy = userId;
    await config.save();

    return config;
  }

  /**
   * Reset to default configuration
   */
  async resetToDefault(userId) {
    return await CarbonConfig.resetToDefault(userId);
  }

  /**
   * Delete config (soft delete by deactivating)
   */
  async deleteConfig(configId, userId) {
    const config = await CarbonConfig.findById(configId);

    if (!config) {
      throw new NotFoundError('Carbon configuration');
    }

    config.isActive = false;
    config.validUntil = new Date();
    config.updatedBy = userId;
    await config.save();

    return config;
  }
}

module.exports = new CarbonConfigService();
