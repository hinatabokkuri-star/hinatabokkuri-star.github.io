// Convert lyric metadata captured from the official Suno editor. No audio or
// credentials are read. Text must match completely before timestamps are used.
'use strict';
const fs = require('node:fs');

function normalize(text) {
  return text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, '');
}

function buildCues(prompt, alignment, duration, omitTokens = []) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('A verified duration is required');
  const lines = prompt.split(/\r?\n/).map(line => line.trim())
    .filter(line => line && !line.startsWith('['));
  if (!lines.length || !Array.isArray(alignment) || !alignment.length) {
    throw new Error('Missing lyrics or alignment');
  }
  if (normalize(alignment.map(word => word.word).join('')) !== normalize(lines.join(''))) {
    throw new Error('Aligned text does not match the original lyrics');
  }
  const omitted = new Set(omitTokens);
  if (omitTokens.some(index => !Number.isInteger(index) || index < 0 || index >= alignment.length)) {
    throw new Error('Invalid omitted token index');
  }
  let offset = 0;
  const spans = alignment.map((word, index) => {
    const start = offset;
    offset += normalize(word.word).length;
    return { start, end: offset, word, index };
  });
  offset = 0;
  const cues = lines.map(text => {
    const start = offset;
    offset += normalize(text).length;
    const words = spans.filter(span => span.end > start && span.start < offset && !omitted.has(span.index))
      .map(span => span.word);
    if (!words.length || words.some(word => word.success === false ||
        !Number.isFinite(word.start_s) || !Number.isFinite(word.end_s) ||
        word.start_s < 0 || word.end_s < word.start_s || word.end_s > duration)) {
      throw new Error(`Unusable timing for: ${text}`);
    }
    return { time: words[0].start_s, end: words.at(-1).end_s, text };
  });
  if (cues.some((cue, index) => index && cue.time < cues[index - 1].end)) {
    throw new Error('Lyric timings overlap or are out of order');
  }
  return cues;
}

function toLRC(cues) {
  return cues.map(cue => {
    const millis = Math.round(cue.time * 1000);
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(3).padStart(6, '0');
    return `[${minutes}:${seconds}]${cue.text}`;
  }).join('\n');
}

if (require.main === module) {
  const [input, promptFile, output, ...flags] = process.argv.slice(2);
  if (!input || !promptFile || !output) {
    throw new Error('Usage: node scripts/suno_alignment_to_lrc.js alignment.json prompt.json output-base --duration=SECONDS [--omit-tokens=INDEX,INDEX]');
  }
  const duration = Number(flags.find(flag => flag.startsWith('--duration='))?.split('=')[1]);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('A verified duration is required');
  const omit = flags.find(flag => flag.startsWith('--omit-tokens='))?.split('=')[1];
  const omitTokens = omit ? omit.split(',').map(Number) : [];
  const native = JSON.parse(fs.readFileSync(input, 'utf8'));
  const original = JSON.parse(fs.readFileSync(promptFile, 'utf8'));
  const cues = buildCues(original.prompt, native.alignment, duration, omitTokens);
  fs.writeFileSync(`${output}.lrc`, toLRC(cues) + '\n');
  fs.writeFileSync(`${output}.cues.json`, JSON.stringify({
    songId: native.songId, source: native.source, duration,
    omittedTokens: omitTokens.map(index => ({ index, ...native.alignment[index] })), cues
  }, null, 2) + '\n');
  console.log(`Converted ${cues.length} lines; ${omitTokens.length} explicitly reviewed tokens omitted.`);
}

module.exports = { buildCues, toLRC };
