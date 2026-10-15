const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    phone: {
      type: String,
      required: [true, 'Contact phone is required'],
      trim: true
    },
    telegramToken: {
      type: String,
      trim: true,
      default: null,
      select: false // Do not expose sensitive token in normal responses
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.telegramToken;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index to prevent adding the same contact phone twice for the same user
contactSchema.index({ userId: 1, phone: 1 }, { unique: true });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
