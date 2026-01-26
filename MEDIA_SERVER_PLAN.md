# Carmine Media Server - Implementation Plan

## Overview
A modern, self-hosted media server with a sleek dark-mode UI for streaming videos, music, and viewing photos from your local network. Built with a high-tech aesthetic featuring glassmorphism, neon accents, and smooth animations.

---

## Tech Stack

### Backend
- **Node.js + Express** - Lightweight server for file handling and streaming
- **Multer** - File upload handling
- **Sharp** - Image thumbnail generation
- **FFmpeg** (optional) - Video transcoding and thumbnails

### Frontend
- **Vanilla HTML/CSS/JS** - No framework overhead, fast loading
- **CSS Custom Properties** - Easy theming and dark mode
- **Web Components** - Modular, reusable UI components

---

## Project Structure

```
carmine/
├── server/
│   ├── index.js              # Main Express server
│   ├── routes/
│   │   ├── videos.js         # Video streaming endpoints
│   │   ├── music.js          # Music streaming endpoints
│   │   ├── photos.js         # Photo gallery endpoints
│   │   └── upload.js         # File upload handling
│   └── utils/
│       ├── fileScanner.js    # Recursive media file scanner
│       └── thumbnails.js     # Thumbnail generation
│
├── public/
│   ├── index.html            # Main entry point
│   ├── css/
│   │   ├── main.css          # Core styles
│   │   ├── components.css    # UI component styles
│   │   └── themes.css        # Dark/light theme variables
│   ├── js/
│   │   ├── app.js            # Main application logic
│   │   ├── router.js         # Client-side routing
│   │   ├── api.js            # API communication layer
│   │   ├── player.js         # Video/audio player controls
│   │   └── components/
│   │       ├── navbar.js
│   │       ├── sidebar.js
│   │       ├── mediaCard.js
│   │       └── uploadModal.js
│   └── assets/
│       ├── icons/            # SVG icons
│       └── fonts/            # Custom fonts
│
├── media/                    # Default media storage (or configure SSD path)
│   ├── videos/
│   ├── music/
│   └── photos/
│
├── config/
│   └── settings.json         # Server configuration (paths, ports, etc.)
│
├── package.json
└── README.md
```

---

## Features

### 1. Dashboard (Home)
- [ ] Quick stats (total videos, songs, photos, storage used)
- [ ] Recently added media carousel
- [ ] Continue watching section
- [ ] Quick access tiles for each media type

### 2. Video Section
- [ ] Grid/list view toggle
- [ ] Folder navigation (respects SSD directory structure)
- [ ] Video thumbnails (auto-generated or from files)
- [ ] Search and filter functionality
- [ ] Custom video player with:
  - Playback speed control
  - Volume control with keyboard shortcuts
  - Picture-in-Picture support
  - Fullscreen mode
  - Progress bar with preview thumbnails
  - Resume playback position

### 3. Music Section
- [ ] Album/Artist/All Songs views
- [ ] Playlist creation and management
- [ ] Persistent audio player (plays while browsing)
- [ ] Album art display
- [ ] Waveform visualization
- [ ] Queue management
- [ ] Shuffle and repeat modes

### 4. Photos Section
- [ ] Masonry grid layout
- [ ] Lightbox viewer with zoom
- [ ] Slideshow mode
- [ ] EXIF data display
- [ ] Folder/album organization

### 5. Upload System
- [ ] Drag-and-drop upload zone
- [ ] Multi-file upload with progress
- [ ] Auto-categorization by file type
- [ ] Choose destination folder
- [ ] Upload queue management

### 6. Settings
- [ ] Configure media directories (point to SSD)
- [ ] Theme customization
- [ ] Server port configuration
- [ ] Scan/rescan media library
- [ ] Storage statistics

---

## UI Design Specifications

