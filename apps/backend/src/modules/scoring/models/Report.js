const mongoose = require('mongoose');

/**
 * Confirmation subdocument schema
 */
const confirmationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true
    },
    at: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

/**
 * Report schema for safety incidents/hazards
 */
const reportSchema = new mongoose.Schema(
  {
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (val) {
            return (
              Array.isArray(val) &&
              val.length === 2 &&
              val[0] >= -180 &&
              val[0] <= 180 && // longitude
              val[1] >= -90 &&
              val[1] <= 90 // latitude
            );
          },
          message: '{VALUE} is not a valid GeoJSON [longitude, latitude] coordinate pair.'
        }
      }
    },
    type: {
      type: String,
      required: true,
      enum: ['dark_street', 'poor_lighting', 'harassment', 'isolated', 'unsafe_crowd', 'other']
    },
    note: {
      type: String,
      maxlength: 280,
      trim: true
    },
    reporterId: {
      type: String,
      required: true,
      trim: true
    },
    confirmations: {
      type: [confirmationSchema],
      default: [],
      validate: {
        // Guard against duplicate user confirmations within the document
        validator: function (confirmations) {
          const userIds = confirmations.map((c) => c.userId);
          return new Set(userIds).size === userIds.length;
        },
        message: 'A user cannot confirm the same report multiple times.'
      }
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index for geospatial proximity searches
reportSchema.index({ location: '2dsphere' });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
