const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { scanDirectory } = require('../utils/fileScanner');

// Get all photos
router.get('/', async (req, res) => {
  try {
    const photos = [];

    for (const dir of req.config.media.photos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'image');
        photos.push(...files);
      }
    }

    // Sort by modified date, newest first
    photos.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get photo by ID
router.get('/:id', async (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo not found' });
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

// Get full resolution photo
router.get('/:id/full', (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const mime = require('mime-types');
    const mimeType = mime.lookup(filePath) || 'image/jpeg';

    res.set('Content-Type', mimeType);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete photo
router.delete('/:id', (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get photo thumbnail
router.get('/:id/thumb', async (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const mime = require('mime-types');
    const mimeType = mime.lookup(filePath) || 'image/jpeg';

    // Try to create thumbnail with sharp
    try {
      const sharp = require('sharp');
      const thumbnail = await sharp(filePath)
        .resize(400, 400, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      res.set('Content-Type', 'image/jpeg');
      res.send(thumbnail);
    } catch (e) {
      // Sharp not available or failed, send original
      res.set('Content-Type', mimeType);
      res.sendFile(filePath);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
