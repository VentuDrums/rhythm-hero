// Corre en el hilo de audio (AudioWorklet): pasa el micrófono por el detector y avisa de cada golpe
// y del nivel de entrada. Los tiempos son de AudioContext.currentTime, el mismo reloj que usa el juego.
import { OnsetDetector, type OnsetOptions } from './onsets';

declare const sampleRate: number;
declare const currentTime: number;
declare function registerProcessor(name: string, processor: unknown): void;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor(options?: unknown);
}

export type WorkletMessage = { type: 'onset'; time: number } | { type: 'level'; rms: number };

const LEVEL_EVERY_S = 0.05;

class OnsetProcessor extends AudioWorkletProcessor {
  private readonly detector: OnsetDetector;
  private levelSum = 0;
  private levelCount = 0;

  constructor(options: { processorOptions?: OnsetOptions }) {
    super(options);
    this.detector = new OnsetDetector(sampleRate, options.processorOptions ?? {});
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    for (const time of this.detector.process(channel, currentTime)) this.post({ type: 'onset', time });
    for (const x of channel) this.levelSum += x * x;
    this.levelCount += channel.length;
    if (this.levelCount >= LEVEL_EVERY_S * sampleRate) {
      this.post({ type: 'level', rms: Math.sqrt(this.levelSum / this.levelCount) });
      this.levelSum = 0;
      this.levelCount = 0;
    }
    return true;
  }

  private post(message: WorkletMessage): void {
    this.port.postMessage(message);
  }
}

registerProcessor('onset-detector', OnsetProcessor);
