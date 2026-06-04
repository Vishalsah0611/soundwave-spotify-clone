from flask import Flask, render_template, request, jsonify, send_from_directory, redirect, url_for, session
import os, json, uuid
from werkzeug.utils import secure_filename
from datetime import datetime
import hashlib

app = Flask(__name__)
app.secret_key = "spotify_clone_secret_key_2024"

UPLOAD_FOLDER_SONGS = "static/uploads/songs"
UPLOAD_FOLDER_COVERS = "static/uploads/covers"
DATA_FILE = "data/data.json"
ALLOWED_AUDIO = {"mp3", "wav", "ogg", "flac"}
ALLOWED_IMAGE = {"png", "jpg", "jpeg", "webp"}

os.makedirs("data", exist_ok=True)
os.makedirs(UPLOAD_FOLDER_SONGS, exist_ok=True)
os.makedirs(UPLOAD_FOLDER_COVERS, exist_ok=True)

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {"songs": [], "playlists": [], "users": [], "liked_songs": {}}

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def init_data():
    data = load_data()
    # Add demo user if no users
    if not data["users"]:
        data["users"].append({
            "id": "demo_user",
            "username": "Demo User",
            "email": "demo@soundwave.com",
            "password": hashlib.md5("demo123".encode()).hexdigest(),
            "avatar": "",
            "joined": datetime.now().strftime("%Y-%m-%d")
        })
        data["liked_songs"]["demo_user"] = []
        save_data(data)
    # Add some demo songs info (no actual files, just metadata for UI demo)
    if not data["songs"]:
        demo_songs = [
            {"id": "s1", "title": "Midnight Vibes", "artist": "DJ SoundWave", "album": "Neon Nights", "genre": "Electronic", "duration": 214, "plays": 1520, "file": "", "cover": "", "uploaded_by": "demo_user", "date": "2024-01-10"},
            {"id": "s2", "title": "Lo-Fi Dreams", "artist": "Chill Beats", "album": "Study Session", "genre": "Lo-Fi", "duration": 180, "plays": 3200, "file": "", "cover": "", "uploaded_by": "demo_user", "date": "2024-01-12"},
            {"id": "s3", "title": "Rainy Day", "artist": "Acoustic Soul", "album": "Monsoon Moods", "genre": "Acoustic", "duration": 195, "plays": 890, "file": "", "cover": "", "uploaded_by": "demo_user", "date": "2024-01-15"},
            {"id": "s4", "title": "City Lights", "artist": "Urban Echo", "album": "Skyline", "genre": "Pop", "duration": 230, "plays": 4100, "file": "", "cover": "", "uploaded_by": "demo_user", "date": "2024-01-18"},
            {"id": "s5", "title": "Mountain High", "artist": "Folk Tales", "album": "Journey", "genre": "Folk", "duration": 260, "plays": 670, "file": "", "cover": "", "uploaded_by": "demo_user", "date": "2024-01-20"},
        ]
        data["songs"] = demo_songs
        data["playlists"] = [
            {"id": "p1", "name": "My Favourites", "description": "All time best songs", "songs": ["s1","s2"], "created_by": "demo_user", "cover": "", "date": "2024-01-01"},
            {"id": "p2", "name": "Study Mode", "description": "Focus music playlist", "songs": ["s2","s3"], "created_by": "demo_user", "cover": "", "date": "2024-01-05"},
        ]
        save_data(data)

init_data()

# ─── AUTH ──────────────────────────────────────────────────────────────────────

@app.route("/login", methods=["GET","POST"])
def login():
    if request.method == "POST":
        d = request.get_json()
        data = load_data()
        user = next((u for u in data["users"] if u["email"]==d["email"] and u["password"]==hashlib.md5(d["password"].encode()).hexdigest()), None)
        if user:
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            return jsonify({"success": True, "username": user["username"]})
        return jsonify({"success": False, "msg": "Invalid credentials"})
    return render_template("index.html")

