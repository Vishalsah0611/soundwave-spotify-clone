/* ═══════════════════════════════════════════════════════
   SoundWave — app.js (Jamendo API Edition)
═══════════════════════════════════════════════════════ */

// ══ JAMENDO CONFIG ══════════════════════════════════════
// Jamendo se free API key lo: https://developer.jamendo.com/v3.0
// Niche apna CLIENT_ID daalo:
const JAMENDO_CLIENT_ID = "e0b2c8b8";
const JAMENDO_BASE = "https://api.jamendo.com/v3.0";
// ═══════════════════════════════════════════════════════

// ── STATE ──────────────────────────────────────────────
const state = {
  songs: [],          // local uploaded songs
  jamendoSongs: [],   // api songs
  likedIds: new Set(),
  playlists: [],
  queue: [],
  currentIndex: -1,
  currentSong: null,
  isPlaying: false,
  isShuffle: false,
  isRepeat: false,
  isMuted: false,
  volume: 0.8,
  currentPlaylistId: null,
  userId: null,
  username: null,
  usingJamendo: false,
};

const audio = document.getElementById("audioPlayer");

// ── INIT ───────────────────────────────────────────────
async function init() {
  setGreeting();
  const res = await fetch("/session-check");
  const data = await res.json();
  if (data.logged_in) {
    state.userId = data.user_id;
    state.username = data.username;
    showApp();
  } else {
    document.getElementById("authOverlay").classList.remove("hidden");
  }
}

function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? "Good Morning ☀️" : h < 17 ? "Good Afternoon 🌤️" : "Good Evening 🌙";
  const el = document.getElementById("greetingText");
  if (el) el.textContent = greet;
}

async function showApp() {
  document.getElementById("authOverlay").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");
  document.getElementById("sidebarUsername").textContent = state.username;
  await loadSongs();
  await loadLiked();
  await loadPlaylists();
  // Jamendo se trending songs load karo
  await loadJamendoTrending();
  renderStats();
  renderHomeGrid();
  setupAudio();
}

// ── AUTH ───────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t, i) =>
    t.classList.toggle("active", (i===0&&tab==="login")||(i===1&&tab==="register")));
  document.getElementById("loginForm").classList.toggle("hidden", tab !== "login");
  document.getElementById("registerForm").classList.toggle("hidden", tab !== "register");
  document.getElementById("authMsg").textContent = "";
}

async function doLogin() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPass").value;
  const msg = document.getElementById("authMsg");
  if (!email || !password) { msg.textContent="Fill all fields"; msg.className="auth-msg error"; return; }
  const res = await fetch("/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password}) });
  const data = await res.json();
  if (data.success) {
    state.username = data.username;
    msg.textContent="Welcome back!"; msg.className="auth-msg success";
    const sc = await fetch("/session-check");
    const sd = await sc.json();
    state.userId = sd.user_id;
    setTimeout(showApp, 600);
  } else { msg.textContent=data.msg; msg.className="auth-msg error"; }
}

