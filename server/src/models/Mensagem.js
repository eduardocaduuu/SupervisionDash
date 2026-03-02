const mongoose = require('mongoose');

const mensagemSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    default: 'Nova Mensagem'
  },
  texto: {
    type: String,
    required: true
  },
  // Tipo de direcionamento: 'all' = todas, 'group' = grupo específico, 'single' = única supervisora
  targetType: {
    type: String,
    enum: ['all', 'group', 'single'],
    default: 'all'
  },
  // Array de setorIds para quem a mensagem é direcionada (vazio = todas)
  targetSetores: [{
    type: String
  }],
  // Se está ativa ou não
  ativa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'mensagens'
});

module.exports = mongoose.model('Mensagem', mensagemSchema);
