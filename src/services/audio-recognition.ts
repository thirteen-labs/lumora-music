import { requestRecordingPermissionsAsync } from 'expo-audio';
import ExpoAudioModule from 'expo-audio/build/AudioModule';
import type { Song } from '@/types/media';

const AudioRecorderClass = ExpoAudioModule.AudioRecorder;

const RECORD_DURATION_MS = 5000;
const SAMPLE_RATE = 22050;
const FRAME_SIZE = 2048;
const HOP_SIZE = 1024;
const NUM_BANDS = 12;

const BAND_EDGES: number[] = [];
for (let i = 0; i <= NUM_BANDS; i++) {
  const freq = 50 * Math.pow(2, i * (Math.log2(16000 / 50) / NUM_BANDS));
  BAND_EDGES.push(Math.round(freq));
}

interface Fingerprint {
  songId: string;
  bands: number[][];
}



let libraryFingerprints: Fingerprint[] | null = null;
let fingerprintCacheId: string | null = null;

function hannWindow(n: number): number[] {
  const w: number[] = [];
  for (let i = 0; i < n; i++) {
    w.push(0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1))));
  }
  return w;
}

const HANN = hannWindow(FRAME_SIZE);

function computeFFT(samples: Float32Array): Float32Array {
  const n = samples.length;
  const real = new Float64Array(n);
  const imag = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    real[i] = samples[i] * HANN[i];
  }
  for (let k = 0; k < n / 2; k++) {
    let sumReal = 0;
    let sumImag = 0;
    for (let t = 0; t < n; t++) {
      const angle = (-2 * Math.PI * k * t) / n;
      sumReal += real[t] * Math.cos(angle);
      sumImag += real[t] * Math.sin(angle);
    }
    real[k] = sumReal;
    imag[k] = sumImag;
  }
  const mags = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    mags[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
  }
  return mags;
}

function extractBands(magnitudes: Float32Array): number[] {
  const bands: number[] = new Array(NUM_BANDS).fill(0);
  const binFreq = SAMPLE_RATE / FRAME_SIZE;
  for (let i = 0; i < magnitudes.length; i++) {
    const freq = i * binFreq;
    for (let b = 0; b < NUM_BANDS; b++) {
      if (freq >= BAND_EDGES[b] && freq < BAND_EDGES[b + 1]) {
        bands[b] += magnitudes[i];
        break;
      }
    }
  }
  const maxVal = Math.max(...bands, 1e-10);
  return bands.map((v) => v / maxVal);
}

function extractFingerprint(samples: Float32Array, sampleRate: number): number[][] {
  const frames: number[][] = [];
  const adjustedHop = Math.round(HOP_SIZE * (SAMPLE_RATE / Math.min(sampleRate, SAMPLE_RATE)));
  const adjustedFrame = Math.round(FRAME_SIZE * (SAMPLE_RATE / Math.min(sampleRate, SAMPLE_RATE)));
  let offset = 0;
  while (offset + adjustedFrame <= samples.length) {
    const frame_src = samples.slice(offset, offset + adjustedFrame);
    const resampled = new Float32Array(FRAME_SIZE);
    const ratio = FRAME_SIZE / adjustedFrame;
    for (let i = 0; i < FRAME_SIZE; i++) {
      const srcIdx = Math.min(Math.floor(i / ratio), adjustedFrame - 1);
      resampled[i] = frame_src[srcIdx];
    }
    const mags = computeFFT(resampled);
    const bands = extractBands(mags);
    frames.push(bands);
    offset += adjustedHop;
  }
  return frames;
}

async function decodeAudioFile(uri: string): Promise<Float32Array | null> {
  try {
    const AudioContext = (await import('react-native-audio-api')).AudioContext;
    const tempCtx = new AudioContext();
    const buffer = await tempCtx.decodeAudioData(uri);
    await tempCtx.close();
    if (!buffer) return null;
    const channelData = buffer.getChannelData(0);
    return channelData;
  } catch {
    return null;
  }
}

async function computeSongFingerprint(song: Song): Promise<Fingerprint | null> {
  const samples = await decodeAudioFile(song.uri);
  if (!samples || samples.length < SAMPLE_RATE) return null;
  const bands = extractFingerprint(samples, SAMPLE_RATE);
  if (bands.length < 10) return null;
  const step = Math.max(1, Math.floor(bands.length / 200));
  const downsampled: number[][] = [];
  for (let i = 0; i < bands.length; i += step) {
    downsampled.push(bands[i]);
  }
  return { songId: song.id, bands: downsampled };
}

