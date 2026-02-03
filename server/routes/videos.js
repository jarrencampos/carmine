const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');
const { scanDirectory } = require('../utils/fileScanner');

// Helper: Get path for categories file
const getCategoriesPath = () => path.resolve(__dirname, '../../config/video-categories.json');

// Helper: Get path for thumbnails directory
const getThumbsDir = () => {
  const dir = path.resolve(__dirname, '../../cache/thumbnails');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

// Check if ffmpeg is available
let ffmpegAvailable = false;
try {
  execSync('ffmpeg -version', { stdio: 'ignore' });
  ffmpegAvailable = true;
} catch (e) {
  console.log('ffmpeg not found - video thumbnails will use placeholders');
}

// Thumbnail generation queue to limit concurrent ffmpeg processes
const thumbQueue = [];
let activeThumbJobs = 0;
const MAX_THUMB_JOBS = 3;

function runThumbJob(filePath, thumbPath) {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeThumbJobs++;
      const ffmpegProcess = spawn('ffmpeg', [
        '-ss', '00:00:05',
        '-i', filePath,
        '-vframes', '1',
        '-vf', 'scale=320:-1',
        '-q:v', '5',
        '-y',
        thumbPath
      ], { stdio: 'ignore' });

      ffmpegProcess.on('close', (code) => {
        activeThumbJobs--;
        processThumbQueue();
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ffmpegProcess.on('error', (err) => {
        activeThumbJobs--;
        processThumbQueue();
        reject(err);
      });
    };

    if (activeThumbJobs < MAX_THUMB_JOBS) {
      run();
    } else {
      thumbQueue.push(run);
    }
  });
}

function processThumbQueue() {
  while (thumbQueue.length > 0 && activeThumbJobs < MAX_THUMB_JOBS) {
    const job = thumbQueue.shift();
    job();
  }
}

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
  videoAssignments: {}, // { videoId: categoryId }
  folders: [], // [{ id, name, categoryId, createdAt }]
  folderAssignments: {} // { videoId: folderId }
};

// ============ BROWSE (Folder-based) ============

