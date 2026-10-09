// Official Suno embeds use their own media element. The optional browser
// extension relays state/commands; this adapter never fetches audio data.
(() => {
  'use strict';
  const channel = 'hinata-suno-player-v1';
  const origin = 'https://suno.com';
  const validId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

  class SunoAudio extends EventTarget {
    constructor(frame, status) {
      super();
      this.frame = frame;
      this.status = status;
      this.active = false;
      this.connected = false;
      this._volume = 1;
      this._rate = 1;
      this._state = { paused: true, currentTime: 0, duration: NaN, readyState: 0 };
      window.addEventListener('message', event => this._receive(event));
      frame.addEventListener('load', () => {
        if (!this.active) return;
        this._frameLoaded = true;
        this._send('hello');
      });
      setInterval(() => {
        if (!this.active) return;
        if (this.connected && Date.now() - this._lastSeen > 10000) {
          this.connected = false;
          this._show('連携を再確認中です。Suno枠内からも再生できます。');
          this.dispatchEvent(new Event('connectionchange'));
        }
        this._send('hello');
      }, 1000);
    }

    load(song) {
      if (!validId.test(song.sunoId || '')) throw new TypeError('Invalid Suno song ID');
      this.active = true;
      this.connected = false;
      this._frameLoaded = false;
      this.songId = song.sunoId;
      this.token = crypto.randomUUID();
      this._pendingPlay = false;
      this._pendingSeek = null;
      this._lastSeen = 0;
      this._state = { paused: true, currentTime: 0, duration: song.duration || NaN, readyState: 0 };
      this.embedUrl = `${origin}/embed/${this.songId}`;
      this.frame.title = `${song.title} — Sunoプレイヤー`;
      this.frame.src = this.embedUrl;
      this._show('Suno枠内の ▶ で再生できます。Edge拡張を有効にすると、このサイトの操作ボタンも使えます。');
      this.dispatchEvent(new Event('connectionchange'));
    }

    deactivate() {
      this.active = false;
      this.connected = false;
      this._frameLoaded = false;
      this.token = null;
      this._pendingPlay = false;
      this._pendingSeek = null;
      this.frame.src = 'about:blank';
      this._state.paused = true;
      this.dispatchEvent(new Event('connectionchange'));
    }

    get paused() { return this._state.paused; }
    get duration() { return this._state.duration; }
    get readyState() { return this._state.readyState; }
    get currentTime() { return this._state.currentTime; }
    set currentTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0 || !this.active) return;
      this._pendingSeek = seconds;
      this._flushSeek();
    }
    get volume() { return this._volume; }
    set volume(value) {
      if (!Number.isFinite(value) || value < 0 || value > 1) return;
      this._volume = value;
      if (this.connected) this._send('volume', { value });
    }
    get playbackRate() { return this._rate; }
    set playbackRate(value) {
      if (!Number.isFinite(value) || value < 0.25 || value > 4) return;
      this._rate = value;
      if (this.connected) this._send('rate', { value });
    }

    play() {
      if (!this.active) return Promise.resolve();
      this._pendingPlay = true;
      if (this.connected) {
        this._pendingPlay = false;
        this._show('Sunoで再生を開始しています…');
        this._send('play');
      }
      return Promise.resolve();
    }

    pause() {
      this._pendingPlay = false;
      if (!this.active) return;
      if (this.connected) this._send('pause');
      else {
        // Reloading the official frame stops playback even without the bridge.
        this._frameLoaded = false;
        this.frame.src = this.embedUrl;
        this._state.paused = true;
        this.dispatchEvent(new Event('pause'));
      }
    }

    _show(message) { this.status.textContent = message; }
    _send(command, extra = {}) {
      if (!this.active || !this.token || !this._frameLoaded) return;
      this.frame.contentWindow?.postMessage({
        channel, type: 'command', songId: this.songId, token: this.token,
        command, ...extra
      }, origin);
    }
    _flushSeek() {
      if (!this.connected || this.readyState < 1 || this._pendingSeek === null) return;
      const seconds = Math.min(this._pendingSeek, this.duration);
      this._pendingSeek = null;
      this._send('seek', { seconds });
    }

    _receive(event) {
      if (!this.active || !this._frameLoaded || event.origin !== origin || event.source !== this.frame.contentWindow) return;
      const data = event.data;
      if (!data || data.channel !== channel || data.type !== 'state' ||
          data.token !== this.token || data.songId !== this.songId) return;
      this._lastSeen = Date.now();
      const wasConnected = this.connected;
      const previous = this._state;
      this.connected = data.available === true;
      const duration = Number.isFinite(data.duration) && data.duration > 0 ? data.duration : previous.duration;
      this._state = {
        duration,
        currentTime: Number.isFinite(data.currentTime) && data.currentTime >= 0 ? data.currentTime : previous.currentTime,
        paused: data.paused !== false,
        readyState: Number.isInteger(data.readyState) ? data.readyState : 0
      };
      if (this.connected && !wasConnected) {
        this._send('volume', { value: this._volume });
        this._send('rate', { value: this._rate });
        if (this._pendingPlay) {
          this._pendingPlay = false;
          this._send('play');
        }
      }
      this._flushSeek();
      if (data.error) this._show('再生を開始できませんでした。Suno枠内の ▶ を押してください。');
      else if (this.connected) this._show('Suno連携中 · 再生・停止・シーク・音量・速度を操作できます');
      else this._show('Sunoプレイヤーを読み込み中です…');
      if (wasConnected !== this.connected || previous.readyState !== this.readyState) {
        this.dispatchEvent(new Event('connectionchange'));
      }
      if (duration !== previous.duration || data.reason === 'loadedmetadata') {
        this.dispatchEvent(new Event('loadedmetadata'));
      }
      if (previous.paused !== this.paused) this.dispatchEvent(new Event(this.paused ? 'pause' : 'play'));
      if (this.connected) this.dispatchEvent(new Event('timeupdate'));
      // Suno rewinds/replays in its own ended listener. The event reason remains
      // reliable even if the snapshot has already returned to time zero.
      if (data.reason === 'ended') {
        this._send('pause');
        this.dispatchEvent(new Event('ended'));
      }
    }
  }
  window.HBSunoAudio = SunoAudio;
})();
