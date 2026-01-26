const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Get current settings
router.get('/', (req, res) => {
  res.json(req.config);
});

// Update settings
router.put('/', (req, res) => {
  try {
    const newConfig = { ...req.config, ...req.body };

    // Validate required fields
    if (!newConfig.server || !newConfig.media) {
      return res.status(400).json({ error: 'Invalid configuration' });
    }

    // Write to file
    fs.writeFileSync(req.configPath, JSON.stringify(newConfig, null, 2));

    // Update in-memory config
    req.config = newConfig;

    res.json(newConfig);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add media directory
router.post('/media/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { path: dirPath } = req.body;

    if (!['videos', 'music', 'photos'].includes(type)) {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    // Check if directory exists
    const resolved = path.resolve(__dirname, '../..', dirPath);
    if (!fs.existsSync(resolved)) {
      return res.status(400).json({ error: 'Directory does not exist' });
    }

    // Add to config if not already present
    if (!req.config.media[type].includes(dirPath)) {
      req.config.media[type].push(dirPath);
      fs.writeFileSync(req.configPath, JSON.stringify(req.config, null, 2));
    }

    res.json(req.config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove media directory
router.delete('/media/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { path: dirPath } = req.body;

    if (!['videos', 'music', 'photos'].includes(type)) {
      return res.status(400).json({ error: 'Invalid media type' });
    }

    const index = req.config.media[type].indexOf(dirPath);
    if (index > -1) {
      req.config.media[type].splice(index, 1);
      fs.writeFileSync(req.configPath, JSON.stringify(req.config, null, 2));
    }

    res.json(req.config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scan media directories
router.post('/scan', async (req, res) => {
  try {
    const { scanDirectory } = require('../utils/fileScanner');

    const results = {
      videos: 0,
      music: 0,
      photos: 0
    };

    for (const dir of req.config.media.videos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'video');
        results.videos += files.length;
      }
    }

    for (const dir of req.config.media.music) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'audio');
        results.music += files.length;
      }
    }

    for (const dir of req.config.media.photos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'image');
        results.photos += files.length;
      }
    }

    res.json({
      success: true,
      ...results,
      total: results.videos + results.music + results.photos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
