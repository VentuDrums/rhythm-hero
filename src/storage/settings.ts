// Ajustes guardados solo en este dispositivo (localStorage). Si el navegador no deja guardar
// (modo privado, almacenamiento bloqueado), el juego sigue funcionando con los valores por defecto.

const LATENCY_KEY = 'rhythm-hero.latency';

/** Copia en memoria: si no se puede guardar, el valor vale al menos hasta cerrar la página. */
let latencyInMemory: number | null = null;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Retraso calibrado en segundos, o null si nunca se ha calibrado en este dispositivo. */
export function getLatency(): number | null {
  const raw = read(LATENCY_KEY);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : latencyInMemory;
}

/** Guarda el retraso. Devuelve false si el navegador no permite guardar. */
export function setLatency(seconds: number): boolean {
  latencyInMemory = seconds;
  try {
    localStorage.setItem(LATENCY_KEY, String(seconds));
    return true;
  } catch {
    return false;
  }
}
