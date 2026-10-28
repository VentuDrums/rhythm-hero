// Genera el audio que Chromium usará como micrófono falso en los tests: palmas a 120 BPM.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { renderScene, steadyHits } from '../tests/helpers/synthAudio';
import { CLAPS_WAV } from './paths';

const SR = 48000;

function toWav(samples: Float32Array, sampleRate: number): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((x, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export default function globalSetup(): void {
  const hits = steadyHits({ bpm: 120, count: 120, start: 0.25, kind: 'clap', jitter: 0.005, minAmplitude: 0.5 });
  const audio = renderScene({ sampleRate: SR, duration: 60, hits, noise: 0.005 });
  mkdirSync(dirname(CLAPS_WAV), { recursive: true });
  writeFileSync(CLAPS_WAV, toWav(audio, SR));
}
