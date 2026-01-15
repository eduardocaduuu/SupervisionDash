const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
// DATA DIRECTORIES
// ═══════════════════════════════════════════════════════════════
const dataDir = path.join(__dirname, '../data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    // Verifica se é upload de cadastro ou snapshot de vendas
    if (req.query.type === 'cadastro') {
      cb(null, 'cadastro_segmento.csv');
    } else {
      const slot = req.query.slot || 'manha';
      cb(null, `snapshot_${slot}.csv`);
    }
  }
});
const upload = multer({ storage });

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════
const configPath = path.join(dataDir, 'config.json');

const defaultConfig = {
  cicloAtual: '01/2026',
  snapshotAtivo: 'manha',
  representatividade: {
    '01/2026': 8,
    '02/2026': 11,
    '03/2026': 11,
    '04/2026': 12,
    '05/2026': 11,
    '06/2026': 15,
    '07/2026': 10,
    '08/2026': 11,
    '09/2026': 10
  },
  uploads: {
    manha: null,
    tarde: null
  },
  adminUser: 'acqua',
  adminPassword: '13707'
};

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return { ...defaultConfig, ...saved };
    }
  } catch (e) {
    console.error('Error loading config:', e);
  }
  return { ...defaultConfig };
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

let config = loadConfig();
saveConfig(config);

// ═══════════════════════════════════════════════════════════════
// SEGMENTAÇÕES (REGRAS DE NEGÓCIO)
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

// Determinar segmento pelo total
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
// LISTA FIXA DE SETORES
// ═══════════════════════════════════════════════════════════════
const SETORES = [
  { id: '1260', nome: 'PRATA / Palmeira / Igaci /' },
  { id: '4005', nome: 'PLATINA & OURO / Palmeira / Igaci /Major / Cacimbinhas / Estrela / Min' },
  { id: '8238', nome: 'PRATA 2 / Major / Cacimbinhas / Estrela / Quebrangulo / Minador /' },
  { id: '8239', nome: 'SUPERVISORA DE RELACIONAMENTO PALMEIRA DOS INDIOS' },
  { id: '14210', nome: 'FVC - 13706 - A - ALCINA MARIA 1' },
  { id: '16283', nome: 'FVC - 13706- BER - ALCINA MARIA' },
  { id: '16289', nome: 'FVC - 13706 - A - ALCINA MARIA 2' },
  { id: '16471', nome: 'Setor Multimarcas - PALMEIRA DOS INDIOS - CP ALCINA MARIA' },
  { id: '17539', nome: 'PLATINA / Palmeira /' },
  { id: '18787', nome: 'FVC - 13706 - ALCINA MARIA REINÍCIOS' },
  { id: '19699', nome: '13706 - ALCINA MARIA - SETOR DEVOLUÇÃO' },
  { id: '23032', nome: 'BRONZE / Todas as cidades 13706' },
  { id: '23336', nome: 'SETOR PADRÃO' },
  { id: '15775', nome: 'INICIOS CENTRAL 13706' },
  { id: '1414', nome: 'SUPERVISORA DE RELACIONAMENTO' },
  { id: '1415', nome: 'PRATA 2 / Coruripe / Piaçabuçu / F. Deserto / São Sebastião /' },
  { id: '3124', nome: 'BRONZE / Todas as cidades 13707' },
  { id: '8317', nome: 'BRONZE 2 / Todas as cidades 13707' },
  { id: '9540', nome: 'PLATINA / Penedo /' },
  { id: '14211', nome: 'FVC - 13707 - A - ALCINA MARIA 1' },
  { id: '14244', nome: 'PRATA 3 / I.Nova / Junqueiro / Olho D\' Agua / Porto Real / São Brás /' },
  { id: '14245', nome: 'PRATA 1 / Penedo /' },
  { id: '14246', nome: 'OURO / Penedo /' },
  { id: '15242', nome: 'FVC - 13707 - A - ALCINA MARIA 2' },
  { id: '15774', nome: 'INICIOS CENTRAL 13707' },
  { id: '16284', nome: 'FVC - 13707- BER - ALCINA MARIA' },
  { id: '16472', nome: 'Setor Multimarcas - PENEDO - CP ALCINA MARIA' },
  { id: '16635', nome: 'FVC - 13707 - A - ALCINA MARIA 3' },
  { id: '18788', nome: 'FVC - 13707 - ALCINA MARIA REINÍCIOS' },
  { id: '19698', nome: '13707 - ALCINA MARIA - SETOR DEVOLUÇÃO' },
  { id: '23557', nome: 'SETOR PADRÃO' }
];

