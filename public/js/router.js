// Client-side Router - Carmine Media Server

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;

    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  // Register a route
  register(path, handler) {
    this.routes[path] = handler;
  }

  // Navigate to a route
  navigate(path) {
    window.location.hash = path;
  }

  // Handle route change
  async handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const [path, ...params] = hash.split('/').filter(Boolean);
    const routePath = '/' + (path || '');

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      const route = item.dataset.route;
      item.classList.toggle('active', route === (path || 'home'));
    });

    // Find and execute route handler
    const handler = this.routes[routePath] || this.routes['/'];
    if (handler) {
      this.currentRoute = routePath;
      try {
        await handler(params);
      } catch (error) {
        console.error('Route error:', error);
        this.showError('Failed to load page');
      }
    }
  }

  // Show error message
  showError(message) {
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  }

  // Show loading state
  showLoading() {
    const content = document.getElementById('page-content');
    content.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
      </div>
    `;
  }
}

// Create global router instance
window.router = new Router();
