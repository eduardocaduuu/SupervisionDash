const mongoose = require('mongoose');

const acaoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['ligou', 'whatsapp', 'catalogo'],
    required: true
  },
  data: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const dealerDataSchema = new mongoose.Schema({
  resellerId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  note: {
    type: String,
    default: ''
  },
  meta: {
    type: Number,
    default: null
  },
  acoes: {
    type: [acaoSchema],
    default: []
  }
}, {
  timestamps: true,
  collection: 'dealerdata'
});

module.exports = mongoose.model('DealerData', dealerDataSchema);
