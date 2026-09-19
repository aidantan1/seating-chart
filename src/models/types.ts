export type Tool = 'select' | 'navigate' | 'pen' | 'shape' | 'seat' | 'marker' | 'delete';

export type ShapeKind = 'rectangle' | 'circle' | 'oval' | 'square';

export type TableShape = ShapeKind | 'custom';

export interface Point {
  x: number;
  y: number;
}

export interface Table {
  id: string;
  type: TableShape;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  points?: Point[];
  label: string;
}

export interface Seat {
  id: string;
  x: number;
  y: number;
  tableId: string | null;
}

export interface Marker {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface LayoutSnapshot {
  tables: Table[];
  seats: Seat[];
  markers: Marker[];
}

export type RestrictionKind = 'within' | 'not_within';

export interface SeatingRestriction {
  id: string;
  kind: RestrictionKind;
  guestA: string;
  guestB: string;
  chairDistance: number;
}
