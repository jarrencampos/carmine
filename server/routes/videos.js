const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { scanDirectory } = require('../utils/fileScanner');

// Get all videos
router.get('/', async (req, res) => {
  try {
    const videos = [];

    for (const dir of req.config.media.videos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'video');
        videos.push(...files);
      }
    }

    // Sort by modified date, newest first
    videos.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get video by ID
router.get('/:id', async (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const stats = fs.statSync(filePath);

    res.json({
      id: req.params.id,
      name: path.basename(filePath),
      path: filePath,
      size: stats.size,
      modified: stats.mtime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete video
router.delete('/:id', (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stream video with range support
router.get('/:id/stream', (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const mime = require('mime-types');
    const mimeType = mime.lookup(filePath) || 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
      });

      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
      });

      fs.createReadStream(filePath).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get video thumbnail (placeholder - returns a default image or generates one)
router.get('/:id/thumb', async (req, res) => {
  try {
    // For now, return a placeholder
    // In production, you'd use ffmpeg to generate thumbnails
    res.redirect('/assets/icons/video-placeholder.svg');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
