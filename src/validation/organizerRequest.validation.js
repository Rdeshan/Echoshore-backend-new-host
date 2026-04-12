const Joi = require('joi');

const createOrganizerRequestSchema = {
  body: Joi.object({
    reason: Joi.string().required().max(500).messages({
      'string.empty': 'Reason is required',
      'string.max': 'Reason cannot exceed 500 characters',
    }),
    currentWorkingDetails: Joi.string().max(500).optional(),
    pastEventsOrganized: Joi.number().integer().min(0).optional(),
    experience: Joi.string().max(1000).optional(),
    workedOrganizations: Joi.string().max(500).optional(),
  }),
};

const reviewOrganizerRequestSchema = {
  body: Joi.object({
    action: Joi.string().valid('APPROVE', 'REJECT').required().messages({
      'any.only': 'Action must be either APPROVE or REJECT',
      'any.required': 'Action is required',
    }),
    rejectionReason: Joi.string().max(500).when('action', {
      is: 'REJECT',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  }),
};

module.exports = {
  createOrganizerRequestSchema,
  reviewOrganizerRequestSchema,
};
