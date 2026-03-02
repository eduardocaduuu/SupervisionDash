const fs = require('fs');
const path = require('path');
const { isMongoConnected } = require('../db/mongodb');

// Paths para arquivos JSON (fallback)
const persistentDataDir = path.join(__dirname, '../../../data');
const configPath = path.join(persistentDataDir, 'config.json');
const notesPath = path.join(persistentDataDir, 'notes.json');
const dealerDataPath = path.join(persistentDataDir, 'dealerdata.json');
const mensagensPath = path.join(persistentDataDir, 'mensagens.json');

// Config padrao
const defaultConfig = {
  cicloAtual: '01/2026',
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
  adminUser: 'acqua',
  adminPassword: '13707',
  mensagemRecompensa: null,
  slack: {
    enabled: true,
    testMode: true,
    riskThresholdPercent: 50,
    sendWhenZero: false,
    supervisoresPorSetor: {}
  }
};

// ================================================================
// CONFIG - MongoDB com fallback para JSON
// ================================================================

async function loadConfigFromMongo() {
  const Config = require('../models/Config');
  try {
    let config = await Config.findById('main_config');
    if (!config) {
      return null;
    }
    return config.toPlainObject();
  } catch (error) {
    console.error('[Persistence] Erro ao carregar config do MongoDB:', error.message);
    return null;
  }
}

function loadConfigFromFile() {
  try {
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        ...defaultConfig,
        ...saved,
        slack: { ...defaultConfig.slack, ...(saved.slack || {}) }
      };
    }
  } catch (e) {
    console.error('[Persistence] Erro ao carregar config do arquivo:', e.message);
  }
  return { ...defaultConfig };
}

async function loadConfig() {
  if (isMongoConnected()) {
    const mongoConfig = await loadConfigFromMongo();
    if (mongoConfig) {
      console.log('[Persistence] Config carregada do MongoDB');
      return mongoConfig;
    }
  }
  console.log('[Persistence] Config carregada do arquivo local');
  return loadConfigFromFile();
}

async function saveConfigToMongo(cfg) {
  const Config = require('../models/Config');
  try {
    await Config.findByIdAndUpdate(
      'main_config',
      {
        ...cfg,
        _id: 'main_config'
      },
      { upsert: true, new: true }
    );
    return true;
  } catch (error) {
    console.error('[Persistence] Erro ao salvar config no MongoDB:', error.message);
    return false;
  }
}

function saveConfigToFile(cfg) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
    return true;
  } catch (error) {
    console.error('[Persistence] Erro ao salvar config no arquivo:', error.message);
    return false;
  }
}

async function saveConfig(cfg) {
  if (isMongoConnected()) {
    const saved = await saveConfigToMongo(cfg);
    if (saved) {
      console.log('[Persistence] Config salva no MongoDB');
      return true;
    }
  }
  console.log('[Persistence] Config salva no arquivo local');
  return saveConfigToFile(cfg);
}

// ================================================================
// NOTES - MongoDB com fallback para JSON
// ================================================================

async function loadNotesFromMongo() {
  const Note = require('../models/Note');
  try {
    const notes = await Note.find({});
    const notesObj = {};
    notes.forEach(n => {
      if (n.note) {
        notesObj[n.resellerId] = n.note;
      }
    });
    return notesObj;
  } catch (error) {
    console.error('[Persistence] Erro ao carregar notes do MongoDB:', error.message);
    return null;
  }
}

function loadNotesFromFile() {
  try {
    if (fs.existsSync(notesPath)) {
      return JSON.parse(fs.readFileSync(notesPath, 'utf-8'));
    }
  } catch (e) {
    console.error('[Persistence] Erro ao carregar notes do arquivo:', e.message);
  }
  return {};
}

async function loadNotes() {
  if (isMongoConnected()) {
    const mongoNotes = await loadNotesFromMongo();
    if (mongoNotes !== null) {
      console.log('[Persistence] Notes carregadas do MongoDB');
      return mongoNotes;
    }
  }
  console.log('[Persistence] Notes carregadas do arquivo local');
  return loadNotesFromFile();
}

async function saveNoteToMongo(resellerId, note) {
  const Note = require('../models/Note');
  try {
    if (note) {
      await Note.findOneAndUpdate(
        { resellerId },
        { resellerId, note },
        { upsert: true }
      );
    } else {
      await Note.deleteOne({ resellerId });
    }
    return true;
  } catch (error) {
    console.error('[Persistence] Erro ao salvar note no MongoDB:', error.message);
    return false;
  }
}

function saveNotesToFile(notes) {
  try {
    fs.writeFileSync(notesPath, JSON.stringify(notes, null, 2));
    return true;
  } catch (error) {
    console.error('[Persistence] Erro ao salvar notes no arquivo:', error.message);
    return false;
  }
}

