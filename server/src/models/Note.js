const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  resellerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  note: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  collection: 'notes'
});

module.exports = mongoose.model('Note', noteSchema);