async function doRegister() {
  const username = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPass").value;
  const msg = document.getElementById("authMsg");
  if (!username||!email||!password) { msg.textContent="Fill all fields"; msg.className="auth-msg error"; return; }
  const res = await fetch("/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username,email,password}) });
  const data = await res.json();
  if (data.success) {
    state.username = data.username;
    msg.textContent="Account created!"; msg.className="auth-msg success";
    const sc = await fetch("/session-check");
    const sd = await sc.json();
    state.userId = sd.user_id;
    setTimeout(showApp, 600);
  } else { msg.textContent=data.msg; msg.className="auth-msg error"; }
}

// ── LOCAL DATA ─────────────────────────────────────────
async function loadSongs() {
  const res = await fetch("/api/songs");
  state.songs = await res.json();
}

async function loadLiked() {
  const res = await fetch("/api/liked");
  const liked = await res.json();
  state.likedIds = new Set(liked.map(s => s.id));
}

async function loadPlaylists() {
  const res = await fetch("/api/playlists");
  state.playlists = await res.json();
  renderSidebarPlaylists();
}

// ── JAMENDO API ────────────────────────────────────────
function isJamendoConfigured() {
  return JAMENDO_CLIENT_ID && JAMENDO_CLIENT_ID !== "YOUR_CLIENT_ID_HERE";
}

// Jamendo se trending/popular tracks lao
async function loadJamendoTrending() {
  if (!isJamendoConfigured()) {
    console.warn("Jamendo Client ID not set. Add your ID in app.js line 8");
    return;
  }
  try {
    const url = `${JAMENDO_BASE}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=100&order=popularity_total&include=musicinfo&audioformat=mp32`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results) {
      state.jamendoSongs = data.results.map(formatJamendoSong);
    }
  } catch (e) {
    console.error("Jamendo API error:", e);
  }
}