// Browse endpoint - filesystem folder browser
router.get('/browse', async (req, res) => {
  try {
    const relativePath = (req.query.path || '').replace(/\\/g, '/');

    // Security: prevent path traversal
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Resolve against the first configured media videos directory
    const mediaRoot = path.resolve(__dirname, '../..', req.config.media.videos[0]);

    const targetDir = relativePath
      ? path.resolve(mediaRoot, relativePath)
      : mediaRoot;

    // Security: ensure resolved path is within media root
    const normalizedTarget = path.normalize(targetDir);
    const normalizedRoot = path.normalize(mediaRoot);
    if (!normalizedTarget.startsWith(normalizedRoot)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
      return res.status(404).json({ error: 'Directory not found' });
    }

    // Build breadcrumb
    const breadcrumb = [{ name: 'Videos', path: '' }];
    if (relativePath) {
      const parts = relativePath.split('/').filter(Boolean);
      let accumulated = '';
      for (const part of parts) {
        accumulated = accumulated ? `${accumulated}/${part}` : part;
        breadcrumb.push({ name: part, path: accumulated });
      }
    }

    // Read immediate children
    const entries = fs.readdirSync(targetDir, { withFileTypes: true });
    const folders = [];
    const videos = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;

      const fullPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        // Count items in this subfolder (non-recursive, just immediate children)
        let itemCount = 0;
        try {
          const subEntries = fs.readdirSync(fullPath, { withFileTypes: true });
          itemCount = subEntries.filter(e => !e.name.startsWith('.')).length;
        } catch (e) { /* ignore permission errors */ }

        const folderRelPath = relativePath
          ? `${relativePath}/${entry.name}`
          : entry.name;

        folders.push({
          name: entry.name,
          path: folderRelPath,
          itemCount
        });
      } else if (entry.isFile()) {
        const mediaType = require('../utils/fileScanner').getMediaType(entry.name);
        if (mediaType === 'video') {
          const stats = fs.statSync(fullPath);
          videos.push({
            id: Buffer.from(fullPath).toString('base64url'),
            name: entry.name,
            path: fullPath,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
    }

    // Sort folders alphabetically, videos by modified date (newest first)
    folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    videos.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json({
      currentPath: relativePath,
      breadcrumb,
      folders,
      videos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CATEGORIES ============

// Category folder mapping
const categoryFolders = {
  'movies': ['movies'],
  'tvshows': ['tv-shows', 'tvshows', 'tv shows'],
  'homevideos': ['home-videos', 'homevideos', 'home videos']
};

// Helper: Get category from path
function getCategoryFromPath(videoPath, mediaRoot) {
  const relativePath = path.relative(mediaRoot, videoPath);
  const parts = relativePath.split(path.sep);

  if (parts.length > 0) {
    const topFolder = parts[0].toLowerCase();
    for (const [categoryId, folderNames] of Object.entries(categoryFolders)) {
      if (folderNames.includes(topFolder)) {
        return categoryId;
      }
    }
  }
  return 'uncategorized';
}

// Get all categories with video counts
router.get('/categories', async (req, res) => {
  try {
    // Get all videos with their paths
    const videos = [];
    for (const dir of req.config.media.videos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'video');
        files.forEach(f => f.mediaRoot = resolved);
        videos.push(...files);
      }
    }

    // Count videos per category based on folder structure
    const counts = {
      'movies': 0,
      'tvshows': 0,
      'homevideos': 0,
      'uncategorized': 0
    };

    videos.forEach(video => {
      const categoryId = getCategoryFromPath(video.path, video.mediaRoot);
      counts[categoryId]++;
    });

    // Build categories list
    const categories = [
      { id: 'movies', name: 'Movies', icon: 'film', count: counts['movies'] },
      { id: 'tvshows', name: 'TV Shows', icon: 'tv', count: counts['tvshows'] },
      { id: 'homevideos', name: 'Home Videos', icon: 'video', count: counts['homevideos'] }
    ];

    // Add uncategorized if there are any
    if (counts['uncategorized'] > 0) {
      categories.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        icon: 'folder',
        count: counts['uncategorized']
      });
    }

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get videos by category (with filesystem folder detection)
router.get('/categories/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;

    // Get all videos with their base directories
    const videos = [];
    for (const dir of req.config.media.videos) {
      const resolved = path.resolve(__dirname, '../..', dir);
      if (fs.existsSync(resolved)) {
        const files = await scanDirectory(resolved, 'video');
        files.forEach(f => f.mediaRoot = resolved);
        videos.push(...files);
      }
    }

    // Filter by category based on folder structure
    const filtered = videos.filter(v => getCategoryFromPath(v.path, v.mediaRoot) === categoryId);

    // Group videos by subfolder within the category folder
    const fsFolders = {};
    const rootVideos = [];

    filtered.forEach(video => {
      const relativePath = path.relative(video.mediaRoot, video.path);
      const parts = relativePath.split(path.sep);

      // parts[0] = category folder (e.g., "home-videos")
      // parts[1] = project/show folder (e.g., "jarren-titans")
      // parts[2+] = deeper folders or the file

      if (parts.length <= 2) {
        // Video is directly in the category folder (no subfolder)
        rootVideos.push(video);
      } else {
        // Video is in a subfolder - get the immediate subfolder name
        const folderName = parts[1];
        const folderPath = path.join(video.mediaRoot, parts[0], folderName);
        const folderId = Buffer.from(folderPath).toString('base64url');

        if (!fsFolders[folderId]) {
          fsFolders[folderId] = {
            id: folderId,
            name: folderName,
            path: folderPath,
            type: 'filesystem',
            videos: []
          };
        }
        fsFolders[folderId].videos.push(video);
      }
    });

    // Sort root videos by modified date
    rootVideos.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    // Convert folders object to array and add video counts
    const folderList = Object.values(fsFolders).map(folder => ({
      id: folder.id,
      name: folder.name,
      path: folder.path,
      type: 'filesystem',
      videoCount: folder.videos.length
    })).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      folders: folderList,
      videos: rootVideos
    });
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

// ============ FILESYSTEM FOLDERS ============

// Get videos from a filesystem folder
router.get('/fs-folder/:folderId', async (req, res) => {
  try {
    const folderPath = Buffer.from(req.params.folderId, 'base64url').toString('utf8');

    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Scan the folder for videos
    const videos = await scanDirectory(folderPath, 'video');

    // Sort by name (natural sort for numbers)
    videos.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    res.json({
      folderId: req.params.folderId,
      folderName: path.basename(folderPath),
      videos
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MANUAL FOLDERS ============

// Get all folders (optionally filtered by category)
router.get('/folders', (req, res) => {
  try {
    const data = readJsonFile(getCategoriesPath(), defaultCategories);
    let folders = data.folders || [];

    // Filter by category if specified
    if (req.query.categoryId) {
      folders = folders.filter(f => f.categoryId === req.query.categoryId);
    }

    res.json(folders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new folder
router.post('/folders', (req, res) => {
  try {
    const { name, categoryId } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Name and categoryId are required' });
    }

    const data = readJsonFile(getCategoriesPath(), defaultCategories);
    if (!data.folders) data.folders = [];
    if (!data.folderAssignments) data.folderAssignments = {};

    const folder = {
      id: crypto.randomBytes(8).toString('hex'),
      name,
      categoryId,
      createdAt: new Date().toISOString()
    };

    data.folders.push(folder);
    writeJsonFile(getCategoriesPath(), data);

    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update folder (rename)
router.put('/folders/:folderId', (req, res) => {
  try {
    const { name } = req.body;
    const data = readJsonFile(getCategoriesPath(), defaultCategories);

    const folder = (data.folders || []).find(f => f.id === req.params.folderId);
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    folder.name = name;
    writeJsonFile(getCategoriesPath(), data);

    res.json(folder);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete folder
router.delete('/folders/:folderId', (req, res) => {
  try {
    const data = readJsonFile(getCategoriesPath(), defaultCategories);

    // Remove folder
    data.folders = (data.folders || []).filter(f => f.id !== req.params.folderId);

    // Remove video assignments to this folder
    if (data.folderAssignments) {
      Object.keys(data.folderAssignments).forEach(videoId => {
        if (data.folderAssignments[videoId] === req.params.folderId) {
          delete data.folderAssignments[videoId];
        }
      });
    }

    writeJsonFile(getCategoriesPath(), data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get videos in a folder
router.get('/folders/:folderId/videos', async (req, res) => {
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

    // Filter to folder
    const folderAssignments = data.folderAssignments || {};
    const filtered = videos.filter(v => folderAssignments[v.id] === req.params.folderId);

    // Sort by modified date
    filtered.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set video's folder
router.put('/:id/folder', (req, res) => {
  try {
    const { folderId } = req.body;
    const data = readJsonFile(getCategoriesPath(), defaultCategories);
    if (!data.folderAssignments) data.folderAssignments = {};

    if (folderId === null) {
      delete data.folderAssignments[req.params.id];
    } else {
      data.folderAssignments[req.params.id] = folderId;

      // Also set the category to match the folder's category
      const folder = (data.folders || []).find(f => f.id === folderId);
      if (folder) {
        data.videoAssignments[req.params.id] = folder.categoryId;
      }
    }

    writeJsonFile(getCategoriesPath(), data);
    res.json({ success: true, folderId });
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

// Get video thumbnail
router.get('/:id/thumb', async (req, res) => {
  const placeholderPath = path.resolve(__dirname, '../../public/assets/icons/video-placeholder.svg');

  try {
    const filePath = Buffer.from(req.params.id, 'base64url').toString('utf8');

    if (!fs.existsSync(filePath)) {
      return res.sendFile(placeholderPath);
    }

    // Check if thumbnail already exists
    const thumbDir = getThumbsDir();
    const thumbPath = path.join(thumbDir, `${req.params.id}.jpg`);

    if (fs.existsSync(thumbPath)) {
      return res.sendFile(thumbPath);
    }

    // Generate thumbnail with ffmpeg if available
    if (ffmpegAvailable) {
      try {
        await runThumbJob(filePath, thumbPath);

        if (fs.existsSync(thumbPath)) {
          return res.sendFile(thumbPath);
        }
      } catch (ffmpegError) {
        console.error('FFmpeg thumbnail generation failed:', ffmpegError.message);
      }
    }

    // Fallback to placeholder
    res.sendFile(placeholderPath);
  } catch (error) {
    console.error('Thumbnail error:', error.message);
    res.sendFile(placeholderPath);
  }
});

module.exports = router;
