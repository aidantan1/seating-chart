import type { SeatingRestriction, Seat, Table } from '@/models/types';
import {
  buildSeatIndexByGuest,
  circularSeatDistance,
} from '@/utils/seatOrdering';

export function satisfiesRestrictions(
  assignment: Map<string, string>,
  seats: Seat[],
  tables: Table[],
  restrictions: SeatingRestriction[]
): boolean {
  if (restrictions.length === 0) return true;

  const guestSeating = buildSeatIndexByGuest(assignment, seats, tables);

  for (const rule of restrictions) {
    if (!rule.guestA || !rule.guestB || rule.guestA === rule.guestB) continue;

    const seatA = guestSeating.get(rule.guestA);
    const seatB = guestSeating.get(rule.guestB);
    if (!seatA || !seatB) continue;

    const kind = rule.kind ?? 'not_within';

    if (kind === 'within') {
      if (seatA.tableId !== seatB.tableId) return false;
      const distance = circularSeatDistance(seatA.index, seatB.index, seatA.tableSize);
      if (distance > rule.chairDistance) return false;
      continue;
    }

    if (seatA.tableId === seatB.tableId) {
      const distance = circularSeatDistance(seatA.index, seatB.index, seatA.tableSize);
      if (distance <= rule.chairDistance) return false;
    }
  }

  return true;
}
