const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
const audioExtensions = ['.mp3', '.flac', '.wav', '.aac', '.ogg', '.m4a', '.wma'];
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

function getMediaType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (videoExtensions.includes(ext)) return 'video';
  if (audioExtensions.includes(ext)) return 'audio';
  if (imageExtensions.includes(ext)) return 'image';
  return null;
}

async function scanDirectory(dirPath, filterType = null) {
  const results = [];

  async function scan(currentPath, relativePath = '') {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        // Skip hidden files
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath, relPath);
        } else if (entry.isFile()) {
          const mediaType = getMediaType(entry.name);

          if (mediaType && (!filterType || mediaType === filterType)) {
            const stats = fs.statSync(fullPath);
            const mimeType = mime.lookup(fullPath) || 'application/octet-stream';

            results.push({
              id: Buffer.from(fullPath).toString('base64url'),
              name: entry.name,
              path: fullPath,
              relativePath: relPath,
              type: mediaType,
              mimeType: mimeType,
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ${currentPath}:`, error.message);
    }
  }

  await scan(dirPath);
  return results;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = {
  scanDirectory,
  getMediaType,
  formatFileSize,
  formatDuration,
  videoExtensions,
  audioExtensions,
  imageExtensions
};