### Design Concept: "Renaissance Noir"
A fusion of classical oil painting aesthetics with futuristic technology. Think Caravaggio's dramatic chiaroscuro lighting meets Blade Runner. Deep shadows, rich carmine reds that glow like embers, subtle gold accents reminiscent of gilded frames, and smooth dark surfaces that feel like polished obsidian.

### Color Palette (Dark Mode)
```css
/* Blacks & Depths */
--bg-primary: #080607;         /* Near-black with warm undertone */
--bg-secondary: #0f0c0d;       /* Card backgrounds - dark mahogany black */
--bg-tertiary: #1a1517;        /* Elevated surfaces */
--bg-hover: #241c1e;           /* Hover states */

/* Carmine Reds - The Soul */
--carmine: #960018;            /* True carmine - deep, rich */
--carmine-light: #b8122d;      /* Lighter carmine for accents */
--carmine-dark: #6b0012;       /* Darker shade for depth */
--carmine-glow: #ff1744;       /* Bright red for glows/highlights */

/* Renaissance Accents */
--gold: #c9a227;               /* Gilded accent - aged gold */
--gold-light: #e8c547;         /* Bright gold highlights */
--bronze: #8b6914;             /* Muted bronze for subtle accents */

/* Text */
--text-primary: #f5f0eb;       /* Warm white - like aged parchment */
--text-secondary: #a89a8c;     /* Muted warm gray */
--text-accent: #d4c4b0;        /* Cream for emphasis */

/* Functional */
--border: rgba(150, 0, 24, 0.2);      /* Subtle carmine borders */
--border-gold: rgba(201, 162, 39, 0.3); /* Gold accent borders */
--glass: rgba(150, 0, 24, 0.08);       /* Red-tinted glass effect */
--shadow: rgba(0, 0, 0, 0.7);          /* Deep dramatic shadows */
```

### Design Elements

**Chiaroscuro Lighting**
- Dramatic contrast between light and shadow
- Cards emerge from darkness with subtle red ambient glow
- Spotlight effects on hover states
- Vignette overlays on images

**Renaissance Textures**
- Subtle noise/grain texture overlay (like canvas)
- Gradient meshes that mimic oil paint blending
- Ornate dividers and flourishes (modernized)
- Border treatments inspired by gilded frames

**Futuristic Elements**
- Thin glowing red lines (like laser etching)
- Smooth glass surfaces with depth blur
- Data visualization with red/gold color coding
- Sleek iconography with sharp edges

**Motion & Interaction**
- Slow, elegant transitions (300-500ms)
- Fade-in reveals like emerging from shadow
- Subtle parallax on cards
- Ember-like particle effects on key actions
- Pulsing glow on active/playing media

**Grid & Layout**
- Asymmetric layouts inspired by classical compositions
- Rule of thirds for media placement
- Generous negative space (darkness is a feature)
- 8px base unit, but more dramatic spacing

### Typography
- **Display/Headings**: Cinzel or Cormorant Garamond (classical, elegant serifs)
- **Body**: Source Sans Pro or Inter (clean, readable)
- **Accents**: Cinzel Decorative (for special headers)
- **Monospace**: JetBrains Mono (technical info, timestamps)

### Special UI Components

**Media Cards**
- Dark surface with subtle red gradient at bottom
- Gold corner accents on hover
- Dramatic shadow underneath
- Title in elegant serif font

**Video Player**
- Minimal controls that fade in from shadow
- Red progress bar with gold buffered indicator
- Cinematic letterboxing option
- Vignette overlay toggle

**Music Player**
- Waveform visualization in carmine gradient
- Album art with gilded frame effect
- Glowing red playhead
- Equalizer bars in red/gold

**Navigation**
- Vertical sidebar with icon + text
- Active item has red glow underline
- Gold accent on hover
- Collapsed mode shows only glowing icons

---

## API Endpoints

### Videos
```
GET    /api/videos              # List all videos
GET    /api/videos/:id          # Get video metadata
GET    /api/videos/:id/stream   # Stream video file
GET    /api/videos/:id/thumb    # Get video thumbnail
```

