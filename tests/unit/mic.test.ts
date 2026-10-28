import { describe, expect, it } from 'vitest';
import { MIC_CONSTRAINTS, MicAccessError, openMic } from '../../src/audio/mic';

const media = (getUserMedia: MediaDevices['getUserMedia']) => ({ getUserMedia }) as MediaDevices;

async function reasonOf(promise: Promise<unknown>) {
  try {
    await promise;
    return 'resolved';
  } catch (error) {
    return error instanceof MicAccessError ? error.reason : 'other';
  }
}

describe('openMic', () => {
  it('asks for raw audio, without the browser processing that can swallow claps', async () => {
    let asked: MediaStreamConstraints | undefined;
    const stream = {} as MediaStream;
    const result = await openMic(
      media(async (c) => {
        asked = c;
        return stream;
      }),
    );
    expect(result).toBe(stream);
    expect(asked).toEqual(MIC_CONSTRAINTS);
    expect(MIC_CONSTRAINTS.audio).toEqual({ echoCancellation: false, noiseSuppression: false, autoGainControl: false });
  });

  it('explains a refused permission as "denied"', async () => {
    const reject = (name: string) => media(() => Promise.reject(new DOMException('no', name)));
    expect(await reasonOf(openMic(reject('NotAllowedError')))).toBe('denied');
    expect(await reasonOf(openMic(reject('SecurityError')))).toBe('denied');
  });

  it('explains a missing or busy microphone as "unavailable"', async () => {
    expect(await reasonOf(openMic(media(() => Promise.reject(new DOMException('no', 'NotFoundError')))))).toBe('unavailable');
    expect(await reasonOf(openMic(media(() => Promise.reject(new Error('weird')))))).toBe('unavailable');
  });

  it('explains a browser without microphone support as "unsupported"', async () => {
    expect(await reasonOf(openMic({} as MediaDevices))).toBe('unsupported');
  });
});