export async function precomputeLibraryFingerprints(songs: Song[]): Promise<void> {
  const cacheKey = songs.map((s) => s.id).join(',');
  if (fingerprintCacheId === cacheKey && libraryFingerprints) {
    return;
  }
  const fingerprints: Fingerprint[] = [];
  const batchSize = 3;
  for (let i = 0; i < songs.length; i += batchSize) {
    const batch = songs.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((song) => computeSongFingerprint(song))
    );
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        fingerprints.push(result.value);
      }
    }
  }
  libraryFingerprints = fingerprints;
  fingerprintCacheId = cacheKey;
}

function compareFingerprints(query: number[][], candidate: number[][]): number {
  if (query.length === 0 || candidate.length < query.length) return 0;
  let bestScore = 0;
  const maxOffset = candidate.length - query.length;
  const searchStep = Math.max(1, Math.floor(maxOffset / 30));
  for (let offset = 0; offset <= maxOffset; offset += searchStep) {
    let score = 0;
    for (let f = 0; f < query.length; f++) {
      for (let b = 0; b < NUM_BANDS; b++) {
        const diff = (query[f]?.[b] ?? 0) - (candidate[f + offset]?.[b] ?? 0);
        score -= diff * diff;
      }
    }
    if (score > bestScore) bestScore = score;
  }
  const worstPossible = query.length * NUM_BANDS;
  const normalized = worstPossible > 0 ? 1 - Math.sqrt(-bestScore / worstPossible) : 0;
  return Math.max(0, Math.min(1, normalized));
}

export interface RecognitionResult {
  song: Song | null;
  confidence: number;
  matches: { song: Song; confidence: number }[];
}

export async function recognizeAudio(
  songs: Song[],
  onProgress?: (phase: string) => void
): Promise<RecognitionResult> {
  onProgress?.('Precomputing library fingerprints...');
  await precomputeLibraryFingerprints(songs);
  if (!libraryFingerprints || libraryFingerprints.length === 0) {
    return { song: null, confidence: 0, matches: [] };
  }
  onProgress?.('Recording audio sample...');
  const { status } = await requestRecordingPermissionsAsync();
  if (status !== 'granted') {
    return { song: null, confidence: 0, matches: [] };
  }
  const recorder = new AudioRecorderClass({
    extension: '.wav',
    sampleRate: SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: 128000,
    android: {
      outputFormat: 'mpeg4',
      audioEncoder: 'aac',
    },
    ios: {
      audioQuality: 96,
      outputFormat: 'aac ',
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 128000,
    },
  });
  try {
    await recorder.prepareToRecordAsync();
    recorder.record();
    await new Promise((r) => setTimeout(r, RECORD_DURATION_MS));
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) {
      return { song: null, confidence: 0, matches: [] };
    }
    onProgress?.('Analyzing recording...');
    const recordedSamples = await decodeAudioFile(uri);
    if (!recordedSamples) {
      return { song: null, confidence: 0, matches: [] };
    }
    const queryFingerprint = extractFingerprint(recordedSamples, SAMPLE_RATE);
    if (queryFingerprint.length < 5) {
      return { song: null, confidence: 0, matches: [] };
    }
    onProgress?.('Matching against library...');
    const scored: { songId: string; score: number }[] = [];
    for (const fp of libraryFingerprints) {
      const score = compareFingerprints(queryFingerprint, fp.bands);
      scored.push({ songId: fp.songId, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.slice(0, 5);
    const songMap = new Map(songs.map((s) => [s.id, s]));
    const matches = topMatches
      .filter((m) => songMap.has(m.songId))
      .map((m) => ({ song: songMap.get(m.songId)!, confidence: Math.max(0, Math.min(1, m.score)) }));
    const best = matches[0] ?? null;
    return {
      song: best?.song ?? null,
      confidence: best?.confidence ?? 0,
      matches,
    };
  } catch {
    try {
      await recorder.stop();
    } catch {}
    return { song: null, confidence: 0, matches: [] };
  }
}

export function clearFingerprintCache(): void {
  libraryFingerprints = null;
  fingerprintCacheId = null;
}
