// API Communication Layer - Carmine Media Server

const API = {
  // Base fetch wrapper with error handling
  async fetch(endpoint, options = {}) {
    try {
      const response = await fetch(`/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }

      return response.json();
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  },

  // Videos
  videos: {
    async getAll() {
      return API.fetch('/videos');
    },

    async get(id) {
      return API.fetch(`/videos/${id}`);
    },

    async delete(id) {
      return API.fetch(`/videos/${id}`, { method: 'DELETE' });
    },

    getStreamUrl(id) {
      return `/api/videos/${id}/stream`;
    },

    getThumbUrl(id) {
      return `/api/videos/${id}/thumb`;
    },

    // Categories
    async getCategories() {
      return API.fetch('/videos/categories');
    },

    async getByCategory(categoryId) {
      return API.fetch(`/videos/categories/${categoryId}`);
    },

    async setCategory(videoId, categoryId) {
      return API.fetch(`/videos/${videoId}/category`, {
        method: 'PUT',
        body: JSON.stringify({ categoryId })
      });
    },

    async getCategory(videoId) {
      return API.fetch(`/videos/${videoId}/category`);
    },

    // TV Shows
    async getTVShows() {
      return API.fetch('/videos/tvshows');
    },

    async getTVShowEpisodes(showId) {
      return API.fetch(`/videos/tvshows/${showId}/episodes`);
    }
  },

  // Music
  music: {
    async getAll() {
      return API.fetch('/music');
    },

    async get(id) {
      return API.fetch(`/music/${id}`);
    },

    async delete(id) {
      return API.fetch(`/music/${id}`, { method: 'DELETE' });
    },

    getStreamUrl(id) {
      return `/api/music/${id}/stream`;
    },

    getCoverUrl(id) {
      return `/api/music/${id}/cover`;
    },

    async getPlaylists() {
      return API.fetch('/music/playlists/all');
    },

    async getPlaylist(id) {
      return API.fetch(`/music/playlists/${id}`);
    },

    async createPlaylist(name, tracks = []) {
      return API.fetch('/music/playlists', {
        method: 'POST',
        body: JSON.stringify({ name, tracks })
      });
    },

    async updatePlaylist(id, data) {
      return API.fetch(`/music/playlists/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async addToPlaylist(playlistId, trackIds) {
      return API.fetch(`/music/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ trackIds })
      });
    },

    async removeFromPlaylist(playlistId, trackIds) {
      return API.fetch(`/music/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        body: JSON.stringify({ trackIds })
      });
    },

    async deletePlaylist(id) {
      return API.fetch(`/music/playlists/${id}`, {
        method: 'DELETE'
      });
    }
  },

  // Photos
  photos: {
    async getAll() {
      return API.fetch('/photos');
    },

    async get(id) {
      return API.fetch(`/photos/${id}`);
    },

    async delete(id) {
      return API.fetch(`/photos/${id}`, { method: 'DELETE' });
    },

    getFullUrl(id) {
      return `/api/photos/${id}/full`;
    },

    getThumbUrl(id) {
      return `/api/photos/${id}/thumb`;
    },

    // People tags
    async getTags(photoId) {
      return API.fetch(`/photos/${photoId}/tags`);
    },

    async setTags(photoId, people) {
      return API.fetch(`/photos/${photoId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ people })
      });
    },

    async getAllPeople() {
      return API.fetch('/photos/tags/people');
    },

    async getByPerson(name) {
      return API.fetch(`/photos/by-person/${encodeURIComponent(name)}`);
    }
  },

  // Albums
  albums: {
    async getAll() {
      return API.fetch('/photos/albums/all');
    },

    async get(albumId) {
      return API.fetch(`/photos/albums/${albumId}`);
    },

    async create(name) {
      return API.fetch('/photos/albums', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
    },

    async update(albumId, data) {
      return API.fetch(`/photos/albums/${albumId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    },

    async delete(albumId) {
      return API.fetch(`/photos/albums/${albumId}`, { method: 'DELETE' });
    },

    async addPhotos(albumId, photoIds) {
      return API.fetch(`/photos/albums/${albumId}/photos`, {
        method: 'POST',
        body: JSON.stringify({ photoIds })
      });
    },

    async removePhotos(albumId, photoIds) {
      return API.fetch(`/photos/albums/${albumId}/photos`, {
        method: 'DELETE',
        body: JSON.stringify({ photoIds })
      });
    },

    getCoverUrl(album) {
      if (album.coverPhotoId) {
        return API.photos.getThumbUrl(album.coverPhotoId);
      }
      return null;
    }
  },

  // Upload
  upload: {
    async uploadFile(file, onProgress) {
      const formData = new FormData();
      formData.append('file', file);

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress((e.loaded / e.total) * 100);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });
    },

    async uploadFiles(files, onProgress) {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress((e.loaded / e.total) * 100);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('POST', '/api/upload/multiple');
        xhr.send(formData);
      });
    }
  },

  // Stats
  async getStats() {
    return API.fetch('/stats');
  },

  // System info
  async getSystem() {
    return API.fetch('/system');
  },

  // Settings
  settings: {
    async get() {
      return API.fetch('/settings');
    },

    async update(settings) {
      return API.fetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
    },

    async addMediaPath(type, path) {
      return API.fetch(`/settings/media/${type}`, {
        method: 'POST',
        body: JSON.stringify({ path })
      });
    },

    async removeMediaPath(type, path) {
      return API.fetch(`/settings/media/${type}`, {
        method: 'DELETE',
        body: JSON.stringify({ path })
      });
    },

    async scan() {
      return API.fetch('/settings/scan', { method: 'POST' });
    }
  }
};

// Export for use in other modules
window.API = API;
