/**
 * Risk Service Module
 * Provides risk summary for sectors, reusing dashboard calculation logic
 */

const fs = require('fs');
const path = require('path');
const { readAllRows } = require('../utils/xlsx');
const SegmentService = require('../SegmentService');
const VendasService = require('../VendasService');
const HistoryService = require('../HistoryService');
const PersistenceService = require('../services/PersistenceService');
const { isMongoConnected } = require('../db/mongodb');

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION (mirrors index.js)
// ═══════════════════════════════════════════════════════════════
const persistentDataDir = path.join(__dirname, '../../../data');
const configPath = path.join(persistentDataDir, 'config.json');

const defaultConfig = {
  cicloAtual: '01/2026',
  representatividade: {
    '01/2026': 8, '02/2026': 11, '03/2026': 11, '04/2026': 12,
    '05/2026': 11, '06/2026': 15, '07/2026': 10, '08/2026': 11, '09/2026': 10
  },
  slack: {
    enabled: false,
    testMode: true,
    riskThresholdPercent: 50,
    sendWhenZero: false,
    supervisoresPorSetor: {}
  }
};

// Config a partir do arquivo (fallback síncrono)
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...defaultConfig, ...saved, slack: { ...defaultConfig.slack, ...saved.slack } };
    }
  } catch (e) {
    console.error('[RiskService] Error loading config:', e);
  }
  return { ...defaultConfig };
}

// Fonte ÚNICA de config: MongoDB quando conectado (igual ao app), senão arquivo.
// Evita o "split" em que o cron usava o arquivo e o app usava o Mongo.
async function loadConfigUnified() {
  try {
    if (isMongoConnected()) {
      return await PersistenceService.loadConfig();
    }
  } catch (e) {
    console.error('[RiskService] Falha ao carregar config do Mongo, usando arquivo:', e.message);
  }
  return loadConfig();
}

// ═══════════════════════════════════════════════════════════════
// SEGMENTOS (same as index.js)
// ═══════════════════════════════════════════════════════════════
const SEGMENTOS = {
  'Cobre':     { minManter: 0,        maxManter: 0,         metaSubir: 0.01,    proximo: 'Bronze' },
  'Bronze':    { minManter: 0.01,     maxManter: 2999.99,   metaSubir: 3000,    proximo: 'Prata' },
  'Prata':     { minManter: 3000,     maxManter: 8999.99,   metaSubir: 9000,    proximo: 'Ouro' },
  'Ouro':      { minManter: 9000,     maxManter: 19999.99,  metaSubir: 20000,   proximo: 'Platina' },
  'Platina':   { minManter: 20000,    maxManter: 49999.99,  metaSubir: 50000,   proximo: 'Rubi' },
  'Rubi':      { minManter: 50000,    maxManter: 79999.99,  metaSubir: 80000,   proximo: 'Esmeralda' },
  'Esmeralda': { minManter: 80000,    maxManter: 129999.99, metaSubir: 130000,  proximo: 'Diamante' },
  'Diamante':  { minManter: 130000,   maxManter: Infinity,  metaSubir: null,    proximo: null }
};

function getSegmentoByTotal(total) {
  if (total >= 130000) return 'Diamante';
  if (total >= 80000) return 'Esmeralda';
  if (total >= 50000) return 'Rubi';
  if (total >= 20000) return 'Platina';
  if (total >= 9000) return 'Ouro';
  if (total >= 3000) return 'Prata';
  if (total > 0) return 'Bronze';
  return 'Cobre';
}

// Normalizar segmento (remove sufixo GB e trata valores invalidos)
function normalizeSegmento(segmento) {
  if (!segmento) return null;
  let normalized = segmento.replace(/\s*GB$/i, '').trim();
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  if (!SEGMENTOS[normalized]) return null;
  return normalized;
}

