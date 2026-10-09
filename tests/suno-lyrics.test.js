'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { buildCues, toLRC } = require('../scripts/suno_alignment_to_lrc');

test('maps repeated lyrics in order and retains instrumental gaps without inventing times', () => {
  const prompt = '[Intro]\n風の中\n[Interlude]\n風の中';
  const words = [
    { word: '[Intro]\n風の', start_s: 10, end_s: 11 },
    { word: '中', start_s: 11, end_s: 12 },
    { word: '\n[Interlude]\n風の', start_s: 30, end_s: 31 },
    { word: '中', start_s: 31, end_s: 32 },
  ];
  assert.deepEqual(buildCues(prompt, words, 40), [
    { time: 10, end: 12, text: '風の中' },
    { time: 30, end: 32, text: '風の中' },
  ]);
  assert.equal(toLRC(buildCues(prompt, words, 40)), '[0:10.000]風の中\n[0:30.000]風の中');
});

test('rejects mismatched text, failed alignment and overlapping timings', () => {
  assert.throws(() => buildCues('風', [{ word: '空', start_s: 1, end_s: 2 }], 10), /match/);
  assert.throws(() => buildCues('風', [{ word: '風', start_s: 1, end_s: 2, success: false }], 10), /Unusable/);
  assert.throws(() => buildCues('風\n空', [
    { word: '風', start_s: 1, end_s: 4 },
    { word: '\n空', start_s: 3, end_s: 5 },
  ], 10), /overlap/);
});

test('reviewed token omissions keep the full original text and use remaining measured timestamps', () => {
  assert.deepEqual(buildCues('風の中', [
    { word: '風', start_s: 1, end_s: 9 },
    { word: 'の', start_s: 10, end_s: 11 },
    { word: '中', start_s: 11, end_s: 12 },
  ], 20, [0]), [{ time: 10, end: 12, text: '風の中' }]);
});

test('published song covers all 76 original lines with bounded cues and distinct repeated choruses', () => {
  const root = path.join(__dirname, '..');
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'songs.js'), 'utf8'), context);
  const song = context.window.HB_SONGS.find(song => song.sunoId === '5af0c312-53e0-4ad1-a153-68d13bef02c6');
  const original = JSON.parse(fs.readFileSync(path.join(root, 'data/suno-test-lyrics.json'), 'utf8')).prompt
    .split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('['));
  const lyrics = song.lyrics.split('\n').map(line => {
    const match = line.match(/^\[(\d+):(\d+\.\d+)\](.*)$/);
    assert.ok(match, 'Every line has a real timestamp');
    return { time: Number(match[1]) * 60 + Number(match[2]), text: match[3] };
  });
  assert.equal(lyrics.length, 76);
  assert.deepEqual(lyrics.map(line => line.text), original);
  assert.equal(song.lyricsEnds.length, 76);
  lyrics.forEach((line, index) => {
    assert.ok(line.time >= 0 && song.lyricsEnds[index] >= line.time && song.lyricsEnds[index] <= song.duration);
    if (index) assert.ok(line.time >= song.lyricsEnds[index - 1]);
  });
  const chorus = lyrics.filter(line => line.text === 'ひと駅ぶんの　逃避行');
  assert.deepEqual(chorus.map(line => Number(line.time.toFixed(3))), [64.787, 144.176, 256.915, 282.287]);
  assert.ok(lyrics[20].time - song.lyricsEnds[19] > 10);
  assert.ok(lyrics[40].time - song.lyricsEnds[39] > 10);
});