// Jamendo se search karo
async function searchJamendo(query) {
  if (!isJamendoConfigured() || !query) return [];
  try {
    const url = `${JAMENDO_BASE}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=20&search=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || []).map(formatJamendoSong);
  } catch (e) { return []; }
}

// Jamendo genre ke hisab se search
async function searchJamendoByGenre(genre) {
  if (!isJamendoConfigured() || !genre) return [];
  try {
    const url = `${JAMENDO_BASE}/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=20&tags=${encodeURIComponent(genre.toLowerCase())}&include=musicinfo&audioformat=mp32`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || []).map(formatJamendoSong);
  } catch (e) { return []; }
}

// Jamendo song format ko apna format banao
function formatJamendoSong(track) {
  return {
    id: "j_" + track.id,          // j_ prefix = jamendo song
    title: track.name,
    artist: track.artist_name,
    album: track.album_name || "Unknown Album",
    genre: track.musicinfo?.tags?.genres?.[0] || "Other",
    duration: track.duration,
    plays: track.listens || 0,
    file: track.audio,             // direct streaming URL!
    cover: track.image || "",
    isJamendo: true,
    jamendo_id: track.id,
  };
}

// ── RENDER ─────────────────────────────────────────────
function renderStats() {
  const el = document.getElementById("statsRow");
  const totalSongs = state.songs.length + state.jamendoSongs.length;
  el.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon purple"><i class="fa-solid fa-music"></i></div>
      <div><div class="stat-value">${totalSongs}</div><div class="stat-label">Total Songs</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon red"><i class="fa-solid fa-heart"></i></div>
      <div><div class="stat-value">${state.likedIds.size}</div><div class="stat-label">Liked Songs</div></div>
    </div>
    <div class="stat-card">
      <div class="stat-icon cyan"><i class="fa-solid fa-list"></i></div>
      <div><div class="stat-value">${state.playlists.length}</div><div class="stat-label">Playlists</div></div>
    </div>`;
}

function renderHomeGrid() {
  const el = document.getElementById("homeSongs");

  // Pehle Jamendo songs dikhao, phir local
  const allSongs = [...state.jamendoSongs, ...state.songs];

  if (!allSongs.length) {
    el.innerHTML = `<div style="grid-column:1/-1;color:var(--text-2);padding:2rem;text-align:center">
      ${isJamendoConfigured()
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Loading songs...'
        : `<p>⚠️ Jamendo API key not set!</p>
           <p style="margin-top:8px;font-size:0.85rem">app.js line 8 mein apna Client ID daalo</p>
           <a href="https://developer.jamendo.com/v3.0" target="_blank" style="color:var(--accent2)">→ Free key lene ke liye click karo</a>`}
    </div>`;
    return;
  }

  el.innerHTML = allSongs.map(s => songCard(s)).join("");
}

function getCoverHTML(s) {
  if (s.isJamendo && s.cover) {
    return `<img src="${s.cover}" alt="cover" onerror="this.style.display='none'"/>`;
  }
  if (!s.isJamendo && s.cover) {
    return `<img src="/static/uploads/covers/${s.cover}" alt="cover"/>`;
  }
  return `<i class="fa-solid fa-music"></i>`;
}

function songCard(s) {
  const cover = getCoverHTML(s);
  return `<div class="song-card" onclick="playSongById('${s.id}')">
    <div class="song-card-cover">
      ${cover}
      <div class="song-card-play"><i class="fa-solid fa-play"></i></div>
    </div>
    <div class="song-card-title">${esc(s.title)}</div>
    <div class="song-card-artist">${esc(s.artist)}</div>
    <div class="song-card-plays">
      <i class="fa-solid fa-headphones" style="font-size:0.7rem"></i> ${fmtPlays(s.plays)}
      ${s.isJamendo ? '<span style="color:var(--accent2);font-size:0.7rem;margin-left:4px">● LIVE</span>' : ''}
    </div>
  </div>`;
}

function songRow(s, index, extraActions="") {
  const cover = getCoverHTML(s);
  const isPlaying = state.currentSong && state.currentSong.id === s.id;
  const likedClass = state.likedIds.has(s.id) ? "liked" : "";
  const likedIcon = state.likedIds.has(s.id) ? "fa-solid" : "fa-regular";
  const numHTML = isPlaying
    ? `<div class="now-playing-bars"><span></span><span></span><span></span></div>`
    : `<span class="song-num">${index+1}</span>`;
  return `<div class="song-row ${isPlaying?"playing":""}" id="row-${s.id}">
    ${numHTML}
    <div class="song-row-cover">${cover}</div>
    <div class="song-row-info" onclick="playSongById('${s.id}')">
      <div class="song-row-title">${esc(s.title)} ${s.isJamendo?'<span style="color:var(--accent2);font-size:0.7rem">LIVE</span>':''}</div>
      <div class="song-row-artist">${esc(s.artist)}</div>
    </div>
    <div class="song-row-album">${esc(s.album||"—")}</div>
    <div class="song-row-dur">${fmtDur(s.duration)}</div>
    <button class="btn-icon ${likedClass}" onclick="toggleLike('${s.id}',event)" title="Like">
      <i class="${likedIcon} fa-heart"></i>
    </button>
    <button class="btn-icon" onclick="openAddToPlaylist('${s.id}',event)" title="Add to playlist">
      <i class="fa-solid fa-plus"></i>
    </button>
    ${extraActions}
  </div>`;
}

function renderSidebarPlaylists() {
  const el = document.getElementById("sidebarPlaylists");
  el.innerHTML = state.playlists.map(p =>
    `<div class="pl-item" onclick="showPlaylist('${p.id}')">
      <i class="fa-solid fa-list-music"></i>${esc(p.name)}
    </div>`
  ).join("");
}

// ── SECTIONS ───────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const sec = document.getElementById(`sec-${name}`);
  if (sec) sec.classList.add("active");
  document.querySelector(`[data-section="${name}"]`)?.classList.add("active");
  if (name==="liked") renderLikedSection();
  if (name==="home") { renderStats(); renderHomeGrid(); }
  if (name==="search") doSearch();
}

// ── SEARCH ─────────────────────────────────────────────
async function doSearch() {
  const q = document.getElementById("searchInput").value.trim();
  const genre = document.getElementById("genreFilter").value;
  const el = document.getElementById("searchResults");

  el.innerHTML = `<p style="color:var(--text-2);padding:1rem"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</p>`;

  // Local songs search
  let url = `/api/songs?q=${encodeURIComponent(q)}&genre=${encodeURIComponent(genre)}`;
  const res = await fetch(url);
  let localSongs = await res.json();

  // Jamendo search
  let jamendoResults = [];
  if (q && isJamendoConfigured()) {
    jamendoResults = await searchJamendo(q);
  } else if (genre && isJamendoConfigured()) {
    jamendoResults = await searchJamendoByGenre(genre);
  } else if (!q && !genre) {
    jamendoResults = state.jamendoSongs;
  }

  const allResults = [...jamendoResults, ...localSongs];

  if (!allResults.length) {
    el.innerHTML = '<p style="color:var(--text-2);padding:1rem">No results found</p>';
    return;
  }

  // Search ke queue set karo
  state.queue = allResults;
  el.innerHTML = allResults.map((s, i) => songRow(s, i)).join("");
}

