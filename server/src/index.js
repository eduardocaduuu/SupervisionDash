const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const SegmentService = require('./SegmentService');
const VendasService = require('./VendasService');
const MapService = require('./MapService');
const ProdutosService = require('./ProdutosService');
const { connectMongoDB, isMongoConnected } = require('./db/mongodb');
const PersistenceService = require('./services/PersistenceService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ═══════════════════════════════════════════════════════════════
// DATA DIRECTORIES
// ═══════════════════════════════════════════════════════════════
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION (usando PersistenceService - MongoDB com fallback JSON)
// ═══════════════════════════════════════════════════════════════
let config = { ...PersistenceService.defaultConfig };

// Funcoes wrapper para compatibilidade com codigo existente
async function saveConfig(cfg) {
  await PersistenceService.saveConfig(cfg);
}

// Cache de notes em memoria (atualizado em cada operacao)
let notesCache = {};

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

// Normalizar segmento (remove sufixo GB e trata valores invalidos)
function normalizeSegmento(segmento) {
  if (!segmento) return null;
  // Remove sufixo " GB" se existir (ex: "Diamante GB" -> "Diamante")
  let normalized = segmento.replace(/\s*GB$/i, '').trim();
  // Capitaliza primeira letra
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  // Retorna null para valores invalidos (ex: "Revendedor")
  if (!SEGMENTOS[normalized]) return null;
  return normalized;
}

// ═══════════════════════════════════════════════════════════════
// LISTA DINÂMICA DE SETORES (gerada a partir de Segmentos_bd.xlsx)
// ═══════════════════════════════════════════════════════════════

// Lista estática como fallback (caso a planilha não esteja disponível)
const SETORES_FALLBACK = [
  { id: '1414', nome: 'SUPERVISORA DE RELACIONAMENTO' },
  { id: '1415', nome: 'PRATA 2 / Coruripe / Piaçabuçu / F. Deserto / São Sebastião /' },
  { id: '3124', nome: 'BRONZE / Todas as cidades 13707' },
  { id: '4005', nome: 'PLATINA & OURO / Palmeira / Igaci /Major / Cacimbinhas / Estrela / Minador / Quebrangulo /' },
  { id: '8238', nome: 'PRATA 2 / Major / Cacimbinhas / Estrela / Quebrangulo / Minador /' },
  { id: '8239', nome: 'SUPERVISORA DE RELACIONAMENTO PALMEIRA DOS INDIOS' },
  { id: '8317', nome: 'BRONZE 2 / Todas as cidades 13707' },
  { id: '9540', nome: 'PLATINA / Penedo /' },
  { id: '14210', nome: 'FVC - 13706 - A - ALCINA MARIA 1' },
  { id: '14211', nome: 'FVC - 13707 - A - ALCINA MARIA 1' },
  { id: '14244', nome: "PRATA 3 / I.Nova / Junqueiro / Olho D' Agua / Porto Real / São Brás / Teotônio" },
  { id: '14245', nome: 'PRATA 1 / Penedo /' },
  { id: '14246', nome: 'OURO / Penedo /' },
  { id: '15242', nome: 'FVC - 13707 - A - ALCINA MARIA 2' },
  { id: '15774', nome: 'INICIOS CENTRAL 13707' },
  { id: '15775', nome: 'INICIOS CENTRAL 13706' },
  { id: '16283', nome: 'FVC - 13706- BER - ALCINA MARIA' },
  { id: '16284', nome: 'FVC - 13707- BER - ALCINA MARIA' },
  { id: '16289', nome: 'FVC - 13706 - A - ALCINA MARIA 2' },
  { id: '16471', nome: 'Setor Multimarcas - PALMEIRA DOS INDIOS - CP ALCINA MARIA' },
  { id: '16472', nome: 'Setor Multimarcas - PENEDO - CP ALCINA MARIA' },
  { id: '16635', nome: 'FVC - 13707 - A - ALCINA MARIA 3' },
  { id: '17539', nome: 'PLATINA / Palmeira /' },
  { id: '18787', nome: 'FVC - 13706 - ALCINA MARIA REINÍCIOS' },
  { id: '18788', nome: 'FVC - 13707 - ALCINA MARIA REINÍCIOS' },
  { id: '23032', nome: 'BRONZE / Todas as cidades 13706' },
  { id: '23336', nome: 'SETOR PADRÃO 13706' },
  { id: '23557', nome: 'SETOR PADRÃO 13707' }
];

// Gerar lista de setores dinamicamente a partir da planilha
function getSetoresDinamicos() {
  try {
    const XLSX = require('xlsx');
    // Caminho correto: data/ na raiz do projeto (não server/data/)
    const segmentosPath = path.join(__dirname, '../../data/Segmentos_bd.xlsx');

    if (!fs.existsSync(segmentosPath)) {
      console.log('[Setores] Planilha não encontrada, usando lista fallback');
      return SETORES_FALLBACK;
    }

    const workbook = XLSX.readFile(segmentosPath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // Mapa para agrupar setores únicos (id -> nome)
    const setoresMap = new Map();

    rawData.forEach(row => {
      // Pega o código e normaliza (remove pontos)
      let codigo = row.CodigoEstruturaComercial || row.SetorId || '';
      codigo = String(codigo).replace(/\./g, '').replace(/\s+/g, '').trim();

      // Pega o nome do setor
      const nome = row.EstruturaComercial || row.SetorNome || `Setor ${codigo}`;

      if (codigo && !setoresMap.has(codigo)) {
        setoresMap.set(codigo, nome);
      }
    });

    const setores = Array.from(setoresMap.entries()).map(([id, nome]) => ({ id, nome }));
    console.log(`[Setores] ${setores.length} setores carregados da planilha`);

    return setores.length > 0 ? setores : SETORES_FALLBACK;
  } catch (error) {
    console.error('[Setores] Erro ao carregar setores da planilha:', error);
    return SETORES_FALLBACK;
  }
}

// Carrega setores uma vez na inicialização
let SETORES = getSetoresDinamicos();

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

// Normalizar ID do setor (remover pontos, espaços e caracteres especiais)
function normalizeSetorId(setorId) {
  return String(setorId || '').replace(/\./g, '').replace(/\s+/g, '').trim();
}

// ═══════════════════════════════════════════════════════════════
// DATA LOADING
// ═══════════════════════════════════════════════════════════════

// Carregar dados de Cadastro (Fonte Oficial)
function loadCadastroData() {
  return SegmentService.loadSegments();
}

// Carregar dados de Vendas
function loadVendasData() {
  return VendasService.loadVendas();
}

// Obter dealers de um setor específico
function getDealersForSetor(setorId) {
  // 1. Carregar Cadastro (Fonte da Verdade)
  const cadastro = loadCadastroData();

  // 2. Carregar Vendas
  const vendasData = loadVendasData();

  // Se não houver cadastro, usa apenas vendas ou dados de demonstração
  if (!cadastro || cadastro.length === 0) {
    if (!vendasData || vendasData.length === 0) {
      return generateDemoData(setorId);
    }
    return vendasData.filter(d => d.setorId === setorId);
  }

  // 3. Filtrar revendedores do setor no cadastro
  const dealersCadastro = cadastro.filter(d => d.setorId === setorId);

  // 4. Indexar vendas por código para acesso O(1)
  const vendasMap = new Map();
  (vendasData || []).forEach(v => {
    if (v.setorId === setorId) {
      vendasMap.set(v.codigo, v);
    }
  });

  // 5. Cruzamento (Left Join: Cadastro -> Vendas)
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

  // Determinar segmento: Prioriza o oficial do cadastro (normalizado) se for valido, senao usa calculado
  let segmento = normalizeSegmento(dealer.segmentoOficial);
  if (!segmento) {
    segmento = getSegmentoByTotal(totalGeral);
  }

  const segInfo = SEGMENTOS[segmento];

  // Meta para manter (mínimo do segmento atual)
  const metaManter = segInfo.minManter;
  const faltaManter = Math.max(0, metaManter - totalGeral);
  const percentManter = metaManter > 0 ? Math.min(100, (totalGeral / metaManter) * 100) : 100;

  // Meta para subir
  const metaSubir = segInfo.metaSubir;
  const faltaSubir = metaSubir ? Math.max(0, metaSubir - totalGeral) : null;
  const percentSubir = metaSubir ? Math.min(100, (totalGeral / metaSubir) * 100) : null;

  // Meta ponderada do ciclo atual (usa ?? para permitir 0 como valor válido)
  const repCiclo = config.representatividade[config.cicloAtual] ?? 10;
  const metaCicloPonderada = repCiclo > 0
    ? (metaSubir ? (metaSubir * repCiclo / 100) : (metaManter * repCiclo / 100))
    : 0;
  const percentCiclo = metaCicloPonderada > 0 ? Math.min(100, (totalCicloAtual / metaCicloPonderada) * 100) : 0;

  // Delta do dia (simulado - em produção viria da comparação manhã/tarde)
  const deltaDia = Math.round((Math.random() - 0.3) * 3000 * 100) / 100;

  // Impulso motivacional
  let impulso = '';
  if (percentManter < 30) impulso = 'CRÍTICO - PRECISA ACELERAR';
  else if (percentManter < 50) impulso = 'AQUECENDO';
  else if (percentManter < 80) impulso = 'NO CAMINHO';
  else if (percentManter < 100) impulso = 'QUASE LÁ';
  else if (percentSubir && percentSubir >= 80) impulso = 'PRONTO PARA SUBIR';
  else impulso = 'MISSÃO CUMPRIDA';

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

// Lista de setores (recarrega dinamicamente para refletir novas planilhas)
app.get('/api/setores', (req, res) => {
  // Recarrega a lista de setores para refletir mudanças na planilha
  SETORES = getSetoresDinamicos();
  res.json(SETORES);
});

// Config pública
app.get('/api/config', (req, res) => {
  const { adminUser, adminPassword, ...publicConfig } = config;
  res.json(publicConfig);
});

// Validar setor
app.get('/api/validar-setor/:setorId', (req, res) => {
  // Normaliza o ID (remove pontos, espaços, etc)
  const setorId = normalizeSetorId(req.params.setorId);

  if (GERENCIAS_BLOQUEADAS.includes(setorId)) {
    return res.status(400).json({
      valid: false,
      error: 'Código inválido. Informe o código do setor (ex: 19698). Códigos de gerência (13706, 13707) não são permitidos.'
    });
  }

  // Recarrega setores para garantir que novos setores sejam reconhecidos
  SETORES = getSetoresDinamicos();

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
  if (!req.query.setorId) {
    return res.status(400).json({ error: 'setorId é obrigatório' });
  }

  // Normaliza o ID (remove pontos, espaços, etc)
  const setorId = normalizeSetorId(req.query.setorId);

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
  const setorId = normalizeSetorId(req.params.setorId);
  return res.redirect(`/api/dashboard?setorId=${setorId}`);
});

// Detalhe do revendedor
app.get('/api/revendedor', (req, res) => {
  if (!req.query.setorId || !req.query.codigoRevendedor) {
    return res.status(400).json({ error: 'setorId e codigoRevendedor são obrigatórios' });
  }

  const setorId = normalizeSetorId(req.query.setorId);
  const codigoRevendedor = normalizeSetorId(req.query.codigoRevendedor);

  const dealers = getDealersForSetor(setorId);
  const dealer = dealers.find(d => d.codigo === codigoRevendedor);

  if (!dealer) {
    return res.status(404).json({ error: 'Revendedor não encontrado' });
  }

  res.json(calculateDealerMetrics(dealer));
});

// Rank do ciclo
app.get('/api/setor/:setorId/rank', (req, res) => {
  const setorId = normalizeSetorId(req.params.setorId);
  const dealers = getDealersForSetor(setorId);
  const dealersWithMetrics = dealers.map(d => calculateDealerMetrics(d));

  const ranked = dealersWithMetrics
    .sort((a, b) => b.totalCicloAtual - a.totalCicloAtual)
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
  if (ranked[0]?.totalCicloAtual > 0) {
    missionBoosters.push(`🔥 ${ranked[0].nome} lidera o ciclo com R$ ${ranked[0].totalCicloAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}!`);
  }

  res.json({ ranking: ranked, missionBoosters });
});

// Ciclos do setor
app.get('/api/setor/:setorId/ciclos', (req, res) => {
  const setorId = normalizeSetorId(req.params.setorId);
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

// Produtos do setor (análise de associação)
app.get('/api/setor/:setorId/produtos', (req, res) => {
  const setorId = normalizeSetorId(req.params.setorId);

  if (GERENCIAS_BLOQUEADAS.includes(setorId)) {
    return res.status(400).json({ error: 'Código de gerência não permitido' });
  }

  const setor = SETORES.find(s => s.id === setorId);
  if (!setor) {
    return res.status(404).json({ error: 'Setor não encontrado' });
  }

  try {
    const data = ProdutosService.getAssociacoesBySetor(setorId);
    res.json({
      setor,
      ...data
    });
  } catch (error) {
    console.error('[Produtos] Erro:', error);
    res.status(500).json({ error: 'Erro ao processar dados de produtos' });
  }
});

// ═══════════════════════════════════════════════════════════════
// MAP ROUTES (Mapa de Calor)
// ═══════════════════════════════════════════════════════════════

// Dados do mapa de calor (com filtro opcional por responsável ou setor)
app.get('/api/map/data', (req, res) => {
  const responsavel = req.query.responsavel || null;
  const setorId = req.query.setorId || null;
  const result = MapService.loadMapData(responsavel, setorId);
  res.json(result);
});

// Dados agrupados por responsável
app.get('/api/map/responsaveis', (req, res) => {
  const result = MapService.getDataByResponsavel();
  res.json(result);
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
app.put('/api/admin/config', async (req, res) => {
  const { cicloAtual, representatividade } = req.body;

  if (cicloAtual) config.cicloAtual = cicloAtual;
  if (representatividade) {
    config.representatividade = representatividade;
  }

  await saveConfig(config);
  res.json({ success: true, config });
});

// Update ciclo (legado)
app.post('/api/admin/ciclo', async (req, res) => {
  const { ciclo } = req.body;
  config.cicloAtual = ciclo;
  await saveConfig(config);
  res.json({ success: true, cicloAtual: ciclo });
});

// Update representatividade
app.post('/api/admin/representatividade', async (req, res) => {
  const { representatividade } = req.body;

  if (!representatividade || typeof representatividade !== 'object') {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  config.representatividade = { ...config.representatividade, ...representatividade };
  await saveConfig(config);
  res.json({ success: true, representatividade: config.representatividade });
});

// Salvar mensagem de recompensa
app.post('/api/admin/mensagem-recompensa', async (req, res) => {
  const { titulo, texto } = req.body;

  config.mensagemRecompensa = {
    titulo: titulo || 'Nova Meta!',
    texto: texto || '',
    ativa: true,
    criadaEm: new Date().toISOString()
  };

  await saveConfig(config);
  res.json({ success: true, mensagem: config.mensagemRecompensa });
});

// Remover mensagem de recompensa
app.delete('/api/admin/mensagem-recompensa', async (req, res) => {
  config.mensagemRecompensa = null;
  await saveConfig(config);
  res.json({ success: true });
});

// Obter mensagem de recompensa (público - para supervisoras)
app.get('/api/mensagem-recompensa', (req, res) => {
  res.json({ mensagem: config.mensagemRecompensa });
});

// ═══════════════════════════════════════════════════════════════
// NOTES ROUTES (usando PersistenceService - MongoDB com fallback JSON)
// ═══════════════════════════════════════════════════════════════
app.get('/api/notes', async (req, res) => {
  try {
    notesCache = await PersistenceService.loadNotes();
    res.json(notesCache);
  } catch (error) {
    console.error('[Notes] Erro ao carregar:', error);
    res.json(notesCache);
  }
});

app.post('/api/notes', async (req, res) => {
  const { resellerId, note } = req.body;
  if (!resellerId) return res.status(400).json({ error: 'resellerId required' });

  try {
    notesCache[resellerId] = note;
    await PersistenceService.saveNote(resellerId, note, notesCache);
    res.json({ success: true });
  } catch (error) {
    console.error('[Notes] Erro ao salvar:', error);
    res.status(500).json({ error: 'Erro ao salvar nota' });
  }
});

// ═══════════════════════════════════════════════════════════════
// DEALER DATA ROUTES (Meta + Acoes + Note)
// ═══════════════════════════════════════════════════════════════
let dealerDataCache = {};

app.get('/api/dealer-data', async (req, res) => {
  try {
    dealerDataCache = await PersistenceService.loadDealerData();
    res.json(dealerDataCache);
  } catch (error) {
    console.error('[DealerData] Erro ao carregar:', error);
    res.json(dealerDataCache);
  }
});

app.post('/api/dealer-data', async (req, res) => {
  const { resellerId, note, meta, acao } = req.body;
  if (!resellerId) return res.status(400).json({ error: 'resellerId required' });

  try {
    // Inicializa se não existe
    if (!dealerDataCache[resellerId]) {
      dealerDataCache[resellerId] = { note: '', meta: null, acoes: [] };
    }

    const data = dealerDataCache[resellerId];

    // Atualiza nota se fornecida
    if (note !== undefined) {
      data.note = note;
    }

    // Atualiza meta se fornecida
    if (meta !== undefined) {
      data.meta = meta;
    }

    // Adiciona ação se fornecida
    if (acao) {
      data.acoes.unshift({ tipo: acao, data: new Date().toISOString() });
      // Mantém apenas as últimas 10 ações
      if (data.acoes.length > 10) {
        data.acoes = data.acoes.slice(0, 10);
      }
    }

    dealerDataCache[resellerId] = data;
    await PersistenceService.saveDealerData(resellerId, data, dealerDataCache);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[DealerData] Erro ao salvar:', error);
    res.status(500).json({ error: 'Erro ao salvar dados' });
  }
});

// ═══════════════════════════════════════════════════════════════
// SLACK ALERTS ROUTES (Admin)
// ═══════════════════════════════════════════════════════════════
const slackClient = require('./slack/slackClient');
const alertComposer = require('./slack/alertComposer');
const riskService = require('./slack/riskService');
const cronSlackAlerts = require('./jobs/cronSlackAlerts');

// Get Slack status (admin)
app.get('/api/admin/slack/status', (req, res) => {
  const slackConfig = config.slack || {};
  const baseUrl = process.env.SLACK_BASE_URL || 'https://dashsupervision.onrender.com';

  res.json({
    enabled: slackConfig.enabled || false,
    testMode: slackConfig.testMode !== false,
    riskThresholdPercent: slackConfig.riskThresholdPercent || 50,
    sendWhenZero: slackConfig.sendWhenZero || false,
    baseUrl,
    hasToken: !!process.env.SLACK_BOT_TOKEN,
    hasTestUser: !!process.env.SLACK_TEST_USER_ID,
    mappedSetores: Object.keys(slackConfig.supervisoresPorSetor || {}),
    cronSchedule: [
      'Segunda 09:00 (America/Maceio)',
      'Segunda 17:00 (America/Maceio)',
      'Sexta 09:00 (America/Maceio)',
      'Sexta 17:00 (America/Maceio)'
    ]
  });
});

// Test Slack alert (admin)
app.post('/api/admin/slack/test', async (req, res) => {
  const { setorId } = req.query;

  if (!setorId) {
    return res.status(400).json({ error: 'setorId is required (e.g., ?setorId=4005)' });
  }

  // Check if Slack token is configured
  if (!process.env.SLACK_BOT_TOKEN) {
    return res.status(500).json({
      error: 'SLACK_BOT_TOKEN not configured',
      hint: 'Add SLACK_BOT_TOKEN to your environment variables on Render'
    });
  }

  const slackConfig = config.slack || {};

  // Determine recipient
  let userId;
  if (slackConfig.testMode !== false) {
    userId = process.env.SLACK_TEST_USER_ID;
    if (!userId) {
      return res.status(500).json({
        error: 'testMode is ON but SLACK_TEST_USER_ID not configured',
        hint: 'Add SLACK_TEST_USER_ID to your environment variables'
      });
    }
  } else {
    userId = slackConfig.supervisoresPorSetor?.[setorId];
    if (!userId) {
      return res.status(400).json({
        error: `No supervisor mapped for setor ${setorId}`,
        hint: 'Add mapping in config.slack.supervisoresPorSetor or enable testMode'
      });
    }
  }

  try {
    // Get risk summary
    const summary = riskService.getSectorRiskSummary(setorId);

    // Compose message
    const { text, blocks } = alertComposer.composeRiskAlert(summary);

    // Send DM
    const result = await slackClient.sendDM(userId, text, blocks);

    if (result.ok) {
      res.json({
        success: true,
        message: `Alert sent to ${slackConfig.testMode !== false ? 'test user' : 'supervisor'}`,
        summary: {
          setorId: summary.setorId,
          setorNome: summary.setorNome,
          riskCount: summary.riskCount,
          totalDealers: summary.totalDealers,
          threshold: summary.threshold
        },
        recipient: userId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('[Slack Test] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update Slack config (admin)
app.put('/api/admin/slack/config', async (req, res) => {
  const { enabled, testMode, riskThresholdPercent, sendWhenZero, supervisoresPorSetor } = req.body;

  if (!config.slack) {
    config.slack = { ...PersistenceService.defaultConfig.slack };
  }

  if (typeof enabled === 'boolean') config.slack.enabled = enabled;
  if (typeof testMode === 'boolean') config.slack.testMode = testMode;
  if (typeof riskThresholdPercent === 'number') config.slack.riskThresholdPercent = riskThresholdPercent;
  if (typeof sendWhenZero === 'boolean') config.slack.sendWhenZero = sendWhenZero;
  if (supervisoresPorSetor && typeof supervisoresPorSetor === 'object') {
    config.slack.supervisoresPorSetor = supervisoresPorSetor;
  }

  await saveConfig(config);

  res.json({
    success: true,
    slack: config.slack
  });
});

// Test Slack connection (admin)
app.get('/api/admin/slack/connection', async (req, res) => {
  const result = await slackClient.testConnection();
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD ROUTES (Admin)
// ═══════════════════════════════════════════════════════════════
const uploadDir = path.join(__dirname, '../../data');

// Configurar multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const tipo = req.query.tipo || req.body.tipo;
    const ext = path.extname(file.originalname).toLowerCase();

    if (tipo === 'vendas') {
      // Aceita .csv ou .xlsx para vendas
      cb(null, `vendas_bd${ext}`);
    } else if (tipo === 'segmentos') {
      cb(null, 'Segmentos_bd.xlsx');
    } else {
      cb(new Error('Tipo de arquivo inválido'));
    }
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const tipo = req.query.tipo || req.body.tipo;
    const ext = path.extname(file.originalname).toLowerCase();

    if (tipo === 'vendas') {
      // Aceitar CSV ou XLSX para vendas
      if (ext === '.csv' || ext === '.xlsx' ||
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        cb(null, true);
      } else {
        cb(new Error('Arquivo de vendas deve ser CSV ou Excel (.xlsx)'));
      }
    } else if (tipo === 'segmentos') {
      // Aceitar XLSX
      if (ext === '.xlsx' ||
          file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        cb(null, true);
      } else {
        cb(new Error('Arquivo de segmentos deve ser Excel (.xlsx)'));
      }
    } else {
      cb(new Error('Tipo de arquivo não especificado'));
    }
  }
});

// Status dos arquivos de dados
app.get('/api/admin/files/status', (req, res) => {
  const vendasCsvPath = path.join(uploadDir, 'vendas_bd.csv');
  const vendasXlsxPath = path.join(uploadDir, 'vendas_bd.xlsx');
  const segmentosPath = path.join(uploadDir, 'Segmentos_bd.xlsx');

  const getFileInfo = (filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return {
          exists: true,
          filename: path.basename(filePath),
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          lastModified: stats.mtime.toISOString(),
          lastModifiedFormatted: new Date(stats.mtime).toLocaleString('pt-BR')
        };
      }
    } catch (e) {}
    return { exists: false };
  };

  // Verificar qual arquivo de vendas existe (prioriza xlsx)
  let vendasInfo = getFileInfo(vendasXlsxPath);
  if (!vendasInfo.exists) {
    vendasInfo = getFileInfo(vendasCsvPath);
  }

  res.json({
    vendas: vendasInfo,
    segmentos: getFileInfo(segmentosPath)
  });
});

// Upload de arquivo
app.post('/api/admin/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const tipo = req.query.tipo || req.body.tipo;

  // Recarregar dados após upload
  if (tipo === 'segmentos') {
    // Recarregar lista de setores
    SETORES = getSetoresDinamicos();
  }

  // Limpar caches dos serviços
  if (tipo === 'vendas') {
    VendasService.clearCache && VendasService.clearCache();
  }
  if (tipo === 'segmentos') {
    SegmentService.clearCache && SegmentService.clearCache();
  }

  res.json({
    success: true,
    message: `Arquivo ${req.file.filename} enviado com sucesso`,
    file: {
      name: req.file.filename,
      size: req.file.size,
      sizeFormatted: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`
    }
  });
});

// Tratamento de erros do multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande (máx 50MB)' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
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
// START SERVER (com inicializacao async para MongoDB)
// ═══════════════════════════════════════════════════════════════
async function startServer() {
  // 1. Tentar conectar ao MongoDB
  const mongoConnected = await connectMongoDB();

  // 2. Se conectou, migrar dados existentes (JSON -> MongoDB)
  if (mongoConnected) {
    await PersistenceService.migrateToMongo();
  }

  // 3. Carregar config (do MongoDB ou arquivo)
  config = await PersistenceService.loadConfig();

  // 4. Carregar notes em cache
  notesCache = await PersistenceService.loadNotes();

  // 5. Iniciar servidor HTTP
  app.listen(PORT, () => {
    const slackStatus = config.slack?.enabled ? 'ENABLED' : 'DISABLED';
    const dbStatus = isMongoConnected() ? 'MongoDB' : 'JSON Files';

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║     SUPERVISION SEGMENTS - SERVER ONLINE                     ║
║     Port: ${PORT}                                                ║
║     Mode: ${(process.env.NODE_ENV || 'development').padEnd(12)}                             ║
║     Database: ${dbStatus.padEnd(10)}                                  ║
║     Ciclo: ${config.cicloAtual}                                       ║
║     Slack Alerts: ${slackStatus.padEnd(8)}                                   ║
║     Status: OPERATIONAL                                      ║
╚══════════════════════════════════════════════════════════════╝
    `);

    // Initialize Slack cron jobs
    cronSlackAlerts.initCronJobs();
  });
}

// Iniciar servidor
startServer().catch(error => {
  console.error('Erro fatal ao iniciar servidor:', error);
  process.exit(1);
});