// GERÊNCIAS BLOQUEADAS
const GERENCIAS_BLOQUEADAS = ['13706', '13707'];

// Validar se é código de setor válido (não é gerência)
function isValidSetorId(id) {
  if (GERENCIAS_BLOQUEADAS.includes(id)) {
    return false;
  }
  return SETORES.some(s => s.id === id);
}

// Extrair código do setor (primeiro número da string)
function extractSetorId(setorString) {
  const match = String(setorString).match(/^\d+/);
  return match ? match[0] : null;
}

// ═══════════════════════════════════════════════════════════════
// CSV PARSING
// ═══════════════════════════════════════════════════════════════

// Converter moeda PT-BR para número (1.234,56 -> 1234.56)
function parseCurrencyPTBR(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value).trim();
  // Remove R$ e espaços
  let clean = str.replace(/R\$\s*/gi, '').trim();

  // Detecta formato PT-BR: 1.234,56
  if (clean.includes(',') && clean.includes('.')) {
    // PT-BR: pontos são milhares, vírgula é decimal
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',') && !clean.includes('.')) {
    // Apenas vírgula: assume decimal
    clean = clean.replace(',', '.');
  }

  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// Parse CSV robusto (detecta ; ou ,)
function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  // Detectar delimitador
  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  // Parse header
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

  // Parse rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      rows.push(row);
    }
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════
// DATA PROCESSING
// ═══════════════════════════════════════════════════════════════

// Cache de dados processados
let dataCache = {
  manha: null,
  tarde: null,
  cadastro: null,
  timestamp: null
};

// Carregar e processar CSV
function loadCSVData(slot) {
  const filePath = path.join(uploadsDir, `snapshot_${slot}.csv`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);

    // Filtrar apenas Tipo = "Venda" e agrupar por setor/revendedor
    const dealers = {};

    rows.forEach(row => {
      // Verificar se é venda
      const tipo = (row.Tipo || row.tipo || '').trim().toLowerCase();
      if (tipo !== 'venda') return;

      // Extrair setorId (primeiro número)
      const setorRaw = row.Setor || row.setor || '';
      const setorId = extractSetorId(setorRaw);
      if (!setorId) return;

      const codigoRevendedor = row.CodigoRevendedor || row.codigoRevendedor || row.Codigo || '';
      const nomeRevendedor = row.NomeRevendedora || row.NomeRevendedor || row.Nome || '';
      const ciclo = row.CicloFaturamento || row.Ciclo || '';
      const valor = parseCurrencyPTBR(row.ValorPraticado || row.Valor || 0);

      if (!codigoRevendedor || !ciclo) return;

      const key = `${setorId}-${codigoRevendedor}`;

      if (!dealers[key]) {
        dealers[key] = {
          codigo: codigoRevendedor,
          nome: nomeRevendedor,
          setorId: setorId,
          ciclos: {}
        };
      }

      if (!dealers[key].ciclos[ciclo]) {
        dealers[key].ciclos[ciclo] = 0;
      }
      dealers[key].ciclos[ciclo] += valor;
    });

    return Object.values(dealers);
  } catch (e) {
    console.error(`Error loading CSV ${slot}:`, e);
    return null;
  }
}

