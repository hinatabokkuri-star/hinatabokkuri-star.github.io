// Node.js script to extract songs.js data → songs.json
// Usage: cd E:/Claude/portfolio && node gen_songs_json.js
// Creates /data/songs.json consumable by other projects (games/rhythm-web etc.)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SW_ROOT = __dirname;
const src = fs.readFileSync(path.join(SW_ROOT, 'songs.js'), 'utf8');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(src, context);

const songs = context.window.HB_SONGS || [];

// Parse LRC string into structured timestamps for rhythm game use
function parseLRC(lrc, ends = []) {
  if (!lrc) return [];
  const lines = lrc.split('\n').map(line => {
    const m = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
    if (!m) return null;
    const t = parseInt(m[1]) * 60 + parseFloat(m[2]);
    const txt = m[3].trim();
    if (!txt || txt.startsWith('[')) return null;
    return { time: t, text: txt };
  }).filter(Boolean);
  return lines.map((line, index) => Number.isFinite(ends[index]) && ends[index] >= line.time
    ? { ...line, end: ends[index] } : line);
}

// Resolve cover/file URLs to absolute (for cross-origin consumers)
const BASE = 'https://hinatabokkuri-star.github.io';
const enriched = songs.map(s => ({
  title: s.title,
  file: s.file,
  file_url: s.playback === 'suno' ? null : `${BASE}/music/${s.file}`,
  playback_type: s.playback === 'suno' ? 'suno' : 'file',
  ...(s.playback === 'suno' ? {
    suno_url: `https://suno.com/song/${s.sunoId}`,
    embed_url: `https://suno.com/embed/${s.sunoId}`,
    lyrics_text: s.lyricsText || '',
  } : {}),
  cover: s.cover,
  cover_url: s.cover.startsWith('http') ? s.cover : `${BASE}/${s.cover}`,
  genre: s.genre,
  bpm: s.bpm || null,
  album: s.album || null,
  comment: s.comment,
  lyrics_lrc: s.lyrics || '',
  lyrics_parsed: parseLRC(s.lyrics, s.lyricsEnds),
}));

const out = {
  schema_version: 2,
  updated: new Date().toISOString(),
  base_url: BASE,
  count: enriched.length,
  songs: enriched,
};

const outDir = path.join(SW_ROOT, 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(path.join(outDir, 'songs.json'), JSON.stringify(out, null, 2));

console.log(`Wrote ${enriched.length} songs to data/songs.json`);
