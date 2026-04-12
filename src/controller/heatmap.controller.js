const heatmapService = require('../service/heatmap.service');
const catchAsync = require('../utils/catchAsync');
const ResponseHandler = require('../utils/responseHandler');

class HeatmapController {
  /**
   * GET /api/heatmap
   * Returns 7-day pollution predictions for all active beaches
   */
  getHeatmap = catchAsync(async (req, res) => {
    const heatmapData = await heatmapService.generateHeatmapData();

    return ResponseHandler.success(
      res,
      { heatmap: heatmapData },
      'Heatmap predictions retrieved successfully'
    );
  });

  /**
   * GET /api/heatmap/:beachId
   * Returns 7-day pollution predictions for a single beach
   */
  getBeachPrediction = catchAsync(async (req, res) => {
    const { beachId } = req.params;
    const heatmapData = await heatmapService.generateHeatmapData(beachId);

    return ResponseHandler.success(
      res,
      { heatmap: heatmapData },
      `Pollution prediction for beach retrieved successfully`
    );
  });

  /**
   * POST /api/heatmap/refresh
   * Force-refresh the heatmap cache (admin only)
   * Accepts optional { beachId } in body to refresh a single beach
   */
  refreshCache = catchAsync(async (req, res) => {
    const { beachId } = req.body;
    const freshData = await heatmapService.refreshCache(beachId || null);

    return ResponseHandler.success(
      res,
      { heatmap: freshData },
      beachId
        ? `Cache refreshed for beach ${beachId}`
        : 'Heatmap cache refreshed for all beaches'
    );
  });

  /**
   * GET /api/heatmap/health
   * Check ML service connectivity and cache stats
   */
  getHealth = catchAsync(async (req, res) => {
    const [mlHealth, cacheStats] = await Promise.all([
      heatmapService.checkMLServiceHealth(),
      Promise.resolve(heatmapService.getCacheStats()),
    ]);

    return ResponseHandler.success(
      res,
      {
        mlService: mlHealth,
        cache: cacheStats,
      },
      'Heatmap service health retrieved'
    );
  });
}

module.exports = new HeatmapController();
