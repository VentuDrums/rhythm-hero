// Desplazamiento de la partitura: convierte la posición musical (ticks) en la x del dibujo.

export interface Anchor {
  ticks: number;
  x: number;
}

/**
 * x correspondiente a unos ticks, interpolando entre las figuras dibujadas.
 * Antes de la primera figura (cuenta previa) y después de la última se sigue en línea recta a pxPerTick.
 */
export function xAtTicks(anchors: Anchor[], ticks: number, pxPerTick: number): number {
  const first = anchors[0];
  const last = anchors[anchors.length - 1];
  if (!first || !last) return 0;
  if (ticks <= first.ticks) return first.x + (ticks - first.ticks) * pxPerTick;
  if (ticks >= last.ticks) return last.x + (ticks - last.ticks) * pxPerTick;
  const next = anchors.findIndex((a) => a.ticks > ticks);
  const a = anchors[next - 1] as Anchor;
  const b = anchors[next] as Anchor;
  return a.x + ((ticks - a.ticks) / (b.ticks - a.ticks)) * (b.x - a.x);
}
