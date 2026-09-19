import type { Point } from '@/models/types';

export function screenToWorld(
  rect: DOMRect,
  clientX: number,
  clientY: number,
  pan: Point,
  zoom: number
): Point {
  return {
    x: (clientX - rect.left - pan.x) / zoom,
    y: (clientY - rect.top - pan.y) / zoom,
  };
}

export function wheelZoomFactor(deltaY: number, precise: boolean): number {
  const step = precise ? 0.02 : 0.1;
  return deltaY < 0 ? 1 + step : 1 - step;
}

export function zoomAtPoint(
  rect: DOMRect,
  clientX: number,
  clientY: number,
  pan: Point,
  zoom: number,
  nextZoom: number
): { pan: Point; zoom: number } {
  const clamped = Math.min(4, Math.max(0.25, nextZoom));
  const world = screenToWorld(rect, clientX, clientY, pan, zoom);
  return {
    zoom: clamped,
    pan: {
      x: clientX - rect.left - world.x * clamped,
      y: clientY - rect.top - world.y * clamped,
    },
  };
}
