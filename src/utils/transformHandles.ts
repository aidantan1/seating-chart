import type { Point, Table } from '@/models/types';

export type HandleKind = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

const HANDLE_SIZE = 8;

export function worldToTableLocal(pt: Point, table: Table): Point {
  const cx = table.x + table.width / 2;
  const cy = table.y + table.height / 2;
  const rad = (-table.rotation * Math.PI) / 180;
  const dx = pt.x - cx;
  const dy = pt.y - cy;
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

export function hitTestHandle(local: Point, table: Table, zoom: number): HandleKind | null {
  const size = HANDLE_SIZE / zoom;
  const { x, y, width, height } = table;
  const handles: { kind: HandleKind; hx: number; hy: number }[] = [
    { kind: 'nw', hx: x, hy: y },
    { kind: 'n', hx: x + width / 2, hy: y },
    { kind: 'ne', hx: x + width, hy: y },
    { kind: 'e', hx: x + width, hy: y + height / 2 },
    { kind: 'se', hx: x + width, hy: y + height },
    { kind: 's', hx: x + width / 2, hy: y + height },
    { kind: 'sw', hx: x, hy: y + height },
    { kind: 'w', hx: x, hy: y + height / 2 },
    { kind: 'rotate', hx: x + width / 2, hy: y - 24 / zoom },
  ];

  for (const h of handles) {
    if (Math.abs(local.x - h.hx) <= size && Math.abs(local.y - h.hy) <= size) {
      return h.kind;
    }
  }
  return null;
}

export function applyResize(
  handle: HandleKind,
  origin: Table,
  start: Point,
  current: Point
): Partial<Table> {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  let { x, y, width, height } = origin;

  if (handle.includes('w')) {
    x += dx;
    width -= dx;
  }
  if (handle.includes('e')) {
    width += dx;
  }
  if (handle.includes('n')) {
    y += dy;
    height -= dy;
  }
  if (handle.includes('s')) {
    height += dy;
  }

  width = Math.max(20, width);
  height = Math.max(20, height);

  return { x, y, width, height };
}

export function computeRotation(origin: Table, start: Point, current: Point, startRotation: number): number {
  const cx = origin.x + origin.width / 2;
  const cy = origin.y + origin.height / 2;
  const a0 = Math.atan2(start.y - cy, start.x - cx);
  const a1 = Math.atan2(current.y - cy, current.x - cx);
  return startRotation + ((a1 - a0) * 180) / Math.PI;
}