// Carregar dados de Cadastro (Fonte Oficial)
function loadCadastroData() {
  // 1. Tentar carregar JSON (novo formato via Excel upload)
  const jsonPath = path.join(uploadsDir, 'cadastro_segmento.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      return content.map(row => ({
        codigo: row.CodigoRevendedor || row.codigo || '',
        nome: row.Nome || row.nome || 'Sem Nome',
        setorId: extractSetorId(row.SetorId || row.setor || ''),
        segmentoOficial: row.SegmentoAtual || row.segmento || 'Bronze'
      })).filter(d => d.codigo && d.setorId);
    } catch (e) {
      console.error('Error loading Cadastro JSON:', e);
    }
  }

  // 2. Fallback para CSV (legado)
  const filePath = path.join(uploadsDir, 'cadastro_segmento.csv');
  
  // Se já temos em cache e o arquivo não mudou, retorna cache (simplificado)
  // Para produção ideal verificar mtime, aqui vamos recarregar para garantir consistência
  if (!fs.existsSync(filePath)) return [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = parseCSV(content);
    
    return rows.map(row => ({
      codigo: row.CodigoRevendedor || row.codigo || '',
      nome: row.Nome || row.nome || 'Sem Nome',
      setorId: extractSetorId(row.SetorId || row.setor || ''),
      segmentoOficial: row.SegmentoAtual || row.segmento || 'Bronze'
    })).filter(d => d.codigo && d.setorId);
  } catch (e) {
    console.error('Error loading Cadastro CSV:', e);
    return [];
  }
}

// Obter dados do snapshot ativo
function getActiveData() {
  const slot = config.snapshotAtivo;
  // Recarregar se necessário
  const filePath = path.join(uploadsDir, `snapshot_${slot}.csv`);
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (!dataCache[slot] || !dataCache.timestamp || stat.mtimeMs > dataCache.timestamp) {
      dataCache[slot] = loadCSVData(slot);
      dataCache.timestamp = stat.mtimeMs;
    }
  }
  return dataCache[slot];
}

// Obter dealers de um setor específico
function getDealersForSetor(setorId) {
  // 1. Carregar Cadastro (Fonte da Verdade)
  const cadastro = loadCadastroData();
  
  // Se não houver cadastro, fallback para demo ou vazio
  if (!cadastro || cadastro.length === 0) {
    const data = getActiveData();
    if (!data) return generateDemoData(setorId);
    return data.filter(d => d.setorId === setorId);
  }

  // 2. Filtrar revendedores do setor no cadastro
  const dealersCadastro = cadastro.filter(d => d.setorId === setorId);
  
  // 3. Carregar Vendas (Performance)
  const vendasData = getActiveData() || [];
  
  // Indexar vendas por código para acesso O(1)
  const vendasMap = new Map();
  vendasData.forEach(v => {
    if (v.setorId === setorId) { // Garantir que venda pertence ao setor
      vendasMap.set(v.codigo, v);
    }
  });

  // 4. Cruzamento (Left Join: Cadastro -> Vendas)
  return dealersCadastro.map(dealer => {
    const venda = vendasMap.get(dealer.codigo);
    
    return {
      codigo: dealer.codigo,
      nome: dealer.nome, // Nome oficial do cadastro
      setorId: dealer.setorId,
      segmentoOficial: dealer.segmentoOficial, // Segmento fixo do ciclo
      ciclos: venda ? venda.ciclos : {} // Se não vendeu, ciclos vazio
    };
  });
}

// Gerar dados de demonstração
function generateDemoData(setorId) {
  const dealers = [];
  const count = 12 + Math.floor(Math.random() * 8);
  const nomes = ['Maria', 'Ana', 'Paula', 'Sandra', 'Rita', 'Lucia', 'Carmen', 'Rosa', 'Julia', 'Vera', 'Sonia', 'Leia', 'Marta', 'Clara', 'Denise', 'Elisa', 'Fatima', 'Gloria', 'Helena', 'Ivone'];

  for (let i = 1; i <= count; i++) {
    const baseTotal = 1000 + Math.random() * 150000;
    const ciclos = {};

    Object.keys(config.representatividade).forEach(ciclo => {
      const variation = 0.5 + Math.random();
      ciclos[ciclo] = Math.round(baseTotal * variation / 9 * 100) / 100;
    });

    dealers.push({
      codigo: `${10000 + i}`,
      nome: `${nomes[i % nomes.length]} Silva ${i}`,
      setorId,
      ciclos
    });
  }

  return dealers;
}

