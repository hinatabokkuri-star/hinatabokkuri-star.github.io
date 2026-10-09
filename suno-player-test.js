(() => {
  'use strict';
  const songId = '5af0c312-53e0-4ad1-a153-68d13bef02c6';
  const channel = 'hinata-suno-player-v1';
  const storageKey = `hinata:suno-cues:v1:${songId}`;
  const token = crypto.randomUUID();
  const $ = id => document.getElementById(id);
  const frame = $('suno-frame');
  let state = null;
  let connected = false;
  let lastMessage = 0;
  let selected = 0;
  let lyrics = [];
  let cues = [];
  let rowButtons = [];
  let active = -1;
  let playbackError = null;
  const pendingStamps = new Map();
  const validTime = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const clock = seconds => {
    if (!validTime(seconds)) return '—';
    const tenths = Math.round(seconds * 10);
    return `${Math.floor(tenths / 600)}:${String(Math.floor(tenths / 10) % 60).padStart(2, '0')}.${tenths % 10}`;
  };
  const lrcTime = seconds => {
    const hundredths = Math.round(seconds * 100);
    return `${String(Math.floor(hundredths / 6000)).padStart(2, '0')}:${String(Math.floor(hundredths / 100) % 60).padStart(2, '0')}.${String(hundredths % 100).padStart(2, '0')}`;
  };
  const command = (name, extra = {}, requestId = crypto.randomUUID()) => {
    frame.contentWindow.postMessage({...extra, channel, type: 'command', songId, token, command: name, requestId}, 'https://suno.com');
    return requestId;
  };
  const refreshControls = () => {
    $('play').disabled = !connected;
    $('pause').disabled = !connected;
    $('restart').disabled = !connected || !validTime(state?.duration);
    $('seek').disabled = !connected || !validTime(state?.duration);
    $('stamp').disabled = !connected || !lyrics.length || Boolean(pendingStamps.size);
    $('jump').disabled = !connected || !validTime(cues[selected]);
    $('clear-cue').disabled = !validTime(cues[selected]);
    $('export-lrc').disabled = !cues.some(validTime);
  };
  const updateRows = () => {
    let nextActive = -1;
    let latestTime = -1;
    const now = state?.currentTime;
    cues.forEach((time, index) => {
      if (validTime(time) && validTime(now) && time <= now && time >= latestTime) {
        latestTime = time;
        nextActive = index;
      }
    });
    rowButtons.forEach((button, index) => {
      button.classList.toggle('selected', index === selected);
      button.setAttribute('aria-pressed', String(index === selected));
      button.classList.toggle('active', index === nextActive);
      button.querySelector('time').textContent = validTime(cues[index]) ? clock(cues[index]) : '未設定';
    });
    if (nextActive >= 0 && nextActive !== active) {
      const container = $('lyrics');
      const row = rowButtons[nextActive];
      container.scrollTo({top: row.offsetTop - container.offsetTop - container.clientHeight / 3, behavior: 'smooth'});
    }
    active = nextActive;
    const count = cues.filter(validTime).length;
    $('cue-status').textContent = `${count} / ${lyrics.length} 行に時刻設定済み。選択中: ${selected + 1} 行目「${lyrics[selected] || ''}」`;
    refreshControls();
  };
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({version: 1, lyrics, cues})); }
    catch { $('cue-status').textContent = 'このブラウザーでは時刻を保存できません。LRCを保存してください。'; }
  };
  window.addEventListener('message', event => {
    if (event.origin !== 'https://suno.com' || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.channel !== channel || data.type !== 'state' || data.songId !== songId || data.token !== token) return;
    if (typeof data.paused !== 'boolean' || typeof data.available !== 'boolean') return;
    if (data.currentTime !== null && !validTime(data.currentTime)) return;
    if (data.duration !== null && !validTime(data.duration)) return;
    state = data;
    lastMessage = Date.now();
    connected = data.available;
    $('connection').classList.toggle('connected', connected);
    $('connection').textContent = connected ? 'Sunoプレイヤーに接続済み。実際の再生時刻に追従しています。' : 'Sunoの音声プレイヤーを待っています。';
    $('clock').textContent = `${clock(data.currentTime)} / ${clock(data.duration)}`;
    if (validTime(data.duration) && data.duration > 0) $('seek').max = String(data.duration);
    if (validTime(data.currentTime) && document.activeElement !== $('seek')) $('seek').value = String(data.currentTime);
    $('playback-state').textContent = data.ended ? '再生終了を検知しました。' : data.seeking ? '指定した位置へ移動中' : data.paused ? '一時停止中' : '再生中';
    if (data.error) playbackError = data.error;
    else if (['play', 'playing', 'pause', 'seek'].includes(data.reason)) playbackError = null;
    if (playbackError) {
      $('playback-state').textContent = playbackError === 'NotAllowedError' ? 'ブラウザーが再生を制限しています。Suno枠内の再生ボタンを一度押してください。' : `操作できませんでした (${playbackError})。Suno枠内の操作も確認してください。`;
    }
    const pending = pendingStamps.get(data.requestId);
    if (pending) {
      clearTimeout(pending.timer);
      pendingStamps.delete(data.requestId);
      if (!data.error && validTime(data.currentTime)) {
        cues[pending.index] = data.currentTime;
        selected = Math.min(pending.index + 1, lyrics.length - 1);
        persist();
      }
    }
    updateRows();
  });
  $('play').addEventListener('click', () => command('play'));
  $('pause').addEventListener('click', () => command('pause'));
  $('restart').addEventListener('click', () => command('seek', {seconds: 0}));
  $('seek').addEventListener('input', () => { $('clock').textContent = `${clock(Number($('seek').value))} / ${clock(state?.duration)}`; });
  $('seek').addEventListener('change', () => command('seek', {seconds: Number($('seek').value)}));
  $('stamp').addEventListener('click', () => {
    if (!connected || !lyrics.length || pendingStamps.size) return;
    const requestId = crypto.randomUUID();
    const timer = setTimeout(() => {
      pendingStamps.delete(requestId);
      refreshControls();
      $('cue-status').textContent = '再生時刻の取得が間に合いませんでした。もう一度押してください。';
    }, 4000);
    pendingStamps.set(requestId, {index: selected, timer});
    refreshControls();
    command('stamp', {}, requestId);
  });
  $('jump').addEventListener('click', () => { if (validTime(cues[selected])) command('seek', {seconds: cues[selected]}); });
  $('clear-cue').addEventListener('click', () => { cues[selected] = null; persist(); updateRows(); });
  $('export-lrc').addEventListener('click', () => {
    const lines = ['[ti:ひと駅ぶんの逃避行]', '[ar:HINATABOKKURI]'];
    cues.map((time, index) => ({time, index})).filter(item => validTime(item.time)).sort((a, b) => a.time - b.time || a.index - b.index).forEach(item => lines.push(`[${lrcTime(item.time)}]${lyrics[item.index]}`));
    const url = URL.createObjectURL(new Blob([lines.join('\n') + '\n'], {type: 'text/plain;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hitoeki-bun-no-tohiko.lrc';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  fetch('data/suno-test-lyrics.json', {cache: 'no-store'}).then(response => {
    if (!response.ok) throw new Error('LyricsUnavailable');
    return response.json();
  }).then(data => {
    if (data.songId !== songId || typeof data.prompt !== 'string') throw new Error('WrongLyrics');
    const entries = data.prompt.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    lyrics = entries.filter(line => !/^\[.*\]$/.test(line));
    cues = lyrics.map(() => null);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (saved?.version === 1 && JSON.stringify(saved.lyrics) === JSON.stringify(lyrics) && Array.isArray(saved.cues) && saved.cues.length === lyrics.length) cues = saved.cues.map(value => validTime(value) ? value : null);
    } catch { /* Ignore incomplete local timing data. */ }
    let index = 0;
    entries.forEach(line => {
      if (/^\[.*\]$/.test(line)) {
        const section = document.createElement('p');
        section.className = 'section';
        section.textContent = line;
        $('lyrics').append(section);
        return;
      }
      const lyricIndex = index++;
      const button = document.createElement('button');
      button.className = 'lyric-row';
      button.type = 'button';
      button.dataset.line = String(lyricIndex);
      const time = document.createElement('time');
      const text = document.createElement('span');
      text.textContent = line;
      button.append(time, text);
      button.addEventListener('click', () => { selected = lyricIndex; updateRows(); });
      rowButtons.push(button);
      $('lyrics').append(button);
    });
    updateRows();
  }).catch(() => { $('cue-status').textContent = '歌詞を読み込めませんでした。ページを再読み込みしてください。'; });

  frame.addEventListener('load', () => { connected = false; lastMessage = 0; refreshControls(); command('hello'); });
  setInterval(() => {
    if (connected && Date.now() - lastMessage > 4000) {
      connected = false;
      $('connection').classList.remove('connected');
      $('connection').textContent = '連携スクリプトとの接続が途切れました。再接続を待っています。';
      refreshControls();
    }
    if (!connected) command('hello');
  }, 1000);
  command('hello');
})();
