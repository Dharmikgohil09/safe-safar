const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    pin: {
      type: String,
      required: [true, 'PIN is required'],
      select: false // Excluded from query results by default for security
    },
    emergencyNote: {
      type: String,
      default: '',
      maxlength: [500, 'Emergency note cannot exceed 500 characters']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.pin;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
