const mongoose = require('mongoose');
const { PLASTIC_TYPES } = require('../constants/analytics.constants');

/**
 * WasteRecord Model
 * Stores individual waste collection entries
 * Optimized for time-series analytics
 */
const wasteRecordSchema = new mongoose.Schema(
  {
    beachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beach',
      required: [true, 'Beach reference is required'],
      index: true,
    },

    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false, // Optional for backward compatibility
    },

    plasticType: {
      type: String,
      required: [true, 'Plastic type is required'],
      enum: Object.keys(PLASTIC_TYPES),
      index: true,
    },

    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [0.01, 'Weight must be at least 0.01 kg'],
      max: [10000, 'Weight cannot exceed 10000 kg'],
    },

    // Source categorization for analytics
    source: {
      type: String,
      enum: ['CLEANUP_EVENT', 'INDIVIDUAL', 'COMMUNITY_DRIVE', 'CORPORATE'],
      default: 'CLEANUP_EVENT',
      index: true,
    },

    // Weather conditions at time of collection
    weather: {
      condition: {
        type: String,
        enum: ['SUNNY', 'CLOUDY', 'RAINY', 'WINDY', 'OTHER'],
      },
      temperature: Number, // Celsius
      windSpeed: Number, // km/h
    },

    collectionDate: {
      type: Date,
      required: [true, 'Collection date is required'],
      default: Date.now,
      index: true,
    },

    // Calculated carbon offset (denormalized for performance)
    carbonOffset: {
      type: Number,
      min: 0,
      default: 0,
    },

    // Metadata
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    notes: {
      type: String,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
    },

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ==========================================
// INDEXES - Critical for analytics performance
// ==========================================

// Compound index for time-series analytics (most frequent query pattern)
wasteRecordSchema.index({ beachId: 1, collectionDate: -1 });

// Index for plastic type analytics
wasteRecordSchema.index({ plasticType: 1, collectionDate: -1 });

// Index for carbon offset calculations
wasteRecordSchema.index({ collectionDate: -1, carbonOffset: 1 });

// Index for verification status and date range
wasteRecordSchema.index({ isVerified: 1, collectionDate: -1 });

// Compound index for trend analysis (beach + plastic type + date)
wasteRecordSchema.index({
  beachId: 1,
  plasticType: 1,
  collectionDate: -1,
});

// ==========================================
// PRE-SAVE HOOKS - FIXED VERSION
// ==========================================

/**
 * Calculate carbon offset before saving
 * Uses configurable emission factor (injected from service)
 */
wasteRecordSchema.pre('save', async function () {
  try {
    if (this.isModified('weight') || this.isModified('plasticType')) {
      // Get carbon config
      const CarbonConfig = mongoose.model('CarbonConfig');
      let emissionFactor = 2.5; // Default

      try {
        const config = await CarbonConfig.getActiveConfig();
        if (config && config.emissionFactor) {
          emissionFactor = config.emissionFactor;
        }
      } catch (configError) {
        console.log('No carbon config found, using default');
      }

      // Plastic type impact multiplier
      const plasticMultiplier = PLASTIC_TYPES[this.plasticType]?.weight || 1.0;

      // Carbon offset = weight * emissionFactor * plasticMultiplier
      this.carbonOffset = this.weight * emissionFactor * plasticMultiplier;
    }
  } catch (error) {
    console.error('Error in pre-save hook:', error);
    // Still set a default value
    this.carbonOffset =
      this.weight * 2.5 * (PLASTIC_TYPES[this.plasticType]?.weight || 1.0);
  }
});

/**
 * After save, update beach analytics
 */
wasteRecordSchema.post('save', async function (doc) {
  try {
    const Beach = mongoose.model('Beach');
    await Beach.findByIdAndUpdate(doc.beachId, {
      $inc: {
        'analytics.totalWasteCollected': doc.weight,
        'analytics.totalCleanups': 1,
      },
      $set: {
        'analytics.lastCleanupDate': doc.collectionDate,
      },
    });
  } catch (error) {
    console.error('Failed to update beach analytics:', error);
  }
});

// ==========================================
// STATIC METHODS - Analytics Aggregations
// ==========================================

/**
 * Get waste statistics by plastic type
 * For pie/bar charts
 */
wasteRecordSchema.statics.getWasteByPlasticType = async function (
  beachId = null,
  startDate = null,
  endDate = null
) {
  const matchStage = { isVerified: true };

  if (beachId) matchStage.beachId = new mongoose.Types.ObjectId(beachId);
  if (startDate || endDate) {
    matchStage.collectionDate = {};
    if (startDate) matchStage.collectionDate.$gte = new Date(startDate);
    if (endDate) matchStage.collectionDate.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$plasticType',
        totalWeight: { $sum: '$weight' },
        totalCarbonOffset: { $sum: '$carbonOffset' },
        count: { $sum: 1 },
        avgWeight: { $avg: '$weight' },
      },
    },
    {
      $project: {
        plasticType: '$_id',
        totalWeight: 1,
        totalCarbonOffset: 1,
        count: 1,
        avgWeight: { $round: ['$avgWeight', 2] },
        _id: 0,
      },
    },
    { $sort: { totalWeight: -1 } },
  ];

  return this.aggregate(pipeline);
};

/**
 * Get monthly trend data for forecasting
 */
wasteRecordSchema.statics.getMonthlyTrends = async function (
  beachId = null,
  months = 12
) {
  const matchStage = { isVerified: true };
  if (beachId) matchStage.beachId = new mongoose.Types.ObjectId(beachId);

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$collectionDate' },
          month: { $month: '$collectionDate' },
        },
        totalWeight: { $sum: '$weight' },
        recordCount: { $sum: 1 },
        avgWeight: { $avg: '$weight' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    { $limit: months },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        totalWeight: 1,
        recordCount: 1,
        avgWeight: { $round: ['$avgWeight', 2] },
        date: {
          $dateFromParts: {
            year: '$_id.year',
            month: '$_id.month',
            day: 1,
          },
        },
      },
    },
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('WasteRecord', wasteRecordSchema);