// ── LIKED ──────────────────────────────────────────────
async function renderLikedSection() {
  await loadLiked();
  const res = await fetch("/api/liked");
  const songs = await res.json();
  document.getElementById("likedCount").textContent = `${songs.length} song${songs.length!==1?"s":""}`;
  const el = document.getElementById("likedList");
  if (!songs.length) {
    el.innerHTML = '<p style="color:var(--text-2);padding:1rem">No liked songs yet. Heart a song to save it here!</p>';
    return;
  }
  el.innerHTML = songs.map((s, i) => songRow(s, i)).join("");
  renderStats();
}

async function toggleLike(sid, e) {
  if (e) e.stopPropagation();
  const res = await fetch(`/api/liked/${sid}`, { method:"POST" });
  const data = await res.json();
  if (data.success) {
    if (data.liked) { state.likedIds.add(sid); showToast("❤️ Added to Liked Songs"); }
    else { state.likedIds.delete(sid); showToast("Removed from Liked Songs"); }
    updateHeartButtons(sid, data.liked);
    renderStats();
  }
}

function updateHeartButtons(sid, liked) {
  document.querySelectorAll(`button[onclick*="toggleLike('${sid}'"]`).forEach(btn => {
    btn.classList.toggle("liked", liked);
    btn.querySelector("i").className = `${liked?"fa-solid":"fa-regular"} fa-heart`;
  });
  if (state.currentSong?.id === sid) {
    const hb = document.getElementById("playerHeartBtn");
    hb.classList.toggle("liked", liked);
    hb.querySelector("i").className = `${liked?"fa-solid":"fa-regular"} fa-heart`;
  }
}

async function toggleCurrentLike() {
  if (!state.currentSong) return;
  toggleLike(state.currentSong.id, null);
}

// ── PLAYLISTS ──────────────────────────────────────────
function openCreatePlaylist() { document.getElementById("createPlaylistModal").classList.remove("hidden"); }
function closeModal() { document.getElementById("createPlaylistModal").classList.add("hidden"); }

async function createPlaylist() {
  const name = document.getElementById("newPlName").value.trim();
  const desc = document.getElementById("newPlDesc").value.trim();
  if (!name) { showToast("Enter a playlist name"); return; }
  const res = await fetch("/api/playlists/create", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({name,desc}) });
  const data = await res.json();
  if (data.success) {
    closeModal();
    document.getElementById("newPlName").value = "";
    document.getElementById("newPlDesc").value = "";
    await loadPlaylists();
    renderStats();
    showToast("✅ Playlist created!");
  }
}

let addToPlaylistSongId = null;
function openAddToPlaylist(sid, e) {
  if (e) e.stopPropagation();
  addToPlaylistSongId = sid;
  const el = document.getElementById("playlistPickerList");
  if (!state.playlists.length) {
    el.innerHTML = '<p style="color:var(--text-2);padding:1rem">No playlists yet. Create one first!</p>';
  } else {
    el.innerHTML = state.playlists.map(p =>
      `<div class="picker-item" onclick="addToSelectedPlaylist('${p.id}')">
        <i class="fa-solid fa-list-music"></i>${esc(p.name)}
      </div>`
    ).join("");
  }
  document.getElementById("addToPlaylistModal").classList.remove("hidden");
}

function closeAddModal() {
  document.getElementById("addToPlaylistModal").classList.add("hidden");
  addToPlaylistSongId = null;
}