// ═══════════════════════════════════════════════════════════════
// SETORES LOADER
// ═══════════════════════════════════════════════════════════════
function getSetoresDinamicos() {
  try {
    const segmentosPath = path.join(__dirname, '../../../data/Segmentos_bd.xlsx');

    if (!fs.existsSync(segmentosPath)) {
      return [];
    }

    // Lê todas as abas (uma por unidade no export bruto)
    const rawData = readAllRows(segmentosPath);

    const setoresMap = new Map();

    rawData.forEach(row => {
      let codigo = row.CodigoEstruturaComercial || row.SetorId || '';
      codigo = String(codigo).replace(/\./g, '').replace(/\s+/g, '').trim();
      const nome = row.EstruturaComercial || row.SetorNome || `Setor ${codigo}`;

      if (codigo && !setoresMap.has(codigo)) {
        setoresMap.set(codigo, nome);
      }
    });

    return Array.from(setoresMap.entries()).map(([id, nome]) => ({ id, nome }));
  } catch (error) {
    console.error('[RiskService] Error loading setores:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// DATA LOADING (same as index.js)
// ═══════════════════════════════════════════════════════════════
async function getDealersForSetor(setorId, config) {
  const cadastro = SegmentService.loadSegments();
  const vendasData = VendasService.loadVendas();

  let dealers;
  if (!cadastro || cadastro.length === 0) {
    dealers = (vendasData || []).filter(d => d.setorId === setorId);
  } else {
    const dealersCadastro = cadastro.filter(d => d.setorId === setorId);
    const vendasMap = new Map();
    (vendasData || []).forEach(v => {
      if (v.setorId === setorId) vendasMap.set(v.codigo, v);
    });
    dealers = dealersCadastro.map(dealer => {
      const venda = vendasMap.get(dealer.codigo);
      return {
        codigo: dealer.codigo,
        nome: dealer.nome,
        setorId: dealer.setorId,
        segmentoOficial: dealer.segmentoOficial,
        ciclos: venda ? { ...venda.ciclos } : {}
      };
    });
  }

  // Enriquecer com histórico (acúmulo da janela) — mesma lógica do dashboard
  if (isMongoConnected()) {
    try {
      const detalhe = await HistoryService.getDetalheTodos(config.cicloAtual);
      dealers.forEach(d => { d.ciclos = { ...(detalhe[d.codigo] || {}), ...d.ciclos }; });
    } catch (e) {
      console.error('[RiskService] Falha ao enriquecer com histórico:', e.message);
    }
  }

  return dealers;
}

// ═══════════════════════════════════════════════════════════════
// CALCULATE DEALER METRICS (same as index.js)
// ═══════════════════════════════════════════════════════════════
function calculateDealerMetrics(dealer, config) {
  // Acúmulo restrito à janela atual (mesma regra do dashboard)
  const ciclosJanela = HistoryService.ciclosDaJanela(config.cicloAtual);
  let totalGeral = 0;
  if (ciclosJanela.length > 0) {
    for (const c of ciclosJanela) totalGeral += (dealer.ciclos[c] || 0);
  } else {
    Object.values(dealer.ciclos).forEach(valor => { totalGeral += valor; });
  }

  const totalCicloAtual = dealer.ciclos[config.cicloAtual] || 0;

  let segmento = normalizeSegmento(dealer.segmentoOficial);
  if (!segmento) {
    segmento = getSegmentoByTotal(totalGeral);
  }

  const segInfo = SEGMENTOS[segmento];
  const metaManter = segInfo.minManter;
  const faltaManter = Math.max(0, metaManter - totalGeral);
  const percentManter = metaManter > 0 ? Math.min(100, (totalGeral / metaManter) * 100) : 100;

  const metaSubir = segInfo.metaSubir;
  const faltaSubir = metaSubir ? Math.max(0, metaSubir - totalGeral) : null;
  const percentSubir = metaSubir ? Math.min(100, (totalGeral / metaSubir) * 100) : null;

  // EM RISCO = vai cair na virada, sinalizado SÓ perto dela (últimos ciclos da janela)
  const perto = HistoryService.pertoDaVirada(config.cicloAtual);
  const mantem = totalGeral >= metaManter;
  const cairiaPara = (!mantem && perto) ? HistoryService.anterior(segmento) : null;

  return {
    ...dealer,
    totalGeral: Math.round(totalGeral * 100) / 100,
    totalCicloAtual: Math.round(totalCicloAtual * 100) / 100,
    segmento,
    metaManter,
    metaSubir,
    faltaManter: Math.round(faltaManter * 100) / 100,
    faltaSubir: faltaSubir ? Math.round(faltaSubir * 100) / 100 : null,
    percentManter: Math.round(percentManter * 10) / 10,
    percentSubir: percentSubir ? Math.round(percentSubir * 10) / 10 : null,
    mantem,
    cairiaPara,
    atRisk: !mantem && perto
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTION: GET SECTOR RISK SUMMARY
// ═══════════════════════════════════════════════════════════════
/**
 * Get risk summary for a sector
 * @param {string} setorId - Sector ID
 * @returns {object} Risk summary
 */
async function getSectorRiskSummary(setorId) {
  const config = await loadConfigUnified();
  const setores = getSetoresDinamicos();
  const setor = setores.find(s => s.id === setorId);

  const baseUrl = process.env.SLACK_BASE_URL || 'https://supervisiondashboard.onrender.com';
  const dashboardUrl = `${baseUrl}/dashboard/${setorId}`;
  const threshold = config.slack?.riskThresholdPercent || 50;

  console.log(`[RiskService] Dashboard URL: ${dashboardUrl}`);

  if (!setor) {
    return {
      setorId,
      setorNome: null,
      riskCount: 0,
      totalDealers: 0,
      threshold,
      dashboardUrl,
      top5: [],
      error: 'Setor não encontrado'
    };
  }

  const dealers = await getDealersForSetor(setorId, config);
  const dealersWithMetrics = dealers.map(d => calculateDealerMetrics(d, config));

  // Em risco = vai cair na virada. Mantém o filtro totalGeral > 0 para não
  // poluir o alerta com quem ainda não comprou nada no ciclo.
  const atRiskDealers = dealersWithMetrics
    .filter(d => d.atRisk && d.totalGeral > 0)
    .sort((a, b) => a.percentManter - b.percentManter); // Mais críticos primeiro

  const top5 = atRiskDealers.slice(0, 5).map(d => ({
    codigo: d.codigo,
    nome: d.nome,
    segmento: d.segmento,
    cairiaPara: d.cairiaPara,
    percentManter: d.percentManter,
    faltaManter: d.faltaManter,
    totalGeral: d.totalGeral
  }));

  // Total que o setor já vendeu no ciclo vigente (soma do ciclo atual de todos)
  const vendidoNoCiclo = Math.round(
    dealersWithMetrics.reduce((s, d) => s + (d.totalCicloAtual || 0), 0) * 100
  ) / 100;

  return {
    setorId,
    setorNome: setor.nome,
    riskCount: atRiskDealers.length,
    totalDealers: dealersWithMetrics.length,
    threshold,
    dashboardUrl,
    cicloAtual: config.cicloAtual,
    vendidoNoCiclo,
    top5
  };
}

/**
 * Get all setores with mapped supervisors
 * @returns {Array} List of setores
 */
function getAllSetores() {
  return getSetoresDinamicos();
}

/**
 * Get current Slack config (fonte única: Mongo quando conectado)
 * @returns {Promise<object>}
 */
async function getSlackConfig() {
  const config = await loadConfigUnified();
  return config.slack || defaultConfig.slack;
}

module.exports = {
  getSectorRiskSummary,
  getAllSetores,
  getSlackConfig,
  loadConfig
};
