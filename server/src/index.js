const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ensure data directories exist
const dataDir = path.join(__dirname, '../data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const snapshot = req.query.snapshot || 'manha';
    cb(null, `vendas_${snapshot}_${Date.now()}.csv`);
  }
});
const upload = multer({ storage });

// Configuration file path
const configPath = path.join(dataDir, 'config.json');

// Default configuration
const defaultConfig = {
  cicloAtual: '01/2026',
  snapshotAtivo: 'manha',
  representatividade: {
    '01/2026': 100, '02/2026': 100, '03/2026': 100,
    '04/2026': 100, '05/2026': 100, '06/2026': 100,
    '07/2026': 100, '08/2026': 100, '09/2026': 100
  },
  uploads: {
    manha: null,
    tarde: null
  },
  adminPassword: 'admin123'
};

// Load or create config
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return { ...defaultConfig };
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Initialize config
let config = loadConfig();
saveConfig(config);

// Fixed setores list
const SETORES = [
  { id: 'SET001', nome: 'Setor Norte' },
  { id: 'SET002', nome: 'Setor Sul' },
  { id: 'SET003', nome: 'Setor Leste' },
  { id: 'SET004', nome: 'Setor Oeste' },
  { id: 'SET005', nome: 'Setor Centro' },
  { id: 'SET006', nome: 'Setor Industrial' },
  { id: 'SET007', nome: 'Setor Comercial' },
  { id: 'SET008', nome: 'Setor Residencial' }
];

// Segment definitions with goals
const SEGMENTOS = {
  'Bronze': { metaManter: 5000, metaSubir: 15000, proximo: 'Prata' },
  'Prata': { metaManter: 15000, metaSubir: 35000, proximo: 'Ouro' },
  'Ouro': { metaManter: 35000, metaSubir: 70000, proximo: 'Diamante' },
  'Diamante': { metaManter: 70000, metaSubir: 120000, proximo: 'Elite' },
  'Elite': { metaManter: 120000, metaSubir: null, proximo: null }
};

// Sample dealers data (simulated)
function generateSampleDealers(setorId) {
  const segmentos = Object.keys(SEGMENTOS);
  const dealers = [];
  const count = 15 + Math.floor(Math.random() * 10);

  for (let i = 1; i <= count; i++) {
    const segmento = segmentos[Math.floor(Math.random() * segmentos.length)];
    const meta = SEGMENTOS[segmento];
    const baseTotal = meta.metaManter * (0.3 + Math.random() * 1.2);

    dealers.push({
      codigo: `${setorId}-D${String(i).padStart(3, '0')}`,
      nome: `Revendedor ${i} - ${setorId}`,
      setorId,
      segmento,
      ciclos: generateCiclosData(baseTotal)
    });
  }
  return dealers;
}

function generateCiclosData(baseTotal) {
  const ciclos = {};
  const ciclosList = Object.keys(defaultConfig.representatividade);

  ciclosList.forEach((ciclo, idx) => {
    const variation = 0.7 + Math.random() * 0.6;
    const trend = 1 + (idx * 0.02);
    ciclos[ciclo] = Math.round(baseTotal * variation * trend * 100) / 100;
  });

  return ciclos;
}

// In-memory dealers cache
let dealersCache = {};

function getDealersForSetor(setorId) {
  if (!dealersCache[setorId]) {
    dealersCache[setorId] = generateSampleDealers(setorId);
  }
  return dealersCache[setorId];
}

// Calculate dealer metrics
function calculateDealerMetrics(dealer, representatividade) {
  const cicloAtual = config.cicloAtual;
  const totalCicloAtual = dealer.ciclos[cicloAtual] || 0;

  // Calculate weighted total based on representatividade
  let totalPonderado = 0;
  Object.entries(dealer.ciclos).forEach(([ciclo, valor]) => {
    const peso = (representatividade[ciclo] || 100) / 100;
    totalPonderado += valor * peso;
  });

  const meta = SEGMENTOS[dealer.segmento];
  const faltaManter = Math.max(0, meta.metaManter - totalCicloAtual);
  const faltaSubir = meta.metaSubir ? Math.max(0, meta.metaSubir - totalCicloAtual) : null;

  const percentManter = Math.min(100, (totalCicloAtual / meta.metaManter) * 100);
  const percentSubir = meta.metaSubir ? Math.min(100, (totalCicloAtual / meta.metaSubir) * 100) : null;

  // Delta simulation (morning vs afternoon)
  const deltaDia = Math.round((Math.random() - 0.3) * 2000 * 100) / 100;

  // Impulso (motivation message)
  let impulso = '';
  if (percentManter < 30) impulso = 'CRITICAL - NEED BOOST';
  else if (percentManter < 50) impulso = 'WARMING UP';
  else if (percentManter < 80) impulso = 'ON TRACK';
  else if (percentManter < 100) impulso = 'ALMOST THERE';
  else if (percentSubir && percentSubir >= 80) impulso = 'LEVEL UP READY';
  else impulso = 'MISSION SECURE';

  return {
    ...dealer,
    totalCicloAtual,
    totalPonderado,
    faltaManter,
    faltaSubir,
    percentManter: Math.round(percentManter * 10) / 10,
    percentSubir: percentSubir ? Math.round(percentSubir * 10) / 10 : null,
    deltaDia,
    impulso,
    nearLevelUp: percentSubir && percentSubir >= 80,
    atRisk: percentManter < 30
  };
}

// ========== API ROUTES ==========

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    cicloAtual: config.cicloAtual,
    snapshotAtivo: config.snapshotAtivo
  });
});

// Get setores list
app.get('/api/setores', (req, res) => {
  res.json(SETORES);
});

