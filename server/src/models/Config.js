const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
  // ID fixo para garantir documento unico
  _id: {
    type: String,
    default: 'main_config'
  },
  cicloAtual: {
    type: String,
    required: true
  },
  representatividade: {
    type: Map,
    of: Number,
    default: {}
  },
  adminUser: {
    type: String,
    required: true
  },
  adminPassword: {
    type: String,
    required: true
  },
  mensagemRecompensa: {
    titulo: String,
    texto: String,
    ativa: Boolean,
    criadaEm: String
  },
  slack: {
    enabled: { type: Boolean, default: true },
    testMode: { type: Boolean, default: true },
    riskThresholdPercent: { type: Number, default: 50 },
    sendWhenZero: { type: Boolean, default: false },
    supervisoresPorSetor: {
      type: Map,
      of: String,
      default: {}
    }
  }
}, {
  timestamps: true,
  collection: 'config'
});

// Converter de/para objeto plano para compatibilidade com codigo existente
configSchema.methods.toPlainObject = function() {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj._id;

  // Converter Maps para objetos
  if (obj.representatividade instanceof Map) {
    obj.representatividade = Object.fromEntries(obj.representatividade);
  } else if (obj.representatividade && typeof obj.representatividade === 'object') {
    // Mongoose retorna como objeto com $__
    const rep = {};
    for (const [key, val] of Object.entries(obj.representatividade)) {
      if (!key.startsWith('$') && !key.startsWith('_')) {
        rep[key] = val;
      }
    }
    obj.representatividade = rep;
  }

  if (obj.slack?.supervisoresPorSetor instanceof Map) {
    obj.slack.supervisoresPorSetor = Object.fromEntries(obj.slack.supervisoresPorSetor);
  } else if (obj.slack?.supervisoresPorSetor && typeof obj.slack.supervisoresPorSetor === 'object') {
    const sup = {};
    for (const [key, val] of Object.entries(obj.slack.supervisoresPorSetor)) {
      if (!key.startsWith('$') && !key.startsWith('_')) {
        sup[key] = val;
      }
    }
    obj.slack.supervisoresPorSetor = sup;
  }

  return obj;
};

module.exports = mongoose.model('Config', configSchema);
