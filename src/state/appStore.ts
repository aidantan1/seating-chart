import { create } from 'zustand';
import type { LayoutSnapshot, Marker, Point, Seat, ShapeKind, Table, Tool } from '@/models/types';
import { findClosestTableByEdge } from '@/utils/tableGeometry';

const MAX_HISTORY = 50;

function uuid(): string {
  return crypto.randomUUID();
}

function snapshot(state: Pick<AppState, 'tables' | 'seats' | 'markers'>): LayoutSnapshot {
  return {
    tables: state.tables.map((t) => ({ ...t, points: t.points?.map((p) => ({ ...p })) })),
    seats: state.seats.map((s) => ({ ...s })),
    markers: state.markers.map((m) => ({ ...m })),
  };
}

interface AppState {
  tool: Tool;
  shapeKind: ShapeKind;
  tables: Table[];
  seats: Seat[];
  markers: Marker[];
  selectedIds: string[];
  zoom: number;
  pan: Point;
  past: LayoutSnapshot[];
  future: LayoutSnapshot[];

  setTool: (tool: Tool) => void;
  setShapeKind: (shape: ShapeKind) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelection: (id: string, additive: boolean) => void;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: Point) => void;

  addTable: (table: Omit<Table, 'id' | 'label'> & { label?: string }) => void;
  updateTable: (id: string, patch: Partial<Table>) => void;
  addSeat: (x: number, y: number) => void;
  updateSeat: (id: string, patch: Partial<Seat>) => void;
  addMarker: (x: number, y: number, label?: string) => void;
  updateMarker: (id: string, patch: Partial<Marker>) => void;
  deleteSelected: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  tool: 'select',
  shapeKind: 'rectangle',
  tables: [],
  seats: [],
  markers: [],
  selectedIds: [],
  zoom: 1,
  pan: { x: 0, y: 0 },
  past: [],
  future: [],

  setTool: (tool) => set({ tool }),
  setShapeKind: (shapeKind) => set({ shapeKind, tool: 'shape' }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  toggleSelection: (id, additive) => {
    const { selectedIds } = get();
    if (additive) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id];
      get().setSelectedIds(next);
    } else {
      get().setSelectedIds([id]);
    }
  },
  clearSelection: () => set({ selectedIds: [] }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (pan) => set({ pan }),

  addTable: (table) => {
    const count = get().tables.length;
    const newTable: Table = {
      id: uuid(),
      label: table.label ?? `Table ${count + 1}`,
      ...table,
    };
    set((s) => ({
      tables: [...s.tables, newTable],
      selectedIds: [newTable.id],
      past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
      future: [],
    }));
  },

  updateTable: (id, patch) => {
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  addSeat: (x, y) => {
    const { tables } = get();
    const newSeat: Seat = {
      id: uuid(),
      x,
      y,
      tableId: findClosestTableByEdge({ x, y }, tables),
    };
    set((s) => ({
      seats: [...s.seats, newSeat],
      selectedIds: [newSeat.id],
      past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
      future: [],
    }));
  },

  updateSeat: (id, patch) => {
    set((s) => ({
      seats: s.seats.map((seat) => (seat.id === id ? { ...seat, ...patch } : seat)),
    }));
  },

  addMarker: (x, y, label) => {
    const { markers } = get();
    const trimmed = label?.trim();
    const finalLabel = trimmed || `Marker ${markers.length + 1}`;
    const newMarker: Marker = { id: uuid(), x, y, label: finalLabel };
    set((s) => ({
      markers: [...s.markers, newMarker],
      selectedIds: [newMarker.id],
      past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
      future: [],
    }));
  },

  updateMarker: (id, patch) => {
    set((s) => ({
      markers: s.markers.map((marker) => (marker.id === id ? { ...marker, ...patch } : marker)),
    }));
  },

  deleteSelected: () => {
    const { selectedIds, tables, seats, markers } = get();
    if (selectedIds.length === 0) return;
    const ids = new Set(selectedIds);
    set((s) => ({
      tables: tables.filter((t) => !ids.has(t.id)),
      seats: seats.filter((seat) => !ids.has(seat.id)).map((seat) =>
        seat.tableId && ids.has(seat.tableId) ? { ...seat, tableId: null } : seat
      ),
      markers: markers.filter((marker) => !ids.has(marker.id)),
      selectedIds: [],
      past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
      future: [],
    }));
  },

  pushHistory: () => {
    set((s) => ({
      past: [...s.past, snapshot(s)].slice(-MAX_HISTORY),
      future: [],
    }));
  },

  undo: () => {
    const { past, future, tables, seats, markers } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      tables: prev.tables,
      seats: prev.seats,
      markers: prev.markers,
      past: past.slice(0, -1),
      future: [snapshot({ tables, seats, markers }), ...future],
      selectedIds: [],
    });
  },

  redo: () => {
    const { past, future, tables, seats, markers } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      tables: next.tables,
      seats: next.seats,
      markers: next.markers,
      past: [...past, snapshot({ tables, seats, markers })],
      future: future.slice(1),
      selectedIds: [],
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
