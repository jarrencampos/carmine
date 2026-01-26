const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Server start time for uptime calculation
const serverStartTime = Date.now();

// Import routes
const videosRouter = require('./routes/videos');
const musicRouter = require('./routes/music');
const photosRouter = require('./routes/photos');
const uploadRouter = require('./routes/upload');
const settingsRouter = require('./routes/settings');

// Load config
const configPath = path.join(__dirname, '../config/settings.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Make config available to routes
app.use((req, res, next) => {
  req.config = config;
  req.configPath = configPath;
  next();
});

// API Routes
app.use('/api/videos', videosRouter);
app.use('/api/music', musicRouter);
app.use('/api/photos', photosRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingsRouter);

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  const { scanDirectory } = require('./utils/fileScanner');

  try {
    const videos = [];
    const music = [];
    const photos = [];

    for (const dir of config.media.videos) {
      const resolved = path.resolve(__dirname, '..', dir);
      if (fs.existsSync(resolved)) {
        videos.push(...await scanDirectory(resolved, 'video'));
      }
    }

    for (const dir of config.media.music) {
      const resolved = path.resolve(__dirname, '..', dir);
      if (fs.existsSync(resolved)) {
        music.push(...await scanDirectory(resolved, 'audio'));
      }
    }

    for (const dir of config.media.photos) {
      const resolved = path.resolve(__dirname, '..', dir);
      if (fs.existsSync(resolved)) {
        photos.push(...await scanDirectory(resolved, 'image'));
      }
    }

    res.json({
      videos: videos.length,
      music: music.length,
      photos: photos.length,
      totalFiles: videos.length + music.length + photos.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System stats endpoint for dashboard
app.get('/api/system', (req, res) => {
  try {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage (average across all cores)
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    // Get disk usage (simplified - uses current directory's disk)
    const diskPath = path.resolve(__dirname, '..');
    let diskInfo = { total: 0, free: 0, used: 0 };

    // Calculate uptime
    const uptimeMs = Date.now() - serverStartTime;
    const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
    const uptimeHours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));

    // Get network interfaces
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = '127.0.0.1';

    for (const [name, interfaces] of Object.entries(networkInterfaces)) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddress = iface.address;
          break;
        }
      }
    }

    // Generate mock activity data for charts (last 24 data points)
    const now = Date.now();
    const activityData = Array.from({ length: 24 }, (_, i) => ({
      time: new Date(now - (23 - i) * 3600000).getHours(),
      value: Math.floor(Math.random() * 60) + 20
    }));

    // Generate CPU history (last 12 data points)
    const cpuHistory = Array.from({ length: 12 }, () =>
      Math.floor(Math.random() * 40) + 15
    );

    res.json({
      cpu: {
        usage: Math.round(cpuUsage),
        cores: cpus.length,
        model: cpus[0]?.model || 'Unknown',
        history: cpuHistory
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      disk: {
        total: 500 * 1024 * 1024 * 1024, // Placeholder 500GB
        used: 175 * 1024 * 1024 * 1024,  // Placeholder 175GB used
        percentage: 35
      },
      uptime: {
        days: uptimeDays,
        hours: uptimeHours,
        minutes: uptimeMinutes,
        formatted: `${uptimeDays}d ${uptimeHours}h ${uptimeMinutes}m`
      },
      network: {
        ip: ipAddress,
        hostname: os.hostname(),
        platform: os.platform(),
        type: '1000BASE-T'
      },
      activity: activityData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
const PORT = config.server.port || 3000;
const HOST = config.server.host || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════════╗
  ║                                                                ║
  ║    ██████╗ █████╗ ██████╗ ███╗   ███╗██╗███╗   ██╗███████╗     ║
  ║   ██╔════╝██╔══██╗██╔══██╗████╗ ████║██║████╗  ██║██╔════╝     ║
  ║   ██║     ███████║██████╔╝██╔████╔██║██║██╔██╗ ██║█████╗       ║
  ║   ██║     ██╔══██║██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══╝       ║
  ║   ╚██████╗██║  ██║██║  ██║██║ ╚═╝ ██║██║██║ ╚████║███████╗     ║
  ║    ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝     ║
  ║                                                                ║
  ║                         media server                           ║
  ║                                                                ║
  ╚════════════════════════════════════════════════════════════════╝

  Server running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}
  Network access: http://<your-ip>:${PORT}
  `);
});

module.exports = app;
