// Main Application - Carmine Media Server

class App {
  constructor() {
    this.init();
  }

  async init() {
    // Register routes
    this.registerRoutes();

    // Load initial stats
    this.loadStats();
  }

  registerRoutes() {
    // Dashboard / Home
    router.register('/', async () => {
      router.showLoading();
      await this.renderDashboard();
    });

    // Videos
    router.register('/videos', async () => {
      router.showLoading();
      await this.renderVideos();
    });

    // Music
    router.register('/music', async () => {
      router.showLoading();
      await this.renderMusic();
    });

    // Photos
    router.register('/photos', async () => {
      router.showLoading();
      await this.renderPhotos();
    });

    // Upload
    router.register('/upload', async () => {
      await this.renderUpload();
    });

    // Settings
    router.register('/settings', async () => {
      router.showLoading();
      await this.renderSettings();
    });
  }

  async loadStats() {
    try {
      const stats = await API.getStats();
      // Update storage indicator (simplified)
      const fill = document.getElementById('storage-fill');
      const text = document.getElementById('storage-text');
      fill.style.width = '35%'; // Placeholder
      text.textContent = `${stats.totalFiles} files`;
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  // ===== DASHBOARD =====
  async renderDashboard() {
    const content = document.getElementById('page-content');

    try {
      const [stats, system] = await Promise.all([
        API.getStats(),
        API.getSystem()
      ]);

      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });

      content.innerHTML = `
        <div class="server-header">
          <div class="server-title">Carmine Media Server</div>
          <div class="server-status">
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-label">Status:</span>
              <span class="status-value">ONLINE</span>
            </div>
            <div class="status-indicator">
              <span class="status-label">Uptime:</span>
              <span class="status-value">${system.uptime.formatted}</span>
            </div>
            <div class="server-time" id="server-time">${currentTime}</div>
          </div>
        </div>

        <div class="dashboard-grid">
          <!-- System Status Panel -->
          <div class="panel panel-third">
            <div class="panel-header">
              <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <span class="panel-title">System Status</span>
            </div>
            <div class="panel-content">
              <div class="stat-row">
                <span class="stat-label">CPU:</span>
                <span class="stat-value">${system.cpu.usage}%</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-track">
                  <div class="progress-bar-fill ${system.cpu.usage > 80 ? 'critical' : system.cpu.usage > 60 ? 'warning' : ''}" style="width: ${system.cpu.usage}%"></div>
                </div>
              </div>

              <div class="stat-row">
                <span class="stat-label">RAM:</span>
                <span class="stat-value">${system.memory.percentage}%</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-track">
                  <div class="progress-bar-fill ${system.memory.percentage > 80 ? 'critical' : system.memory.percentage > 60 ? 'warning' : ''}" style="width: ${system.memory.percentage}%"></div>
                </div>
              </div>

              <div class="stat-row">
                <span class="stat-label">DISK:</span>
                <span class="stat-value">${system.disk.percentage}%</span>
              </div>
              <div class="progress-bar-container">
                <div class="progress-bar-track">
                  <div class="progress-bar-fill ${system.disk.percentage > 80 ? 'critical' : system.disk.percentage > 60 ? 'warning' : ''}" style="width: ${system.disk.percentage}%"></div>
                </div>
              </div>

              <div class="stat-row" style="margin-top: var(--space-md);">
                <span class="stat-label">UPTIME:</span>
                <span class="stat-value">${system.uptime.formatted}</span>
              </div>
            </div>
          </div>

          <!-- CPU Chart Panel -->
          <div class="panel panel-third">
            <div class="panel-header">
              <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 20V10"/>
                <path d="M12 20V4"/>
                <path d="M6 20v-6"/>
              </svg>
              <span class="panel-title">CPU Usage</span>
            </div>
            <div class="panel-content">
              <div class="bar-chart" id="cpu-chart">
                ${system.cpu.history.map((val, i) => `
                  <div class="bar-chart-bar" style="height: ${val}%" data-value="${val}"></div>
                `).join('')}
              </div>
              <div class="bar-chart-labels">
                <span>12m ago</span>
                <span>Now</span>
              </div>
            </div>
          </div>

          <!-- Memory Donut Panel -->
          <div class="panel panel-third">
            <div class="panel-header">
              <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
              </svg>
              <span class="panel-title">Memory</span>
            </div>
            <div class="panel-content">
              <div class="donut-chart">
                <svg class="donut-chart-svg" viewBox="0 0 100 100">
                  <circle class="donut-chart-bg" cx="50" cy="50" r="40"/>
                  <circle class="donut-chart-fill" cx="50" cy="50" r="40"
                    stroke-dasharray="${system.memory.percentage * 2.51} 251"
                    stroke-dashoffset="0"/>
                </svg>
                <div class="donut-chart-center">
                  <div class="donut-chart-value">${system.memory.percentage}%</div>
                  <div class="donut-chart-label">Used</div>
                </div>
              </div>
              <div style="text-align: center; margin-top: var(--space-md);">
                <span style="color: var(--text-muted); font-size: 0.75rem; font-family: var(--font-terminal);">
                  ${this.formatBytes(system.memory.used)} / ${this.formatBytes(system.memory.total)}
                </span>
              </div>
            </div>
          </div>

          <!-- Network Panel -->
          <div class="panel panel-half">
            <div class="panel-header">
              <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14"/>
                <path d="M12 5v14"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              <span class="panel-title">Network</span>
            </div>
            <div class="panel-content">
              <div class="stat-row">
                <span class="stat-label">IP Address:</span>
                <span class="stat-value">${system.network.ip}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Hostname:</span>
                <span class="stat-value">${system.network.hostname}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Interface:</span>
                <span class="stat-value">${system.network.type}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">Platform:</span>
                <span class="stat-value">${system.network.platform.toUpperCase()}</span>
              </div>
            </div>
          </div>

          <!-- Activity Chart Panel -->
          <div class="panel panel-half">
            <div class="panel-header">
              <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <span class="panel-title">Activity</span>
            </div>
            <div class="panel-content">
              <div class="line-chart">
                <svg class="line-chart-svg" viewBox="0 0 400 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style="stop-color:var(--carmine);stop-opacity:0.3"/>
                      <stop offset="100%" style="stop-color:var(--carmine);stop-opacity:0.05"/>
                    </linearGradient>
                  </defs>
                  ${this.generateActivityChart(system.activity)}
                </svg>
              </div>
              <div class="bar-chart-labels">
                <span>24h ago</span>
                <span>Now</span>
              </div>
            </div>
          </div>

          <!-- Media Library Panel -->
          <div class="panel panel-half">
            <div class="panel-header">
              <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span class="panel-title">Media Library</span>
            </div>
            <div class="panel-content">
              <div class="media-stat">
                <svg class="media-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                <div class="media-stat-info">
                  <div class="media-stat-label">Videos</div>
                  <div class="media-stat-value">${stats.videos}</div>
                </div>
              </div>
              <div class="media-stat">
                <svg class="media-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
                <div class="media-stat-info">
                  <div class="media-stat-label">Music Tracks</div>
                  <div class="media-stat-value">${stats.music}</div>
                </div>
              </div>
              <div class="media-stat">
                <svg class="media-stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <div class="media-stat-info">
                  <div class="media-stat-label">Photos</div>
                  <div class="media-stat-value">${stats.photos}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Storage Panel -->
          <div class="panel panel-half">
            <div class="panel-header">
              <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
              <span class="panel-title">Storage</span>
            </div>
            <div class="panel-content">
              <div style="display: flex; align-items: center; gap: var(--space-xl);">
                <div class="donut-chart" style="width: 100px; height: 100px;">
                  <svg class="donut-chart-svg" viewBox="0 0 100 100">
                    <circle class="donut-chart-bg" cx="50" cy="50" r="40"/>
                    <circle class="donut-chart-fill" cx="50" cy="50" r="40"
                      stroke-dasharray="${system.disk.percentage * 2.51} 251"
                      stroke-dashoffset="0"/>
                  </svg>
                  <div class="donut-chart-center">
                    <div class="donut-chart-value" style="font-size: 1.25rem;">${system.disk.percentage}%</div>
                  </div>
                </div>
                <div style="flex: 1;">
                  <div class="stat-row">
                    <span class="stat-label">Total:</span>
                    <span class="stat-value">${this.formatBytes(system.disk.total)}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Used:</span>
                    <span class="stat-value">${this.formatBytes(system.disk.used)}</span>
                  </div>
                  <div class="stat-row">
                    <span class="stat-label">Free:</span>
                    <span class="stat-value">${this.formatBytes(system.disk.total - system.disk.used)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions Panel -->
          <div class="panel panel-full">
            <div class="panel-header">
              <svg class="panel-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10 8 16 12 10 16 10 8"/>
              </svg>
              <span class="panel-title">Quick Actions</span>
            </div>
            <div class="quick-actions">
              <a href="#/videos" class="quick-action">
                <svg class="quick-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                <span class="quick-action-label">Videos</span>
              </a>
              <a href="#/music" class="quick-action">
                <svg class="quick-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
                <span class="quick-action-label">Music</span>
              </a>
              <a href="#/photos" class="quick-action">
                <svg class="quick-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span class="quick-action-label">Photos</span>
              </a>
              <a href="#/settings" class="quick-action">
                <svg class="quick-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span class="quick-action-label">Settings</span>
              </a>
            </div>
          </div>
        </div>
      `;

      // Start clock update
      this.startClock();

    } catch (error) {
      content.innerHTML = `
        <div class="server-header">
          <div class="server-title">Carmine Media Server</div>
        </div>
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <h3>Connection Error</h3>
          <p>Could not load system statistics. Make sure the server is running.</p>
        </div>
      `;
    }
  }

