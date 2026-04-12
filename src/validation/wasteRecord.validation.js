const Joi = require('joi');
const { PLASTIC_TYPES } = require('../constants/analytics.constants');

const wasteRecordValidation = {
  // Create waste record validation
  createWasteRecord: {
    body: Joi.object({
      beachId: Joi.string().hex().length(24).required(),
      eventId: Joi.string().hex().length(24),
      plasticType: Joi.string()
        .valid(...Object.keys(PLASTIC_TYPES))
        .required(),
      weight: Joi.number().min(0.01).max(10000).required(),
      source: Joi.string()
        .valid('CLEANUP_EVENT', 'INDIVIDUAL', 'COMMUNITY_DRIVE', 'CORPORATE')
        .default('CLEANUP_EVENT'),
      weather: Joi.object({
        condition: Joi.string().valid(
          'SUNNY',
          'CLOUDY',
          'RAINY',
          'WINDY',
          'OTHER'
        ),
        temperature: Joi.number(),
        windSpeed: Joi.number(),
      }),
      collectionDate: Joi.date().max('now').default(Date.now),
      notes: Joi.string().max(300).trim(),
    }),
  },

  // Update waste record validation
  updateWasteRecord: {
    body: Joi.object({
      plasticType: Joi.string().valid(...Object.keys(PLASTIC_TYPES)),
      weight: Joi.number().min(0.01).max(10000),
      source: Joi.string().valid(
        'CLEANUP_EVENT',
        'INDIVIDUAL',
        'COMMUNITY_DRIVE',
        'CORPORATE'
      ),
      weather: Joi.object({
        condition: Joi.string().valid(
          'SUNNY',
          'CLOUDY',
          'RAINY',
          'WINDY',
          'OTHER'
        ),
        temperature: Joi.number(),
        windSpeed: Joi.number(),
      }),
      collectionDate: Joi.date().max('now'),
      notes: Joi.string().max(300).trim(),
      isVerified: Joi.boolean(),
    }),
  },

  // Query parameters validation
  getWasteRecords: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      beachId: Joi.string().hex().length(24),
      plasticType: Joi.string().valid(...Object.keys(PLASTIC_TYPES)),
      startDate: Joi.date(),
      endDate: Joi.date().min(Joi.ref('startDate')),
      isVerified: Joi.boolean(),
      sortBy: Joi.string()
        .valid('collectionDate', 'weight', 'carbonOffset', 'createdAt')
        .default('collectionDate'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
    }),
  },

  // ID parameter validation
  recordId: {
    params: Joi.object({
      recordId: Joi.string().hex().length(24).required(),
    }),
  },

  // Verify record validation
  verifyRecord: {
    params: Joi.object({
      recordId: Joi.string().hex().length(24).required(),
    }),
  },
};

module.exports = wasteRecordValidation;
