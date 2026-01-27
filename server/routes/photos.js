const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { scanDirectory } = require('../utils/fileScanner');

// Helper: Get paths for data files
const getTagsPath = () => path.resolve(__dirname, '../../config/photo-tags.json');
const getAlbumsPath = () => path.resolve(__dirname, '../../config/albums.json');

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
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ============ PEOPLE TAGS ============

// Get all unique people names (for autocomplete)
router.get('/tags/people', (req, res) => {
  try {
    const tags = readJsonFile(getTagsPath(), {});
    const allPeople = new Set();

    Object.values(tags).forEach(people => {
      if (Array.isArray(people)) {
        people.forEach(name => allPeople.add(name));
      }
    });

    res.json([...allPeople].sort());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get photos by person name
router.get('/by-person/:name', async (req, res) => {
  try {
    const personName = decodeURIComponent(req.params.name);
    const tags = readJsonFile(getTagsPath(), {});

    // Get all photos first
    const allPhotos = [];
    for (const dir of req.config.media.photos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'image');
        allPhotos.push(...files);
      }
    }

    // Filter photos that have this person tagged
    const matchingPhotos = allPhotos.filter(photo => {
      const photoTags = tags[photo.id];
      return Array.isArray(photoTags) && photoTags.includes(personName);
    });

    // Sort by modified date
    matchingPhotos.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json(matchingPhotos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tags for a specific photo
router.get('/:id/tags', (req, res) => {
  try {
    const tags = readJsonFile(getTagsPath(), {});
    const photoTags = tags[req.params.id] || [];
    res.json({ people: photoTags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set tags for a photo
router.put('/:id/tags', (req, res) => {
  try {
    const { people } = req.body;

    if (!Array.isArray(people)) {
      return res.status(400).json({ error: 'people must be an array' });
    }

    const tags = readJsonFile(getTagsPath(), {});

    if (people.length === 0) {
      delete tags[req.params.id];
    } else {
      tags[req.params.id] = people.map(p => p.trim()).filter(p => p);
    }

    writeJsonFile(getTagsPath(), tags);
    res.json({ success: true, people: tags[req.params.id] || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ALBUMS ============

// Get all albums
router.get('/albums/all', async (req, res) => {
  try {
    const data = readJsonFile(getAlbumsPath(), { albums: [] });
    res.json(data.albums);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create album
router.post('/albums', (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Album name is required' });
    }

    const data = readJsonFile(getAlbumsPath(), { albums: [] });

    const newAlbum = {
      id: crypto.randomUUID(),
      name: name.trim(),
      photoIds: [],
      coverPhotoId: null,
      created: new Date().toISOString()
    };

    data.albums.push(newAlbum);
    writeJsonFile(getAlbumsPath(), data);

    res.status(201).json(newAlbum);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get album by ID
router.get('/albums/:albumId', async (req, res) => {
  try {
    const data = readJsonFile(getAlbumsPath(), { albums: [] });
    const album = data.albums.find(a => a.id === req.params.albumId);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    // Get full photo details for photos in album
    const allPhotos = [];
    for (const dir of req.config.media.photos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'image');
        allPhotos.push(...files);
      }
    }

    // Map photo IDs to full photo objects
    const photosMap = new Map(allPhotos.map(p => [p.id, p]));
    const photos = album.photoIds
      .map(id => photosMap.get(id))
      .filter(p => p); // Filter out any deleted photos

    res.json({
      ...album,
      photos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update album (name, cover)
router.put('/albums/:albumId', (req, res) => {
  try {
    const { name, coverPhotoId } = req.body;
    const data = readJsonFile(getAlbumsPath(), { albums: [] });

    const albumIndex = data.albums.findIndex(a => a.id === req.params.albumId);
    if (albumIndex === -1) {
      return res.status(404).json({ error: 'Album not found' });
    }

    if (name !== undefined) {
      data.albums[albumIndex].name = name.trim();
    }
    if (coverPhotoId !== undefined) {
      data.albums[albumIndex].coverPhotoId = coverPhotoId;
    }

    writeJsonFile(getAlbumsPath(), data);
    res.json(data.albums[albumIndex]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete album
router.delete('/albums/:albumId', (req, res) => {
  try {
    const data = readJsonFile(getAlbumsPath(), { albums: [] });

    const albumIndex = data.albums.findIndex(a => a.id === req.params.albumId);
    if (albumIndex === -1) {
      return res.status(404).json({ error: 'Album not found' });
    }

    data.albums.splice(albumIndex, 1);
    writeJsonFile(getAlbumsPath(), data);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add photos to album
router.post('/albums/:albumId/photos', (req, res) => {
  try {
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ error: 'photoIds must be an array' });
    }

    const data = readJsonFile(getAlbumsPath(), { albums: [] });
    const album = data.albums.find(a => a.id === req.params.albumId);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    // Add new photos (avoid duplicates)
    const existingIds = new Set(album.photoIds);
    photoIds.forEach(id => {
      if (!existingIds.has(id)) {
        album.photoIds.push(id);
      }
    });

    // Set cover if not set
    if (!album.coverPhotoId && album.photoIds.length > 0) {
      album.coverPhotoId = album.photoIds[0];
    }

    writeJsonFile(getAlbumsPath(), data);
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove photos from album
router.delete('/albums/:albumId/photos', (req, res) => {
  try {
    const { photoIds } = req.body;

    if (!Array.isArray(photoIds)) {
      return res.status(400).json({ error: 'photoIds must be an array' });
    }

    const data = readJsonFile(getAlbumsPath(), { albums: [] });
    const album = data.albums.find(a => a.id === req.params.albumId);

    if (!album) {
      return res.status(404).json({ error: 'Album not found' });
    }

    // Remove photos
    const removeSet = new Set(photoIds);
    album.photoIds = album.photoIds.filter(id => !removeSet.has(id));

    // Update cover if it was removed
    if (removeSet.has(album.coverPhotoId)) {
      album.coverPhotoId = album.photoIds[0] || null;
    }

    writeJsonFile(getAlbumsPath(), data);
    res.json(album);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PHOTOS ============

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
