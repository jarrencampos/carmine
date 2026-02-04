// Main Application - Carmine Media Server

class App {
  constructor() {
    this.vizUpdateInterval = null;
    this.resizeHandler = null;
    this.init();
  }

  async init() {
    // Register routes
    this.registerRoutes();

    // Load initial stats
    this.loadStats();

    // Load saved theme color
    this.loadThemeColor();

  }

  async loadThemeColor() {
    try {
      const settings = await API.settings.get();
      if (settings.theme?.preset && App.THEME_PRESETS[settings.theme.preset]) {
        this.applyPresetTheme(settings.theme.preset);
      } else if (settings.theme?.accentColor) {
        this.currentThemePreset = null;
        this.clearPresetMultiColor();
        this.applyThemeColor(settings.theme.accentColor);
      }
    } catch (error) {
      console.error('Failed to load theme color:', error);
    }
  }

  applyThemeColor(hexColor) {
    const root = document.documentElement;

    // Parse hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate lighter and darker variants
    const lighten = (value, amount) => Math.min(255, value + amount);
    const darken = (value, amount) => Math.max(0, value - amount);

    const lightR = lighten(r, 40);
    const lightG = lighten(g, 40);
    const lightB = lighten(b, 40);

    const darkR = darken(r, 50);
    const darkG = darken(g, 50);
    const darkB = darken(b, 50);

    const toHex = (r, g, b) => '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');

    // Update CSS variables
    root.style.setProperty('--carmine', hexColor);
    root.style.setProperty('--carmine-light', toHex(lightR, lightG, lightB));
    root.style.setProperty('--carmine-dark', toHex(darkR, darkG, darkB));
    root.style.setProperty('--carmine-glow', hexColor);
    root.style.setProperty('--carmine-muted', toHex(Math.floor(r * 0.2), Math.floor(g * 0.2), Math.floor(b * 0.2)));

    // Compute contrast color for text on accent-colored backgrounds
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    root.style.setProperty('--text-on-accent', luminance > 0.5 ? '#000000' : '#ffffff');

    // Update text colors
    root.style.setProperty('--text-primary', hexColor);
    root.style.setProperty('--text-secondary', toHex(darkR, darkG, darkB));
    root.style.setProperty('--text-muted', toHex(Math.floor(r * 0.4), Math.floor(g * 0.4), Math.floor(b * 0.4)));
    root.style.setProperty('--text-accent', hexColor);
    root.style.setProperty('--text-data', hexColor);

    // Update borders
    root.style.setProperty('--border', `rgba(${r}, ${g}, ${b}, 0.3)`);
    root.style.setProperty('--border-light', `rgba(${r}, ${g}, ${b}, 0.5)`);
    root.style.setProperty('--border-strong', `rgba(${r}, ${g}, ${b}, 0.7)`);

    // Update glass effects
    root.style.setProperty('--glass', `rgba(${r}, ${g}, ${b}, 0.05)`);
    root.style.setProperty('--glass-heavy', `rgba(${r}, ${g}, ${b}, 0.1)`);

    // Update gradients
    root.style.setProperty('--gradient-carmine', `linear-gradient(135deg, ${toHex(darkR, darkG, darkB)} 0%, ${hexColor} 100%)`);
    root.style.setProperty('--gradient-glow', `radial-gradient(ellipse at center, rgba(${r}, ${g}, ${b}, 0.1) 0%, transparent 70%)`);
    root.style.setProperty('--gradient-chart', `linear-gradient(180deg, rgba(${r}, ${g}, ${b}, 0.4) 0%, rgba(${r}, ${g}, ${b}, 0.05) 100%)`);

    // Update shadows
    root.style.setProperty('--shadow-glow', `0 0 20px rgba(${r}, ${g}, ${b}, 0.4)`);
    root.style.setProperty('--shadow-glow-strong', `0 0 40px rgba(${r}, ${g}, ${b}, 0.6)`);

