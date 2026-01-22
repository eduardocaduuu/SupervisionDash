const fs = require('fs');
const path = require('path');
const { isMongoConnected } = require('../db/mongodb');

// Paths para arquivos JSON (fallback)
const persistentDataDir = path.join(__dirname, '../../../data');
const configPath = path.join(persistentDataDir, 'config.json');
const notesPath = path.join(persistentDataDir, 'notes.json');

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
  migrateToMongo,
  defaultConfig
};
