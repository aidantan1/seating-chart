import type { Seat, SeatingRestriction, Table } from '@/models/types';
import { satisfiesRestrictions } from '@/engine/restrictionChecks';

export function parseGuestNames(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const MAX_ASSIGN_ATTEMPTS = 5000;

function buildAssignment(guestNames: string[], seats: Seat[]): Map<string, string> {
  const assignment = new Map<string, string>();
  const shuffledGuests = shuffle(guestNames);
  const shuffledSeats = shuffle(seats);

  for (let i = 0; i < Math.min(shuffledGuests.length, shuffledSeats.length); i++) {
    assignment.set(shuffledSeats[i].id, shuffledGuests[i]);
  }

  return assignment;
}

/** Randomly assign guest names to seats. Returns seatId → guest name. */
export function randomAssign(
  guestNames: string[],
  seats: Seat[],
  tables: Table[] = [],
  restrictions: SeatingRestriction[] = []
): Map<string, string> | null {
  if (restrictions.length === 0) {
    return buildAssignment(guestNames, seats);
  }

  for (let attempt = 0; attempt < MAX_ASSIGN_ATTEMPTS; attempt++) {
    const assignment = buildAssignment(guestNames, seats);
    if (satisfiesRestrictions(assignment, seats, tables, restrictions)) {
      return assignment;
    }
  }

  return null;
}