### Music
```
GET    /api/music               # List all tracks
GET    /api/music/:id           # Get track metadata
GET    /api/music/:id/stream    # Stream audio file
GET    /api/playlists           # List playlists
POST   /api/playlists           # Create playlist
```

### Photos
```
GET    /api/photos              # List all photos
GET    /api/photos/:id          # Get photo metadata
GET    /api/photos/:id/full     # Get full resolution
GET    /api/photos/:id/thumb    # Get thumbnail
```

### Upload
```
POST   /api/upload              # Upload file(s)
GET    /api/upload/progress/:id # Check upload progress
```

### System
```
GET    /api/stats               # Storage and media stats
POST   /api/scan                # Rescan media directories
GET    /api/settings            # Get server settings
PUT    /api/settings            # Update settings
```

---

## Implementation Phases

### Phase 1: Foundation
1. Set up Node.js/Express server
2. Create base HTML structure
3. Implement CSS design system (variables, components)
4. Build responsive navigation and layout
5. Set up file scanning utility

### Phase 2: Video Functionality
1. Video listing and folder navigation
2. Video streaming endpoint with range requests
3. Custom video player component
4. Thumbnail generation
5. Search and filtering

### Phase 3: Music Functionality
1. Music library scanning (ID3 tags)
2. Persistent audio player
3. Playlist management
4. Album art extraction

### Phase 4: Photos Functionality
1. Photo gallery with masonry layout
2. Lightbox viewer
3. Thumbnail generation
4. EXIF data extraction

### Phase 5: Upload & Polish
1. File upload system with progress
2. Settings panel
3. Storage statistics
4. Performance optimization
5. PWA support (offline capability)

---

## Running the Server 24/7

### Option 1: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start server/index.js --name carmine
pm2 startup  # Auto-start on boot
pm2 save
```

### Option 2: systemd Service (Linux)
```ini
[Unit]
Description=Carmine Media Server
After=network.target

[Service]
ExecStart=/usr/bin/node /path/to/carmine/server/index.js
Restart=always
User=youruser

[Install]
WantedBy=multi-user.target
```

### Option 3: launchd (macOS)
Create `~/Library/LaunchAgents/com.carmine.mediaserver.plist`

---

## Accessing on Local Network

1. Find your computer's local IP: `192.168.x.x`
2. Server runs on port 3000 by default
3. Access from any device: `http://192.168.x.x:3000`
4. Optional: Set up mDNS for `http://carmine.local:3000`

---

## Configuration (settings.json)
```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "media": {
    "videos": ["/Volumes/SSD/Videos", "/path/to/more/videos"],
    "music": ["/Volumes/SSD/Music"],
    "photos": ["/Volumes/SSD/Photos"]
  },
  "thumbnails": {
    "enabled": true,
    "quality": 80,
    "videoInterval": 10
  },
  "upload": {
    "maxSize": "10GB",
    "allowedTypes": ["video/*", "audio/*", "image/*"]
  }
}
```

---

## Security Considerations

- Server binds to local network only (0.0.0.0 with firewall)
- No authentication by default (add if needed for shared networks)
- File access restricted to configured media directories
- Input sanitization on all file operations
- Rate limiting on uploads

---

## Browser Compatibility

- Chrome 90+ (primary target)
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Future Enhancements (Optional)

- [ ] Chromecast/AirPlay support
- [ ] Mobile app (React Native or PWA)
- [ ] Transcoding for incompatible formats
- [ ] Subtitle support (.srt, .vtt)
- [ ] User accounts and profiles
- [ ] Watch history sync
- [ ] Remote access via Tailscale/Cloudflare Tunnel

---

## Ready to Build?

Once you approve this plan, I'll implement each phase starting with the foundation. The complete server should be functional after Phase 2, with each subsequent phase adding more features.