// Calcular métricas do revendedor
function calculateDealerMetrics(dealer) {
  // Total de todos os ciclos
  let totalGeral = 0;
  Object.values(dealer.ciclos).forEach(valor => {
    totalGeral += valor;
  });

  // Total do ciclo atual
  const totalCicloAtual = dealer.ciclos[config.cicloAtual] || 0;

  // Determinar segmento: Prioriza o oficial do cadastro, fallback para calculado
  const segmento = dealer.segmentoOficial || getSegmentoByTotal(totalGeral);
  
  const segInfo = SEGMENTOS[segmento];

  // Meta para manter (mínimo do segmento atual)
  const metaManter = segInfo.minManter;
  const faltaManter = Math.max(0, metaManter - totalGeral);
  const percentManter = metaManter > 0 ? Math.min(100, (totalGeral / metaManter) * 100) : 100;

  // Meta para subir
  const metaSubir = segInfo.metaSubir;
  const faltaSubir = metaSubir ? Math.max(0, metaSubir - totalGeral) : null;
  const percentSubir = metaSubir ? Math.min(100, (totalGeral / metaSubir) * 100) : null;

  // Meta ponderada do ciclo atual
  const repCiclo = config.representatividade[config.cicloAtual] || 10;
  const metaCicloPonderada = metaSubir ? (metaSubir * repCiclo / 100) : (metaManter * repCiclo / 100);
  const percentCiclo = metaCicloPonderada > 0 ? Math.min(100, (totalCicloAtual / metaCicloPonderada) * 100) : 0;

  // Delta do dia (simulado - em produção viria da comparação manhã/tarde)
  const deltaDia = Math.round((Math.random() - 0.3) * 3000 * 100) / 100;

  // Impulso motivacional
  let impulso = '';
  if (percentManter < 30) impulso = 'CRITICAL - NEED BOOST';
  else if (percentManter < 50) impulso = 'WARMING UP';
  else if (percentManter < 80) impulso = 'ON TRACK';
  else if (percentManter < 100) impulso = 'ALMOST THERE';
  else if (percentSubir && percentSubir >= 80) impulso = 'LEVEL UP READY';
  else impulso = 'MISSION SECURE';

  return {
    ...dealer,
    totalGeral: Math.round(totalGeral * 100) / 100,
    totalCicloAtual: Math.round(totalCicloAtual * 100) / 100,
    segmento,
    segmentoProximo: segInfo.proximo,
    metaManter,
    metaSubir,
    faltaManter: Math.round(faltaManter * 100) / 100,
    faltaSubir: faltaSubir ? Math.round(faltaSubir * 100) / 100 : null,
    percentManter: Math.round(percentManter * 10) / 10,
    percentSubir: percentSubir ? Math.round(percentSubir * 10) / 10 : null,
    metaCicloPonderada: Math.round(metaCicloPonderada * 100) / 100,
    percentCiclo: Math.round(percentCiclo * 10) / 10,
    deltaDia,
    impulso,
    nearLevelUp: percentSubir !== null && percentSubir >= 80,
    atRisk: percentManter < 50
  };
}

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// Health check (para UptimeRobot)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    cicloAtual: config.cicloAtual,
    snapshotAtivo: config.snapshotAtivo,
    uptime: process.uptime()
  });
});

// Lista de setores
app.get('/api/setores', (req, res) => {
  res.json(SETORES);
});

// Config pública
app.get('/api/config', (req, res) => {
  const { adminUser, adminPassword, ...publicConfig } = config;
  res.json(publicConfig);
});

