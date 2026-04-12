const mongoose = require('mongoose');

const OrganizerRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    reason: {
      type: String,
      required: true,
      maxlength: 500,
    },
    currentWorkingDetails: {
      type: String,
      maxlength: 500,
    },
    pastEventsOrganized: {
      type: Number,
      default: 0,
    },
    experience: {
      type: String,
      maxlength: 1000,
    },
    workedOrganizations: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Indexes for performance (userId index already created by unique: true)
OrganizerRequestSchema.index({ status: 1 });
OrganizerRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('OrganizerRequest', OrganizerRequestSchema);