@app.route("/register", methods=["POST"])
def register():
    d = request.get_json()
    data = load_data()
    if any(u["email"]==d["email"] for u in data["users"]):
        return jsonify({"success": False, "msg": "Email already exists"})
    user = {
        "id": str(uuid.uuid4())[:8],
        "username": d["username"],
        "email": d["email"],
        "password": hashlib.md5(d["password"].encode()).hexdigest(),
        "avatar": "",
        "joined": datetime.now().strftime("%Y-%m-%d")
    }
    data["users"].append(user)
    data["liked_songs"][user["id"]] = []
    save_data(data)
    session["user_id"] = user["id"]
    session["username"] = user["username"]
    return jsonify({"success": True, "username": user["username"]})

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")

@app.route("/session-check")
def session_check():
    if "user_id" in session:
        return jsonify({"logged_in": True, "username": session["username"], "user_id": session["user_id"]})
    return jsonify({"logged_in": False})

# ─── MAIN APP ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

# ─── SONGS API ─────────────────────────────────────────────────────────────────

@app.route("/api/songs")
def get_songs():
    data = load_data()
    q = request.args.get("q","").lower()
    genre = request.args.get("genre","")
    songs = data["songs"]
    if q:
        songs = [s for s in songs if q in s["title"].lower() or q in s["artist"].lower() or q in s["album"].lower()]
    if genre:
        songs = [s for s in songs if s["genre"]==genre]
    return jsonify(songs)

@app.route("/api/songs/upload", methods=["POST"])
def upload_song():
    if "user_id" not in session:
        return jsonify({"success": False, "msg": "Login required"})
    audio = request.files.get("audio")
    cover = request.files.get("cover")
    title = request.form.get("title", "Unknown")
    artist = request.form.get("artist", "Unknown")
    album = request.form.get("album", "Unknown")
    genre = request.form.get("genre", "Other")

    audio_path, cover_path = "", ""
    if audio and audio.filename.rsplit(".",1)[-1].lower() in ALLOWED_AUDIO:
        fname = str(uuid.uuid4())[:8] + "_" + secure_filename(audio.filename)
        audio.save(os.path.join(UPLOAD_FOLDER_SONGS, fname))
        audio_path = fname
    if cover and cover.filename.rsplit(".",1)[-1].lower() in ALLOWED_IMAGE:
        fname = str(uuid.uuid4())[:8] + "_" + secure_filename(cover.filename)
        cover.save(os.path.join(UPLOAD_FOLDER_COVERS, fname))
        cover_path = fname

    song = {
        "id": str(uuid.uuid4())[:8],
        "title": title, "artist": artist, "album": album, "genre": genre,
        "duration": 0, "plays": 0,
        "file": audio_path, "cover": cover_path,
        "uploaded_by": session["user_id"],
        "date": datetime.now().strftime("%Y-%m-%d")
    }
    data = load_data()
    data["songs"].append(song)
    save_data(data)
    return jsonify({"success": True, "song": song})

@app.route("/api/songs/<sid>/play", methods=["POST"])
def play_song(sid):
    data = load_data()
    for s in data["songs"]:
        if s["id"] == sid:
            s["plays"] = s.get("plays",0) + 1
            break
    save_data(data)
    return jsonify({"success": True})

@app.route("/api/songs/<sid>/delete", methods=["DELETE"])
def delete_song(sid):
    if "user_id" not in session:
        return jsonify({"success": False})
    data = load_data()
    data["songs"] = [s for s in data["songs"] if not (s["id"]==sid and s["uploaded_by"]==session["user_id"])]
    save_data(data)
    return jsonify({"success": True})

# ─── LIKED SONGS ───────────────────────────────────────────────────────────────

@app.route("/api/liked")
def get_liked():
    if "user_id" not in session:
        return jsonify([])
    data = load_data()
    liked_ids = data["liked_songs"].get(session["user_id"], [])
    liked = [s for s in data["songs"] if s["id"] in liked_ids]
    return jsonify(liked)

