const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { mongoose, isMongoConnected } = require('../db/mongodb');

const META_COLLECTION = 'uploaded_file_meta';
const BUCKET_NAME = 'uploaded_files';

function getMetaCollection() {
  return mongoose.connection.db.collection(META_COLLECTION);
}

function getBucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
}

async function deleteFile(storageKey) {
  if (!isMongoConnected()) return false;

  const metaCol = getMetaCollection();
  const bucket = getBucket();
  const existing = await metaCol.findOne({ _id: storageKey });

  if (existing?.gridFsFileId) {
    try {
      await bucket.delete(existing.gridFsFileId);
    } catch (error) {
      // Se o arquivo já foi removido, apenas segue para limpar metadados.
      if (!String(error.message || '').includes('FileNotFound')) {
        throw error;
      }
    }
  }

  await metaCol.deleteOne({ _id: storageKey });
  return true;
}

async function saveFileFromDisk(storageKey, diskPath, contentType = 'application/octet-stream') {
  if (!isMongoConnected()) return false;

  const metaCol = getMetaCollection();
  const bucket = getBucket();
  const existing = await metaCol.findOne({ _id: storageKey });

  if (existing?.gridFsFileId) {
    try {
      await bucket.delete(existing.gridFsFileId);
    } catch (error) {
      if (!String(error.message || '').includes('FileNotFound')) {
        throw error;
      }
    }
  }

  const filename = path.basename(diskPath);
  const stats = fs.statSync(diskPath);
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: { storageKey, contentType }
  });

  await pipeline(fs.createReadStream(diskPath), uploadStream);

  await metaCol.updateOne(
    { _id: storageKey },
    {
      $set: {
        filename,
        contentType,
        size: stats.size,
        gridFsFileId: uploadStream.id,
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  return true;
}

async function restoreFileToDisk(storageKey, diskPath) {
  if (!isMongoConnected()) return false;

  const metaCol = getMetaCollection();
  const bucket = getBucket();
  const fileMeta = await metaCol.findOne({ _id: storageKey });

  if (!fileMeta?.gridFsFileId) {
    return false;
  }

  fs.mkdirSync(path.dirname(diskPath), { recursive: true });
  await pipeline(bucket.openDownloadStream(fileMeta.gridFsFileId), fs.createWriteStream(diskPath));
  return true;
}

async function restoreKnownFilesToDisk(dataDir) {
  if (!isMongoConnected()) return [];

  const knownFiles = ['Segmentos_bd.xlsx', 'vendas_bd.csv', 'vendas_bd.xlsx'];
  const restored = [];

  for (const filename of knownFiles) {
    const targetPath = path.join(dataDir, filename);
    const ok = await restoreFileToDisk(filename, targetPath);
    if (ok) restored.push(filename);
  }

  return restored;
}

module.exports = {
  saveFileFromDisk,
  restoreKnownFilesToDisk,
  deleteFile
};
