// ==UserScript==
// @name         HINATA Suno player bridge (test)
// @namespace    https://hinatabokkuri-star.github.io/
// @version      0.1.0
// @description  Relay playback state and controls for the HINATA test page. No audio capture.
// @match        https://suno.com/embed/5af0c312-53e0-4ad1-a153-68d13bef02c6
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  const parentOrigin = 'https://hinatabokkuri-star.github.io';
  const songId = '5af0c312-53e0-4ad1-a153-68d13bef02c6';
  const channel = 'hinata-suno-player-v1';
  if (location.origin !== 'https://suno.com' || location.pathname !== `/embed/${songId}` || window.parent === window) return;
  if (window.__hinataSunoBridgeDispose) window.__hinataSunoBridgeDispose();

  let audio = null;
  let token = null;
  let disposed = false;
  const events = ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'playing', 'pause', 'seeking', 'seeked', 'waiting', 'ended', 'ratechange', 'error'];
  const finite = value => Number.isFinite(value) ? value : null;
  const send = (reason, requestId = null, error = null) => {
    if (disposed || !token) return;
    window.parent.postMessage({
      channel, type: 'state', songId, token, reason, requestId, error,
      currentTime: audio ? finite(audio.currentTime) : null,
      duration: audio ? finite(audio.duration) : null,
      paused: audio ? audio.paused : true,
      ended: audio ? audio.ended : false,
      seeking: audio ? audio.seeking : false,
      readyState: audio ? audio.readyState : 0,
      available: Boolean(audio)
    }, parentOrigin);
  };
  const onAudioEvent = event => send(event.type);
  const findAudio = () => {
    const next = document.querySelector('audio');
    if (next === audio) return;
    if (audio) events.forEach(name => audio.removeEventListener(name, onAudioEvent));
    audio = next;
    if (audio) events.forEach(name => audio.addEventListener(name, onAudioEvent));
    send('ready');
  };
  const onMessage = async event => {
    if (event.source !== window.parent || event.origin !== parentOrigin) return;
    const data = event.data;
    if (!data || data.channel !== channel || data.type !== 'command' || data.songId !== songId) return;
    if (typeof data.token !== 'string' || data.token.length < 16 || data.token.length > 100) return;
    if (data.command === 'hello') {
      token = data.token;
      findAudio();
      send('ready', data.requestId);
      return;
    }
    if (data.token !== token) return;
    findAudio();
    if (!audio) { send('unavailable', data.requestId, 'AudioUnavailable'); return; }
    try {
      switch (data.command) {
        case 'play': await audio.play(); break;
        case 'pause': audio.pause(); break;
        case 'seek':
          if (!Number.isFinite(data.seconds) || data.seconds < 0 || !Number.isFinite(audio.duration)) throw new RangeError('InvalidSeek');
          audio.currentTime = Math.min(data.seconds, audio.duration);
          break;
        case 'stamp': break;
        default: return;
      }
      send(data.command, data.requestId);
    } catch (error) {
      send('command-error', data.requestId, error.name || 'PlaybackError');
    }
  };

  window.addEventListener('message', onMessage);
  const observer = new MutationObserver(findAudio);
  observer.observe(document.documentElement, {childList: true, subtree: true});
  const heartbeat = setInterval(() => { findAudio(); send('heartbeat'); }, 1000);
  findAudio();
  window.__hinataSunoBridgeDispose = () => {
    disposed = true;
    clearInterval(heartbeat);
    observer.disconnect();
    window.removeEventListener('message', onMessage);
    if (audio) events.forEach(name => audio.removeEventListener(name, onAudioEvent));
    delete window.__hinataSunoBridgeDispose;
  };
})();
