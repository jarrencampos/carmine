// Media Player Controller - Carmine Media Server

class MusicPlayer {
  constructor() {
    this.audio = document.getElementById('audio-player');
    this.queue = [];
    this.originalQueue = []; // For shuffle restore
    this.currentIndex = -1;
    this.isPlaying = false;
    this.volume = 0.7;
    this.shuffle = false;
    this.repeat = 'none'; // 'none', 'all', 'one'
    this.allTracks = []; // Cache of all tracks for random play

    // Web Audio API for visualizer
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.animationId = null;

    // DOM elements
    this.elements = {
      artwork: document.getElementById('player-artwork'),
      title: document.getElementById('player-title'),
      artist: document.getElementById('player-artist'),
      btnPlay: document.getElementById('btn-play'),
      btnPrev: document.getElementById('btn-prev'),
      btnNext: document.getElementById('btn-next'),
      btnMute: document.getElementById('btn-mute'),
      progressBar: document.getElementById('progress-bar'),
      progressFill: document.getElementById('progress-fill'),
      progressHandle: document.getElementById('progress-handle'),
      progressCurrent: document.getElementById('progress-current'),
      progressDuration: document.getElementById('progress-duration'),
      volumeSlider: document.getElementById('volume-slider'),
      volumeFill: document.getElementById('volume-fill'),
      equalizer: document.getElementById('equalizer')
    };

    this.init();
  }

  init() {
    // Set initial volume
    this.audio.volume = this.volume;
    this.updateVolumeUI();

    // Initialize Web Audio API for visualizer
    this.initAudioContext();

    // Setup Media Session API for iOS lock screen playback
    this.initMediaSession();

    // Audio events
    this.audio.addEventListener('timeupdate', () => {
      this.updateProgress();
      this.updatePositionState();
    });
    this.audio.addEventListener('loadedmetadata', () => {
      this.updateDuration();
      this.updatePositionState();
    });
    this.audio.addEventListener('ended', () => this.playNext());
    this.audio.addEventListener('play', () => {
      this.setPlayingState(true);
      this.startVisualizer();
    });
    this.audio.addEventListener('pause', () => {
      this.setPlayingState(false);
      this.stopVisualizer();
    });

    // Control events
    this.elements.btnPlay.addEventListener('click', () => this.togglePlay());
    this.elements.btnPrev.addEventListener('click', () => this.playPrevious());
    this.elements.btnNext.addEventListener('click', () => this.playNext());
    this.elements.btnMute.addEventListener('click', () => this.toggleMute());

    // Queue button
    const queueBtn = document.getElementById('btn-queue');
    if (queueBtn) {
      queueBtn.addEventListener('click', () => queueModal.show());
    }

    // Progress bar click
    this.elements.progressBar.addEventListener('click', (e) => {
      const rect = this.elements.progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      this.audio.currentTime = percent * this.audio.duration;
    });

    // Volume slider click
    this.elements.volumeSlider.addEventListener('click', (e) => {
      const rect = this.elements.volumeSlider.getBoundingClientRect();
      this.volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.audio.volume = this.volume;
      this.audio.muted = false;
      this.updateVolumeUI();
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
          this.audio.currentTime -= 10;
          break;
        case 'ArrowRight':
          this.audio.currentTime += 10;
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.volume = Math.min(1, this.volume + 0.1);
          this.audio.volume = this.volume;
          this.updateVolumeUI();
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.volume = Math.max(0, this.volume - 0.1);
          this.audio.volume = this.volume;
          this.updateVolumeUI();
          break;
      }
    });