async function saveNote(resellerId, note, allNotes) {
  if (isMongoConnected()) {
    const saved = await saveNoteToMongo(resellerId, note);
    if (saved) {
      console.log('[Persistence] Note salva no MongoDB');
      return true;
    }
  }
  console.log('[Persistence] Note salva no arquivo local');
  return saveNotesToFile(allNotes);
}

// ================================================================
// DEALER DATA - MongoDB com fallback para JSON (meta + acoes + note)
// ================================================================

async function loadDealerDataFromMongo() {
  const DealerData = require('../models/DealerData');
  try {
    const data = await DealerData.find({});
    const dataObj = {};
    data.forEach(d => {
      dataObj[d.resellerId] = {
        note: d.note || '',
        meta: d.meta || null,
        acoes: d.acoes || []
      };
    });
    return dataObj;
  } catch (error) {
    console.error('[Persistence] Erro ao carregar dealerData do MongoDB:', error.message);
    return null;
  }
}

function loadDealerDataFromFile() {
  try {
    if (fs.existsSync(dealerDataPath)) {
      return JSON.parse(fs.readFileSync(dealerDataPath, 'utf-8'));
    }
  } catch (e) {
    console.error('[Persistence] Erro ao carregar dealerData do arquivo:', e.message);
  }
  return {};
}

async function loadDealerData() {
  if (isMongoConnected()) {
    const mongoData = await loadDealerDataFromMongo();
    if (mongoData !== null) {
      console.log('[Persistence] DealerData carregado do MongoDB');
      return mongoData;
    }
  }
  console.log('[Persistence] DealerData carregado do arquivo local');
  return loadDealerDataFromFile();
}

async function saveDealerDataToMongo(resellerId, data) {
  const DealerData = require('../models/DealerData');
  try {
    await DealerData.findOneAndUpdate(
      { resellerId },
      { resellerId, ...data },
      { upsert: true }
    );
    return true;
  } catch (error) {
    console.error('[Persistence] Erro ao salvar dealerData no MongoDB:', error.message);
    return false;
  }
}

function saveDealerDataToFile(allData) {
  try {
    fs.writeFileSync(dealerDataPath, JSON.stringify(allData, null, 2));
    return true;
  } catch (error) {
    console.error('[Persistence] Erro ao salvar dealerData no arquivo:', error.message);
    return false;
  }
}

async function saveDealerData(resellerId, data, allData) {
  if (isMongoConnected()) {
    const saved = await saveDealerDataToMongo(resellerId, data);
    if (saved) {
      console.log('[Persistence] DealerData salvo no MongoDB');
      return true;
    }
  }
  console.log('[Persistence] DealerData salvo no arquivo local');
  return saveDealerDataToFile(allData);
}

// ================================================================
// MENSAGENS - MongoDB com fallback para JSON
// ================================================================

async function loadMensagensFromMongo() {
  const Mensagem = require('../models/Mensagem');
  try {
    const mensagens = await Mensagem.find({}).sort({ createdAt: -1 });
    return mensagens.map(m => ({
      id: m._id.toString(),
      titulo: m.titulo,
      texto: m.texto,
      targetType: m.targetType,
      targetSetores: m.targetSetores || [],
      ativa: m.ativa,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt
    }));
  } catch (error) {
    console.error('[Persistence] Erro ao carregar mensagens do MongoDB:', error.message);
    return null;
  }
}

function loadMensagensFromFile() {
  try {
    if (fs.existsSync(mensagensPath)) {
      return JSON.parse(fs.readFileSync(mensagensPath, 'utf-8'));
    }
  } catch (e) {
    console.error('[Persistence] Erro ao carregar mensagens do arquivo:', e.message);
  }
  return [];
}

async function loadMensagens() {
  if (isMongoConnected()) {
    const mongoMensagens = await loadMensagensFromMongo();
    if (mongoMensagens !== null) {
      console.log('[Persistence] Mensagens carregadas do MongoDB');
      return mongoMensagens;
    }
  }
  console.log('[Persistence] Mensagens carregadas do arquivo local');
  return loadMensagensFromFile();
}

async function createMensagemInMongo(mensagem) {
  const Mensagem = require('../models/Mensagem');
  try {
    const nova = await Mensagem.create(mensagem);
    return {
      id: nova._id.toString(),
      titulo: nova.titulo,
      texto: nova.texto,
      targetType: nova.targetType,
      targetSetores: nova.targetSetores || [],
      ativa: nova.ativa,
      createdAt: nova.createdAt,
      updatedAt: nova.updatedAt
    };
  } catch (error) {
    console.error('[Persistence] Erro ao criar mensagem no MongoDB:', error.message);
    return null;
  }
}

