const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema(
  {
    address: { type: String, default: '', trim: true },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Coordinates [longitude, latitude] are required'],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length === 2 &&
            val[0] >= -180 && val[0] <= 180 &&
            val[1] >= -90 && val[1] <= 90;
        },
        message: 'Coordinates must be valid [longitude (-180..180), latitude (-90..90)]'
      }
    }
  },
  { _id: false }
);

const locationPayloadSchema = new mongoose.Schema(
  {
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    trackingToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    origin: {
      type: pointSchema,
      required: [true, 'Trip origin is required']
    },
    destination: {
      type: pointSchema,
      required: [true, 'Trip destination is required']
    },
    status: {
      type: String,
      enum: ['active', 'arrived', 'expired', 'cancelled'],
      default: 'active',
      index: true
    },
    estimatedDurationMinutes: {
      type: Number,
      required: [true, 'Estimated duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [1440, 'Duration cannot exceed 24 hours']
    },
    deadlineAt: {
      type: Date,
      required: true,
      index: true
    },
    lastCheckinAt: {
      type: Date,
      default: Date.now
    },
    arrivedAt: {
      type: Date,
      default: null
    },
    emergencyContacts: [
      {
        contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
        name: { type: String, required: true },
        phone: { type: String, required: true }
      }
    ],
    lastKnownLocation: {
      type: locationPayloadSchema,
      default: () => ({ coordinates: [0, 0], timestamp: new Date() })
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

tripSchema.index({ userId: 1, status: 1 });

const Trip = mongoose.model('Trip', tripSchema);

module.exports = Trip;
