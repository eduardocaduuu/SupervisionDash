const mongoose = require('mongoose');

// Conexao MongoDB
let isConnected = false;

async function connectMongoDB() {
  if (isConnected) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('[MongoDB] MONGODB_URI nao configurado - usando arquivos locais como fallback');
    return false;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });

    isConnected = true;
    console.log('[MongoDB] Conectado com sucesso');
    return true;
  } catch (error) {
    console.error('[MongoDB] Erro na conexao:', error.message);
    return false;
  }
}

function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  connectMongoDB,
  isMongoConnected,
  mongoose
};
