// ==UserScript==
// @name         HINATA Suno player bridge
// @namespace    https://hinatabokkuri-star.github.io/
// @version      0.2.0
// @description  Relay playback state and controls for HINATA AI MUSIC. No audio capture.
// @match        https://suno.com/embed/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';
  const parentOrigin = 'https://hinatabokkuri-star.github.io';
  const match = location.pathname.match(/^\/embed\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/?$/i);
  const songId = match?.[1];
  const channel = 'hinata-suno-player-v1';
  if (location.origin !== 'https://suno.com' || !songId || window.parent === window) return;
  if (window.__hinataSunoBridgeDispose) window.__hinataSunoBridgeDispose();

  let audio = null;
  let token = null;
  let disposed = false;
  let bootstrapping = false;
  const events = ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'playing', 'pause', 'seeking', 'seeked', 'waiting', 'ended', 'ratechange', 'volumechange', 'error'];
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
      available: Boolean(audio),
      volume: audio ? finite(audio.volume) : null,
      playbackRate: audio ? finite(audio.playbackRate) : null
    }, parentOrigin);
  };
  const onAudioEvent = event => {
    if (['loadedmetadata', 'playing', 'error'].includes(event.type)) bootstrapping = false;
    send(event.type);
  };
  const findAudio = () => {
    const next = document.querySelector('audio');
    if (next === audio) return;
    if (audio) events.forEach(name => audio.removeEventListener(name, onAudioEvent));
    audio = next;
    bootstrapping = false;
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
        case 'play':
          // The embed sets its media source on the first native Play action.
          if (bootstrapping) { send('initializing', data.requestId); return; }
          if (audio.readyState === 0 && !Number.isFinite(audio.duration)) {
            const buttons = document.querySelectorAll('button');
            if (buttons.length !== 1 || buttons[0].disabled) throw new DOMException('SunoPlayerNotReady', 'InvalidStateError');
            bootstrapping = true;
            buttons[0].click();
            send('initializing', data.requestId);
            return;
          }
          await audio.play();
          break;
        case 'pause': audio.pause(); break;
        case 'seek':
          if (!Number.isFinite(data.seconds) || data.seconds < 0 || !Number.isFinite(audio.duration)) throw new RangeError('InvalidSeek');
          audio.currentTime = Math.min(data.seconds, audio.duration);
          break;
        case 'volume':
          if (!Number.isFinite(data.value) || data.value < 0 || data.value > 1) throw new RangeError('InvalidVolume');
          audio.volume = data.value;
          break;
        case 'rate':
          if (!Number.isFinite(data.value) || data.value < 0.25 || data.value > 4) throw new RangeError('InvalidRate');
          audio.playbackRate = data.value;
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