async function addToSelectedPlaylist(pid) {
  if (!addToPlaylistSongId) return;
  const res = await fetch(`/api/playlists/${pid}/add/${addToPlaylistSongId}`, { method:"POST" });
  const data = await res.json();
  closeAddModal();
  if (data.success) showToast("✅ Added to playlist!");
}

async function showPlaylist(pid) {
  const res = await fetch(`/api/playlists/${pid}`);
  const pl = await res.json();
  state.currentPlaylistId = pid;
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById("sec-playlist").classList.add("active");
  document.getElementById("plHeroName").textContent = pl.name;
  document.getElementById("plHeroDesc").textContent = pl.description || "";
  document.getElementById("plHeroMeta").textContent = `${pl.song_details?.length||0} songs`;
  const songs = pl.song_details || [];
  state.queue = songs;
  const el = document.getElementById("playlistSongs");
  if (!songs.length) { el.innerHTML = '<p style="color:var(--text-2);padding:1rem">No songs in this playlist yet.</p>'; return; }
  el.innerHTML = songs.map((s, i) => {
    const extra = `<button class="btn-icon" onclick="removeFromPlaylist('${pid}','${s.id}',event)" title="Remove">
      <i class="fa-solid fa-xmark"></i></button>`;
    return songRow(s, i, extra);
  }).join("");
}

async function removeFromPlaylist(pid, sid, e) {
  if (e) e.stopPropagation();
  await fetch(`/api/playlists/${pid}/remove/${sid}`, { method:"DELETE" });
  showPlaylist(pid);
  showToast("Removed from playlist");
}

async function deleteCurrentPlaylist() {
  if (!state.currentPlaylistId) return;
  if (!confirm("Delete this playlist?")) return;
  await fetch(`/api/playlists/${state.currentPlaylistId}/delete`, { method:"DELETE" });
  state.currentPlaylistId = null;
  await loadPlaylists();
  renderStats();
  showSection("home");
  showToast("Playlist deleted");
}

function playPlaylist() {
  if (!state.queue.length) return;
  state.currentIndex = 0;
  playSong(state.queue[0]);
}

// ── AUDIO PLAYER ───────────────────────────────────────
function setupAudio() {
  audio.volume = state.volume;
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("ended", onSongEnd);
  audio.addEventListener("loadedmetadata", () => {
    document.getElementById("totalTime").textContent = fmtDur(audio.duration);
    if (state.currentSong) state.currentSong.duration = Math.floor(audio.duration);
  });
  audio.addEventListener("error", () => {
    showToast("❌ Song load nahi hui, next try karo");
    state.isPlaying = false;
    updatePlayBtn();
  });
  audio.addEventListener("waiting", () => {
    document.getElementById("playPauseBtn").innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
  });
  audio.addEventListener("playing", () => {
    state.isPlaying = true;
    updatePlayBtn();
  });
}

// Sab songs ka combined pool
function getAllSongs() {
  return [...state.jamendoSongs, ...state.songs];
}

function findSongById(sid) {
  return getAllSongs().find(s => s.id === sid);
}

async function playSongById(sid) {
  const song = findSongById(sid);
  if (!song) return;
  // Queue set karo agar empty hai
  if (!state.queue.length || !state.queue.find(s => s.id === sid)) {
    state.queue = getAllSongs();
  }
  state.currentIndex = state.queue.findIndex(s => s.id === sid);
  playSong(song);
}

