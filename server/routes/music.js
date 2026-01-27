const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { scanDirectory } = require('../utils/fileScanner');

// Helper: Get path for playlists file
const getPlaylistsPath = () => path.resolve(__dirname, '../../config/playlists.json');

// Helper: Read JSON file with default
function readJsonFile(filePath, defaultValue = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return defaultValue;
}

// Helper: Write JSON file
function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Default playlists structure
const defaultPlaylists = { playlists: [] };

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

// ============ PLAYLISTS ============

// Get all playlists
router.get('/playlists/all', (req, res) => {
  try {
    const data = readJsonFile(getPlaylistsPath(), defaultPlaylists);
    res.json(data.playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single playlist
router.get('/playlists/:id', (req, res) => {
  try {
    const data = readJsonFile(getPlaylistsPath(), defaultPlaylists);
    const playlist = data.playlists.find(p => p.id === req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create playlist
router.post('/playlists', (req, res) => {
  try {
    const { name, tracks = [] } = req.body;
    const data = readJsonFile(getPlaylistsPath(), defaultPlaylists);

    const playlist = {
      id: `playlist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      tracks, // Array of track IDs
      created: new Date().toISOString(),
      modified: new Date().toISOString()
    };

    data.playlists.push(playlist);
    writeJsonFile(getPlaylistsPath(), data);

    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update playlist (name, reorder tracks)
router.put('/playlists/:id', (req, res) => {
  try {
    const { name, tracks } = req.body;
    const data = readJsonFile(getPlaylistsPath(), defaultPlaylists);
    const playlist = data.playlists.find(p => p.id === req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (name !== undefined) playlist.name = name;
    if (tracks !== undefined) playlist.tracks = tracks;
    playlist.modified = new Date().toISOString();

    writeJsonFile(getPlaylistsPath(), data);
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add tracks to playlist
router.post('/playlists/:id/tracks', (req, res) => {
  try {
    const { trackIds } = req.body;
    const data = readJsonFile(getPlaylistsPath(), defaultPlaylists);
    const playlist = data.playlists.find(p => p.id === req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Add tracks (avoid duplicates)
    trackIds.forEach(id => {
      if (!playlist.tracks.includes(id)) {
        playlist.tracks.push(id);
      }
    });
    playlist.modified = new Date().toISOString();

    writeJsonFile(getPlaylistsPath(), data);
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove tracks from playlist
router.delete('/playlists/:id/tracks', (req, res) => {
  try {
    const { trackIds } = req.body;
    const data = readJsonFile(getPlaylistsPath(), defaultPlaylists);
    const playlist = data.playlists.find(p => p.id === req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    playlist.tracks = playlist.tracks.filter(id => !trackIds.includes(id));
    playlist.modified = new Date().toISOString();

    writeJsonFile(getPlaylistsPath(), data);
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete playlist
router.delete('/playlists/:id', (req, res) => {
  try {
    const data = readJsonFile(getPlaylistsPath(), defaultPlaylists);
    const index = data.playlists.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    data.playlists.splice(index, 1);
    writeJsonFile(getPlaylistsPath(), data);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
