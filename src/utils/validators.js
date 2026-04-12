const mongoose = require('mongoose');

/**
 * Utility validators (SOLID - Single Responsibility)
 */

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const validateObjectId = (id, fieldName = 'ID') => {
  if (!isValidObjectId(id)) {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim();
  }
  return input;
};

module.exports = {
  isValidObjectId,
  validateObjectId,
  sanitizeInput,
};