async function playSong(song) {
  state.currentSong = song;

  // Player UI update
  document.getElementById("playerTitle").textContent = song.title;
  document.getElementById("playerArtist").textContent = song.artist;

  const cover = document.getElementById("playerCover");
  if (song.isJamendo && song.cover) {
    cover.innerHTML = `<img src="${song.cover}" alt="cover" onerror="this.style.display='none'"/>`;
  } else if (!song.isJamendo && song.cover) {
    cover.innerHTML = `<img src="/static/uploads/covers/${song.cover}" alt="cover"/>`;
  } else {
    cover.innerHTML = `<i class="fa-solid fa-music"></i>`;
  }

  // Heart button
  const hb = document.getElementById("playerHeartBtn");
  const liked = state.likedIds.has(song.id);
  hb.classList.toggle("liked", liked);
  hb.querySelector("i").className = `${liked?"fa-solid":"fa-regular"} fa-heart`;

  // Audio source set karo
  if (song.file) {
    audio.src = song.file;  // Jamendo = direct URL, local = filename
    audio.load();
    try {
      await audio.play();
      state.isPlaying = true;
    } catch(e) {
      console.error("Play error:", e);
      showToast("❌ Play nahi hua — next song try karo");
      state.isPlaying = false;
    }
    updatePlayBtn();
  } else {
    // Local song without file
    audio.src = "";
    state.isPlaying = false;
    updatePlayBtn();
    showToast("⚠️ Is song ki audio file nahi hai");
  }

  // Play count (sirf local songs ke liye)
  if (!song.isJamendo) {
    fetch(`/api/songs/${song.id}/play`, { method:"POST" });
  }

  updatePlayingRows();
}

function updatePlayingRows() {
  document.querySelectorAll(".song-row").forEach(r => r.classList.remove("playing"));
  if (state.currentSong) {
    const row = document.getElementById(`row-${state.currentSong.id}`);
    if (row) row.classList.add("playing");
  }
}

function togglePlay() {
  if (!state.currentSong) return;
  if (audio.paused) { audio.play(); state.isPlaying = true; }
  else { audio.pause(); state.isPlaying = false; }
  updatePlayBtn();
}

function updatePlayBtn() {
  const btn = document.getElementById("playPauseBtn");
  btn.innerHTML = state.isPlaying
    ? `<i class="fa-solid fa-pause"></i>`
    : `<i class="fa-solid fa-play"></i>`;
}

function nextSong() {
  if (!state.queue.length) return;
  state.currentIndex = state.isShuffle
    ? Math.floor(Math.random() * state.queue.length)
    : (state.currentIndex + 1) % state.queue.length;
  playSong(state.queue[state.currentIndex]);
}

function prevSong() {
  if (!state.queue.length) return;
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  state.currentIndex = (state.currentIndex - 1 + state.queue.length) % state.queue.length;
  playSong(state.queue[state.currentIndex]);
}

function onSongEnd() {
  if (state.isRepeat) { audio.currentTime = 0; audio.play(); return; }
  nextSong();
}

function toggleShuffle() {
  state.isShuffle = !state.isShuffle;
  document.getElementById("shuffleBtn").classList.toggle("active", state.isShuffle);
  showToast(state.isShuffle ? "🔀 Shuffle on" : "Shuffle off");
}

function toggleRepeat() {
  state.isRepeat = !state.isRepeat;
  document.getElementById("repeatBtn").classList.toggle("active", state.isRepeat);
  showToast(state.isRepeat ? "🔁 Repeat on" : "Repeat off");
}

function updateProgress() {
  if (!audio.duration) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressThumb").style.left = pct + "%";
  document.getElementById("currentTime").textContent = fmtDur(audio.currentTime);
}

function seekTo(e) {
  const bar = document.getElementById("progressBar");
  const rect = bar.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  audio.currentTime = pct * audio.duration;
}

function setVolume(val) {
  state.volume = val / 100;
  audio.volume = state.volume;
  state.isMuted = false;
  const icon = document.getElementById("muteBtn").querySelector("i");
  icon.className = val < 1 ? "fa-solid fa-volume-xmark" : val < 50 ? "fa-solid fa-volume-low" : "fa-solid fa-volume-high";
}

function toggleMute() {
  state.isMuted = !state.isMuted;
  audio.muted = state.isMuted;
  const icon = document.getElementById("muteBtn").querySelector("i");
  icon.className = state.isMuted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
}

