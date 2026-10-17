const mongoose = require('mongoose');

/**
 * Landmark schema representing safe havens, emergency infrastructure, and key public points
 */
const landmarkSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: ['police', 'hospital', 'school', 'other']
    },
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
    source: {
      type: String,
      trim: true,
      default: 'osm'
    }
  },
  {
    timestamps: true
  }
);

// 2dsphere index on location for geospatial proximity queries
landmarkSchema.index({ location: '2dsphere' });

const Landmark = mongoose.model('Landmark', landmarkSchema);

module.exports = Landmark;
