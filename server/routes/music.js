const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { scanDirectory } = require('../utils/fileScanner');

// In-memory playlists (in production, use a database)
let playlists = [];

// Get all music
router.get('/', async (req, res) => {
  try {
    const music = [];

    for (const dir of req.config.media.music) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'audio');
        music.push(...files);
      }
    }

    // Sort by name
    music.sort((a, b) => a.name.localeCompare(b.name));

    // Try to extract metadata
    try {
      const mm = require('music-metadata');
      for (const track of music) {
        try {
          const metadata = await mm.parseFile(track.path, { duration: true });
          track.metadata = {
            title: metadata.common.title || track.name,
            artist: metadata.common.artist || 'Unknown Artist',
            album: metadata.common.album || 'Unknown Album',
            year: metadata.common.year,
            duration: metadata.format.duration,
            hasCover: metadata.common.picture && metadata.common.picture.length > 0
          };
        } catch (e) {
          track.metadata = {
            title: track.name,
            artist: 'Unknown Artist',
            album: 'Unknown Album'
          };
        }
      }
    } catch (e) {
      // music-metadata not available, use filename
      for (const track of music) {
        track.metadata = {
          title: track.name.replace(/\.[^/.]+$/, ''),
          artist: 'Unknown Artist',
          album: 'Unknown Album'
        };
      }
    }

    res.json(music);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get track by ID
router.get('/:id', async (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Track not found' });
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

// Delete track
router.delete('/:id', (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.json({ success: true, message: 'Track deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stream audio
router.get('/:id/stream', (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const mime = require('mime-types');
    const mimeType = mime.lookup(filePath) || 'audio/mpeg';

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

// Get album art
router.get('/:id/cover', async (req, res) => {
  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Track not found' });
    }

    try {
      const mm = require('music-metadata');
      const metadata = await mm.parseFile(filePath);

      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        res.set('Content-Type', picture.format);
        return res.send(picture.data);
      }
    } catch (e) {
      // No metadata available
    }

    res.redirect('/assets/icons/music-placeholder.svg');
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all playlists
router.get('/playlists/all', (req, res) => {
  res.json(playlists);
});

// Create playlist
router.post('/playlists', (req, res) => {
  const { name, tracks = [] } = req.body;

  const playlist = {
    id: Date.now().toString(),
    name,
    tracks,
    created: new Date(),
    modified: new Date()
  };

  playlists.push(playlist);
  res.json(playlist);
});

// Update playlist
router.put('/playlists/:id', (req, res) => {
  const { name, tracks } = req.body;
  const playlist = playlists.find(p => p.id === req.params.id);

  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  if (name) playlist.name = name;
  if (tracks) playlist.tracks = tracks;
  playlist.modified = new Date();

  res.json(playlist);
});

// Delete playlist
router.delete('/playlists/:id', (req, res) => {
  const index = playlists.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  playlists.splice(index, 1);
  res.json({ success: true });
});

module.exports = router;
