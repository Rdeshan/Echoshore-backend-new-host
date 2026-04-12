const Joi = require('joi');

const analyticsValidation = {
  // Dashboard query validation
  dashboard: {
    query: Joi.object({
      beachId: Joi.string().hex().length(24),
    }),
  },

  // Severity ranking validation
  severityRanking: {
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  },

  // Trend prediction validation
  trendPrediction: {
    query: Joi.object({
      beachId: Joi.string().hex().length(24),
      months: Joi.number().integer().min(1).max(12).default(3),
    }),
  },

  // Carbon offset summary validation
  carbonOffset: {
    query: Joi.object({
      startDate: Joi.date(),
      endDate: Joi.date().min(Joi.ref('startDate')),
    }),
  },

  // Recalculate severity validation
  recalculateSeverity: {
    body: Joi.object({
      beachId: Joi.string().hex().length(24),
    }),
  },
};

module.exports = analyticsValidation;
