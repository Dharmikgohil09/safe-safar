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

const CATEGORY_ENUM = [
  'poor_lighting',
  'harassment',
  'suspicious_activity',
  'unsafe_pathway',
  'other',
  // Backward compatibility with teammate routes
  'dark_street',
  'isolated',
  'unsafe_crowd',
  'isolated_path',
  'suspicious'
];

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
    category: {
      type: String,
      enum: CATEGORY_ENUM,
      default: 'other'
    },
    type: {
      type: String,
      enum: CATEGORY_ENUM,
      default: 'other'
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      trim: true,
      default: ''
    },
    note: {
      type: String,
      maxlength: [500, 'Note cannot exceed 500 characters'],
      trim: true,
      default: ''
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reporterId: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'resolved', 'active'],
      default: 'pending',
      index: true
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

// Synchronize backward-compatible aliases before saving
reportSchema.pre('save', function (next) {
  if (this.category && !this.type) this.type = this.category;
  if (this.type && !this.category) this.category = this.type;
  if (this.description && !this.note) this.note = this.description;
  if (this.note && !this.description) this.description = this.note;
  if (this.reporter && !this.reporterId) this.reporterId = String(this.reporter);
  if (this.reporterId && !this.reporter && mongoose.isValidObjectId(this.reporterId)) {
    this.reporter = new mongoose.Types.ObjectId(this.reporterId);
  }
  next();
});

// 2dsphere index for geospatial proximity searches
reportSchema.index({ location: '2dsphere' });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
