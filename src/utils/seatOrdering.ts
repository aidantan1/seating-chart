import type { Seat, Table } from '@/models/types';

export function orderSeatsAroundTable(tableSeats: Seat[], table: Table): Seat[] {
  const cx = table.x + table.width / 2;
  const cy = table.y + table.height / 2;
  return [...tableSeats].sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });
}

/** Minimum seats between two positions going around a table. Direct neighbors = 1. */
export const ADJACENT_SEAT_DISTANCE = 1;

export function circularSeatDistance(indexA: number, indexB: number, total: number): number {
  const diff = Math.abs(indexA - indexB);
  return Math.min(diff, total - diff);
}

export function buildSeatIndexByGuest(
  assignment: Map<string, string>,
  seats: Seat[],
  tables: Table[]
): Map<string, { tableId: string; index: number; tableSize: number }> {
  const guestToSeatInfo = new Map<string, { tableId: string; index: number; tableSize: number }>();

  for (const table of tables) {
    const tableSeats = seats.filter((s) => s.tableId === table.id);
    if (tableSeats.length === 0) continue;

    const ordered = orderSeatsAroundTable(tableSeats, table);
    ordered.forEach((seat, index) => {
      const guest = assignment.get(seat.id);
      if (guest) {
        guestToSeatInfo.set(guest, { tableId: table.id, index, tableSize: ordered.length });
      }
    });
  }

  return guestToSeatInfo;
}
