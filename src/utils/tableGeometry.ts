import type { Point, Table } from '@/models/types';
import { worldToTableLocal } from '@/utils/transformHandles';

function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

function distanceToRectEdge(local: Point, table: Table): number {
  const { x, y, width, height } = table;
  const left = x;
  const right = x + width;
  const top = y;
  const bottom = y + height;

  if (local.x >= left && local.x <= right && local.y >= top && local.y <= bottom) {
    return Math.min(local.x - left, right - local.x, local.y - top, bottom - local.y);
  }

  const clampX = Math.max(left, Math.min(local.x, right));
  const clampY = Math.max(top, Math.min(local.y, bottom));
  return Math.hypot(local.x - clampX, local.y - clampY);
}

function distanceToCapsuleEdge(local: Point, a: Point, b: Point, radius: number): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.abs(Math.hypot(local.x - a.x, local.y - a.y) - radius);

  let t = ((local.x - a.x) * dx + (local.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = a.x + t * dx;
  const qy = a.y + t * dy;
  const dist = Math.hypot(local.x - qx, local.y - qy);
  return Math.abs(dist - radius);
}

function distanceToCustomEdge(local: Point, table: Table): number {
  const points = table.points;
  if (!points || points.length < 2) {
    return distanceToRectEdge(local, table);
  }

  const vertices = points.map((p) => ({ x: table.x + p.x, y: table.y + p.y }));
  let minDist = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    minDist = Math.min(minDist, distancePointToSegment(local, a, b));
  }
  return minDist;
}

export function distancePointToTableEdge(point: Point, table: Table): number {
  const local = worldToTableLocal(point, table);

  switch (table.type) {
    case 'circle': {
      const cx = table.x + table.width / 2;
      const cy = table.y + table.height / 2;
      const radius = table.width / 2;
      return Math.abs(Math.hypot(local.x - cx, local.y - cy) - radius);
    }
    case 'oval': {
      const radius = table.height / 2;
      const cy = table.y + radius;
      const left = { x: table.x + radius, y: cy };
      const right = { x: table.x + table.width - radius, y: cy };
      if (table.width <= table.height) {
        const cx = table.x + table.width / 2;
        return Math.abs(Math.hypot(local.x - cx, local.y - cy) - radius);
      }
      return distanceToCapsuleEdge(local, left, right, radius);
    }
    case 'custom':
      return distanceToCustomEdge(local, table);
    default:
      return distanceToRectEdge(local, table);
  }
}

export function findClosestTableByEdge(point: Point, tables: Table[]): string | null {
  if (tables.length === 0) return null;

  let bestId: string | null = null;
  let bestDist = Infinity;

  for (const table of tables) {
    const dist = distancePointToTableEdge(point, table);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = table.id;
    }
  }

  return bestId;
}
