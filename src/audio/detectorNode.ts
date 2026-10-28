// Conecta el micrófono al detector que corre en el AudioWorklet.
import type { WorkletMessage } from './onset-worklet';
import type { OnsetOptions } from './onsets';
import workletUrl from './onset-worklet.ts?worker&url';

export interface DetectorHandlers {
  onOnset: (time: number) => void;
  onLevel: (rms: number) => void;
}

export interface DetectorConnection {
  disconnect: () => void;
}

export async function connectDetector(
  ctx: AudioContext,
  stream: MediaStream,
  handlers: DetectorHandlers,
  options: OnsetOptions = {},
): Promise<DetectorConnection> {
  await ctx.audioWorklet.addModule(workletUrl);
  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'onset-detector', { processorOptions: options });
  // El nodo necesita estar conectado a la salida para que el navegador lo procese; se silencia con ganancia 0.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(node).connect(mute).connect(ctx.destination);
  node.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
    if (event.data.type === 'onset') handlers.onOnset(event.data.time);
    else handlers.onLevel(event.data.rms);
  };
  return {
    disconnect: () => {
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      mute.disconnect();
      for (const track of stream.getTracks()) track.stop();
    },
  };
}
