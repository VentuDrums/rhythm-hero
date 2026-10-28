import { resolve } from 'node:path';

/** WAV generado en global-setup (no se guarda en git). */
export const CLAPS_WAV = resolve('test-results/fixtures/claps-120bpm.wav');

export const FAKE_MEDIA_ARGS = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