  generateActivityChart(data) {
    if (!data || data.length === 0) return '';

    const width = 400;
    const height = 100;
    const padding = 5;
    const pointCount = data.length;
    const xStep = (width - padding * 2) / (pointCount - 1);

    // Generate path points
    const points = data.map((d, i) => {
      const x = padding + i * xStep;
      const y = height - padding - (d.value / 100) * (height - padding * 2);
      return `${x},${y}`;
    });

    // Create line path
    const linePath = `M ${points.join(' L ')}`;

    // Create area path (closed polygon for fill)
    const areaPath = `M ${padding},${height - padding} L ${points.join(' L ')} L ${width - padding},${height - padding} Z`;

    return `
      <path class="line-chart-area" d="${areaPath}"/>
      <path class="line-chart-line" d="${linePath}"/>
    `;
  }

  startClock() {
    if (this.clockInterval) clearInterval(this.clockInterval);

    this.clockInterval = setInterval(() => {
      const timeEl = document.getElementById('server-time');
      if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
      }
    }, 1000);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // ===== VIDEOS =====
  async renderVideos() {
    const content = document.getElementById('page-content');

    try {
      const videos = await API.videos.getAll();

      content.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Videos</h1>
          <p class="page-subtitle">${videos.length} videos in your library</p>
        </div>

        <div class="search-bar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" id="video-search" placeholder="Search videos...">
        </div>

        ${videos.length > 0 ? `
          <div class="media-grid" id="videos-grid">
            ${videos.map(video => this.renderVideoCard(video)).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
              <polygon points="10 8 16 12 10 16 10 8"/>
            </svg>
            <h3>No Videos Yet</h3>
            <p>Add video files to your media folders or upload some to get started.</p>
            <a href="#/upload" class="btn btn-primary" style="margin-top: var(--space-lg);">Upload Videos</a>
          </div>
        `}
      `;

      // Add search functionality
      const searchInput = document.getElementById('video-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase();
          const cards = document.querySelectorAll('#videos-grid .media-card');
          cards.forEach(card => {
            const title = card.dataset.title.toLowerCase();
            card.style.display = title.includes(query) ? '' : 'none';
          });
        });
      }

      // Add click handlers
      document.querySelectorAll('#videos-grid .media-card').forEach(card => {
        card.addEventListener('click', (e) => {
          // Handle delete button click
          const deleteBtn = e.target.closest('.delete-btn');
          if (deleteBtn) {
            e.stopPropagation();
            const id = deleteBtn.dataset.id;
            const name = deleteBtn.dataset.name;
            confirmModal.show(name, async () => {
              try {
                await API.videos.delete(id);
                this.renderVideos(); // Re-render the page
              } catch (error) {
                console.error('Failed to delete video:', error);
                alert('Failed to delete video. Please try again.');
              }
            });
            return;
          }

          const videoId = card.dataset.id;
          const video = videos.find(v => v.id === videoId);
          if (video) {
            videoPlayer.play(video);
          }
        });
      });

    } catch (error) {
      console.error('Failed to load videos:', error);
      router.showError('Failed to load videos');
    }
  }

  renderVideoCard(video) {
    return `
      <div class="media-card" data-id="${video.id}" data-title="${video.name}">
        <button class="delete-btn" data-id="${video.id}" data-name="${video.name}" data-type="video" title="Delete video">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
        <div class="media-card-thumb">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
            <polygon points="10 8 16 12 10 16 10 8"/>
          </svg>
          <div class="media-card-play">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
        <div class="media-card-info">
          <div class="media-card-title">${video.name}</div>
          <div class="media-card-meta">${this.formatFileSize(video.size)}</div>
        </div>
      </div>
    `;
  }

  // ===== MUSIC =====
  async renderMusic() {
    const content = document.getElementById('page-content');

    try {
      const tracks = await API.music.getAll();

      if (tracks.length === 0) {
        content.innerHTML = `
          <div class="page-header">
            <h1 class="page-title">Music</h1>
            <p class="page-subtitle">0 tracks in your library</p>
          </div>
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <h3>No Music Yet</h3>
            <p>Add audio files to your media folders or upload some to get started.</p>
            <a href="#/upload" class="btn btn-primary" style="margin-top: var(--space-lg);">Upload Music</a>
          </div>
        `;
        return;
      }

      // Store tracks for player
      this.musicTracks = tracks;

      // Get current track info
      const currentTrack = musicPlayer.queue[musicPlayer.currentIndex];
      const trackTitle = currentTrack?.metadata?.title || currentTrack?.name || 'NO TRACK SELECTED';
      const trackArtist = currentTrack?.metadata?.artist || '---';

      content.innerHTML = `
        <div class="music-visualizer-page">
          <div class="viz-header">
            <div class="viz-header-left">AUDIO VISUALIZER v1.0</div>
            <div class="viz-header-right">
              <div class="viz-status">
                <span>SYS:</span>
                <div class="viz-status-dot"></div>
                <span>ONLINE</span>
              </div>
              <div class="viz-status">
                <span>TRACKS: ${tracks.length}</span>
              </div>
            </div>
          </div>

          <div class="viz-content">
            <div class="viz-track-section">
              <div class="viz-track-label">NOW PLAYING:</div>
              <div class="viz-track-title" id="viz-track-title">"${trackTitle}"</div>
              <div class="viz-track-artist" id="viz-track-artist">${trackArtist}</div>
              <div class="viz-track-meta">
                <span>DURATION: <span id="viz-duration">00:00</span></span>
                <span>|</span>
                <span>FORMAT: DIGITAL AUDIO</span>
              </div>
            </div>

            <div class="viz-progress-section">
              <span class="viz-time" id="viz-current-time">00:00</span>
              <div class="viz-progress-bar" id="viz-progress-bar">
                <div class="viz-progress-fill" id="viz-progress-fill"></div>
              </div>
              <span class="viz-time" id="viz-total-time">00:00</span>
            </div>

            <div class="viz-controls">
              <button class="viz-control-btn" id="viz-prev">&lt;&lt;&lt;</button>
              <span class="viz-control-divider">|</span>
              <button class="viz-control-btn" id="viz-play">&#9654;</button>
              <span class="viz-control-divider">|</span>
              <button class="viz-control-btn" id="viz-next">&gt;&gt;&gt;</button>
            </div>

            <div class="viz-canvas-container">
              <canvas class="viz-canvas" id="viz-canvas"></canvas>
            </div>

            <button class="viz-toggle-list" id="viz-toggle-list">[ TRACK LIST ]</button>

            <div class="viz-tracklist" id="viz-tracklist">
              <div class="viz-tracklist-header">
                <span class="viz-tracklist-title">Track List</span>
                <button class="viz-tracklist-close" id="viz-tracklist-close">X</button>
              </div>
              <div class="viz-tracklist-content" id="viz-tracklist-content">
                ${tracks.map((track, index) => this.renderVizTrackItem(track, index)).join('')}
              </div>
            </div>
          </div>

          <div class="viz-footer">
            <div class="viz-footer-left">
              <div class="viz-play-indicator">
                <div class="viz-play-icon ${musicPlayer.isPlaying ? '' : 'paused'}" id="viz-play-icon"></div>
                <span id="viz-status-text">${musicPlayer.isPlaying ? 'PLAYING' : 'PAUSED'}</span>
              </div>
            </div>
            <div class="viz-footer-center">
              <span>VOLUME: <span id="viz-volume">${Math.round(musicPlayer.volume * 100)}%</span></span>
            </div>
            <div class="viz-footer-right">
              <span>FREQ ANALYSIS: <span id="viz-freq-status">STANDBY</span></span>
            </div>
          </div>
        </div>
      `;

      // Initialize the visualizer
      this.initMusicVisualizer();

      // Setup event handlers
      this.setupMusicVisualizerEvents(tracks);

    } catch (error) {
      console.error('Failed to load music:', error);
      router.showError('Failed to load music');
    }
  }

  renderVizTrackItem(track, index) {
    const title = track.metadata?.title || track.name;
    const artist = track.metadata?.artist || 'Unknown';
    const duration = track.metadata?.duration ? this.formatDuration(track.metadata.duration) : '--:--';
    const isActive = musicPlayer.currentIndex === index;

    return `
      <div class="viz-track-item ${isActive ? 'active' : ''}" data-index="${index}" data-id="${track.id}" data-name="${title}">
        <span class="viz-track-item-num">${String(index + 1).padStart(2, '0')}</span>
        <div class="viz-track-item-info">
          <div class="viz-track-item-title">${title}</div>
          <div class="viz-track-item-artist">${artist}</div>
        </div>
        <span class="viz-track-item-duration">${duration}</span>
      </div>
    `;
  }

  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  initMusicVisualizer() {
    const canvas = document.getElementById('viz-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation function
    const draw = () => {
      if (!document.getElementById('viz-canvas')) return; // Stop if page changed

      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Get frequency data from music player
      let dataArray;
      if (musicPlayer.analyser && musicPlayer.dataArray && musicPlayer.isPlaying) {
        musicPlayer.analyser.getByteFrequencyData(musicPlayer.dataArray);
        dataArray = musicPlayer.dataArray;

        // Update freq status
        const freqStatus = document.getElementById('viz-freq-status');
        if (freqStatus) freqStatus.textContent = 'ACTIVE';
      } else {
        // Create idle animation
        dataArray = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          dataArray[i] = 20 + Math.sin(Date.now() / 500 + i * 0.3) * 15;
        }

        const freqStatus = document.getElementById('viz-freq-status');
        if (freqStatus) freqStatus.textContent = 'STANDBY';
      }

      const barCount = 64;
      const barWidth = (width / barCount) - 2;
      const maxBarHeight = height * 0.45;

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const value = dataArray[dataIndex] || 0;
        const barHeight = (value / 255) * maxBarHeight;

        const x = i * (barWidth + 2);
        const y = height / 2 - barHeight;

        // Main bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, '#ff3333');
        gradient.addColorStop(0.5, '#ff0a0a');
        gradient.addColorStop(1, '#cc0000');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Add horizontal lines for segmented effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let j = 0; j < barHeight; j += 4) {
          ctx.fillRect(x, y + j, barWidth, 1);
        }

        // Reflection (mirrored, faded)
        const reflectionGradient = ctx.createLinearGradient(x, height / 2, x, height / 2 + barHeight * 0.6);
        reflectionGradient.addColorStop(0, 'rgba(255, 10, 10, 0.4)');
        reflectionGradient.addColorStop(1, 'rgba(255, 10, 10, 0)');

        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(x, height / 2 + 5, barWidth, barHeight * 0.6);

        // Reflection horizontal lines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        for (let j = 0; j < barHeight * 0.6; j += 4) {
          ctx.fillRect(x, height / 2 + 5 + j, barWidth, 1);
        }
      }

      // Draw center line
      ctx.fillStyle = 'rgba(255, 10, 10, 0.3)';
      ctx.fillRect(0, height / 2 - 1, width, 2);

      requestAnimationFrame(draw);
    };

    draw();

    // Update track info periodically
    this.vizUpdateInterval = setInterval(() => {
      this.updateMusicVisualizerInfo();
    }, 100);
  }

  updateMusicVisualizerInfo() {
    const track = musicPlayer.queue[musicPlayer.currentIndex];
    if (!track) return;

    // Update track info
    const titleEl = document.getElementById('viz-track-title');
    const artistEl = document.getElementById('viz-track-artist');
    if (titleEl) titleEl.textContent = `"${track.metadata?.title || track.name}"`;
    if (artistEl) artistEl.textContent = track.metadata?.artist || '---';

    // Update times
    const currentTimeEl = document.getElementById('viz-current-time');
    const totalTimeEl = document.getElementById('viz-total-time');
    const progressFill = document.getElementById('viz-progress-fill');

    if (currentTimeEl) currentTimeEl.textContent = this.formatDuration(musicPlayer.audio.currentTime);
    if (totalTimeEl) totalTimeEl.textContent = this.formatDuration(musicPlayer.audio.duration);
    if (progressFill) {
      const percent = (musicPlayer.audio.currentTime / musicPlayer.audio.duration) * 100 || 0;
      progressFill.style.width = `${percent}%`;
    }

    // Update play state
    const playIcon = document.getElementById('viz-play-icon');
    const statusText = document.getElementById('viz-status-text');
    const playBtn = document.getElementById('viz-play');

    if (playIcon) {
      playIcon.className = `viz-play-icon ${musicPlayer.isPlaying ? '' : 'paused'}`;
    }
    if (statusText) {
      statusText.textContent = musicPlayer.isPlaying ? 'PLAYING' : 'PAUSED';
    }
    if (playBtn) {
      playBtn.innerHTML = musicPlayer.isPlaying ? '&#10074;&#10074;' : '&#9654;';
    }

    // Update volume
    const volumeEl = document.getElementById('viz-volume');
    if (volumeEl) volumeEl.textContent = `${Math.round(musicPlayer.volume * 100)}%`;

    // Update active track in list
    document.querySelectorAll('.viz-track-item').forEach((item, index) => {
      item.classList.toggle('active', index === musicPlayer.currentIndex);
    });
  }

  setupMusicVisualizerEvents(tracks) {
    // Control buttons
    const playBtn = document.getElementById('viz-play');
    const prevBtn = document.getElementById('viz-prev');
    const nextBtn = document.getElementById('viz-next');

    if (playBtn) playBtn.addEventListener('click', () => musicPlayer.togglePlay());
    if (prevBtn) prevBtn.addEventListener('click', () => musicPlayer.playPrevious());
    if (nextBtn) nextBtn.addEventListener('click', () => musicPlayer.playNext());

    // Progress bar click
    const progressBar = document.getElementById('viz-progress-bar');
    if (progressBar) {
      progressBar.addEventListener('click', (e) => {
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        musicPlayer.audio.currentTime = percent * musicPlayer.audio.duration;
      });
    }

    // Track list toggle
    const toggleBtn = document.getElementById('viz-toggle-list');
    const tracklist = document.getElementById('viz-tracklist');
    const closeBtn = document.getElementById('viz-tracklist-close');

    if (toggleBtn && tracklist) {
      toggleBtn.addEventListener('click', () => tracklist.classList.add('open'));
    }
    if (closeBtn && tracklist) {
      closeBtn.addEventListener('click', () => tracklist.classList.remove('open'));
    }

    // Track list items
    document.querySelectorAll('.viz-track-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Check for right-click or context menu for delete
        const index = parseInt(item.dataset.index);
        musicPlayer.setQueue(tracks, index);

        // Close track list on mobile
        if (window.innerWidth < 768 && tracklist) {
          tracklist.classList.remove('open');
        }
      });

      // Right-click to delete
      item.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const id = item.dataset.id;
        const name = item.dataset.name;
        confirmModal.show(name, async () => {
          try {
            await API.music.delete(id);
            this.renderMusic();
          } catch (error) {
            console.error('Failed to delete track:', error);
            alert('Failed to delete track.');
          }
        });
      });
    });
  }

  renderMusicCard(track, index) {
    const title = track.metadata?.title || track.name;
    const artist = track.metadata?.artist || 'Unknown Artist';

    return `
      <div class="media-card music-card" data-id="${track.id}" data-index="${index}" data-title="${title}" data-artist="${artist}">
        <button class="delete-btn" data-id="${track.id}" data-name="${title}" data-type="music" title="Delete track">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
        <div class="media-card-thumb">
          ${track.metadata?.hasCover ? `
            <img src="${API.music.getCoverUrl(track.id)}" alt="Album Art">
          ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          `}
          <div class="media-card-play">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
        <div class="media-card-info">
          <div class="media-card-title">${title}</div>
          <div class="media-card-meta">${artist}</div>
        </div>
      </div>
    `;
  }

  // ===== PHOTOS =====
  async renderPhotos() {
    const content = document.getElementById('page-content');

    try {
      const photos = await API.photos.getAll();

      if (photos.length === 0) {
        content.innerHTML = `
          <div class="page-header">
            <h1 class="page-title">Photos</h1>
            <p class="page-subtitle">0 photos in your library</p>
          </div>
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <h3>No Photos Yet</h3>
            <p>Add image files to your media folders or upload some to get started.</p>
            <a href="#/upload" class="btn btn-primary" style="margin-top: var(--space-lg);">Upload Photos</a>
          </div>
        `;
        return;
      }

      // Store photos for lightbox
      this.photos = photos;

      // Group photos by year, month, and day
      const grouped = this.groupPhotosByDate(photos);

      // Calculate stats
      const years = Object.keys(grouped).length;
      const oldestDate = new Date(photos[photos.length - 1].modified);
      const newestDate = new Date(photos[0].modified);

      content.innerHTML = `
        <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 class="page-title">Photos</h1>
            <p class="page-subtitle">${photos.length} photos in your library</p>
          </div>
          <div class="photo-view-toggle">
            <button class="photo-view-btn active" data-view="timeline">Timeline</button>
            <button class="photo-view-btn" data-view="grid">Grid</button>
          </div>
        </div>

        <div class="photo-stats-bar">
          <div class="photo-stat">
            <span class="photo-stat-value">${photos.length}</span>
            <span class="photo-stat-label">Total Photos</span>
          </div>
          <div class="photo-stat">
            <span class="photo-stat-value">${years}</span>
            <span class="photo-stat-label">${years === 1 ? 'Year' : 'Years'}</span>
          </div>
          <div class="photo-stat">
            <span class="photo-stat-value">${this.formatDateShort(oldestDate)}</span>
            <span class="photo-stat-label">Oldest</span>
          </div>
          <div class="photo-stat">
            <span class="photo-stat-value">${this.formatDateShort(newestDate)}</span>
            <span class="photo-stat-label">Newest</span>
          </div>
        </div>

        <div class="photo-timeline" id="photos-container">
          ${this.renderPhotoTimeline(grouped)}
        </div>
      `;

      // Add click handlers for photos
      this.attachPhotoClickHandlers();

      // Add view toggle handlers
      document.querySelectorAll('.photo-view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.photo-view-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          const view = e.target.dataset.view;
          this.switchPhotoView(view);
        });
      });

    } catch (error) {
      console.error('Failed to load photos:', error);
      router.showError('Failed to load photos');
    }
  }

  groupPhotosByDate(photos) {
    const grouped = {};

    photos.forEach((photo, index) => {
      const date = new Date(photo.modified);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      if (!grouped[year]) {
        grouped[year] = { months: {}, count: 0 };
      }
      if (!grouped[year].months[month]) {
        grouped[year].months[month] = { days: {}, count: 0 };
      }
      if (!grouped[year].months[month].days[day]) {
        grouped[year].months[month].days[day] = [];
      }

      photo.globalIndex = index; // Store global index for lightbox
      grouped[year].months[month].days[day].push(photo);
      grouped[year].months[month].count++;
      grouped[year].count++;
    });

    return grouped;
  }

  renderPhotoTimeline(grouped) {
    const years = Object.keys(grouped).sort((a, b) => b - a); // Newest first
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return years.map(year => {
      const yearData = grouped[year];
      const months = Object.keys(yearData.months).sort((a, b) => b - a);

      return `
        <div class="photo-year-section">
          <div class="photo-year-header">
            <span class="photo-year-title">${year}</span>
            <span class="photo-year-count">${yearData.count} photos</span>
          </div>

          ${months.map(month => {
            const monthData = yearData.months[month];
            const days = Object.keys(monthData.days).sort((a, b) => b - a);

            return `
              <div class="photo-month-section">
                <div class="photo-month-header">
                  <span class="photo-month-title">${monthNames[month]}</span>
                  <span class="photo-month-subtitle">${monthData.count} photos</span>
                </div>

                ${days.map(day => {
                  const photos = monthData.days[day];
                  const date = new Date(year, month, day);
                  const weekday = dayNames[date.getDay()];

                  return `
                    <div class="photo-day-section">
                      <div class="photo-day-header">
                        <span class="photo-day-date">${monthNames[month]} ${day}</span>
                        <span class="photo-day-weekday">${weekday}</span>
                      </div>
                      <div class="photo-grid">
                        ${photos.map((photo, idx) => this.renderPhotoGridItem(photo, idx, photos.length)).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('');
  }

  renderPhotoGridItem(photo, indexInDay, totalInDay) {
    // Determine size class for visual variety
    let sizeClass = '';
    if (totalInDay > 4) {
      // For larger groups, make some photos featured
      if (indexInDay === 0) {
        sizeClass = 'featured';
      } else if (indexInDay % 7 === 3) {
        sizeClass = 'wide';
      } else if (indexInDay % 11 === 5) {
        sizeClass = 'tall';
      }
    } else if (totalInDay <= 2 && indexInDay === 0) {
      sizeClass = 'featured';
    }

    return `
      <div class="photo-grid-item ${sizeClass}" data-id="${photo.id}" data-index="${photo.globalIndex}" data-name="${photo.name}">
        <button class="delete-btn" data-id="${photo.id}" data-name="${photo.name}" title="Delete photo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
        <img src="${API.photos.getThumbUrl(photo.id)}" alt="${photo.name}" loading="lazy">
        <div class="photo-item-info">${photo.name}</div>
      </div>
    `;
  }

  attachPhotoClickHandlers() {
    document.querySelectorAll('.photo-grid-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Handle delete button click
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
          e.stopPropagation();
          const id = deleteBtn.dataset.id;
          const name = deleteBtn.dataset.name;
          confirmModal.show(name, async () => {
            try {
              await API.photos.delete(id);
              this.renderPhotos(); // Re-render the page
            } catch (error) {
              console.error('Failed to delete photo:', error);
              alert('Failed to delete photo. Please try again.');
            }
          });
          return;
        }

        const index = parseInt(item.dataset.index);
        lightbox.open(this.photos, index, (deletedPhoto, deletedIndex) => {
          // Re-render photos page after deletion
          this.renderPhotos();
        });
      });
    });
  }

  switchPhotoView(view) {
    const container = document.getElementById('photos-container');
    if (!container) return;

    if (view === 'grid') {
      // Simple grid view - all photos in one grid
      container.className = 'photo-grid';
      container.innerHTML = this.photos.map((photo, index) => `
        <div class="photo-grid-item" data-id="${photo.id}" data-index="${index}" data-name="${photo.name}">
          <button class="delete-btn" data-id="${photo.id}" data-name="${photo.name}" title="Delete photo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          <img src="${API.photos.getThumbUrl(photo.id)}" alt="${photo.name}" loading="lazy">
          <div class="photo-item-info">${photo.name}</div>
        </div>
      `).join('');
    } else {
      // Timeline view
      container.className = 'photo-timeline';
      const grouped = this.groupPhotosByDate(this.photos);
      container.innerHTML = this.renderPhotoTimeline(grouped);
    }

    // Re-attach click handlers
    this.attachPhotoClickHandlers();
  }

  formatDateShort(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // ===== UPLOAD =====
  async renderUpload() {
    const content = document.getElementById('page-content');

    content.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">Upload</h1>
        <p class="page-subtitle">Add media to your library</p>
      </div>

      <div class="upload-zone" id="upload-zone">
        <input type="file" id="file-input" multiple accept="video/*,audio/*,image/*">
        <svg class="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <h3>Drop files here</h3>
        <p>or click to browse</p>
      </div>

      <div class="upload-progress" id="upload-progress"></div>
    `;

    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const uploadProgress = document.getElementById('upload-progress');

    // Click to upload
    uploadZone.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFiles(Array.from(e.target.files));
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      this.handleFiles(Array.from(e.dataTransfer.files));
    });
  }

  async handleFiles(files) {
    const uploadProgress = document.getElementById('upload-progress');

    for (const file of files) {
      const itemId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add progress item
      uploadProgress.innerHTML += `
        <div class="upload-item" id="${itemId}">
          <div class="upload-item-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div class="upload-item-info">
            <div class="upload-item-name">${file.name}</div>
            <div class="upload-item-progress">
              <div class="upload-item-progress-fill" style="width: 0%"></div>
            </div>
            <div class="upload-item-status">Uploading...</div>
          </div>
        </div>
      `;

      const item = document.getElementById(itemId);
      const progressFill = item.querySelector('.upload-item-progress-fill');
      const status = item.querySelector('.upload-item-status');

      try {
        await API.upload.uploadFile(file, (percent) => {
          progressFill.style.width = `${percent}%`;
          status.textContent = `${Math.round(percent)}%`;
        });

        progressFill.style.width = '100%';
        progressFill.style.background = 'var(--gold)';
        status.textContent = 'Complete';

        // Refresh stats
        this.loadStats();
      } catch (error) {
        progressFill.style.background = 'var(--carmine)';
        status.textContent = 'Failed';
      }
    }
  }

  // ===== SETTINGS =====
  async renderSettings() {
    const content = document.getElementById('page-content');

    try {
      const settings = await API.settings.get();

      content.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Settings</h1>
          <p class="page-subtitle">Configure your media server</p>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Server</h3>
          <div class="settings-row">
            <div class="settings-label">
              Port
              <small>Server port (requires restart)</small>
            </div>
            <input type="number" class="settings-input" id="server-port" value="${settings.server.port}">
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Video Directories</h3>
          <div class="path-list" id="video-paths">
            ${settings.media.videos.map(p => `
              <div class="path-item">
                <span>${p}</span>
                <button data-type="videos" data-path="${p}">&times;</button>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm);">
            <input type="text" class="settings-input" id="new-video-path" placeholder="/path/to/videos">
            <button class="btn btn-secondary" id="add-video-path">Add</button>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Music Directories</h3>
          <div class="path-list" id="music-paths">
            ${settings.media.music.map(p => `
              <div class="path-item">
                <span>${p}</span>
                <button data-type="music" data-path="${p}">&times;</button>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm);">
            <input type="text" class="settings-input" id="new-music-path" placeholder="/path/to/music">
            <button class="btn btn-secondary" id="add-music-path">Add</button>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Photo Directories</h3>
          <div class="path-list" id="photo-paths">
            ${settings.media.photos.map(p => `
              <div class="path-item">
                <span>${p}</span>
                <button data-type="photos" data-path="${p}">&times;</button>
              </div>
            `).join('')}
          </div>
          <div style="margin-top: var(--space-md); display: flex; gap: var(--space-sm);">
            <input type="text" class="settings-input" id="new-photo-path" placeholder="/path/to/photos">
            <button class="btn btn-secondary" id="add-photo-path">Add</button>
          </div>
        </div>

        <div class="settings-section">
          <h3 class="settings-section-title">Library</h3>
          <div class="settings-row">
            <div class="settings-label">
              Rescan Library
              <small>Scan all directories for new media</small>
            </div>
            <button class="btn btn-primary" id="rescan-btn">Scan Now</button>
          </div>
        </div>
      `;

      // Add path handlers
      document.querySelectorAll('.path-item button').forEach(btn => {
        btn.addEventListener('click', async () => {
          const type = btn.dataset.type;
          const path = btn.dataset.path;
          try {
            await API.settings.removeMediaPath(type, path);
            this.renderSettings();
          } catch (error) {
            console.error('Failed to remove path:', error);
          }
        });
      });

      // Add new path buttons
      ['video', 'music', 'photo'].forEach(type => {
        const btn = document.getElementById(`add-${type}-path`);
        const input = document.getElementById(`new-${type}-path`);
        const apiType = type === 'photo' ? 'photos' : type + 's';

        btn.addEventListener('click', async () => {
          const path = input.value.trim();
          if (path) {
            try {
              await API.settings.addMediaPath(apiType, path);
              this.renderSettings();
            } catch (error) {
              alert('Failed to add path. Make sure the directory exists.');
            }
          }
        });
      });

      // Rescan button
      document.getElementById('rescan-btn').addEventListener('click', async () => {
        const btn = document.getElementById('rescan-btn');
        btn.textContent = 'Scanning...';
        btn.disabled = true;

        try {
          const result = await API.settings.scan();
          btn.textContent = `Found ${result.total} files`;
          this.loadStats();
          setTimeout(() => {
            btn.textContent = 'Scan Now';
            btn.disabled = false;
          }, 2000);
        } catch (error) {
          btn.textContent = 'Scan Failed';
          setTimeout(() => {
            btn.textContent = 'Scan Now';
            btn.disabled = false;
          }, 2000);
        }
      });

    } catch (error) {
      console.error('Failed to load settings:', error);
      router.showError('Failed to load settings');
    }
  }

  // ===== UTILITIES =====
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Initialize app
const app = new App();