// Get config (public)
app.get('/api/config', (req, res) => {
  const { adminPassword, ...publicConfig } = config;
  res.json(publicConfig);
});

// Get setor dashboard
app.get('/api/setor/:setorId', (req, res) => {
  const { setorId } = req.params;
  const setor = SETORES.find(s => s.id === setorId);

  if (!setor) {
    return res.status(404).json({ error: 'Setor não encontrado' });
  }

  const dealers = getDealersForSetor(setorId);
  const dealersWithMetrics = dealers.map(d =>
    calculateDealerMetrics(d, config.representatividade)
  );

  // Calculate setor KPIs
  const totalSetor = dealersWithMetrics.reduce((sum, d) => sum + d.totalCicloAtual, 0);
  const qtdRevendedores = dealersWithMetrics.length;
  const nearLevelUp = dealersWithMetrics.filter(d => d.nearLevelUp).length;
  const atRisk = dealersWithMetrics.filter(d => d.atRisk).length;

  res.json({
    setor,
    cicloAtual: config.cicloAtual,
    snapshotAtivo: config.snapshotAtivo,
    kpis: {
      totalSetor: Math.round(totalSetor * 100) / 100,
      qtdRevendedores,
      nearLevelUp,
      atRisk
    },
    dealers: dealersWithMetrics
  });
});

// Get single dealer details
app.get('/api/dealer/:codigo', (req, res) => {
  const { codigo } = req.params;
  const setorId = codigo.split('-')[0];
  const dealers = getDealersForSetor(setorId);
  const dealer = dealers.find(d => d.codigo === codigo);

  if (!dealer) {
    return res.status(404).json({ error: 'Revendedor não encontrado' });
  }

  const dealerWithMetrics = calculateDealerMetrics(dealer, config.representatividade);
  res.json(dealerWithMetrics);
});

// Get rank do dia
app.get('/api/setor/:setorId/rank', (req, res) => {
  const { setorId } = req.params;
  const dealers = getDealersForSetor(setorId);
  const dealersWithMetrics = dealers.map(d =>
    calculateDealerMetrics(d, config.representatividade)
  );

  const ranked = dealersWithMetrics
    .sort((a, b) => b.deltaDia - a.deltaDia)
    .slice(0, 10);

  // Mission boosters messages
  const nearLevelUpCount = dealersWithMetrics.filter(d => d.nearLevelUp).length;
  const atRiskCount = dealersWithMetrics.filter(d => d.atRisk).length;

  const missionBoosters = [];
  if (nearLevelUpCount > 0) {
    missionBoosters.push(`🎯 ${nearLevelUpCount} revendedores na reta final do LEVEL UP!`);
  }
  if (atRiskCount > 0) {
    missionBoosters.push(`⚠️ ${atRiskCount} revendedores precisam de BOOST urgente!`);
  }
  if (ranked[0]?.deltaDia > 0) {
    missionBoosters.push(`🔥 ${ranked[0].nome} lidera o dia com +R$ ${ranked[0].deltaDia.toFixed(2)}!`);
  }

  res.json({ ranking: ranked, missionBoosters });
});

// Get ciclos data for setor
app.get('/api/setor/:setorId/ciclos', (req, res) => {
  const { setorId } = req.params;
  const dealers = getDealersForSetor(setorId);

  const ciclosList = Object.keys(config.representatividade);
  const ciclosData = ciclosList.map(ciclo => {
    const total = dealers.reduce((sum, d) => sum + (d.ciclos[ciclo] || 0), 0);
    return {
      ciclo,
      total: Math.round(total * 100) / 100,
      representatividade: config.representatividade[ciclo]
    };
  });

  res.json(ciclosData);
});

// ========== ADMIN ROUTES ==========

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === config.adminPassword) {
    res.json({ success: true, message: 'ACCESS GRANTED' });
  } else {
    res.status(401).json({ success: false, message: 'ACCESS DENIED' });
  }
});

// Upload CSV
app.post('/api/admin/upload', upload.single('file'), (req, res) => {
  const snapshot = req.query.snapshot || 'manha';

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  config.uploads[snapshot] = {
    filename: req.file.filename,
    timestamp: new Date().toISOString()
  };
  saveConfig(config);

  res.json({
    success: true,
    message: `Upload ${snapshot} concluído`,
    file: req.file.filename
  });
});

// Update snapshot ativo
app.post('/api/admin/snapshot', (req, res) => {
  const { snapshot } = req.body;
  if (!['manha', 'tarde'].includes(snapshot)) {
    return res.status(400).json({ error: 'Snapshot inválido' });
  }
  config.snapshotAtivo = snapshot;
  saveConfig(config);
  res.json({ success: true, snapshotAtivo: snapshot });
});

// Update ciclo atual
app.post('/api/admin/ciclo', (req, res) => {
  const { ciclo } = req.body;
  config.cicloAtual = ciclo;
  saveConfig(config);
  res.json({ success: true, cicloAtual: ciclo });
});

// Update representatividade
app.post('/api/admin/representatividade', (req, res) => {
  const { representatividade } = req.body;

  // Validate all values are 0-100
  for (const [ciclo, valor] of Object.entries(representatividade)) {
    if (valor < 0 || valor > 100) {
      return res.status(400).json({ error: `Valor inválido para ${ciclo}: deve ser 0-100` });
    }
  }

  config.representatividade = { ...config.representatividade, ...representatividade };
  saveConfig(config);
  res.json({ success: true, representatividade: config.representatividade });
});

// Get admin config
app.get('/api/admin/config', (req, res) => {
  res.json(config);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║     SUPERVISION SEGMENTS - SERVER ONLINE         ║
║     Port: ${PORT}                                    ║
║     Status: OPERATIONAL                          ║
╚══════════════════════════════════════════════════╝
  `);
});
