const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const { test } = require('node:test');
const path = require('node:path');

const songId = '5af0c312-53e0-4ad1-a153-68d13bef02c6';
function setup() {
  const window = new EventTarget();
  const frame = new EventTarget();
  const messages = [];
  const timers = [];
  frame.contentWindow = { postMessage: (message, origin) => messages.push({ message, origin }) };
  const status = { textContent: '' };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../suno-player.js'), 'utf8'), {
    window, EventTarget, Event, crypto: { randomUUID }, setInterval(callback) { timers.push(callback); }, Date, console
  });
  const player = new window.HBSunoAudio(frame, status);
  player.load({ sunoId: songId, title: 'Test', duration: 329.84 });
  frame.dispatchEvent(new Event('load'));
  messages.length = 0;
  function state(extra = {}, envelope = {}) {
    const event = Object.assign(new Event('message'), {
      origin: 'https://suno.com', source: frame.contentWindow,
      data: { channel: 'hinata-suno-player-v1', type: 'state', songId,
        token: player.token, available: true, paused: true, currentTime: 0,
        duration: null, readyState: 0, reason: 'ready', ...extra }, ...envelope
    });
    window.dispatchEvent(event);
  }
  return { player, frame, messages, state, status, timers };
}

test('rejects other origins, frames, song IDs and stale tokens', () => {
  const { player, state } = setup();
  state({}, { origin: 'https://example.com' });
  state({}, { source: {} });
  state({ songId: randomUUID() });
  state({ token: randomUUID() });
  assert.equal(player.connected, false);
  state();
  assert.equal(player.connected, true);
});

test('queues play/resume until bridge and real audio metadata are ready', async () => {
  const { player, state, messages } = setup();
  await player.play();
  player.currentTime = 120;
  assert.equal(messages.length, 0);
  state();
  assert.deepEqual(messages.map(x => x.message.command), ['volume', 'rate', 'play']);
  state({ duration: 329.84, readyState: 1, reason: 'loadedmetadata' });
  assert.equal(messages.at(-1).message.command, 'seek');
  assert.equal(messages.at(-1).message.seconds, 120);
  assert.ok(messages.every(x => x.origin === 'https://suno.com'));
});

test('ignores the outgoing document until the new embed has loaded', async () => {
  const { player, frame, state, messages } = setup();
  state();
  assert.equal(player.connected, true);
  player.load({ sunoId: songId, title: 'Reload', duration: 329.84 });
  messages.length = 0;
  await player.play();
  state({ readyState: 4, duration: 329.84 });
  assert.equal(player.connected, false);
  assert.equal(messages.length, 0);
  frame.dispatchEvent(new Event('load'));
  assert.equal(messages.at(-1).message.command, 'hello');
  state();
  assert.equal(messages.at(-1).message.command, 'play');
});

test('ended reason advances even when Suno has already rewound the snapshot', () => {
  const { player, state, messages } = setup();
  let ended = 0;
  player.addEventListener('ended', () => ended++);
  state({ paused: false, currentTime: 329, readyState: 4, duration: 329.84 });
  state({ reason: 'ended', paused: false, ended: false, currentTime: 0, readyState: 4, duration: 329.84 });
  assert.equal(ended, 1);
  assert.equal(messages.at(-1).message.command, 'pause');
});

test('deactivation unloads the frame and ignores late state', () => {
  const { player, frame, state } = setup();
  state({ currentTime: 50 });
  player.deactivate();
  state({ currentTime: 70 });
  assert.equal(frame.src, 'about:blank');
  assert.equal(player.connected, false);
  assert.equal(player.currentTime, 50);
});

test('volume/rate reject invalid values and send valid settings', () => {
  const { player, state, messages } = setup();
  state();
  player.volume = -1;
  player.playbackRate = 0;
  assert.equal(player.volume, 1);
  assert.equal(player.playbackRate, 1);
  player.volume = 0.4;
  player.playbackRate = 1.25;
  assert.deepEqual(messages.slice(-2).map(x => [x.message.command, x.message.value]), [['volume', 0.4], ['rate', 1.25]]);
});

test('playback failures keep native controls visible through heartbeats until playback succeeds', () => {
  const { player, state, status } = setup();
  let changed = 0;
  player.addEventListener('connectionchange', () => changed++);
  state({ error: 'NotAllowedError', reason: 'command-error' });
  assert.equal(player.connected, true);
  assert.equal(player.nativeControlsRequired, true);
  state({ reason: 'heartbeat' });
  assert.equal(player.nativeControlsRequired, true);
  assert.match(status.textContent, /Suno枠内/);
  state({ reason: 'playing', readyState: 4, duration: 329.84, paused: false });
  assert.equal(player.nativeControlsRequired, false);
  assert.equal(changed, 2);
});

test('native media errors also reveal the fallback and track changes reset it', () => {
  const { player, state } = setup();
  state({ reason: 'error' });
  assert.equal(player.nativeControlsRequired, true);
  player.load({ sunoId: songId, title: 'Reload', duration: 329.84 });
  assert.equal(player.nativeControlsRequired, false);
  assert.equal(player.connected, false);
});

test('a stalled first play reveals native controls instead of leaving a hidden unresponsive player', async () => {
  const { player, state, timers } = setup();
  state();
  await player.play();
  player._playStartedAt = Date.now() - 13000;
  timers[0]();
  assert.equal(player.connected, true);
  assert.equal(player.nativeControlsRequired, true);
  state({ reason: 'heartbeat' });
  assert.equal(player.nativeControlsRequired, true);
});
