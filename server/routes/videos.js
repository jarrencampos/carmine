const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { scanDirectory } = require('../utils/fileScanner');

// Helper: Get path for categories file
const getCategoriesPath = () => path.resolve(__dirname, '../../config/video-categories.json');

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

// Default categories structure
const defaultCategories = {
  categories: [
    { id: 'movies', name: 'Movies', icon: 'film' },
    { id: 'tvshows', name: 'TV Shows', icon: 'tv' },
    { id: 'homevideos', name: 'Home Videos', icon: 'video' }
  ],
  videoAssignments: {} // { videoId: categoryId }
};

// ============ CATEGORIES ============

// Get all categories with video counts
router.get('/categories', async (req, res) => {
  try {
    const data = readJsonFile(getCategoriesPath(), defaultCategories);

    // Get all videos
    const videos = [];
    for (const dir of req.config.media.videos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'video');
        videos.push(...files);
      }
    }

    // Count videos per category
    const counts = {};
    data.categories.forEach(cat => counts[cat.id] = 0);
    counts['uncategorized'] = 0;

    videos.forEach(video => {
      const categoryId = data.videoAssignments[video.id];
      if (categoryId && counts[categoryId] !== undefined) {
        counts[categoryId]++;
      } else {
        counts['uncategorized']++;
      }
    });

    // Return categories with counts
    const categoriesWithCounts = data.categories.map(cat => ({
      ...cat,
      count: counts[cat.id]
    }));

    // Add uncategorized if there are any
    if (counts['uncategorized'] > 0) {
      categoriesWithCounts.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        icon: 'folder',
        count: counts['uncategorized']
      });
    }

    res.json(categoriesWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get videos by category
router.get('/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const data = readJsonFile(getCategoriesPath(), defaultCategories);

    // Get all videos
    const videos = [];
    for (const dir of req.config.media.videos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'video');
        videos.push(...files);
      }
    }

    // Filter by category
    let filtered;
    if (categoryId === 'uncategorized') {
      filtered = videos.filter(v => !data.videoAssignments[v.id]);
    } else {
      filtered = videos.filter(v => data.videoAssignments[v.id] === categoryId);
    }

    // Sort by modified date
    filtered.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get TV shows grouped by folder
router.get('/tvshows', async (req, res) => {
  try {
    const data = readJsonFile(getCategoriesPath(), defaultCategories);

    // Get all videos
    const videos = [];
    for (const dir of req.config.media.videos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'video');
        videos.push(...files);
      }
    }

    // Filter to only TV shows
    const tvVideos = videos.filter(v => data.videoAssignments[v.id] === 'tvshows');

    // Group by parent folder (show name)
    const shows = {};
    tvVideos.forEach(video => {
      const parentDir = path.dirname(video.path);
      const showName = path.basename(parentDir);

      // Use parent folder path as show ID
      const showId = Buffer.from(parentDir).toString('base64url');

      if (!shows[showId]) {
        shows[showId] = {
          id: showId,
          name: showName,
          path: parentDir,
          episodes: [],
          episodeCount: 0
        };
      }

      shows[showId].episodes.push(video);
      shows[showId].episodeCount++;
    });

    // Sort episodes within each show and pick a cover
    Object.values(shows).forEach(show => {
      // Sort episodes by name (natural sort for episode numbers)
      show.episodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      // Use first episode as cover
      if (show.episodes.length > 0) {
        show.coverVideoId = show.episodes[0].id;
      }

      // Remove episodes array from summary (will fetch separately)
      delete show.episodes;
    });

    // Sort shows by name
    const showList = Object.values(shows).sort((a, b) => a.name.localeCompare(b.name));

    res.json(showList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get episodes for a specific TV show
router.get('/tvshows/:showId/episodes', async (req, res) => {
  try {
    const showPath = Buffer.from(req.params.showId, 'base64url').toString('utf8');
    const data = readJsonFile(getCategoriesPath(), defaultCategories);

    // Get all videos
    const videos = [];
    for (const dir of req.config.media.videos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'video');
        videos.push(...files);
      }
    }

    // Filter to TV shows in this folder
    const episodes = videos.filter(v => {
      const isInCategory = data.videoAssignments[v.id] === 'tvshows';
      const parentDir = path.dirname(v.path);
      return isInCategory && parentDir === showPath;
    });

    // Sort by name (natural sort for episode numbers)
    episodes.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // Add episode numbers based on sort order
    episodes.forEach((ep, index) => {
      ep.episodeNumber = index + 1;
    });

    res.json({
      showId: req.params.showId,
      showName: path.basename(showPath),
      episodes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set video category
router.put('/:id/category', (req, res) => {
  try {
    const { categoryId } = req.body;
    const data = readJsonFile(getCategoriesPath(), defaultCategories);

    if (categoryId === null || categoryId === 'uncategorized') {
      delete data.videoAssignments[req.params.id];
    } else {
      data.videoAssignments[req.params.id] = categoryId;
    }

    writeJsonFile(getCategoriesPath(), data);
    res.json({ success: true, categoryId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get video's category
router.get('/:id/category', (req, res) => {
  try {
    const data = readJsonFile(getCategoriesPath(), defaultCategories);
    const categoryId = data.videoAssignments[req.params.id] || null;
    res.json({ categoryId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ VIDEOS ============

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
