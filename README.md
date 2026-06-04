# 🎵 SoundWave — Spotify Clone (College Project)

A modern Spotify-inspired music player built with **Python Flask** + HTML/CSS/JS.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Auth System | Login / Register with session management |
| 🎵 Music Player | Full audio player with seek, volume, progress bar |
| ❤️ Liked Songs | Like/unlike songs, saved per user |
| 📋 Playlists | Create, manage, and delete playlists |
| 🔀 Shuffle / 🔁 Repeat | Toggle shuffle and repeat modes |
| ☁️ Upload Songs | Upload MP3/WAV + cover art |
| 🔍 Search & Filter | Search by name, artist, album + genre filter |
| 📊 Stats Dashboard | Live stats — total songs, liked, playlists |
| ⌨️ Keyboard Shortcuts | Space = play/pause, ← → = seek, M = mute |

---

## 🚀 Setup & Run

### Step 1 — Open in VS Code
Extract the zip and open the `spotify_clone` folder in VS Code.

### Step 2 — Create Virtual Environment (Optional but Recommended)
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate
```

### Step 3 — Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4 — Run the App
```bash
python app.py
```

### Step 5 — Open in Browser
Visit: **http://127.0.0.1:5000**

---

## 🔑 Demo Login
```
Email:    demo@soundwave.com
Password: demo123
```

---

## 📁 Project Structure
```
spotify_clone/
├── app.py                  # Flask backend (all routes & API)
├── requirements.txt        # Python dependencies
├── data/
│   └── data.json           # Auto-generated database
├── templates/
│   └── index.html          # Main frontend HTML
└── static/
    ├── css/
    │   └── style.css       # All styles
    ├── js/
    │   └── app.js          # All frontend logic
    └── uploads/
        ├── songs/          # Uploaded audio files
        └── covers/         # Uploaded cover images
```

---

## 🛠️ Tech Stack
- **Backend:** Python 3, Flask, Werkzeug
- **Frontend:** HTML5, CSS3 (CSS Variables, Grid, Flexbox), Vanilla JS
- **Storage:** JSON file-based database
- **Audio:** HTML5 Audio API
- **Icons:** Font Awesome 6
- **Fonts:** Plus Jakarta Sans (Google Fonts)

---

## 📝 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/login` | User login |
| POST | `/register` | User registration |
| GET | `/api/songs` | Get all songs (with search/filter) |
| POST | `/api/songs/upload` | Upload a new song |
| POST | `/api/songs/:id/play` | Increment play count |
| GET | `/api/liked` | Get liked songs |
| POST | `/api/liked/:id` | Toggle like on song |
| GET | `/api/playlists` | Get user playlists |
| POST | `/api/playlists/create` | Create playlist |
| POST | `/api/playlists/:pid/add/:sid` | Add song to playlist |
| DELETE | `/api/playlists/:pid/delete` | Delete playlist |

---

Made with ❤️ for College Project
