const Joi = require('joi');

const carbonConfigValidation = {
  // Create config validation
  createConfig: {
    body: Joi.object({
      emissionFactor: Joi.number().min(0.1).max(10).required(),
      name: Joi.string().required().max(100).trim(),
      description: Joi.string().max(200).trim(),
      validFrom: Joi.date().default(Date.now),
      validUntil: Joi.date().min(Joi.ref('validFrom')),
    }),
  },

  // Update config validation
  updateConfig: {
    body: Joi.object({
      emissionFactor: Joi.number().min(0.1).max(10),
      name: Joi.string().max(100).trim(),
      description: Joi.string().max(200).trim(),
      validUntil: Joi.date(),
    }),
  },

  // Query parameters validation
  getConfigs: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      isActive: Joi.boolean(),
      sortBy: Joi.string()
        .valid('version', 'createdAt', 'emissionFactor')
        .default('createdAt'),
      order: Joi.string().valid('asc', 'desc').default('desc'),
    }),
  },

  // ID parameter validation
  configId: {
    params: Joi.object({
      configId: Joi.string().hex().length(24).required(),
    }),
  },

  // Activate config validation
  activateConfig: {
    params: Joi.object({
      configId: Joi.string().hex().length(24).required(),
    }),
  },
};

module.exports = carbonConfigValidation;
