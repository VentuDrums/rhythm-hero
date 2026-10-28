// Acceso al micrófono. El audio se procesa solo en el dispositivo: nunca se graba ni se envía.

export type MicErrorReason = 'denied' | 'unavailable' | 'unsupported';

export class MicAccessError extends Error {
  constructor(readonly reason: MicErrorReason) {
    super(`microphone ${reason}`);
  }
}

/**
 * Sin procesado del navegador: la supresión de ruido y el control de ganancia pueden apagar o deformar las palmadas.
 * La cancelación de eco tampoco hace falta: con la regla de turnos la app nunca suena mientras el alumno toca.
 */
export const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  video: false,
};

export async function openMic(media: MediaDevices | undefined = navigator.mediaDevices): Promise<MediaStream> {
  if (!media?.getUserMedia) throw new MicAccessError('unsupported');
  try {
    return await media.getUserMedia(MIC_CONSTRAINTS);
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    throw new MicAccessError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable');
  }
}
