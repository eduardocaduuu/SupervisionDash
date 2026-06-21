const mongoose = require('mongoose');

// Total de vendas (ValorPraticado, Tipo=Venda) por revendedor e ciclo.
// Um documento por (codigo, ciclo) — reimportar um ciclo faz UPSERT só dele,
// preservando o histórico dos demais.
const cicloVendaSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  setorId: { type: String, default: '' },
  ciclo: { type: String, required: true },   // ex.: "08/2026"
  cicloNum: { type: Number },                // 8
  ano: { type: Number },                     // 2026
  total: { type: Number, default: 0 },       // soma de ValorPraticado
  atualizadoEm: { type: Date }
}, { collection: 'cicloVendas' });

cicloVendaSchema.index({ codigo: 1, ciclo: 1 }, { unique: true });

module.exports = mongoose.models.CicloVenda || mongoose.model('CicloVenda', cicloVendaSchema);