@app.route("/api/liked/<sid>", methods=["POST"])
def toggle_like(sid):
    if "user_id" not in session:
        return jsonify({"success": False})
    data = load_data()
    uid = session["user_id"]
    if uid not in data["liked_songs"]:
        data["liked_songs"][uid] = []
    if sid in data["liked_songs"][uid]:
        data["liked_songs"][uid].remove(sid)
        liked = False
    else:
        data["liked_songs"][uid].append(sid)
        liked = True
    save_data(data)
    return jsonify({"success": True, "liked": liked})

# ─── PLAYLISTS ─────────────────────────────────────────────────────────────────

@app.route("/api/playlists")
def get_playlists():
    data = load_data()
    uid = session.get("user_id")
    playlists = [p for p in data["playlists"] if p["created_by"]==uid] if uid else []
    return jsonify(playlists)

@app.route("/api/playlists/create", methods=["POST"])
def create_playlist():
    if "user_id" not in session:
        return jsonify({"success": False})
    d = request.get_json()
    pl = {
        "id": str(uuid.uuid4())[:8],
        "name": d.get("name","New Playlist"),
        "description": d.get("description",""),
        "songs": [],
        "created_by": session["user_id"],
        "cover": "",
        "date": datetime.now().strftime("%Y-%m-%d")
    }
    data = load_data()
    data["playlists"].append(pl)
    save_data(data)
    return jsonify({"success": True, "playlist": pl})

@app.route("/api/playlists/<pid>/add/<sid>", methods=["POST"])
def add_to_playlist(pid, sid):
    if "user_id" not in session:
        return jsonify({"success": False})
    data = load_data()
    for p in data["playlists"]:
        if p["id"]==pid and p["created_by"]==session["user_id"]:
            if sid not in p["songs"]:
                p["songs"].append(sid)
            break
    save_data(data)
    return jsonify({"success": True})

@app.route("/api/playlists/<pid>/remove/<sid>", methods=["DELETE"])
def remove_from_playlist(pid, sid):
    if "user_id" not in session:
        return jsonify({"success": False})
    data = load_data()
    for p in data["playlists"]:
        if p["id"]==pid and p["created_by"]==session["user_id"]:
            p["songs"] = [s for s in p["songs"] if s!=sid]
            break
    save_data(data)
    return jsonify({"success": True})

@app.route("/api/playlists/<pid>")
def get_playlist(pid):
    data = load_data()
    pl = next((p for p in data["playlists"] if p["id"]==pid), None)
    if not pl:
        return jsonify({"error": "Not found"}), 404
    songs = [s for s in data["songs"] if s["id"] in pl["songs"]]
    return jsonify({**pl, "song_details": songs})

@app.route("/api/playlists/<pid>/delete", methods=["DELETE"])
def delete_playlist(pid):
    if "user_id" not in session:
        return jsonify({"success": False})
    data = load_data()
    data["playlists"] = [p for p in data["playlists"] if not (p["id"]==pid and p["created_by"]==session["user_id"])]
    save_data(data)
    return jsonify({"success": True})

# ─── STATIC FILES ──────────────────────────────────────────────────────────────

@app.route("/static/uploads/songs/<path:filename>")
def serve_song(filename):
    return send_from_directory(UPLOAD_FOLDER_SONGS, filename)

@app.route("/static/uploads/covers/<path:filename>")
def serve_cover(filename):
    return send_from_directory(UPLOAD_FOLDER_COVERS, filename)

if __name__ == "__main__":
    print("\n🎵 SoundWave - Spotify Clone")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("▶  Running at: http://127.0.0.1:5000")
    print("▶  Demo Login: demo@soundwave.com / demo123")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
    import os
port = int(os.environ.get("PORT", 5000))
import os
port = int(os.environ.get("PORT", 5000))
app.run(debug=False, host="0.0.0.0", port=port)