    // Preload tracks for random play
    this.loadAllTracks();
  }

  // Initialize Media Session API for iOS/mobile lock screen controls
  initMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        this.audio.currentTime = Math.max(0, this.audio.currentTime - (details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + (details.seekOffset || 10));
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in this.audio) {
          this.audio.fastSeek(details.seekTime);
        } else {
          this.audio.currentTime = details.seekTime;
        }
        this.updatePositionState();
      });
    }
  }

  // Update Media Session metadata (shown on lock screen)
  updateMediaSessionMetadata(track) {
    if ('mediaSession' in navigator) {
      const title = track.metadata?.title || track.name;
      const artist = track.metadata?.artist || 'Unknown Artist';
      const album = track.metadata?.album || 'Unknown Album';

      const artwork = [];
      if (track.metadata?.hasCover) {
        artwork.push({
          src: API.music.getCoverUrl(track.id),
          sizes: '512x512',
          type: 'image/jpeg'
        });
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artist: artist,
        album: album,
        artwork: artwork
      });
    }
  }

  // Update position state for lock screen progress bar
  updatePositionState() {
    if ('mediaSession' in navigator && this.audio.duration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration,
          playbackRate: this.audio.playbackRate,
          position: this.audio.currentTime
        });
      } catch (e) {
        // Position state not supported or invalid state
      }
    }
  }

  // Load all tracks for random play feature
  async loadAllTracks() {
    try {
      this.allTracks = await API.music.getAll();
    } catch (e) {
      console.log('Could not preload tracks');
    }
  }

  // Play a random song from the library
  async playRandomSong() {
    try {
      // Refresh tracks if needed
      if (this.allTracks.length === 0) {
        this.allTracks = await API.music.getAll();
      }

      if (this.allTracks.length === 0) {
        console.log('No music in library');
        return;
      }

      // Pick a random starting index
      const randomIndex = Math.floor(Math.random() * this.allTracks.length);

      // Set the queue with all tracks starting from random position
      this.setQueue(this.allTracks, randomIndex);
    } catch (error) {
      console.error('Failed to play random song:', error);
    }
  }

  // Load and play a track
  play(track) {
    this.audio.src = API.music.getStreamUrl(track.id);
    this.audio.play();

    // Update UI
    this.elements.title.textContent = track.metadata?.title || track.name;
    this.elements.artist.textContent = track.metadata?.artist || 'Unknown Artist';

    // Update artwork
    if (track.metadata?.hasCover) {
      this.elements.artwork.innerHTML = `<img src="${API.music.getCoverUrl(track.id)}" alt="Album Art">`;
    } else {
      this.elements.artwork.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
      `;
    }

    // Update Media Session for lock screen controls
    this.updateMediaSessionMetadata(track);
  }

  // Set queue and play
  setQueue(tracks, startIndex = 0) {
    this.queue = [...tracks];
    this.originalQueue = [...tracks];
    this.currentIndex = startIndex;
    if (this.shuffle) {
      const currentTrack = this.queue[startIndex];
      this.queue = this.shuffleArray([...this.queue]);
      const newIndex = this.queue.indexOf(currentTrack);
      if (newIndex !== 0) {
        this.queue.splice(newIndex, 1);
        this.queue.unshift(currentTrack);
      }
      this.currentIndex = 0;
    }
    if (tracks.length > 0) {
      this.play(this.queue[this.currentIndex]);
    }
  }

  // Add to queue (at end)
  addToQueue(track) {
    this.queue.push(track);
    this.originalQueue.push(track);
    if (this.queue.length === 1) {
      this.currentIndex = 0;
      this.play(track);
    }
  }

  // Add to play next (after current track)
  playNextInQueue(track) {
    if (this.queue.length === 0) {
      this.addToQueue(track);
    } else {
      this.queue.splice(this.currentIndex + 1, 0, track);
      this.originalQueue.splice(this.currentIndex + 1, 0, track);
    }
  }

  // Get the current queue
  getQueue() {
    return {
      tracks: this.queue,
      currentIndex: this.currentIndex,
      currentTrack: this.queue[this.currentIndex] || null
    };
  }

  // Remove track from queue by index
  removeFromQueue(index) {
    if (index < 0 || index >= this.queue.length) return;

    this.queue.splice(index, 1);

    // Adjust current index if needed
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      // If removing current track, play next or stop
      if (this.queue.length === 0) {
        this.audio.pause();
        this.currentIndex = -1;
      } else {
        this.currentIndex = Math.min(this.currentIndex, this.queue.length - 1);
        this.play(this.queue[this.currentIndex]);
      }
    }
  }

  // Move track in queue
  moveInQueue(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.queue.length) return;
    if (toIndex < 0 || toIndex >= this.queue.length) return;

    const track = this.queue.splice(fromIndex, 1)[0];
    this.queue.splice(toIndex, 0, track);

    // Adjust current index
    if (fromIndex === this.currentIndex) {
      this.currentIndex = toIndex;
    } else if (fromIndex < this.currentIndex && toIndex >= this.currentIndex) {
      this.currentIndex--;
    } else if (fromIndex > this.currentIndex && toIndex <= this.currentIndex) {
      this.currentIndex++;
    }
  }

  // Clear queue except current track
  clearQueue() {
    if (this.currentIndex >= 0 && this.queue[this.currentIndex]) {
      const currentTrack = this.queue[this.currentIndex];
      this.queue = [currentTrack];
      this.originalQueue = [currentTrack];
      this.currentIndex = 0;
    } else {
      this.queue = [];
      this.originalQueue = [];
      this.currentIndex = -1;
    }
  }

  // Play track at specific queue index
  playAtIndex(index) {
    if (index >= 0 && index < this.queue.length) {
      this.currentIndex = index;
      this.play(this.queue[index]);
    }
  }

  togglePlay() {
    // If no track is loaded, play a random song
    if (!this.audio.src || this.queue.length === 0) {
      this.playRandomSong();
      return;
    }

    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  playNext() {
    if (this.repeat === 'one') {
      // Repeat current track
      this.audio.currentTime = 0;
      this.audio.play();
    } else if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      this.play(this.queue[this.currentIndex]);
    } else if (this.repeat === 'all' && this.queue.length > 0) {
      // Loop back to start
      this.currentIndex = 0;
      this.play(this.queue[0]);
    }
  }

  playPrevious() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
    } else if (this.currentIndex > 0) {
      this.currentIndex--;
      this.play(this.queue[this.currentIndex]);
    }
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    if (this.shuffle) {
      // Save original order and shuffle
      this.originalQueue = [...this.queue];
      const currentTrack = this.queue[this.currentIndex];
      this.queue = this.shuffleArray([...this.queue]);
      // Keep current track at current position
      const newIndex = this.queue.indexOf(currentTrack);
      if (newIndex !== this.currentIndex) {
        this.queue.splice(newIndex, 1);
        this.queue.splice(this.currentIndex, 0, currentTrack);
      }
    } else {
      // Restore original order
      const currentTrack = this.queue[this.currentIndex];
      this.queue = [...this.originalQueue];
      this.currentIndex = this.queue.indexOf(currentTrack);
    }
    return this.shuffle;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  toggleRepeat() {
    const modes = ['none', 'all', 'one'];
    const currentModeIndex = modes.indexOf(this.repeat);
    this.repeat = modes[(currentModeIndex + 1) % modes.length];
    return this.repeat;
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    this.updateVolumeUI();
  }

  setPlayingState(playing) {
    this.isPlaying = playing;
    const playIcon = this.elements.btnPlay.querySelector('.icon-play');
    const pauseIcon = this.elements.btnPlay.querySelector('.icon-pause');

    if (playing) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      this.elements.btnPlay.classList.add('playing');
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      this.elements.btnPlay.classList.remove('playing');
    }

    // Update Media Session playback state for lock screen
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }

  updateProgress() {
    const percent = (this.audio.currentTime / this.audio.duration) * 100 || 0;
    this.elements.progressFill.style.width = `${percent}%`;
    this.elements.progressCurrent.textContent = this.formatTime(this.audio.currentTime);
  }

  updateDuration() {
    this.elements.progressDuration.textContent = this.formatTime(this.audio.duration);
  }

  updateVolumeUI() {
    const volume = this.audio.muted ? 0 : this.volume;
    this.elements.volumeFill.style.width = `${volume * 100}%`;

    const volumeIcon = this.elements.btnMute.querySelector('.icon-volume');
    const muteIcon = this.elements.btnMute.querySelector('.icon-mute');

    if (this.audio.muted || volume === 0) {
      volumeIcon.style.display = 'none';
      muteIcon.style.display = 'block';
    } else {
      volumeIcon.style.display = 'block';
      muteIcon.style.display = 'none';
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Detect iOS/iPadOS
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  // Web Audio API Visualizer
  // Skip on iOS - createMediaElementSource routes audio through AudioContext,
  // and iOS suspends AudioContext when the browser is backgrounded, killing playback.
  initAudioContext() {
    if (this.isIOS()) {
      console.log('iOS detected - skipping Web Audio API to preserve background playback');
      return;
    }

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64; // 32 frequency bins
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect audio element to analyser
      this.source = this.audioContext.createMediaElementSource(this.audio);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Mark equalizer as realtime
      if (this.elements.equalizer) {
        this.elements.equalizer.classList.add('realtime');
      }
    } catch (e) {
      console.log('Web Audio API not supported, using CSS animation fallback');
    }
  }

  startVisualizer() {
    if (this.elements.equalizer) {
      this.elements.equalizer.classList.add('playing');
    }

    // Resume audio context if suspended (required for some browsers)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Start animation loop if we have Web Audio API
    if (this.analyser && this.dataArray) {
      this.updateVisualizer();
    }
  }

  stopVisualizer() {
    if (this.elements.equalizer) {
      this.elements.equalizer.classList.remove('playing');
    }

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Reset bars to minimum height
    if (this.elements.equalizer) {
      const bars = this.elements.equalizer.querySelectorAll('.eq-bar');
      bars.forEach(bar => {
        bar.style.height = '3px';
        bar.classList.remove('peak');
      });
    }
  }

  updateVisualizer() {
    if (!this.isPlaying) return;

    this.animationId = requestAnimationFrame(() => this.updateVisualizer());

    if (!this.analyser || !this.dataArray || !this.elements.equalizer) return;

    this.analyser.getByteFrequencyData(this.dataArray);

    const bars = this.elements.equalizer.querySelectorAll('.eq-bar');
    const barCount = bars.length;
    const binCount = this.dataArray.length;

    // Map frequency bins to equalizer bars
    bars.forEach((bar, i) => {
      // Get the frequency value for this bar
      // Weight towards lower frequencies (more bass response like 80s visualizers)
      const binIndex = Math.floor((i / barCount) * binCount * 0.8);
      const value = this.dataArray[binIndex];

      // Convert to percentage (0-255 -> 5-100%)
      const percent = Math.max(5, (value / 255) * 100);

      bar.style.height = `${percent}%`;

      // Add peak indicator for high values
      if (percent > 85) {
        bar.classList.add('peak');
      } else {
        bar.classList.remove('peak');
      }
    });
  }
}

// Video Player Controller
class VideoPlayer {
  constructor() {
    this.modal = document.getElementById('video-modal');
    this.backdrop = document.getElementById('video-modal-backdrop');
    this.closeBtn = document.getElementById('video-modal-close');
    this.video = document.getElementById('video-player');
    this.currentVideo = null;

    this.init();
  }

  init() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());

    // Video event listeners
    this.video.addEventListener('ended', () => this.onEnded());
    this.video.addEventListener('play', () => this.onPlay());
    this.video.addEventListener('pause', () => this.onPause());

    document.addEventListener('keydown', (e) => {
      if (!this.modal.classList.contains('active')) return;

      switch (e.key) {
        case 'Escape':
          this.close();
          break;
        case ' ':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
        case 'ArrowLeft':
          this.video.currentTime -= 10;
          break;
        case 'ArrowRight':
          this.video.currentTime += 10;
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.video.volume = Math.min(1, this.video.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.video.volume = Math.max(0, this.video.volume - 0.1);
          break;
      }
    });

    // Double-click to toggle fullscreen
    this.video.addEventListener('dblclick', () => this.toggleFullscreen());
  }

  play(videoData) {
    this.currentVideo = videoData;
    this.video.src = API.videos.getStreamUrl(videoData.id);
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.video.play();
  }

  // Immersive mode - same as play but with extra styling
  playImmersive(videoData) {
    this.currentVideo = videoData;
    this.video.src = API.videos.getStreamUrl(videoData.id);
    this.modal.classList.add('active', 'immersive');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('video-playing');

    // Update title if element exists
    const titleEl = this.modal.querySelector('.video-modal-title');
    if (titleEl) {
      titleEl.textContent = videoData.name.replace(/\.[^/.]+$/, '').replace(/[._-]/g, ' ');
    }

    this.video.play();

    // Try to enter fullscreen on mobile
    if (window.innerWidth <= 768) {
      this.tryFullscreen();
    }
  }

  close() {
    this.video.pause();
    this.video.src = '';
    this.modal.classList.remove('active', 'immersive');
    document.body.style.overflow = '';
    document.body.classList.remove('video-playing');

    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  togglePlay() {
    if (this.video.paused) {
      this.video.play();
    } else {
      this.video.pause();
    }
  }

  toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      this.tryFullscreen();
    }
  }

  tryFullscreen() {
    const element = this.modal;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (this.video.webkitEnterFullscreen) {
      // iOS Safari
      this.video.webkitEnterFullscreen();
    }
  }

  onPlay() {
    // Could add UI updates here
  }

  onPause() {
    // Could add UI updates here
  }

  onEnded() {
    // Could auto-close or show replay option
  }
}

// Photo Lightbox Controller
class Lightbox {
  constructor() {
    this.lightbox = document.getElementById('lightbox');
    this.backdrop = document.getElementById('lightbox-backdrop');
    this.closeBtn = document.getElementById('lightbox-close');
    this.deleteBtn = document.getElementById('lightbox-delete');
    this.albumBtn = document.getElementById('lightbox-album');
    this.prevBtn = document.getElementById('lightbox-prev');
    this.nextBtn = document.getElementById('lightbox-next');
    this.image = document.getElementById('lightbox-image');
    this.info = document.getElementById('lightbox-info');
    this.tagsContainer = document.getElementById('lightbox-tags');
    this.tagsList = document.getElementById('tags-list');
    this.addTagBtn = document.getElementById('btn-add-tag');

    this.photos = [];
    this.currentIndex = 0;
    this.onDelete = null;
    this.currentTags = [];

    this.init();
  }

  init() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.deleteBtn.addEventListener('click', () => this.confirmDelete());
    this.addTagBtn.addEventListener('click', () => this.openTagModal());
    this.albumBtn.addEventListener('click', () => this.openAlbumModal());

    document.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('active')) return;
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case 'Escape':
          this.close();
          break;
        case 'ArrowLeft':
          this.prev();
          break;
        case 'ArrowRight':
          this.next();
          break;
        case 't':
        case 'T':
          this.openTagModal();
          break;
        case 'a':
        case 'A':
          this.openAlbumModal();
          break;
        case 'Delete':
        case 'Backspace':
          this.confirmDelete();
          break;
      }
    });
  }

  open(photos, index = 0, onDelete = null) {
    this.photos = photos;
    this.currentIndex = index;
    this.onDelete = onDelete;
    this.show();
    this.lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  async show() {
    const photo = this.photos[this.currentIndex];
    this.image.src = API.photos.getFullUrl(photo.id);
    this.info.textContent = `${photo.name} (${this.currentIndex + 1} / ${this.photos.length})`;

    this.prevBtn.style.display = this.currentIndex > 0 ? 'flex' : 'none';
    this.nextBtn.style.display = this.currentIndex < this.photos.length - 1 ? 'flex' : 'none';

    // Load tags for current photo
    await this.loadTags();
  }

  async loadTags() {
    const photo = this.photos[this.currentIndex];
    try {
      const result = await API.photos.getTags(photo.id);
      this.currentTags = result.people || [];
      this.renderTags();
    } catch (error) {
      console.error('Failed to load tags:', error);
      this.currentTags = [];
      this.renderTags();
    }
  }

  renderTags() {
    if (this.currentTags.length === 0) {
      this.tagsList.innerHTML = '<span class="no-tags">No people tagged</span>';
    } else {
      this.tagsList.innerHTML = this.currentTags.map(name => `
        <span class="tag-pill" data-name="${name}">
          ${name}
          <button class="tag-remove" data-name="${name}">&times;</button>
        </span>
      `).join('');

      // Add remove handlers
      this.tagsList.querySelectorAll('.tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeTag(btn.dataset.name);
        });
      });
    }
  }

  async removeTag(name) {
    const photo = this.photos[this.currentIndex];
    const newTags = this.currentTags.filter(t => t !== name);

    try {
      await API.photos.setTags(photo.id, newTags);
      this.currentTags = newTags;
      this.renderTags();
    } catch (error) {
      console.error('Failed to remove tag:', error);
    }
  }

  openTagModal() {
    tagModal.show(this.currentTags, async (newName) => {
      await this.addTag(newName);
    });
  }

  async addTag(name) {
    if (!name || this.currentTags.includes(name)) return;

    const photo = this.photos[this.currentIndex];
    const newTags = [...this.currentTags, name];

    try {
      await API.photos.setTags(photo.id, newTags);
      this.currentTags = newTags;
      this.renderTags();
    } catch (error) {
      console.error('Failed to add tag:', error);
    }
  }

  openAlbumModal() {
    const photo = this.photos[this.currentIndex];
    albumModal.show([photo.id]);
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.show();
    }
  }

  next() {
    if (this.currentIndex < this.photos.length - 1) {
      this.currentIndex++;
      this.show();
    }
  }

  confirmDelete() {
    const photo = this.photos[this.currentIndex];
    confirmModal.show(photo.name, async () => {
      await this.deleteCurrentPhoto();
    });
  }

  async deleteCurrentPhoto() {
    const photo = this.photos[this.currentIndex];

    try {
      await API.photos.delete(photo.id);

      // Remove from array
      this.photos.splice(this.currentIndex, 1);

      // Call the onDelete callback if provided
      if (this.onDelete) {
        this.onDelete(photo, this.currentIndex);
      }

      // Handle navigation after delete
      if (this.photos.length === 0) {
        this.close();
      } else {
        if (this.currentIndex >= this.photos.length) {
          this.currentIndex = this.photos.length - 1;
        }
        this.show();
      }
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('Failed to delete photo. Please try again.');
    }
  }
}

// Tag Modal Controller
class TagModal {
  constructor() {
    this.modal = document.getElementById('tag-modal');
    this.backdrop = document.getElementById('tag-modal-backdrop');
    this.input = document.getElementById('tag-input');
    this.suggestions = document.getElementById('tag-suggestions');
    this.cancelBtn = document.getElementById('tag-cancel');
    this.saveBtn = document.getElementById('tag-save');

    this.onSave = null;
    this.allPeople = [];
    this.existingTags = [];

    this.init();
  }

  init() {
    this.backdrop.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.saveBtn.addEventListener('click', () => this.save());

    this.input.addEventListener('input', () => this.updateSuggestions());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.save();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  async show(existingTags, onSave) {
    this.existingTags = existingTags || [];
    this.onSave = onSave;
    this.input.value = '';
    this.suggestions.innerHTML = '';

    // Load all people for autocomplete
    try {
      this.allPeople = await API.photos.getAllPeople();
    } catch (e) {
      this.allPeople = [];
    }

    this.modal.classList.add('active');
    setTimeout(() => this.input.focus(), 100);
  }

  close() {
    this.modal.classList.remove('active');
    this.onSave = null;
  }

  save() {
    const name = this.input.value.trim();
    if (name && this.onSave) {
      this.onSave(name);
    }
    this.close();
  }

  updateSuggestions() {
    const query = this.input.value.toLowerCase().trim();

    if (!query) {
      this.suggestions.innerHTML = '';
      return;
    }

    const matches = this.allPeople
      .filter(name => name.toLowerCase().includes(query) && !this.existingTags.includes(name))
      .slice(0, 5);

    if (matches.length === 0) {
      this.suggestions.innerHTML = '';
      return;
    }

    this.suggestions.innerHTML = matches.map(name => `
      <div class="tag-suggestion" data-name="${name}">${name}</div>
    `).join('');

    this.suggestions.querySelectorAll('.tag-suggestion').forEach(item => {
      item.addEventListener('click', () => {
        this.input.value = item.dataset.name;
        this.suggestions.innerHTML = '';
        this.save();
      });
    });
  }
}

// Album Modal Controller
class AlbumModal {
  constructor() {
    this.modal = document.getElementById('album-modal');
    this.backdrop = document.getElementById('album-modal-backdrop');
    this.listContainer = document.getElementById('album-list-container');
    this.newAlbumInput = document.getElementById('new-album-name');
    this.createBtn = document.getElementById('btn-create-album');
    this.cancelBtn = document.getElementById('album-cancel');

    this.photoIds = [];

    this.init();
  }

  init() {
    this.backdrop.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.createBtn.addEventListener('click', () => this.createAlbum());

    this.newAlbumInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.createAlbum();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  async show(photoIds) {
    this.photoIds = photoIds;
    this.newAlbumInput.value = '';

    // Load albums
    await this.loadAlbums();

    this.modal.classList.add('active');
  }

  close() {
    this.modal.classList.remove('active');
  }

  async loadAlbums() {
    try {
      const albums = await API.albums.getAll();

      if (albums.length === 0) {
        this.listContainer.innerHTML = '<div class="album-empty">No albums yet. Create one below.</div>';
      } else {
        this.listContainer.innerHTML = albums.map(album => `
          <div class="album-list-item" data-id="${album.id}">
            <div class="album-list-thumb">
              ${album.coverPhotoId ? `<img src="${API.photos.getThumbUrl(album.coverPhotoId)}" alt="">` : `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                </svg>
              `}
            </div>
            <div class="album-list-info">
              <div class="album-list-name">${album.name}</div>
              <div class="album-list-count">${album.photoIds.length} photos</div>
            </div>
            <button class="album-add-btn" data-id="${album.id}">Add</button>
          </div>
        `).join('');

        // Add click handlers
        this.listContainer.querySelectorAll('.album-add-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.addToAlbum(btn.dataset.id);
            btn.textContent = 'Added!';
            btn.disabled = true;
            setTimeout(() => {
              btn.textContent = 'Add';
              btn.disabled = false;
            }, 1500);
          });
        });
      }
    } catch (error) {
      console.error('Failed to load albums:', error);
      this.listContainer.innerHTML = '<div class="album-empty">Failed to load albums</div>';
    }
  }

  async addToAlbum(albumId) {
    try {
      await API.albums.addPhotos(albumId, this.photoIds);
    } catch (error) {
      console.error('Failed to add to album:', error);
      alert('Failed to add photos to album');
    }
  }

  async createAlbum() {
    const name = this.newAlbumInput.value.trim();
    if (!name) return;

    try {
      const album = await API.albums.create(name);
      // Add photos to the new album
      if (this.photoIds.length > 0) {
        await API.albums.addPhotos(album.id, this.photoIds);
      }
      this.newAlbumInput.value = '';
      await this.loadAlbums();
    } catch (error) {
      console.error('Failed to create album:', error);
      alert('Failed to create album');
    }
  }
}

// Confirm Modal Controller
class ConfirmModal {
  constructor() {
    this.modal = document.getElementById('confirm-modal');
    this.backdrop = document.getElementById('confirm-modal-backdrop');
    this.filename = document.getElementById('confirm-filename');
    this.cancelBtn = document.getElementById('confirm-cancel');
    this.deleteBtn = document.getElementById('confirm-delete');

    this.onConfirm = null;

    this.init();
  }

  init() {
    this.backdrop.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.deleteBtn.addEventListener('click', () => {
      if (this.onConfirm) {
        this.onConfirm();
      }
      this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  show(filename, onConfirm) {
    this.filename.textContent = filename;
    this.onConfirm = onConfirm;
    this.modal.classList.add('active');
  }

  close() {
    this.modal.classList.remove('active');
    this.onConfirm = null;
  }
}

// Playlist Modal Controller
class PlaylistModal {
  constructor() {
    this.modal = null;
    this.trackIds = [];
    this.createModal();
  }

  createModal() {
    const modalHTML = `
      <div class="modal playlist-modal" id="playlist-modal">
        <div class="modal-backdrop" id="playlist-modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Add to Playlist</h3>
            <button class="modal-close" id="playlist-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="playlist-list-container" id="playlist-list-container">
              <!-- Playlists loaded here -->
            </div>
            <div class="playlist-create-section">
              <input type="text" class="playlist-input" id="new-playlist-name" placeholder="New playlist name...">
              <button class="btn btn-primary" id="btn-create-playlist">Create</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    this.modal = document.getElementById('playlist-modal');
    this.backdrop = document.getElementById('playlist-modal-backdrop');
    this.closeBtn = document.getElementById('playlist-modal-close');
    this.listContainer = document.getElementById('playlist-list-container');
    this.newPlaylistInput = document.getElementById('new-playlist-name');
    this.createBtn = document.getElementById('btn-create-playlist');

    this.init();
  }

  init() {
    this.backdrop.addEventListener('click', () => this.close());
    this.closeBtn.addEventListener('click', () => this.close());
    this.createBtn.addEventListener('click', () => this.createPlaylist());

    this.newPlaylistInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.createPlaylist();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  async show(trackIds) {
    this.trackIds = Array.isArray(trackIds) ? trackIds : [trackIds];
    this.newPlaylistInput.value = '';

    await this.loadPlaylists();

    this.modal.classList.add('active');
  }

  close() {
    this.modal.classList.remove('active');
  }

  async loadPlaylists() {
    try {
      const playlists = await API.music.getPlaylists();

      if (playlists.length === 0) {
        this.listContainer.innerHTML = '<div class="playlist-empty">No playlists yet. Create one below.</div>';
      } else {
        this.listContainer.innerHTML = playlists.map(playlist => `
          <div class="playlist-list-item" data-id="${playlist.id}">
            <div class="playlist-list-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <div class="playlist-list-info">
              <div class="playlist-list-name">${playlist.name}</div>
              <div class="playlist-list-count">${playlist.tracks.length} tracks</div>
            </div>
            <button class="playlist-add-btn" data-id="${playlist.id}">Add</button>
          </div>
        `).join('');

        // Add click handlers
        this.listContainer.querySelectorAll('.playlist-add-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await this.addToPlaylist(btn.dataset.id);
            btn.textContent = 'Added!';
            btn.disabled = true;
            setTimeout(() => {
              btn.textContent = 'Add';
              btn.disabled = false;
            }, 1500);
          });
        });
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
      this.listContainer.innerHTML = '<div class="playlist-empty">Failed to load playlists</div>';
    }
  }

  async addToPlaylist(playlistId) {
    try {
      await API.music.addToPlaylist(playlistId, this.trackIds);
    } catch (error) {
      console.error('Failed to add to playlist:', error);
      alert('Failed to add tracks to playlist');
    }
  }

  async createPlaylist() {
    const name = this.newPlaylistInput.value.trim();
    if (!name) return;

    try {
      const playlist = await API.music.createPlaylist(name, this.trackIds);
      this.newPlaylistInput.value = '';
      await this.loadPlaylists();
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert('Failed to create playlist');
    }
  }
}

