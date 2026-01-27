# Carmine Media Server

A self-hosted media server with a cyberpunk/terminal aesthetic for managing your videos, music, and photos.

![Carmine](https://img.shields.io/badge/Carmine-Media%20Server-red)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-MIT-blue)

## Features

### Media Management
- **Videos** - Netflix-style browsing with categories (Movies, TV Shows, Home Videos)
- **Music** - Play music with an 80s-style equalizer visualizer and lock screen controls
- **Photos** - Timeline view organized by date with lightbox viewer

### Video Experience
- **Cinema Mode** - Immersive video browsing without distractions (music player hidden)
- **Categories** - Organize videos into Movies, TV Shows, and Home Videos
- **TV Show Folders** - TV shows grouped by folder, click to expand and see all episodes
- **Horizontal Scrolling Rows** - Netflix-style category rows with hover effects
- **Immersive Playback** - Fullscreen video player with keyboard controls
- **Context Menu** - Right-click to move videos between categories

### Photo Organization
- **People Tagging** - Tag people in photos with autocomplete suggestions
- **Albums** - Create albums to organize photos into collections
- **Filter by Person** - View all photos of a specific person

### Music Player
- Background playback on iOS/mobile (lock screen controls via Media Session API)
- Random shuffle when clicking play with no track selected
- Real-time audio visualizer using Web Audio API
- **Playlists** - Create, manage, and play custom playlists
- **Queue Management** - View, reorder, and remove upcoming tracks
- Add tracks to queue or playlists directly from the track list
- Keyboard shortcuts for playback control

### Dashboard
- System stats (CPU, memory, disk usage)
- Media library statistics
- Recent activity monitoring

## Installation

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/carmine.git
cd carmine

# Install dependencies
npm install

# Start the server
npm start
```

The server will start at `http://localhost:3000`

## Configuration

Configuration is stored in `config/settings.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "media": {
    "videos": ["./media/videos"],
    "music": ["./media/music"],
    "photos": ["./media/photos"]
  },
  "upload": {
    "maxFileSize": 10737418240,
    "allowedTypes": ["video/*", "audio/*", "image/*"]
  }
}
```

### Adding Media Directories

You can add multiple directories for each media type through the Settings page or by editing `settings.json`.

## API Reference

### Videos
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos` | GET | List all videos |
| `/api/videos/:id` | GET | Get video metadata |
| `/api/videos/:id/stream` | GET | Stream video (supports range requests) |
| `/api/videos/:id/thumb` | GET | Get video thumbnail |
| `/api/videos/:id` | DELETE | Delete video |
| `/api/videos/categories` | GET | List all categories with video counts |
| `/api/videos/categories/:categoryId` | GET | Get videos in a category |
| `/api/videos/:id/category` | GET | Get video's category |
| `/api/videos/:id/category` | PUT | Set video's category |
| `/api/videos/tvshows` | GET | List all TV shows (grouped by folder) |
| `/api/videos/tvshows/:showId/episodes` | GET | Get episodes for a TV show |

**Set category request body:**
```json
{
  "categoryId": "movies"
}
```

**Available categories:** `movies`, `tvshows`, `homevideos`, `uncategorized`

### Music
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/music` | GET | List all music tracks |
| `/api/music/:id` | GET | Get track metadata |
| `/api/music/:id/stream` | GET | Stream audio (supports range requests) |
| `/api/music/:id/cover` | GET | Get album artwork |
| `/api/music/:id` | DELETE | Delete track |

### Playlists
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/music/playlists/all` | GET | List all playlists |
| `/api/music/playlists/:id` | GET | Get single playlist |
| `/api/music/playlists` | POST | Create playlist |
| `/api/music/playlists/:id` | PUT | Update playlist (name, tracks) |
| `/api/music/playlists/:id` | DELETE | Delete playlist |
| `/api/music/playlists/:id/tracks` | POST | Add tracks to playlist |
| `/api/music/playlists/:id/tracks` | DELETE | Remove tracks from playlist |

**Create playlist request body:**
```json
{
  "name": "My Playlist",
  "tracks": ["trackId1", "trackId2"]
}
```

**Add/remove tracks request body:**
```json
{
  "trackIds": ["trackId1", "trackId2"]
}
```

### Photos
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/photos` | GET | List all photos |
| `/api/photos/:id` | GET | Get photo metadata |
| `/api/photos/:id/full` | GET | Get full resolution photo |
| `/api/photos/:id/thumb` | GET | Get photo thumbnail (400x400) |
| `/api/photos/:id` | DELETE | Delete photo |

### People Tags
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/photos/tags/people` | GET | Get all unique people names |
| `/api/photos/:id/tags` | GET | Get tags for a photo |
| `/api/photos/:id/tags` | PUT | Set tags for a photo |
| `/api/photos/by-person/:name` | GET | Get all photos with a person |

**Set tags request body:**
```json
{
  "people": ["John", "Sarah"]
}
```

### Albums
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/photos/albums/all` | GET | List all albums |
| `/api/photos/albums` | POST | Create album |
| `/api/photos/albums/:id` | GET | Get album with photos |
| `/api/photos/albums/:id` | PUT | Update album (name, cover) |
| `/api/photos/albums/:id` | DELETE | Delete album |
| `/api/photos/albums/:id/photos` | POST | Add photos to album |
| `/api/photos/albums/:id/photos` | DELETE | Remove photos from album |

**Create album request body:**
```json
{
  "name": "Summer 2024"
}
```

**Add/remove photos request body:**
```json
{
  "photoIds": ["photoId1", "photoId2"]
}
```

### Upload
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload single file |
| `/api/upload/multiple` | POST | Upload multiple files |

### System
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stats` | GET | Get media library statistics |
| `/api/system` | GET | Get system information (CPU, memory, disk) |
| `/api/settings` | GET | Get current settings |
| `/api/settings` | PUT | Update settings |
| `/api/settings/scan` | POST | Scan media directories |

## Keyboard Shortcuts

### Global
| Key | Action |
|-----|--------|
| `Space` | Play/Pause music |
| `←` / `→` | Seek backward/forward 10 seconds |
| `↑` / `↓` | Volume up/down |

### Photo Lightbox
| Key | Action |
|-----|--------|
| `←` / `→` | Previous/Next photo |
| `T` | Tag a person |
| `A` | Add to album |
| `Delete` / `Backspace` | Delete photo |
| `Escape` | Close lightbox |

### Music Page
| Key | Action |
|-----|--------|
| `S` | Toggle shuffle |
| `R` | Toggle repeat |
| `L` | Toggle track list |
| `Q` | Open queue |
| `P` | Open playlists |

### Video Player
| Key | Action |
|-----|--------|
| `Space` | Play/Pause video |
| `←` / `→` | Seek backward/forward 10 seconds |
| `↑` / `↓` | Volume up/down |
| `F` | Toggle fullscreen |
| `Escape` | Close player |
| `Double-click` | Toggle fullscreen |

## Data Storage

Carmine uses a lightweight file-based storage approach:

- **Media files** - Stored in configured directories on the filesystem
- **Settings** - `config/settings.json`
- **Photo tags** - `config/photo-tags.json`
- **Albums** - `config/albums.json`
- **Video categories** - `config/video-categories.json`
- **Playlists** - `config/playlists.json`

No database required - all metadata is generated on-demand by scanning the filesystem.

## Mobile Support

- Responsive design works on phones and tablets
- Music continues playing when screen is locked (iOS/Android)
- Lock screen controls for play/pause, skip, and seek
- Touch-optimized UI with appropriate tap targets

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, CSS3
- **Image Processing**: Sharp
- **Audio Metadata**: music-metadata
- **Fonts**: JetBrains Mono, Montserrat

## Project Structure

```
carmine/
├── config/
│   ├── settings.json          # Server configuration
│   ├── photo-tags.json        # People tags data
│   ├── albums.json            # Albums data
│   └── video-categories.json  # Video category assignments
├── media/
│   ├── videos/
│   ├── music/
│   └── photos/
├── public/
│   ├── css/
│   │   ├── themes.css     # Color variables
│   │   ├── main.css       # Layout styles
│   │   └── components.css # Component styles
│   ├── js/
│   │   ├── api.js         # API communication layer
│   │   ├── router.js      # Client-side routing
│   │   ├── player.js      # Media players & modals
│   │   └── app.js         # Main application
│   └── index.html
└── server/
    ├── index.js           # Express server
    ├── routes/
    │   ├── photos.js      # Photos, tags, albums API
    │   ├── videos.js      # Videos API
    │   ├── music.js       # Music API
    │   ├── upload.js      # File upload handler
    │   └── settings.js    # Settings API
    └── utils/
        └── fileScanner.js # Directory scanner
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Design inspired by cyberpunk/terminal aesthetics
- 80s equalizer visualization style
- Apple Photos-inspired timeline view
