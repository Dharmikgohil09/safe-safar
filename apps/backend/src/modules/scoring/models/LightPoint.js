const mongoose = require('mongoose');

/**
 * LightPoint schema representing streetlights and verified illumination points
 */
const lightPointSchema = new mongoose.Schema(
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
    intensity: {
      type: Number,
      min: 0,
      max: 10
    },
    status: {
      type: String,
      trim: true,
      enum: ['active', 'dim', 'broken', 'unknown'],
      default: 'active'
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index on location for geospatial lighting density evaluation
lightPointSchema.index({ location: '2dsphere' });

const LightPoint = mongoose.model('LightPoint', lightPointSchema);

module.exports = LightPoint;
