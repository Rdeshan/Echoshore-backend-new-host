const Joi = require('joi');

/**
 * Joi validation schemas for all heatmap endpoints
 * Follows the same pattern as analytics.validation.js
 */
const heatmapValidation = {
  // GET /api/heatmap — no query params needed, open schema
  getHeatmap: {
    query: Joi.object({}),
  },

  // GET /api/heatmap/:beachId — validate the MongoDB ObjectId param
  getBeachPrediction: {
    params: Joi.object({
      beachId: Joi.string().hex().length(24).required().messages({
        'string.hex': 'beachId must be a valid MongoDB ObjectId (hex)',
        'string.length': 'beachId must be exactly 24 characters',
        'any.required': 'beachId is required',
      }),
    }),
  },

  // POST /api/heatmap/refresh — optional beachId to target a single beach
  refreshCache: {
    body: Joi.object({
      beachId: Joi.string().hex().length(24).messages({
        'string.hex': 'beachId must be a valid MongoDB ObjectId (hex)',
        'string.length': 'beachId must be exactly 24 characters',
      }),
    }),
  },
};

module.exports = heatmapValidation;