// Queue Modal Controller
class QueueModal {
  constructor() {
    this.modal = null;
    this.createModal();
  }

  createModal() {
    const modalHTML = `
      <div class="modal queue-modal" id="queue-modal">
        <div class="modal-backdrop" id="queue-modal-backdrop"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Queue</h3>
            <div class="queue-header-actions">
              <button class="btn btn-text" id="queue-clear">Clear</button>
              <button class="modal-close" id="queue-modal-close">&times;</button>
            </div>
          </div>
          <div class="modal-body">
            <div class="queue-now-playing" id="queue-now-playing">
              <!-- Current track shown here -->
            </div>
            <div class="queue-divider">
              <span>Up Next</span>
            </div>
            <div class="queue-list-container" id="queue-list-container">
              <!-- Queue tracks loaded here -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    this.modal = document.getElementById('queue-modal');
    this.backdrop = document.getElementById('queue-modal-backdrop');
    this.closeBtn = document.getElementById('queue-modal-close');
    this.clearBtn = document.getElementById('queue-clear');
    this.nowPlayingContainer = document.getElementById('queue-now-playing');
    this.listContainer = document.getElementById('queue-list-container');

    this.init();
  }

  init() {
    this.backdrop.addEventListener('click', () => this.close());
    this.closeBtn.addEventListener('click', () => this.close());
    this.clearBtn.addEventListener('click', () => this.clearQueue());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  show() {
    this.render();
    this.modal.classList.add('active');
  }

  close() {
    this.modal.classList.remove('active');
  }

  render() {
    const { tracks, currentIndex, currentTrack } = musicPlayer.getQueue();

    // Render current track
    if (currentTrack) {
      const title = currentTrack.metadata?.title || currentTrack.name;
      const artist = currentTrack.metadata?.artist || 'Unknown Artist';

      this.nowPlayingContainer.innerHTML = `
        <div class="queue-track current">
          <div class="queue-track-thumb">
            ${currentTrack.metadata?.hasCover ?
              `<img src="${API.music.getCoverUrl(currentTrack.id)}" alt="">` :
              `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>`
            }
          </div>
          <div class="queue-track-info">
            <div class="queue-track-title">${title}</div>
            <div class="queue-track-artist">${artist}</div>
          </div>
          <div class="queue-track-indicator">
            <div class="queue-playing-icon">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      `;
    } else {
      this.nowPlayingContainer.innerHTML = '<div class="queue-empty">No track playing</div>';
    }

    // Render upcoming tracks
    const upcomingTracks = tracks.slice(currentIndex + 1);

    if (upcomingTracks.length === 0) {
      this.listContainer.innerHTML = '<div class="queue-empty">No tracks in queue</div>';
    } else {
      this.listContainer.innerHTML = upcomingTracks.map((track, idx) => {
        const actualIndex = currentIndex + 1 + idx;
        const title = track.metadata?.title || track.name;
        const artist = track.metadata?.artist || 'Unknown Artist';
        const duration = track.metadata?.duration ? this.formatDuration(track.metadata.duration) : '--:--';

        return `
          <div class="queue-track" data-index="${actualIndex}">
            <div class="queue-track-drag">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.5"/>
                <circle cx="9" cy="12" r="1.5"/>
                <circle cx="9" cy="18" r="1.5"/>
                <circle cx="15" cy="6" r="1.5"/>
                <circle cx="15" cy="12" r="1.5"/>
                <circle cx="15" cy="18" r="1.5"/>
              </svg>
            </div>
            <div class="queue-track-thumb">
              ${track.metadata?.hasCover ?
                `<img src="${API.music.getCoverUrl(track.id)}" alt="">` :
                `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>`
              }
            </div>
            <div class="queue-track-info">
              <div class="queue-track-title">${title}</div>
              <div class="queue-track-artist">${artist}</div>
            </div>
            <div class="queue-track-duration">${duration}</div>
            <button class="queue-track-remove" data-index="${actualIndex}" title="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        `;
      }).join('');

      // Add click handlers
      this.listContainer.querySelectorAll('.queue-track').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.queue-track-remove')) return;

          const index = parseInt(item.dataset.index);
          musicPlayer.playAtIndex(index);
          this.render();
        });
      });

      // Remove handlers
      this.listContainer.querySelectorAll('.queue-track-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(btn.dataset.index);
          musicPlayer.removeFromQueue(index);
          this.render();
        });
      });
    }
  }

  clearQueue() {
    musicPlayer.clearQueue();
    this.render();
  }

  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
}

// Create global instances
window.confirmModal = new ConfirmModal();
window.tagModal = new TagModal();
window.albumModal = new AlbumModal();
window.playlistModal = new PlaylistModal();
window.queueModal = new QueueModal();
window.musicPlayer = new MusicPlayer();
window.videoPlayer = new VideoPlayer();
window.lightbox = new Lightbox();