    // Update background colors with tint
    root.style.setProperty('--bg-secondary', `rgb(${Math.floor(r * 0.02)}, ${Math.floor(g * 0.02)}, ${Math.floor(b * 0.02)})`);
    root.style.setProperty('--bg-tertiary', `rgb(${Math.floor(r * 0.04)}, ${Math.floor(g * 0.04)}, ${Math.floor(b * 0.04)})`);
    root.style.setProperty('--bg-hover', `rgb(${Math.floor(r * 0.08)}, ${Math.floor(g * 0.08)}, ${Math.floor(b * 0.08)})`);
    root.style.setProperty('--bg-elevated', `rgb(${Math.floor(r * 0.03)}, ${Math.floor(g * 0.03)}, ${Math.floor(b * 0.03)})`);
    root.style.setProperty('--bg-panel', `rgb(${Math.floor(r * 0.01)}, ${Math.floor(g * 0.01)}, ${Math.floor(b * 0.01)})`);
  }

  // Preset theme definitions
  static THEME_PRESETS = {
    usa: {
      label: 'USA',
      emoji: '\u{1F1FA}\u{1F1F8}',
      primary: '#E8283B',
      secondary: '#4A55A2',
      accent: '#FFFFFF'
    },
    christmas: {
      label: 'Christmas',
      emoji: '\u{1F384}',
      primary: '#c41e3a',
      secondary: '#2d5a27',
      accent: '#ffd700'
    },
    halloween: {
      label: 'Halloween',
      emoji: '\u{1F383}',
      primary: '#FF6600',
      secondary: '#8B00CC',
      accent: '#39FF14'
    },
    barbie: {
      label: 'Barbie',
      emoji: '\u{1F451}',
      primary: '#FF69B4',
      secondary: '#FF1493',
      accent: '#FFB6C1'
    },
    synthwave: {
      label: 'Synthwave',
      emoji: '\u{1F305}',
      primary: '#FF2975',
      secondary: '#7B2FBE',
      accent: '#00F0FF'
    },
    rgb: {
      label: 'RGB',
      emoji: '\u{1F308}',
      primary: '#ff0000',
      secondary: '#00ff00',
      accent: '#0000ff'
    }
  };

  applyPresetTheme(presetName) {
    const preset = App.THEME_PRESETS[presetName];
    if (!preset) {
      this.currentThemePreset = null;
      return;
    }
    this.currentThemePreset = presetName;
    // Use secondary as base UI color so the preset doesn't feel mono-color
    this.applyThemeColor(preset.secondary);

    const root = document.documentElement;
    root.style.setProperty('--carmine-secondary', preset.secondary);
    root.style.setProperty('--carmine-accent', preset.accent);

    // Set the 3 preset cycling colors + their rgba border/glow variants
    const colors = [preset.primary, preset.secondary, preset.accent];
    colors.forEach((hex, i) => {
      const idx = i + 1;
      root.style.setProperty(`--preset-${idx}`, hex);
      const pr = parseInt(hex.slice(1, 3), 16);
      const pg = parseInt(hex.slice(3, 5), 16);
      const pb = parseInt(hex.slice(5, 7), 16);
      root.style.setProperty(`--preset-${idx}-border`, `rgba(${pr},${pg},${pb},0.3)`);
      root.style.setProperty(`--preset-${idx}-glow`, `rgba(${pr},${pg},${pb},0.4)`);
      root.style.setProperty(`--preset-${idx}-muted`, `rgba(${pr},${pg},${pb},0.15)`);
    });

    document.body.classList.add('preset-active');
  }

  clearPresetMultiColor() {
    document.body.classList.remove('preset-active');
    const root = document.documentElement;
    for (let i = 1; i <= 3; i++) {
      root.style.removeProperty(`--preset-${i}`);
      root.style.removeProperty(`--preset-${i}-border`);
      root.style.removeProperty(`--preset-${i}-glow`);
      root.style.removeProperty(`--preset-${i}-muted`);
    }
  }

  // Cleanup method to clear intervals and event listeners when navigating away
  cleanup() {
    if (this.vizUpdateInterval) {
      clearInterval(this.vizUpdateInterval);
      this.vizUpdateInterval = null;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.musicKeyHandler) {
      document.removeEventListener('keydown', this.musicKeyHandler);
      this.musicKeyHandler = null;
    }
    if (this.thumbObserver) {
      this.thumbObserver.disconnect();
      this.thumbObserver = null;
    }
    // Exit cinema mode when leaving videos page
    this.exitCinemaMode();
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

    // Albums
    router.register('/albums', async (params) => {
      router.showLoading();
      if (params && params[0]) {
        // Single album view
        await this.renderAlbum(params[0]);
      } else {
        // Albums list
        await this.renderAlbums();
      }
    });

    // Playlists
    router.register('/playlists', async (params) => {
      router.showLoading();
      if (params && params[0]) {
        // Single playlist view
        await this.renderPlaylist(params[0]);
      } else {
        // Playlists list
        await this.renderPlaylists();
      }
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
    this.cleanup();
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
  async renderVideos(browsePath = '') {
    this.cleanup();
    const content = document.getElementById('page-content');

    // Enter cinema mode - hide music player
    this.enterCinemaMode();

    // Store current browse path
    this.currentBrowsePath = browsePath;

    try {
      const browseData = await API.videos.browse(browsePath);

      // Load all videos for search only once (lazy)
      if (!this.allVideos) {
        API.videos.getAll().then(allVideos => {
          this.allVideos = allVideos;
        });
      }

      const { breadcrumb, folders, videos } = browseData;

      const breadcrumbHtml = breadcrumb.map((crumb, i) => {
        const isLast = i === breadcrumb.length - 1;
        if (isLast) {
          return `<span class="breadcrumb-current">${crumb.name}</span>`;
        }
        return `<a class="breadcrumb-link" data-path="${crumb.path}">${crumb.name}</a>
                <span class="breadcrumb-sep">&gt;</span>`;
      }).join(' ');

      const hasContent = folders.length > 0 || videos.length > 0;

      content.innerHTML = `
        <div class="cinema-page">
          <div class="cinema-header">
            <div class="cinema-header-top">
              <div class="cinema-breadcrumb" id="video-breadcrumb">
                ${breadcrumbHtml}
              </div>
              <div class="cinema-search">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <input type="text" id="video-search" placeholder="Search...">
              </div>
            </div>
          </div>

          <div class="cinema-content" id="cinema-content">
            ${!hasContent ? `
              <div class="empty-state cinema-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                <h3>Empty Folder</h3>
                <p>No videos or subfolders here.</p>
                ${browsePath ? '' : '<a href="#/upload" class="btn btn-primary">Upload Videos</a>'}
              </div>
            ` : `
              <div class="cinema-grid">
                ${folders.map(folder => this.renderBrowseFolderCard(folder)).join('')}
                ${videos.map(video => this.renderCinemaCard(video)).join('')}
              </div>
            `}
          </div>
        </div>
      `;

      // Breadcrumb click handlers
      document.querySelectorAll('#video-breadcrumb .breadcrumb-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          this.renderVideos(link.dataset.path);
        });
      });

      // Folder click handlers
      document.querySelectorAll('.cinema-card.browse-folder-card').forEach(card => {
        card.addEventListener('click', () => {
          this.renderVideos(card.dataset.folderPath);
        });
      });

      // Video click handlers
      document.querySelectorAll('.cinema-card:not(.browse-folder-card)').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.cinema-card-menu')) return;
          const videoId = card.dataset.id;
          const video = videos.find(v => v.id === videoId);
          if (video) {
            this.playVideoImmersive(video);
          }
        });

        const menuBtn = card.querySelector('.cinema-card-menu');
        if (menuBtn) {
          menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showVideoContextMenu(card.dataset.id, card.dataset.name, e);
          });
        }
      });

      // Search functionality
      const searchInput = document.getElementById('video-search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.filterVideos(e.target.value);
        });
      }

      // Lazy-load video thumbnails
      this.initVideoThumbObserver();

    } catch (error) {
      console.error('Failed to load videos:', error);
      router.showError('Failed to load videos');
    }
  }

  enterCinemaMode() {
    document.body.classList.add('cinema-mode');
    const musicPlayer = document.getElementById('music-player');
    if (musicPlayer) {
      musicPlayer.style.display = 'none';
    }
  }

  exitCinemaMode() {
    document.body.classList.remove('cinema-mode');
    const musicPlayer = document.getElementById('music-player');
    if (musicPlayer) {
      musicPlayer.style.display = '';
    }
  }

  renderBrowseFolderCard(folder) {
    return `
      <div class="cinema-card browse-folder-card" data-folder-path="${folder.path}">
        <div class="cinema-card-poster folder-poster">
          <div class="cinema-card-overlay">
            <div class="cinema-card-play">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
          </div>
          <div class="cinema-card-icon folder-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="folder-video-count">${folder.itemCount} ${folder.itemCount === 1 ? 'item' : 'items'}</div>
        </div>
        <div class="cinema-card-info">
          <div class="cinema-card-title">${folder.name}</div>
          <div class="cinema-card-meta">Folder</div>
        </div>
      </div>
    `;
  }

  renderCinemaCard(video) {
    const title = video.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ');
    const streamUrl = API.videos.getStreamUrl(video.id);

    return `
      <div class="cinema-card" data-id="${video.id}" data-name="${video.name}">
        <div class="cinema-card-poster">
          <video class="cinema-card-thumb" data-src="${streamUrl}#t=2" preload="none" muted playsinline></video>
          <div class="cinema-card-overlay">
            <div class="cinema-card-play">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="cinema-card-info">
          <div class="cinema-card-title">${title}</div>
          <div class="cinema-card-meta">${this.formatFileSize(video.size)}</div>
        </div>
        <button class="cinema-card-menu" title="Options">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>
    `;
  }

  initVideoThumbObserver() {
    if (this.thumbObserver) {
      this.thumbObserver.disconnect();
    }

    let loadingCount = 0;
    const MAX_CONCURRENT = 4;
    const pending = [];

    const loadThumb = (video) => {
      if (loadingCount >= MAX_CONCURRENT) {
        pending.push(video);
        return;
      }
      loadingCount++;
      video.src = video.dataset.src;
      video.preload = 'metadata';
      const onReady = () => {
        loadingCount--;
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onReady);
        if (pending.length > 0) {
          loadThumb(pending.shift());
        }
      };
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('error', onReady);
    };

    this.thumbObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const video = entry.target;
          this.thumbObserver.unobserve(video);
          loadThumb(video);
        }
      });
    }, { rootMargin: '200px' });

    document.querySelectorAll('.cinema-card-thumb[data-src]').forEach(video => {
      this.thumbObserver.observe(video);
    });
  }

  async showVideoContextMenu(videoId, videoName, event) {
    document.querySelectorAll('.context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu';

    menu.innerHTML = `
      <div class="context-menu-header">${videoName}</div>
      <div class="context-menu-divider"></div>
      <button class="context-menu-item danger" data-action="delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Delete
      </button>
    `;

    menu.style.position = 'fixed';
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;

    document.body.appendChild(menu);

    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', async () => {
        const action = item.dataset.action;

        if (action === 'delete') {
          confirmModal.show(videoName, async () => {
            try {
              await API.videos.delete(videoId);
              this.renderVideos(this.currentBrowsePath || '');
            } catch (error) {
              console.error('Failed to delete video:', error);
            }
          });
        }

        menu.remove();
      });
    });

    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 0);
  }

  filterVideos(query) {
    query = query.toLowerCase().trim();
    const content = document.getElementById('cinema-content');

    if (!query) {
      // Re-render current browse view
      this.renderVideos(this.currentBrowsePath || '');
      return;
    }

    // Show search results from all videos
    if (!this.allVideos) {
      content.innerHTML = `<div class="cinema-empty-row"><p>Loading videos...</p></div>`;
      API.videos.getAll().then(allVideos => {
        this.allVideos = allVideos;
        this.filterVideos(query);
      });
      return;
    }

    const filtered = this.allVideos.filter(v =>
      v.name.toLowerCase().includes(query)
    );

    content.innerHTML = '';

    if (filtered.length === 0) {
      content.innerHTML = `
        <div class="cinema-empty-row">
          <p>No videos found for "${query}"</p>
        </div>
      `;
    } else {
      content.innerHTML = `
        <h2 class="cinema-row-title">Search Results</h2>
        <div class="cinema-grid">
          ${filtered.map(video => this.renderCinemaCard(video)).join('')}
        </div>
      `;

      content.querySelectorAll('.cinema-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.cinema-card-menu')) return;
          const videoId = card.dataset.id;
          const video = filtered.find(v => v.id === videoId);
          if (video) {
            this.playVideoImmersive(video);
          }
        });
      });

      this.initVideoThumbObserver();
    }
  }

  playVideoImmersive(video) {
    // Use the enhanced video player
    videoPlayer.playImmersive(video);
  }

  // ===== MUSIC =====
  async renderMusic() {
    this.cleanup();
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
              <button class="viz-control-btn ${musicPlayer.shuffle ? 'active' : ''}" id="viz-shuffle" title="Shuffle">
                <span class="viz-control-icon">&#8645;</span>
                <span class="viz-control-label">SHUF</span>
              </button>
              <span class="viz-control-divider">|</span>
              <button class="viz-control-btn" id="viz-prev">&lt;&lt;&lt;</button>
              <span class="viz-control-divider">|</span>
              <button class="viz-control-btn" id="viz-play">&#9654;</button>
              <span class="viz-control-divider">|</span>
              <button class="viz-control-btn" id="viz-next">&gt;&gt;&gt;</button>
              <span class="viz-control-divider">|</span>
              <button class="viz-control-btn" id="viz-repeat" title="Repeat">
                <span class="viz-control-icon">&#8634;</span>
                <span class="viz-control-label" id="viz-repeat-label">${musicPlayer.repeat === 'none' ? 'OFF' : musicPlayer.repeat === 'all' ? 'ALL' : 'ONE'}</span>
              </button>
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
                ${this.renderArtistFolders(tracks)}
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
              <span>VOL: <span id="viz-volume">${Math.round(musicPlayer.volume * 100)}%</span></span>
              <span class="viz-footer-divider">|</span>
              <span class="viz-shortcut-hint">[SPACE] Play | [S] Shuffle | [R] Repeat | [L] List</span>
            </div>
            <div class="viz-footer-right">
              <span>FREQ: <span id="viz-freq-status">STANDBY</span></span>
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

  groupTracksByArtist(tracks) {
    const grouped = {};
    tracks.forEach((track, index) => {
      const artist = track.metadata?.artist || 'Unknown Artist';
      if (!grouped[artist]) {
        grouped[artist] = [];
      }
      grouped[artist].push({ ...track, originalIndex: index });
    });
    // Sort artists alphabetically, but put "Unknown Artist" at the end
    const sortedArtists = Object.keys(grouped).sort((a, b) => {
      if (a === 'Unknown Artist') return 1;
      if (b === 'Unknown Artist') return -1;
      return a.localeCompare(b);
    });
    return { grouped, sortedArtists };
  }

  renderArtistFolders(tracks) {
    const { grouped, sortedArtists } = this.groupTracksByArtist(tracks);

    return sortedArtists.map(artist => {
      const artistTracks = grouped[artist];
      const trackCount = artistTracks.length;
      const totalDuration = artistTracks.reduce((sum, t) => sum + (t.metadata?.duration || 0), 0);

      return `
        <div class="viz-artist-folder" data-artist="${artist}">
          <div class="viz-artist-header">
            <span class="viz-artist-toggle">▶</span>
            <span class="viz-artist-name">${artist}</span>
            <span class="viz-artist-meta">${trackCount} track${trackCount !== 1 ? 's' : ''} · ${this.formatDuration(totalDuration)}</span>
          </div>
          <div class="viz-artist-tracks">
            ${artistTracks.map(track => this.renderVizTrackItem(track, track.originalIndex)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  renderVizTrackItem(track, index) {
    const title = track.metadata?.title || track.name;
    const artist = track.metadata?.artist || 'Unknown Artist';
    const duration = track.metadata?.duration ? this.formatDuration(track.metadata.duration) : '--:--';
    const isActive = musicPlayer.currentIndex === index;

    return `
      <div class="viz-track-item ${isActive ? 'active' : ''}" data-index="${index}" data-id="${track.id}" data-name="${title}">
        <div class="viz-track-item-info">
          <div class="viz-track-item-title">${title}</div>
        </div>
        <div class="viz-track-item-actions">
          <button class="track-action-btn btn-add-queue" data-id="${track.id}" data-index="${index}" title="Add to queue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button class="track-action-btn btn-add-playlist" data-id="${track.id}" title="Add to playlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
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

  // Parse the current --carmine CSS variable into RGB components for the canvas visualizer
  getThemeRGB() {
    const hex = getComputedStyle(document.documentElement).getPropertyValue('--carmine').trim();
    if (hex && hex.startsWith('#') && hex.length >= 7) {
      return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
      };
    }
    return { r: 245, g: 236, b: 0 }; // fallback
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
    this.resizeHandler = resizeCanvas;
    window.addEventListener('resize', this.resizeHandler);

    // Animation function
    const draw = () => {
      if (!document.getElementById('viz-canvas')) return; // Stop if page changed

      const width = canvas.width;
      const height = canvas.height;

      // Read theme color each frame so it stays in sync with user changes
      const { r, g, b } = this.getThemeRGB();
      const darkR = Math.max(0, r - 50), darkG = Math.max(0, g - 50), darkB = Math.max(0, b - 50);
      const lightR = Math.min(255, r + 40), lightG = Math.min(255, g + 40), lightB = Math.min(255, b + 40);

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
      } else if (musicPlayer.isPlaying) {
        // Playing but no analyser (iOS) — simulate movement from audio time
        const t = musicPlayer.audio.currentTime || Date.now() / 1000;
        dataArray = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
          dataArray[i] = 80 + Math.sin(t * 3.5 + i * 0.7) * 60
                            + Math.sin(t * 5.2 + i * 1.3) * 30
                            + Math.sin(t * 1.8 + i * 0.4) * 25;
        }

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

      // Get bar color based on preset
      const getBarColor = (i, barCount) => {
        const preset = this.currentThemePreset;

        if (preset === 'usa') {
          const cantonWidth = Math.floor(barCount * 0.4);
          if (i < cantonWidth) {
            // Blue canton
            return { r: 74, g: 85, b: 162 }; // #4A55A2
          }
          // Red and white stripes
          const stripeIndex = i % 6;
          if (stripeIndex < 3) {
            return { r: 232, g: 40, b: 59 }; // #E8283B
          }
          return { r: 255, g: 255, b: 255 };
        }

        if (preset === 'barbie') {
          // Hot pink, soft pink, white shimmer
          const shimmer = Math.sin(Date.now() / 600 + i * 0.8) * 0.5 + 0.5;
          if (i % 7 === 0) {
            // White sparkle bars
            const v = Math.round(200 + shimmer * 55);
            return { r: v, g: v, b: v };
          }
          if (i % 2 === 0) {
            // Hot pink
            return { r: 255, g: 20, b: 147 };   // #FF1493
          }
          // Soft pink with shimmer
          return {
            r: 255,
            g: Math.round(105 + shimmer * 77),
            b: Math.round(180 + shimmer * 25)
          };
        }

        if (preset === 'synthwave') {
          // Hot pink → purple → cyan gradient that drifts slowly
          const shift = (Date.now() / 4000) % 1;
          const t = ((i / barCount) + shift) % 1;
          if (t < 0.4) {
            // Hot pink to purple
            const p = t / 0.4;
            return {
              r: Math.round(255 - (255 - 123) * p),
              g: Math.round(41 - (41 - 47) * p),
              b: Math.round(117 + (190 - 117) * p)
            };
          }
          if (t < 0.7) {
            // Purple to cyan
            const p = (t - 0.4) / 0.3;
            return {
              r: Math.round(123 - 123 * p),
              g: Math.round(47 + (240 - 47) * p),
              b: Math.round(190 + (255 - 190) * p)
            };
          }
          // Cyan back to hot pink
          const p = (t - 0.7) / 0.3;
          return {
            r: Math.round(0 + 255 * p),
            g: Math.round(240 - (240 - 41) * p),
            b: Math.round(255 - (255 - 117) * p)
          };
        }

        if (preset === 'halloween') {
          // Flickering between orange, purple, and eerie green
          const flicker = Math.sin(Date.now() / 300 + i * 0.5);
          if (i % 5 === 0) {
            // Eerie green accent bars
            return { r: 57, g: 255, b: 20 };  // #39FF14
          }
          if (flicker > 0.3) {
            return { r: 255, g: 102, b: 0 };   // Orange #FF6600
          }
          return { r: 139, g: 0, b: 204 };     // Purple #8B00CC
        }

        if (preset === 'christmas') {
          if (i % 8 === 0) {
            return { r: 255, g: 215, b: 0 }; // Gold
          }
          if (i % 2 === 0) {
            return { r: 196, g: 30, b: 58 }; // Red
          }
          return { r: 45, g: 90, b: 39 }; // Green
        }

        if (preset === 'rgb') {
          const hueOffset = (Date.now() / 20) % 360;
          const hue = (hueOffset + (i / barCount) * 360) % 360;
          // HSL to RGB conversion
          const s = 1, l = 0.5;
          const c = (1 - Math.abs(2 * l - 1)) * s;
          const x2 = c * (1 - Math.abs((hue / 60) % 2 - 1));
          const m = l - c / 2;
          let rr, gg, bb;
          if (hue < 60) { rr = c; gg = x2; bb = 0; }
          else if (hue < 120) { rr = x2; gg = c; bb = 0; }
          else if (hue < 180) { rr = 0; gg = c; bb = x2; }
          else if (hue < 240) { rr = 0; gg = x2; bb = c; }
          else if (hue < 300) { rr = x2; gg = 0; bb = c; }
          else { rr = c; gg = 0; bb = x2; }
          return {
            r: Math.round((rr + m) * 255),
            g: Math.round((gg + m) * 255),
            b: Math.round((bb + m) * 255)
          };
        }

        // Default: use theme color
        return { r, g, b };
      };

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * dataArray.length);
        const value = dataArray[dataIndex] || 0;
        const barHeight = (value / 255) * maxBarHeight;

        const x = i * (barWidth + 2);
        const y = height / 2 - barHeight;

        const col = getBarColor(i, barCount);
        const colLightR = Math.min(255, col.r + 40);
        const colLightG = Math.min(255, col.g + 40);
        const colLightB = Math.min(255, col.b + 40);
        const colDarkR = Math.max(0, col.r - 50);
        const colDarkG = Math.max(0, col.g - 50);
        const colDarkB = Math.max(0, col.b - 50);

        // Main bar with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, `rgb(${colLightR}, ${colLightG}, ${colLightB})`);
        gradient.addColorStop(0.5, `rgb(${col.r}, ${col.g}, ${col.b})`);
        gradient.addColorStop(1, `rgb(${colDarkR}, ${colDarkG}, ${colDarkB})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Add horizontal lines for segmented effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let j = 0; j < barHeight; j += 4) {
          ctx.fillRect(x, y + j, barWidth, 1);
        }

        // USA preset: draw star dots in the canton area
        if (this.currentThemePreset === 'usa' && i < Math.floor(barCount * 0.4) && i % 3 === 0) {
          const starY = y + barHeight * 0.3;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(x + barWidth / 2, starY, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Reflection (mirrored, faded)
        const reflectionGradient = ctx.createLinearGradient(x, height / 2, x, height / 2 + barHeight * 0.6);
        reflectionGradient.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.4)`);
        reflectionGradient.addColorStop(1, `rgba(${col.r}, ${col.g}, ${col.b}, 0)`);

        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(x, height / 2 + 5, barWidth, barHeight * 0.6);

        // Reflection horizontal lines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        for (let j = 0; j < barHeight * 0.6; j += 4) {
          ctx.fillRect(x, height / 2 + 5 + j, barWidth, 1);
        }
      }

      // Draw center line
      if (this.currentThemePreset === 'barbie') {
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, 'rgba(255, 20, 147, 0.5)');
        lineGrad.addColorStop(0.5, 'rgba(255, 182, 193, 0.5)');
        lineGrad.addColorStop(1, 'rgba(255, 105, 180, 0.5)');
        ctx.fillStyle = lineGrad;
      } else if (this.currentThemePreset === 'synthwave') {
        // Neon pink-purple-cyan center line
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, 'rgba(255, 41, 117, 0.6)');
        lineGrad.addColorStop(0.5, 'rgba(123, 47, 190, 0.6)');
        lineGrad.addColorStop(1, 'rgba(0, 240, 255, 0.6)');
        ctx.fillStyle = lineGrad;
      } else if (this.currentThemePreset === 'halloween') {
        // Orange-purple gradient center line
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, 'rgba(255, 102, 0, 0.5)');
        lineGrad.addColorStop(0.5, 'rgba(57, 255, 20, 0.4)');
        lineGrad.addColorStop(1, 'rgba(139, 0, 204, 0.5)');
        ctx.fillStyle = lineGrad;
      } else if (this.currentThemePreset === 'christmas') {
        // Red-green gradient center line
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, 'rgba(196, 30, 58, 0.5)');
        lineGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.5)');
        lineGrad.addColorStop(1, 'rgba(45, 90, 39, 0.5)');
        ctx.fillStyle = lineGrad;
      } else {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
      }
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
    const shuffleBtn = document.getElementById('viz-shuffle');
    const repeatBtn = document.getElementById('viz-repeat');

    if (playBtn) playBtn.addEventListener('click', () => musicPlayer.togglePlay());
    if (prevBtn) prevBtn.addEventListener('click', () => musicPlayer.playPrevious());
    if (nextBtn) nextBtn.addEventListener('click', () => musicPlayer.playNext());

    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        const isShuffled = musicPlayer.toggleShuffle();
        shuffleBtn.classList.toggle('active', isShuffled);
      });
    }

    if (repeatBtn) {
      repeatBtn.addEventListener('click', () => {
        const mode = musicPlayer.toggleRepeat();
        const label = document.getElementById('viz-repeat-label');
        if (label) {
          label.textContent = mode === 'none' ? 'OFF' : mode === 'all' ? 'ALL' : 'ONE';
        }
        repeatBtn.classList.toggle('active', mode !== 'none');
      });
    }

    // Keyboard shortcuts for music page
    this.musicKeyHandler = (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key.toLowerCase()) {
        case 's':
          // Toggle shuffle
          if (shuffleBtn) {
            const isShuffled = musicPlayer.toggleShuffle();
            shuffleBtn.classList.toggle('active', isShuffled);
          }
          break;
        case 'r':
          // Toggle repeat
          if (repeatBtn) {
            const mode = musicPlayer.toggleRepeat();
            const label = document.getElementById('viz-repeat-label');
            if (label) {
              label.textContent = mode === 'none' ? 'OFF' : mode === 'all' ? 'ALL' : 'ONE';
            }
            repeatBtn.classList.toggle('active', mode !== 'none');
          }
          break;
        case 'l':
          // Toggle track list
          const tracklist = document.getElementById('viz-tracklist');
          if (tracklist) {
            tracklist.classList.toggle('open');
          }
          break;
        case 'escape':
          // Close track list
          const tracklistEsc = document.getElementById('viz-tracklist');
          if (tracklistEsc) {
            tracklistEsc.classList.remove('open');
          }
          break;
        case 'q':
          // Open queue modal
          queueModal.show();
          break;
        case 'p':
          // Open playlists
          this.showPlaylistsPanel();
          break;
      }
    };
    document.addEventListener('keydown', this.musicKeyHandler);

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

    // Artist folder toggles
    document.querySelectorAll('.viz-artist-header').forEach(header => {
      header.addEventListener('click', () => {
        const folder = header.closest('.viz-artist-folder');
        folder.classList.toggle('open');
      });
    });

    // Track list items
    document.querySelectorAll('.viz-track-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on action buttons
        if (e.target.closest('.viz-track-item-actions')) return;

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

    // Add to queue buttons
    document.querySelectorAll('.btn-add-queue').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const track = tracks[index];
        if (track) {
          musicPlayer.addToQueue(track);
          // Visual feedback
          btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
          setTimeout(() => {
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
          }, 1000);
        }
      });
    });

    // Add to playlist buttons
    document.querySelectorAll('.btn-add-playlist').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const trackId = btn.dataset.id;
        playlistModal.show([trackId]);
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

  // ===== PLAYLISTS =====
  showPlaylistsPanel() {
    router.navigate('/playlists');
  }

  async renderPlaylists() {
    this.cleanup();
    const content = document.getElementById('page-content');

    try {
      const playlists = await API.music.getPlaylists();

      content.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Playlists</h1>
          <div class="page-actions">
            <button class="btn btn-primary" id="create-playlist-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Playlist
            </button>
          </div>
        </div>

        ${playlists.length === 0 ? `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <h3>No Playlists Yet</h3>
            <p>Create your first playlist to organize your music</p>
          </div>
        ` : `
          <div class="playlists-grid">
            ${playlists.map(playlist => `
              <div class="playlist-card" data-id="${playlist.id}">
                <div class="playlist-card-cover">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 18V5l12-2v13"/>
                    <circle cx="6" cy="18" r="3"/>
                    <circle cx="18" cy="16" r="3"/>
                  </svg>
                </div>
                <div class="playlist-card-info">
                  <div class="playlist-card-name">${playlist.name}</div>
                  <div class="playlist-card-count">${playlist.tracks.length} tracks</div>
                </div>
                <button class="playlist-card-delete" data-id="${playlist.id}" title="Delete playlist">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            `).join('')}
          </div>
        `}
      `;

      // Create playlist button
      document.getElementById('create-playlist-btn')?.addEventListener('click', () => {
        const name = prompt('Enter playlist name:');
        if (name && name.trim()) {
          API.music.createPlaylist(name.trim())
            .then(() => this.renderPlaylists())
            .catch(err => alert('Failed to create playlist'));
        }
      });

      // Playlist card click handlers
      document.querySelectorAll('.playlist-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.closest('.playlist-card-delete')) {
            router.navigate(`/playlists/${card.dataset.id}`);
          }
        });
      });

      // Delete playlist buttons
      document.querySelectorAll('.playlist-card-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const playlistId = btn.dataset.id;
          const playlist = playlists.find(p => p.id === playlistId);
          confirmModal.show(playlist.name, async () => {
            try {
              await API.music.deletePlaylist(playlistId);
              this.renderPlaylists();
            } catch (error) {
              console.error('Failed to delete playlist:', error);
            }
          });
        });
      });

    } catch (error) {
      console.error('Failed to load playlists:', error);
      router.showError('Failed to load playlists');
    }
  }

  async renderPlaylist(playlistId) {
    this.cleanup();
    const content = document.getElementById('page-content');

    try {
      const [playlist, allTracks] = await Promise.all([
        API.music.getPlaylist(playlistId),
        API.music.getAll()
      ]);

      // Get full track info for playlist tracks
      const playlistTracks = playlist.tracks
        .map(trackId => allTracks.find(t => t.id === trackId))
        .filter(t => t); // Remove any null tracks

      content.innerHTML = `
        <div class="page-header">
          <button class="btn btn-back" id="back-to-playlists">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <h1 class="page-title">${playlist.name}</h1>
          <div class="page-actions">
            <span class="photo-count">${playlistTracks.length} tracks</span>
            <button class="btn btn-primary" id="play-playlist-btn">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Play All
            </button>
          </div>
        </div>

        ${playlistTracks.length === 0 ? `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
            <h3>Empty Playlist</h3>
            <p>Add tracks from the music page to this playlist</p>
          </div>
        ` : `
          <div class="playlist-tracks">
            ${playlistTracks.map((track, index) => this.renderPlaylistTrack(track, index, playlistId)).join('')}
          </div>
        `}
      `;

      this.currentPlaylistTracks = playlistTracks;
      this.currentPlaylistId = playlistId;

      // Back button
      document.getElementById('back-to-playlists')?.addEventListener('click', () => {
        router.navigate('/playlists');
      });

      // Play all button
      document.getElementById('play-playlist-btn')?.addEventListener('click', () => {
        if (playlistTracks.length > 0) {
          musicPlayer.setQueue(playlistTracks, 0);
        }
      });

      // Track click handlers
      document.querySelectorAll('.playlist-track').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.playlist-track-remove')) return;

          const index = parseInt(item.dataset.index);
          musicPlayer.setQueue(playlistTracks, index);
        });
      });

      // Remove from playlist buttons
      document.querySelectorAll('.playlist-track-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const trackId = btn.dataset.id;
          try {
            await API.music.removeFromPlaylist(playlistId, [trackId]);
            this.renderPlaylist(playlistId);
          } catch (error) {
            console.error('Failed to remove track:', error);
          }
        });
      });

    } catch (error) {
      console.error('Failed to load playlist:', error);
      router.showError('Failed to load playlist');
    }
  }

  renderPlaylistTrack(track, index, playlistId) {
    const title = track.metadata?.title || track.name;
    const artist = track.metadata?.artist || 'Unknown Artist';
    const duration = track.metadata?.duration ? this.formatDuration(track.metadata.duration) : '--:--';

    return `
      <div class="playlist-track" data-index="${index}" data-id="${track.id}">
        <span class="playlist-track-num">${String(index + 1).padStart(2, '0')}</span>
        <div class="playlist-track-thumb">
          ${track.metadata?.hasCover ?
            `<img src="${API.music.getCoverUrl(track.id)}" alt="">` :
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>`
          }
        </div>
        <div class="playlist-track-info">
          <div class="playlist-track-title">${title}</div>
          <div class="playlist-track-artist">${artist}</div>
        </div>
        <span class="playlist-track-duration">${duration}</span>
        <button class="playlist-track-remove" data-id="${track.id}" title="Remove from playlist">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }

  // ===== PHOTOS =====
  async renderPhotos() {
    this.cleanup();
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
        <img src="${API.photos.getThumbUrl(photo.id)}" alt="${photo.name}" loading="lazy">
        <div class="photo-item-info">${photo.name}</div>
      </div>
    `;
  }

  attachPhotoClickHandlers() {
    document.querySelectorAll('.photo-grid-item').forEach(item => {
      item.addEventListener('click', () => {
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
    this.cleanup();
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
    this.cleanup();
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
          <h3 class="settings-section-title">Appearance</h3>
          <div class="settings-row">
            <div class="settings-label">
              Theme Presets
              <small>Quick theme presets with custom visualizer effects</small>
            </div>
            <div class="preset-selector">
              ${Object.entries(App.THEME_PRESETS).map(([key, preset]) => `
                <button class="preset-btn ${settings.theme?.preset === key ? 'active' : ''}" data-preset="${key}">
                  <span class="preset-btn-emoji">${preset.emoji}</span>
                  <span class="preset-btn-label">${preset.label}</span>
                </button>
              `).join('')}
              <button class="preset-btn ${!settings.theme?.preset ? 'active' : ''}" data-preset="custom">
                <span class="preset-btn-emoji">\u{1F3A8}</span>
                <span class="preset-btn-label">Custom</span>
              </button>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-label">
              Accent Color
              <small>Main theme color for the interface</small>
            </div>
            <div class="color-picker-wrapper">
              <input type="color" class="color-picker-input" id="accent-color" value="${settings.theme?.accentColor || '#ff0a0a'}">
              <input type="text" class="settings-input color-hex-input" id="accent-color-hex" value="${settings.theme?.accentColor || '#ff0a0a'}" placeholder="#ff0a0a">
              <button class="btn btn-secondary" id="reset-color-btn">Reset</button>
            </div>
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

      // Color picker handlers
      const colorPicker = document.getElementById('accent-color');
      const colorHexInput = document.getElementById('accent-color-hex');
      const resetColorBtn = document.getElementById('reset-color-btn');
      const defaultColor = '#ff0a0a';

      const saveAndApplyColor = async (color) => {
        this.applyThemeColor(color);
        try {
          await API.settings.update({ theme: { accentColor: color, preset: null } });
        } catch (error) {
          console.error('Failed to save color:', error);
        }
      };

      // Preset button handlers
      const updatePresetButtons = (activePreset) => {
        document.querySelectorAll('.preset-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.preset === activePreset);
        });
      };

      const deselectPreset = () => {
        this.currentThemePreset = null;
        this.clearPresetMultiColor();
        updatePresetButtons('custom');
      };

      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const preset = btn.dataset.preset;
          if (preset === 'custom') {
            this.currentThemePreset = null;
            this.clearPresetMultiColor();
            const color = colorPicker.value;
            this.applyThemeColor(color);
            updatePresetButtons('custom');
            try {
              await API.settings.update({ theme: { accentColor: color, preset: null } });
            } catch (error) {
              console.error('Failed to save preset:', error);
            }
          } else {
            this.applyPresetTheme(preset);
            const presetDef = App.THEME_PRESETS[preset];
            colorPicker.value = presetDef.secondary;
            colorHexInput.value = presetDef.secondary;
            updatePresetButtons(preset);
            try {
              await API.settings.update({ theme: { accentColor: presetDef.secondary, preset: preset } });
            } catch (error) {
              console.error('Failed to save preset:', error);
            }
          }
        });
      });

      colorPicker.addEventListener('input', (e) => {
        const color = e.target.value;
        colorHexInput.value = color;
        this.applyThemeColor(color);
        deselectPreset();
      });

      colorPicker.addEventListener('change', (e) => {
        deselectPreset();
        saveAndApplyColor(e.target.value);
      });

      colorHexInput.addEventListener('input', (e) => {
        let color = e.target.value;
        if (!color.startsWith('#')) {
          color = '#' + color;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
          colorPicker.value = color;
          this.applyThemeColor(color);
          deselectPreset();
        }
      });

      colorHexInput.addEventListener('change', (e) => {
        let color = e.target.value;
        if (!color.startsWith('#')) {
          color = '#' + color;
        }
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
          deselectPreset();
          saveAndApplyColor(color);
        } else {
          colorHexInput.value = colorPicker.value;
        }
      });

      resetColorBtn.addEventListener('click', () => {
        colorPicker.value = defaultColor;
        colorHexInput.value = defaultColor;
        deselectPreset();
        saveAndApplyColor(defaultColor);
      });

    } catch (error) {
      console.error('Failed to load settings:', error);
      router.showError('Failed to load settings');
    }
  }

  // ===== ALBUMS =====
  async renderAlbums() {
    this.cleanup();
    const content = document.getElementById('page-content');

    try {
      const albums = await API.albums.getAll();
      const people = await API.photos.getAllPeople();

      content.innerHTML = `
        <div class="page-header">
          <h1 class="page-title">Albums</h1>
          <div class="page-actions">
            <button class="btn btn-primary" id="create-album-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create Album
            </button>
          </div>
        </div>

        ${people.length > 0 ? `
          <div class="people-section">
            <h2 class="section-title">People</h2>
            <div class="people-pills">
              ${people.map(name => `
                <button class="people-pill" data-person="${name}">${name}</button>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="section-title">Your Albums</div>
        ${albums.length === 0 ? `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M2 8h20"/>
            </svg>
            <h3>No Albums Yet</h3>
            <p>Create your first album to organize your photos</p>
          </div>
        ` : `
          <div class="albums-grid">
            ${albums.map(album => `
              <div class="album-card" data-id="${album.id}">
                <div class="album-card-cover">
                  ${album.coverPhotoId ? `
                    <img src="${API.photos.getThumbUrl(album.coverPhotoId)}" alt="${album.name}">
                  ` : `
                    <div class="album-card-empty">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                    </div>
                  `}
                </div>
                <div class="album-card-info">
                  <div class="album-card-name">${album.name}</div>
                  <div class="album-card-count">${album.photoIds.length} photos</div>
                </div>
                <button class="album-delete-btn" data-id="${album.id}" title="Delete album">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            `).join('')}
          </div>
        `}
      `;

      // Create album button
      document.getElementById('create-album-btn')?.addEventListener('click', () => {
        this.showCreateAlbumDialog();
      });

      // Album card click handlers
      document.querySelectorAll('.album-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (!e.target.closest('.album-delete-btn')) {
            router.navigate(`/albums/${card.dataset.id}`);
          }
        });
      });

      // Delete album buttons
      document.querySelectorAll('.album-delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const albumId = btn.dataset.id;
          const album = albums.find(a => a.id === albumId);
          confirmModal.show(album.name, async () => {
            try {
              await API.albums.delete(albumId);
              this.renderAlbums();
            } catch (error) {
              console.error('Failed to delete album:', error);
            }
          });
        });
      });

      // People pill click handlers
      document.querySelectorAll('.people-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          this.showPhotosByPerson(pill.dataset.person);
        });
      });

    } catch (error) {
      console.error('Failed to load albums:', error);
      router.showError('Failed to load albums');
    }
  }

  showCreateAlbumDialog() {
    const name = prompt('Enter album name:');
    if (name && name.trim()) {
      API.albums.create(name.trim())
        .then(() => this.renderAlbums())
        .catch(err => alert('Failed to create album'));
    }
  }

  async showPhotosByPerson(personName) {
    const content = document.getElementById('page-content');
    router.showLoading();

    try {
      const photos = await API.photos.getByPerson(personName);

      // Add global index to each photo
      photos.forEach((photo, index) => {
        photo.globalIndex = index;
      });

      this.photos = photos;

      content.innerHTML = `
        <div class="page-header">
          <button class="btn btn-back" id="back-to-albums">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <h1 class="page-title">Photos of ${personName}</h1>
          <div class="page-actions">
            <span class="photo-count">${photos.length} photos</span>
          </div>
        </div>

        ${photos.length === 0 ? `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <h3>No Photos</h3>
            <p>No photos tagged with ${personName}</p>
          </div>
        ` : `
          <div class="photo-grid" id="person-photos-container">
            ${photos.map((photo, index) => `
              <div class="photo-grid-item" data-id="${photo.id}" data-index="${index}">
                <img src="${API.photos.getThumbUrl(photo.id)}" alt="${photo.name}" loading="lazy">
              </div>
            `).join('')}
          </div>
        `}
      `;

      // Back button
      document.getElementById('back-to-albums')?.addEventListener('click', () => {
        router.navigate('/albums');
      });

      // Photo click handlers
      document.querySelectorAll('.photo-grid-item').forEach(item => {
        item.addEventListener('click', () => {
          const index = parseInt(item.dataset.index);
          lightbox.open(this.photos, index);
        });
      });

    } catch (error) {
      console.error('Failed to load photos:', error);
      router.showError('Failed to load photos');
    }
  }

  async renderAlbum(albumId) {
    this.cleanup();
    const content = document.getElementById('page-content');

    try {
      const album = await API.albums.get(albumId);

      // Add global index to each photo
      album.photos.forEach((photo, index) => {
        photo.globalIndex = index;
      });

      this.photos = album.photos;
      this.currentAlbum = album;

      content.innerHTML = `
        <div class="page-header">
          <button class="btn btn-back" id="back-to-albums">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>
          <h1 class="page-title">${album.name}</h1>
          <div class="page-actions">
            <span class="photo-count">${album.photos.length} photos</span>
          </div>
        </div>

        ${album.photos.length === 0 ? `
          <div class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <h3>No Photos</h3>
            <p>This album is empty. Open photos and use the album button to add them here.</p>
          </div>
        ` : `
          <div class="photo-grid" id="album-photos-container">
            ${album.photos.map((photo, index) => `
              <div class="photo-grid-item" data-id="${photo.id}" data-index="${index}">
                <img src="${API.photos.getThumbUrl(photo.id)}" alt="${photo.name}" loading="lazy">
                <button class="photo-remove-btn" data-id="${photo.id}" title="Remove from album">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            `).join('')}
          </div>
        `}
      `;

      // Back button
      document.getElementById('back-to-albums')?.addEventListener('click', () => {
        router.navigate('/albums');
      });

      // Photo click handlers
      document.querySelectorAll('.photo-grid-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (!e.target.closest('.photo-remove-btn')) {
            const index = parseInt(item.dataset.index);
            lightbox.open(this.photos, index);
          }
        });
      });

      // Remove from album buttons
      document.querySelectorAll('.photo-remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await API.albums.removePhotos(albumId, [btn.dataset.id]);
            this.renderAlbum(albumId);
          } catch (error) {
            console.error('Failed to remove photo:', error);
          }
        });
      });

    } catch (error) {
      console.error('Failed to load album:', error);
      router.showError('Failed to load album');
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