function saveMensagensToFile(mensagens) {
  try {
    fs.writeFileSync(mensagensPath, JSON.stringify(mensagens, null, 2));
    return true;
  } catch (error) {
    console.error('[Persistence] Erro ao salvar mensagens no arquivo:', error.message);
    return false;
  }
}

async function createMensagem(mensagem) {
  if (isMongoConnected()) {
    const created = await createMensagemInMongo(mensagem);
    if (created) {
      console.log('[Persistence] Mensagem criada no MongoDB');
      return created;
    }
  }
  // Fallback para arquivo
  const mensagens = loadMensagensFromFile();
  const nova = {
    id: Date.now().toString(),
    ...mensagem,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  mensagens.unshift(nova);
  saveMensagensToFile(mensagens);
  console.log('[Persistence] Mensagem criada no arquivo local');
  return nova;
}

async function updateMensagemInMongo(id, updates) {
  const Mensagem = require('../models/Mensagem');
  try {
    const updated = await Mensagem.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
    if (!updated) return null;
    return {
      id: updated._id.toString(),
      titulo: updated.titulo,
      texto: updated.texto,
      targetType: updated.targetType,
      targetSetores: updated.targetSetores || [],
      ativa: updated.ativa,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  } catch (error) {
    console.error('[Persistence] Erro ao atualizar mensagem no MongoDB:', error.message);
    return null;
  }
}

async function updateMensagem(id, updates) {
  if (isMongoConnected()) {
    const updated = await updateMensagemInMongo(id, updates);
    if (updated) {
      console.log('[Persistence] Mensagem atualizada no MongoDB');
      return updated;
    }
  }
  // Fallback para arquivo
  const mensagens = loadMensagensFromFile();
  const idx = mensagens.findIndex(m => m.id === id);
  if (idx === -1) return null;
  mensagens[idx] = {
    ...mensagens[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveMensagensToFile(mensagens);
  console.log('[Persistence] Mensagem atualizada no arquivo local');
  return mensagens[idx];
}

async function deleteMensagemFromMongo(id) {
  const Mensagem = require('../models/Mensagem');
  try {
    await Mensagem.findByIdAndDelete(id);
    return true;
  } catch (error) {
    console.error('[Persistence] Erro ao deletar mensagem do MongoDB:', error.message);
    return false;
  }
}

async function deleteMensagem(id) {
  if (isMongoConnected()) {
    const deleted = await deleteMensagemFromMongo(id);
    if (deleted) {
      console.log('[Persistence] Mensagem deletada do MongoDB');
      return true;
    }
  }
  // Fallback para arquivo
  const mensagens = loadMensagensFromFile();
  const idx = mensagens.findIndex(m => m.id === id);
  if (idx === -1) return false;
  mensagens.splice(idx, 1);
  saveMensagensToFile(mensagens);
  console.log('[Persistence] Mensagem deletada do arquivo local');
  return true;
}

// ================================================================
// MIGRACAO - Importar dados JSON existentes para MongoDB
// ================================================================

async function migrateToMongo() {
  if (!isMongoConnected()) {
    console.log('[Migration] MongoDB nao conectado, pulando migracao');
    return false;
  }

  const Config = require('../models/Config');
  const Note = require('../models/Note');

  try {
    // Verificar se ja existe config no Mongo
    const existingConfig = await Config.findById('main_config');

    if (!existingConfig) {
      // Carregar do arquivo e migrar
      const fileConfig = loadConfigFromFile();
      await Config.create({
        _id: 'main_config',
        ...fileConfig
      });
      console.log('[Migration] Config migrada do arquivo para MongoDB');
    } else {
      console.log('[Migration] Config ja existe no MongoDB, pulando');
    }

    // Verificar se ja existem notes no Mongo
    const existingNotes = await Note.countDocuments();

    if (existingNotes === 0) {
      // Carregar do arquivo e migrar
      const fileNotes = loadNotesFromFile();
      const notesDocs = Object.entries(fileNotes).map(([resellerId, note]) => ({
        resellerId,
        note
      }));

      if (notesDocs.length > 0) {
        await Note.insertMany(notesDocs);
        console.log(`[Migration] ${notesDocs.length} notes migradas do arquivo para MongoDB`);
      }
    } else {
      console.log('[Migration] Notes ja existem no MongoDB, pulando');
    }

    return true;
  } catch (error) {
    console.error('[Migration] Erro na migracao:', error.message);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  loadNotes,
  saveNote,
  loadDealerData,
  saveDealerData,
  loadMensagens,
  createMensagem,
  updateMensagem,
  deleteMensagem,
  migrateToMongo,
  defaultConfig
};