// Validar setor
app.get('/api/validar-setor/:setorId', (req, res) => {
  const { setorId } = req.params;

  if (GERENCIAS_BLOQUEADAS.includes(setorId)) {
    return res.status(400).json({
      valid: false,
      error: 'Código inválido. Informe o código do setor (ex: 19698). Códigos de gerência (13706, 13707) não são permitidos.'
    });
  }

  const setor = SETORES.find(s => s.id === setorId);
  if (!setor) {
    return res.status(404).json({
      valid: false,
      error: 'Setor não encontrado. Verifique o código informado.'
    });
  }

  res.json({ valid: true, setor });
});

// Dashboard do setor
app.get('/api/dashboard', (req, res) => {
  const { setorId } = req.query;

  if (!setorId) {
    return res.status(400).json({ error: 'setorId é obrigatório' });
  }

  if (GERENCIAS_BLOQUEADAS.includes(setorId)) {
    return res.status(400).json({
      error: 'Código inválido. Informe o código do setor (ex: 19698). Códigos de gerência (13706, 13707) não são permitidos.'
    });
  }

  const setor = SETORES.find(s => s.id === setorId);
  if (!setor) {
    return res.status(404).json({ error: 'Setor não encontrado' });
  }

  const dealers = getDealersForSetor(setorId);
  const dealersWithMetrics = dealers.map(d => calculateDealerMetrics(d));

  // KPIs
  const totalSetor = dealersWithMetrics.reduce((sum, d) => sum + d.totalGeral, 0);
  const qtdRevendedores = dealersWithMetrics.length;
  const nearLevelUp = dealersWithMetrics.filter(d => d.nearLevelUp).length;
  const atRisk = dealersWithMetrics.filter(d => d.atRisk).length;

  // Contagem por segmento
  const segmentosCount = {};
  dealersWithMetrics.forEach(d => {
    segmentosCount[d.segmento] = (segmentosCount[d.segmento] || 0) + 1;
  });

  res.json({
    setor,
    cicloAtual: config.cicloAtual,
    snapshotAtivo: config.snapshotAtivo,
    kpis: {
      totalSetor: Math.round(totalSetor * 100) / 100,
      qtdRevendedores,
      nearLevelUp,
      atRisk,
      segmentosCount
    },
    dealers: dealersWithMetrics
  });
});

// Rota legada (compatibilidade)
app.get('/api/setor/:setorId', (req, res) => {
  req.query.setorId = req.params.setorId;
  return res.redirect(`/api/dashboard?setorId=${req.params.setorId}`);
});

// Detalhe do revendedor
app.get('/api/revendedor', (req, res) => {
  const { setorId, codigoRevendedor } = req.query;

  if (!setorId || !codigoRevendedor) {
    return res.status(400).json({ error: 'setorId e codigoRevendedor são obrigatórios' });
  }

  const dealers = getDealersForSetor(setorId);
  const dealer = dealers.find(d => d.codigo === codigoRevendedor);

  if (!dealer) {
    return res.status(404).json({ error: 'Revendedor não encontrado' });
  }

  res.json(calculateDealerMetrics(dealer));
});

