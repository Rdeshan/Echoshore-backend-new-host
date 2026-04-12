const mongoose = require('mongoose');
const carbonConfigSchema = new mongoose.Schema(
  {
    // Emission factor (kg CO₂ per kg of plastic)
    emissionFactor: {
      type: Number,
      required: [true, 'Emission factor is required'],
      min: [0.1, 'Emission factor must be at least 0.1'],
      max: [10, 'Emission factor cannot exceed 10'],
      default: 2.5,
    },

    // Configuration metadata
    name: {
      type: String,
      required: [true, 'Configuration name is required'],
      trim: true,
      default: 'Default Carbon Offset Configuration',
    },

    description: {
      type: String,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },

    // Version control
    version: {
      type: Number,
      default: 1,
    },

    // Status - only one active config allowed
    isActive: {
      type: Boolean,
      default: true,
    },

    // Validity period
    validFrom: {
      type: Date,
      default: Date.now,
    },

    validUntil: {
      type: Date,
    },

    // Audit fields
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

// Ensure only one active configuration
carbonConfigSchema.index(
  { isActive: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

// Index for version history
carbonConfigSchema.index({ version: -1, createdAt: -1 });

// ==========================================
// PRE-SAVE HOOKS - FIXED
// ==========================================

/**
 * Deactivate other configs when this one is set to active
 */
carbonConfigSchema.pre('save', async function () {
  try {
    if (this.isActive) {
      // Deactivate all other configurations
      await this.constructor.updateMany(
        { _id: { $ne: this._id }, isActive: true },
        {
          $set: {
            isActive: false,
            validUntil: new Date(),
            updatedBy: this.updatedBy || this.createdBy,
          },
        }
      );
    }
  } catch (error) {
    console.error('Error in pre-save hook (deactivate):', error);
    throw error;
  }
});

/**
 * Auto-increment version number for existing documents
 */
carbonConfigSchema.pre('save', async function () {
  try {
    if (!this.isNew) {
      // For existing documents being updated, increment version
      this.version = (this.version || 0) + 1;
    }
  } catch (error) {
    console.error('Error in pre-save hook (version):', error);
    throw error;
  }
});

// ==========================================
// STATIC METHODS
// ==========================================

/**
 * Get currently active configuration
 * Used by WasteRecord pre-save hook
 */
carbonConfigSchema.statics.getActiveConfig = async function () {
  const config = await this.findOne({
    isActive: true,
    $or: [
      { validUntil: { $exists: false } },
      { validUntil: null },
      { validUntil: { $gt: new Date() } },
    ],
  });

  return config || null;
};

/**
 * Create new configuration and deactivate old one
 */
carbonConfigSchema.statics.createNewConfig = async function (
  configData,
  userId
) {
  // Deactivate all existing configs
  await this.updateMany(
    { isActive: true },
    {
      $set: {
        isActive: false,
        validUntil: new Date(),
        updatedBy: userId,
      },
    }
  );

  // Create new config
  const newConfig = new this({
    ...configData,
    version: (await this.countDocuments()) + 1,
    createdBy: userId,
    isActive: true,
  });

  return newConfig.save();
};

/**
 * Reset to default configuration
 */
carbonConfigSchema.statics.resetToDefault = async function (userId) {
  return this.createNewConfig(
    {
      emissionFactor: 2.5,
      name: 'Default Configuration',
      description: 'Reset to system default emission factor',
    },
    userId
  );
};

module.exports = mongoose.model('CarbonConfig', carbonConfigSchema);
