/**
 * Risk Service Module
 * Provides risk summary for sectors, reusing dashboard calculation logic
 */

const fs = require('fs');
const path = require('path');
const SegmentService = require('../SegmentService');
const VendasService = require('../VendasService');

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

// ═══════════════════════════════════════════════════════════════
// SEGMENTOS (same as index.js)
// ═══════════════════════════════════════════════════════════════
const SEGMENTOS = {
  'Bronze':    { minManter: 0,        maxManter: 2999.99,   metaSubir: 3000,    proximo: 'Prata' },
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
  return 'Bronze';
}

// ═══════════════════════════════════════════════════════════════
// SETORES LOADER
// ═══════════════════════════════════════════════════════════════
function getSetoresDinamicos() {
  try {
    const XLSX = require('xlsx');
    const segmentosPath = path.join(__dirname, '../../../data/Segmentos_bd.xlsx');

    if (!fs.existsSync(segmentosPath)) {
      return [];
    }

    const workbook = XLSX.readFile(segmentosPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

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
function getDealersForSetor(setorId, config) {
  const cadastro = SegmentService.loadSegments();
  const vendasData = VendasService.loadVendas();

  if (!cadastro || cadastro.length === 0) {
    if (!vendasData || vendasData.length === 0) {
      return [];
    }
    return vendasData.filter(d => d.setorId === setorId);
  }

  const dealersCadastro = cadastro.filter(d => d.setorId === setorId);
  const vendasMap = new Map();
  (vendasData || []).forEach(v => {
    if (v.setorId === setorId) {
      vendasMap.set(v.codigo, v);
    }
  });

  return dealersCadastro.map(dealer => {
    const venda = vendasMap.get(dealer.codigo);
    return {
      codigo: dealer.codigo,
      nome: dealer.nome,
      setorId: dealer.setorId,
      segmentoOficial: dealer.segmentoOficial,
      ciclos: venda ? venda.ciclos : {}
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// CALCULATE DEALER METRICS (same as index.js)
// ═══════════════════════════════════════════════════════════════
function calculateDealerMetrics(dealer, config) {
  let totalGeral = 0;
  Object.values(dealer.ciclos).forEach(valor => {
    totalGeral += valor;
  });

  const totalCicloAtual = dealer.ciclos[config.cicloAtual] || 0;

  let segmento = dealer.segmentoOficial;
  if (!segmento || !SEGMENTOS[segmento]) {
    segmento = getSegmentoByTotal(totalGeral);
  }

  const segInfo = SEGMENTOS[segmento];
  const metaManter = segInfo.minManter;
  const faltaManter = Math.max(0, metaManter - totalGeral);
  const percentManter = metaManter > 0 ? Math.min(100, (totalGeral / metaManter) * 100) : 100;

  const metaSubir = segInfo.metaSubir;
  const faltaSubir = metaSubir ? Math.max(0, metaSubir - totalGeral) : null;
  const percentSubir = metaSubir ? Math.min(100, (totalGeral / metaSubir) * 100) : null;

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
    atRisk: percentManter < (config.slack?.riskThresholdPercent || 50)
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
function getSectorRiskSummary(setorId) {
  const config = loadConfig();
  const setores = getSetoresDinamicos();
  const setor = setores.find(s => s.id === setorId);

  const baseUrl = process.env.SLACK_BASE_URL || 'https://supervisiondash.onrender.com';
  const threshold = config.slack?.riskThresholdPercent || 50;

  if (!setor) {
    return {
      setorId,
      setorNome: null,
      riskCount: 0,
      totalDealers: 0,
      threshold,
      dashboardUrl: `${baseUrl}/dashboard/${setorId}`,
      top5: [],
      error: 'Setor não encontrado'
    };
  }

  const dealers = getDealersForSetor(setorId, config);
  const dealersWithMetrics = dealers.map(d => calculateDealerMetrics(d, config));

  // Filter at-risk dealers (percentManter < threshold)
  const atRiskDealers = dealersWithMetrics
    .filter(d => d.percentManter < threshold)
    .sort((a, b) => a.percentManter - b.percentManter); // Most critical first

  // Top 5 most critical
  const top5 = atRiskDealers.slice(0, 5).map(d => ({
    codigo: d.codigo,
    nome: d.nome,
    segmento: d.segmento,
    percentManter: d.percentManter,
    faltaManter: d.faltaManter,
    totalGeral: d.totalGeral
  }));

  return {
    setorId,
    setorNome: setor.nome,
    riskCount: atRiskDealers.length,
    totalDealers: dealersWithMetrics.length,
    threshold,
    dashboardUrl: `${baseUrl}/dashboard/${setorId}`,
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
 * Get current Slack config
 * @returns {object}
 */
function getSlackConfig() {
  const config = loadConfig();
  return config.slack || defaultConfig.slack;
}

module.exports = {
  getSectorRiskSummary,
  getAllSetores,
  getSlackConfig,
  loadConfig
};
