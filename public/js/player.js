// Media Player Controller - Carmine Media Server

class MusicPlayer {
  constructor() {
    this.audio = document.getElementById('audio-player');
    this.queue = [];
    this.currentIndex = -1;
    this.isPlaying = false;
    this.volume = 0.7;

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

    // Audio events
    this.audio.addEventListener('timeupdate', () => this.updateProgress());
    this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
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
  }

  // Set queue and play
  setQueue(tracks, startIndex = 0) {
    this.queue = tracks;
    this.currentIndex = startIndex;
    if (tracks.length > 0) {
      this.play(tracks[startIndex]);
    }
  }

  // Add to queue
  addToQueue(track) {
    this.queue.push(track);
    if (this.queue.length === 1) {
      this.currentIndex = 0;
      this.play(track);
    }
  }

  togglePlay() {
    if (this.audio.paused) {
      this.audio.play();
    } else {
      this.audio.pause();
    }
  }

  playNext() {
    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      this.play(this.queue[this.currentIndex]);
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

  // Web Audio API Visualizer
  initAudioContext() {
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

    this.init();
  }

  init() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.close();
      }
    });
  }

  play(videoData) {
    this.video.src = API.videos.getStreamUrl(videoData.id);
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.video.play();
  }

  close() {
    this.video.pause();
    this.video.src = '';
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Photo Lightbox Controller
class Lightbox {
  constructor() {
    this.lightbox = document.getElementById('lightbox');
    this.backdrop = document.getElementById('lightbox-backdrop');
    this.closeBtn = document.getElementById('lightbox-close');
    this.deleteBtn = document.getElementById('lightbox-delete');
    this.prevBtn = document.getElementById('lightbox-prev');
    this.nextBtn = document.getElementById('lightbox-next');
    this.image = document.getElementById('lightbox-image');
    this.info = document.getElementById('lightbox-info');

    this.photos = [];
    this.currentIndex = 0;
    this.onDelete = null; // Callback when photo is deleted

    this.init();
  }

  init() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());
    this.prevBtn.addEventListener('click', () => this.prev());
    this.nextBtn.addEventListener('click', () => this.next());
    this.deleteBtn.addEventListener('click', () => this.confirmDelete());

    document.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('active')) return;

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
        case 'Delete':
        case 'Backspace':
          if (e.target.tagName !== 'INPUT') {
            this.confirmDelete();
          }
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

  show() {
    const photo = this.photos[this.currentIndex];
    this.image.src = API.photos.getFullUrl(photo.id);
    this.info.textContent = `${photo.name} (${this.currentIndex + 1} / ${this.photos.length})`;

    this.prevBtn.style.display = this.currentIndex > 0 ? 'flex' : 'none';
    this.nextBtn.style.display = this.currentIndex < this.photos.length - 1 ? 'flex' : 'none';
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

// Create global instances
window.confirmModal = new ConfirmModal();
window.musicPlayer = new MusicPlayer();
window.videoPlayer = new VideoPlayer();
window.lightbox = new Lightbox();
