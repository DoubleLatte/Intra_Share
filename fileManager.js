const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const pako = require('pako');
const xxhash = require('xxhash');
const { getSettings, logSavePathChange } = require('./settingsManager');
const { log } = require('./notificationManager');

function encryptBuffer(buffer, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

function decryptBuffer(buffer, key) {
  const iv = buffer.slice(0, 16);
  const encrypted = buffer.slice(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function calculateFileHash(buffer) {
  return xxhash.hash64(buffer, 0xCAFEBABE).toString('hex');
}

function compressFile(buffer) {
  if (buffer.length < 1024 * 1024) return buffer;
  return pako.deflate(buffer);
}

function decompressFile(buffer) {
  if (buffer.length < 1024 * 1024) return buffer;
  return pako.inflate(buffer);
}

function organizeFile(filePath) {
  const settings = getSettings().settings;
  if (!settings.autoOrganize) return filePath;

  const ext = path.extname(filePath).toLowerCase();
  const date = new Date();
  const dateFolder = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const typeFolder = settings.fileTypePaths?.[ext] || (ext === '.jpg' || ext === '.png' ? 'Images' : ext === '.pdf' ? 'Documents' : 'Others');
  const newDir = path.join(settings.savePath, dateFolder, typeFolder);

  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }

  const newPath = path.join(newDir, path.basename(filePath));
  fs.renameSync(filePath, newPath);
  fs.chmodSync(newPath, settings.pathPermissions === 'rw' ? 0o666 : 0o444);
  return newPath;
}

function encryptPath(filePath) {
  const settings = getSettings().settings;
  if (!settings.pathEncryption) return filePath;

  const encryptedPath = path.join(settings.savePath, `encrypted-${Date.now()}-${path.basename(filePath)}`);
  const data = fs.readFileSync(filePath);
  const encryptedData = encryptBuffer(data, crypto.randomBytes(32).toString('hex'));
  fs.writeFileSync(encryptedPath, encryptedData);
  fs.unlinkSync(filePath);
  return encryptedPath;
}

function getDiskSpace(savePath) {
  try {
    const stats = fs.statfsSync(savePath);
    return (stats.bfree * stats.bsize) / (1024 * 1024 * 1024); // GB 단위
  } catch (err) {
    return 0;
  }
}

module.exports = { encryptBuffer, decryptBuffer, calculateFileHash, compressFile, decompressFile, organizeFile, encryptPath, getDiskSpace };
