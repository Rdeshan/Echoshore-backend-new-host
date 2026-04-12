const carbonConfigService = require('../service/carbonConfig.service');
const catchAsync = require('../utils/catchAsync');
const ResponseHandler = require('../utils/responseHandler');

class CarbonConfigController {
  /**
   * Helper method to format config response
   */
  formatConfigResponse(config) {
    return {
      id: config._id,
      emissionFactor: config.emissionFactor,
      name: config.name,
      description: config.description,
      version: config.version,
      isActive: config.isActive,
      validFrom: config.validFrom,
      validUntil: config.validUntil,
      createdBy: config.createdBy,
      updatedBy: config.updatedBy,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Get active configuration
   */
  getActiveConfig = catchAsync(async (req, res) => {
    const config = await carbonConfigService.getActiveConfig();

    return ResponseHandler.success(
      res,
      {
        config: config ? this.formatConfigResponse(config) : null,
      },
      'Active configuration retrieved successfully'
    );
  });

  /**
   * Create new configuration
   */
  createConfig = catchAsync(async (req, res) => {
    const config = await carbonConfigService.createConfig(
      req.body,
      req.user.id
    );

    return ResponseHandler.created(
      res,
      {
        config: this.formatConfigResponse(config),
      },
      'Configuration created successfully'
    );
  });

  /**
   * Get all configurations
   */
  getConfigs = catchAsync(async (req, res) => {
    const result = await carbonConfigService.getAllConfigs(req.query);

    const formattedConfigs = result.configs.map((config) =>
      this.formatConfigResponse(config)
    );

    return ResponseHandler.paginated(
      res,
      formattedConfigs,
      req.query.page || 1,
      req.query.limit || 10,
      result.pagination.total,
      'Configurations retrieved successfully'
    );
  });

  /**
   * Get configuration by ID
   */
  getConfigById = catchAsync(async (req, res) => {
    const config = await carbonConfigService.getConfigById(req.params.configId);

    return ResponseHandler.success(
      res,
      {
        config: this.formatConfigResponse(config),
      },
      'Configuration retrieved successfully'
    );
  });

  /**
   * Update configuration
   */
  updateConfig = catchAsync(async (req, res) => {
    const config = await carbonConfigService.updateConfig(
      req.params.configId,
      req.body,
      req.user.id
    );

    return ResponseHandler.success(
      res,
      {
        config: this.formatConfigResponse(config),
      },
      'Configuration updated successfully'
    );
  });

  /**
   * Activate configuration
   */
  activateConfig = catchAsync(async (req, res) => {
    const config = await carbonConfigService.activateConfig(
      req.params.configId,
      req.user.id
    );

    return ResponseHandler.success(
      res,
      {
        config: this.formatConfigResponse(config),
      },
      'Configuration activated successfully'
    );
  });

  /**
   * Reset to default configuration
   */
  resetToDefault = catchAsync(async (req, res) => {
    const config = await carbonConfigService.resetToDefault(req.user.id);

    return ResponseHandler.success(
      res,
      {
        config: this.formatConfigResponse(config),
      },
      'Reset to default configuration successful'
    );
  });

  /**
   * Delete configuration
   */
  deleteConfig = catchAsync(async (req, res) => {
    await carbonConfigService.deleteConfig(req.params.configId, req.user.id);

    return ResponseHandler.success(
      res,
      null,
      'Configuration deleted successfully'
    );
  });
}

module.exports = new CarbonConfigController();
