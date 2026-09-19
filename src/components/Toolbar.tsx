import { useAppStore } from '@/state/appStore';
import type { ShapeKind, Tool } from '@/models/types';
import { TOOL_HOTKEYS } from '@/utils/toolShortcuts';

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: 'select', label: 'Select', hint: 'Move, resize, label (Q)' },
  { id: 'navigate', label: 'Navigate', hint: 'Pan & zoom (W, Space)' },
  { id: 'pen', label: 'Pen', hint: 'Draw custom table (E)' },
  { id: 'seat', label: 'Seat', hint: 'Place seats (R)' },
  { id: 'marker', label: 'Marker', hint: 'Room labels (T)' },
  { id: 'delete', label: 'Delete', hint: 'Remove items (Y)' },
];

const SHAPES: { id: ShapeKind; label: string }[] = [
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'square', label: 'Square' },
  { id: 'circle', label: 'Circle' },
  { id: 'oval', label: 'Oval' },
];

export function Toolbar() {
  const tool = useAppStore((s) => s.tool);
  const shapeKind = useAppStore((s) => s.shapeKind);
  const tables = useAppStore((s) => s.tables);
  const seats = useAppStore((s) => s.seats);
  const markers = useAppStore((s) => s.markers);
  const setTool = useAppStore((s) => s.setTool);
  const setShapeKind = useAppStore((s) => s.setShapeKind);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const canUndo = useAppStore((s) => s.canUndo());
  const canRedo = useAppStore((s) => s.canRedo());

  return (
    <div className="toolbar">
      <div className="toolbar-brand">
        <h1>Seating Chart</h1>
        <p className="toolbar-stats">
          {tables.length} tables · {seats.length} seats · {markers.length} markers
        </p>
      </div>

      <section className="toolbar-section">
        <h2>Tools</h2>
        <div className="tool-grid">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tool-btn ${tool === t.id ? 'active' : ''}`}
              onClick={() => setTool(t.id)}
            >
              <span className="tool-label">
                {t.label}
                {TOOL_HOTKEYS[t.id] && (
                  <kbd className="tool-key">{TOOL_HOTKEYS[t.id]}</kbd>
                )}
              </span>
              <span className="tool-hint">{t.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="toolbar-section">
        <h2>Shape</h2>
        <select
          className="shape-select"
          value={tool === 'shape' ? shapeKind : ''}
          onChange={(e) => {
            const value = e.target.value as ShapeKind;
            if (value) setShapeKind(value);
          }}
        >
          <option value="" disabled>
            Choose shape…
          </option>
          {SHAPES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {tool === 'shape' && (
          <p className="shape-active">Drawing {shapeKind}. Drag on canvas.</p>
        )}
      </section>

      <section className="toolbar-section toolbar-actions">
        <div className="action-row">
          <button type="button" className="btn btn-secondary" disabled={!canUndo} onClick={undo}>
            Undo
          </button>
          <button type="button" className="btn btn-secondary" disabled={!canRedo} onClick={redo}>
            Redo
          </button>
        </div>
      </section>

      <section className="toolbar-section help">
        <h3>Shortcuts</h3>
        <ul>
          <li>
            <strong>Q / W / E / R / T / Y</strong> — select, navigate, pen, seat, marker, delete
          </li>
          <li>
            <strong>Space</strong> — temporary navigate
          </li>
          <li>
            <strong>Shift+click</strong> — multi-select
          </li>
          <li>
            <strong>Double-click</strong> — edit table or marker label
          </li>
          <li>
            <strong>⌘Z / Ctrl+Z</strong> — undo
          </li>
        </ul>
      </section>
    </div>
  );
}