// Rank do dia
app.get('/api/setor/:setorId/rank', (req, res) => {
  const { setorId } = req.params;
  const dealers = getDealersForSetor(setorId);
  const dealersWithMetrics = dealers.map(d => calculateDealerMetrics(d));

  const ranked = dealersWithMetrics
    .sort((a, b) => b.deltaDia - a.deltaDia)
    .slice(0, 10);

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

// Ciclos do setor
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

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════

// Login admin
app.post('/api/admin/login', (req, res) => {
  const { user, password } = req.body;

  if (user === config.adminUser && password === config.adminPassword) {
    res.json({ success: true, message: 'ACCESS GRANTED' });
  } else {
    res.status(401).json({ success: false, message: 'ACCESS DENIED' });
  }
});

// Logout admin
app.post('/api/admin/logout', (req, res) => {
  res.json({ success: true, message: 'LOGGED OUT' });
});

// Get admin config
app.get('/api/admin/config', (req, res) => {
  res.json(config);
});

// Update config
app.put('/api/admin/config', (req, res) => {
  const { cicloAtual, snapshotAtivo, representatividade } = req.body;

  if (cicloAtual) config.cicloAtual = cicloAtual;
  if (snapshotAtivo && ['manha', 'tarde'].includes(snapshotAtivo)) {
    config.snapshotAtivo = snapshotAtivo;
  }
  if (representatividade) {
    // Validar que soma = 100% (aproximadamente)
    const soma = Object.values(representatividade).reduce((a, b) => a + b, 0);
    if (soma < 95 || soma > 105) {
      return res.status(400).json({
        error: `Soma da representatividade deve ser ~100%. Atual: ${soma}%`
      });
    }
    config.representatividade = representatividade;
  }

  saveConfig(config);

  // Limpar cache para recarregar com novas configs
  dataCache.timestamp = null;

  res.json({ success: true, config });
});

// Upload CSV
app.post('/api/admin/upload', upload.single('file'), (req, res) => {
  const slot = req.query.slot || 'manha';

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  if (!['manha', 'tarde'].includes(slot)) {
    return res.status(400).json({ error: 'Slot inválido. Use manha ou tarde.' });
  }

  config.uploads[slot] = {
    filename: req.file.filename,
    originalName: req.file.originalname,
    timestamp: new Date().toISOString(),
    size: req.file.size
  };
  saveConfig(config);

  // Limpar cache para forçar reload
  dataCache[slot] = null;
  dataCache.timestamp = null;

  res.json({
    success: true,
    message: `Upload ${slot} concluído`,
    file: req.file.filename
  });
});

// Upload Cadastro via JSON (Processado do Excel no Front)
app.post('/api/admin/cadastro-data', (req, res) => {
  try {
    const data = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: 'Formato inválido. Esperado array JSON.' });
    }
    
    const filePath = path.join(uploadsDir, 'cadastro_segmento.json');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Limpar cache
    dataCache.cadastro = null;

    res.json({ success: true, count: data.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao salvar dados de cadastro.' });
  }
});

// Upload Cadastro (Novo Endpoint)
app.post('/api/admin/upload-cadastro', upload.single('file'), (req, res) => {
  // O multer já salvou como cadastro_segmento.csv devido à query type=cadastro
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  // Limpar cache
  dataCache.cadastro = null;

  res.json({
    success: true,
    message: 'Cadastro de segmentos atualizado com sucesso',
    file: req.file.filename
  });
});

// Update snapshot ativo (legado)
app.post('/api/admin/snapshot', (req, res) => {
  const { snapshot } = req.body;
  if (!['manha', 'tarde'].includes(snapshot)) {
    return res.status(400).json({ error: 'Snapshot inválido' });
  }
  config.snapshotAtivo = snapshot;
  saveConfig(config);
  res.json({ success: true, snapshotAtivo: snapshot });
});

// Update ciclo (legado)
app.post('/api/admin/ciclo', (req, res) => {
  const { ciclo } = req.body;
  config.cicloAtual = ciclo;
  saveConfig(config);
  res.json({ success: true, cicloAtual: ciclo });
});

// Update representatividade (legado)
app.post('/api/admin/representatividade', (req, res) => {
  const { representatividade } = req.body;

  const soma = Object.values(representatividade).reduce((a, b) => a + b, 0);
  if (soma < 95 || soma > 105) {
    return res.status(400).json({
      error: `Soma da representatividade deve ser ~100%. Atual: ${soma}%`
    });
  }

  config.representatividade = { ...config.representatividade, ...representatividade };
  saveConfig(config);
  res.json({ success: true, representatividade: config.representatividade });
});

// ═══════════════════════════════════════════════════════════════
// SERVE FRONTEND IN PRODUCTION
// ═══════════════════════════════════════════════════════════════
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');

  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     SUPERVISION SEGMENTS - SERVER ONLINE                     ║
║     Port: ${PORT}                                                ║
║     Mode: ${(process.env.NODE_ENV || 'development').padEnd(12)}                             ║
║     Ciclo: ${config.cicloAtual}                                       ║
║     Snapshot: ${config.snapshotAtivo}                                       ║
║     Status: OPERATIONAL                                      ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