// ── UPLOAD ─────────────────────────────────────────────
function handleAudioSelect(input) {
  const zone = document.getElementById("audioDropZone");
  if (input.files[0]) {
    zone.classList.add("has-file");
    zone.querySelector("p").textContent = input.files[0].name;
    zone.querySelector("i").className = "fa-solid fa-circle-check";
    zone.querySelector("i").style.color = "var(--green)";
  }
}

function handleCoverSelect(input) {
  const zone = document.getElementById("coverDropZone");
  if (input.files[0]) {
    zone.classList.add("has-file");
    zone.querySelector("p").textContent = input.files[0].name;
    zone.querySelector("i").className = "fa-solid fa-circle-check";
    zone.querySelector("i").style.color = "var(--green)";
    const reader = new FileReader();
    reader.onload = e => { zone.style.backgroundImage=`url(${e.target.result})`; zone.style.backgroundSize="cover"; };
    reader.readAsDataURL(input.files[0]);
  }
}

async function uploadSong() {
  const title = document.getElementById("upTitle").value.trim();
  const artist = document.getElementById("upArtist").value.trim();
  const album = document.getElementById("upAlbum").value.trim();
  const genre = document.getElementById("upGenre").value;
  const audioFile = document.getElementById("audioFile").files[0];
  const coverFile = document.getElementById("coverFile").files[0];
  const msg = document.getElementById("uploadMsg");
  if (!title||!artist) { msg.textContent="Title aur Artist required hai!"; msg.className="upload-msg error"; return; }
  if (!audioFile) { msg.textContent="Audio file select karo!"; msg.className="upload-msg error"; return; }
  const fd = new FormData();
  fd.append("title",title); fd.append("artist",artist);
  fd.append("album",album); fd.append("genre",genre);
  fd.append("audio",audioFile);
  if (coverFile) fd.append("cover",coverFile);
  msg.textContent="Uploading..."; msg.className="upload-msg";
  const res = await fetch("/api/songs/upload", { method:"POST", body:fd });
  const data = await res.json();
  if (data.success) {
    msg.textContent="✅ Song upload ho gayi!"; msg.className="upload-msg success";
    await loadSongs();
    renderStats();
    ["upTitle","upAlbum","upArtist"].forEach(id => document.getElementById(id).value="");
    document.getElementById("audioFile").value="";
    document.getElementById("coverFile").value="";
    ["audioDropZone","coverDropZone"].forEach(id => {
      const z = document.getElementById(id);
      z.classList.remove("has-file");
      z.style.backgroundImage="";
    });
  } else {
    msg.textContent=data.msg||"Upload failed"; msg.className="upload-msg error";
  }
}

// ── HELPERS ────────────────────────────────────────────
function fmtDur(s) {
  if (!s||isNaN(s)) return "0:00";
  const m = Math.floor(s/60), sec = Math.floor(s%60);
  return `${m}:${sec.toString().padStart(2,"0")}`;
}

function fmtPlays(n) {
  if (!n) return "0 plays";
  if (n>=1000) return (n/1000).toFixed(1)+"k plays";
  return n+" plays";
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str||"";
  return d.innerHTML;
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.classList.remove("show"); setTimeout(()=>t.classList.add("hidden"),300); }, 2500);
}

// ── KEYBOARD SHORTCUTS ─────────────────────────────────
document.addEventListener("keydown", e => {
  if (["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)) return;
  if (e.code==="Space") { e.preventDefault(); togglePlay(); }
  if (e.code==="ArrowRight") { audio.currentTime=Math.min(audio.duration||0, audio.currentTime+10); }
  if (e.code==="ArrowLeft")  { audio.currentTime=Math.max(0, audio.currentTime-10); }
  if (e.code==="KeyM") toggleMute();
});

// ── START ──────────────────────────────────────────────
init();
