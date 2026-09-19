import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '@/state/appStore';
import type { Marker, Point, Seat, Table } from '@/models/types';
import { simplifyPath, pointsToSvgPath, boundingBox } from '@/utils/pathSimplify';
import { tableColor } from '@/utils/tableColors';
import {
  hitTestHandle,
  applyResize,
  computeRotation,
  worldToTableLocal,
  type HandleKind,
} from '@/utils/transformHandles';
import { screenToWorld, zoomAtPoint, wheelZoomFactor } from '@/utils/canvasViewport';
import { useCanvasNavigation } from '@/hooks/useCanvasNavigation';
import { MarkerNameDialog } from '@/components/MarkerNameDialog';
import { SelectionHandles } from './SelectionHandles';

const MARQUEE_THRESHOLD = 4;

type DragMode =
  | { kind: 'none' }
  | { kind: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | { kind: 'marquee'; start: Point; current: Point; additive: boolean }
  | {
      kind: 'move';
      ids: string[];
      start: Point;
      origins: Map<string, { x: number; y: number }>;
      attachedSeats: Map<string, { x: number; y: number }>;
    }
  | { kind: 'draw-shape'; start: Point; current: Point }
  | { kind: 'pen'; points: Point[] }
  | { kind: 'resize'; id: string; handle: HandleKind; start: Point; origin: Table }
  | { kind: 'rotate'; id: string; start: Point; origin: Table; startRotation: number };

export function LayoutCanvas() {
  const tool = useAppStore((s) => s.tool);
  const shapeKind = useAppStore((s) => s.shapeKind);
  const tables = useAppStore((s) => s.tables);
  const seats = useAppStore((s) => s.seats);
  const markers = useAppStore((s) => s.markers);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const zoom = useAppStore((s) => s.zoom);
  const pan = useAppStore((s) => s.pan);

  const setSelectedIds = useAppStore((s) => s.setSelectedIds);
  const toggleSelection = useAppStore((s) => s.toggleSelection);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const addTable = useAppStore((s) => s.addTable);
  const updateTable = useAppStore((s) => s.updateTable);
  const addSeat = useAppStore((s) => s.addSeat);
  const updateSeat = useAppStore((s) => s.updateSeat);
  const addMarker = useAppStore((s) => s.addMarker);
  const updateMarker = useAppStore((s) => s.updateMarker);
  const pushHistory = useAppStore((s) => s.pushHistory);
  const setZoom = useAppStore((s) => s.setZoom);
  const setPan = useAppStore((s) => s.setPan);
  const deleteSelected = useAppStore((s) => s.deleteSelected);
  const setTool = useAppStore((s) => s.setTool);

  const { spaceHeld } = useCanvasNavigation(
    () => {},
    () => {}
  );

  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  panRef.current = pan;
  zoomRef.current = zoom;

  const [drag, setDrag] = useState<DragMode>({ kind: 'none' });
  const [isPanning, setIsPanning] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [pendingMarker, setPendingMarker] = useState<Point | null>(null);

  const isPanMode = tool === 'navigate' || spaceHeld;
  const selectedTable =
    selectedIds.length === 1 ? tables.find((t) => t.id === selectedIds[0]) : null;

  const tableColorById = useMemo(
    () => new Map(tables.map((t, i) => [t.id, tableColor(i)])),
    [tables]
  );

  const getWorldPoint = useCallback((clientX: number, clientY: number): Point | null => {
    if (!svgRef.current) return null;
    return screenToWorld(
      svgRef.current.getBoundingClientRect(),
      clientX,
      clientY,
      panRef.current,
      zoomRef.current
    );
  }, []);

  const handleFromEvent = (e: React.PointerEvent, table: Table): HandleKind | null => {
    const target = e.target as SVGElement;
    const handle = target.getAttribute('data-handle') as HandleKind | null;
    if (handle) return handle;
    const pt = getWorldPoint(e.clientX, e.clientY);
    if (!pt) return null;
    return hitTestHandle(worldToTableLocal(pt, table), table, zoomRef.current);
  };

  const hitTest = useCallback(
    (pt: Point): string | null => {
      for (const seat of [...seats].reverse()) {
        if (Math.hypot(pt.x - seat.x, pt.y - seat.y) < 14 / zoomRef.current) return seat.id;
      }
      for (const marker of [...markers].reverse()) {
        if (hitTestMarker(pt, marker, zoomRef.current)) return marker.id;
      }
      for (const table of [...tables].reverse()) {
        if (pointInTable(pt, table)) return table.id;
      }
      return null;
    },
    [markers, seats, tables]
  );

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!svgRef.current) return;
      const factor = wheelZoomFactor(e.deltaY, e.ctrlKey);
      const next = zoomRef.current * factor;
      const vp = zoomAtPoint(
        svgRef.current.getBoundingClientRect(),
        e.clientX,
        e.clientY,
        panRef.current,
        zoomRef.current,
        next
      );
      setZoom(vp.zoom);
      setPan(vp.pan);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setPan, setZoom]);

  const startPan = (e: React.PointerEvent) => {
    setIsPanning(true);
    setDrag({
      kind: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    });
    wrapRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    wrapRef.current?.focus({ preventScroll: true });
    const pt = getWorldPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (isPanMode || e.button === 1) {
      e.preventDefault();
      startPan(e);
      return;
    }

    if (tool === 'delete') {
      const hit = hitTest(pt);
      if (hit) {
        setSelectedIds([hit]);
        deleteSelected();
      }
      return;
    }

    if (tool === 'seat') {
      addSeat(pt.x, pt.y);
      return;
    }

    if (tool === 'marker') {
      setPendingMarker(pt);
      return;
    }

    if (tool === 'pen') {
      setDrag({ kind: 'pen', points: [pt] });
      wrapRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === 'shape') {
      setDrag({ kind: 'draw-shape', start: pt, current: pt });
      wrapRef.current?.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === 'select') {
      if (selectedTable) {
        const handle = handleFromEvent(e, selectedTable);
        if (handle === 'rotate') {
          setDrag({
            kind: 'rotate',
            id: selectedTable.id,
            start: pt,
            origin: { ...selectedTable },
            startRotation: selectedTable.rotation,
          });
          wrapRef.current?.setPointerCapture(e.pointerId);
          return;
        }
        if (handle) {
          setDrag({
            kind: 'resize',
            id: selectedTable.id,
            handle,
            start: pt,
            origin: { ...selectedTable },
          });
          wrapRef.current?.setPointerCapture(e.pointerId);
          return;
        }
      }

      const hit = hitTest(pt);
      if (hit) {
        const additive = e.shiftKey;
        let moveIds: string[];

        if (additive) {
          const wasSelected = selectedIds.includes(hit);
          toggleSelection(hit, true);
          if (wasSelected) return;
          moveIds = [...selectedIds, hit];
        } else if (selectedIds.includes(hit)) {
          moveIds = selectedIds;
        } else {
          setSelectedIds([hit]);
          moveIds = [hit];
        }

        const origins = new Map<string, { x: number; y: number }>();
        const attachedSeats = new Map<string, { x: number; y: number }>();

        for (const id of moveIds) {
          const table = tables.find((t) => t.id === id);
          const seat = seats.find((s) => s.id === id);
          const marker = markers.find((m) => m.id === id);
          if (table) {
            origins.set(id, { x: table.x, y: table.y });
            for (const s of seats) {
              if (s.tableId === id && !moveIds.includes(s.id)) {
                attachedSeats.set(s.id, { x: s.x, y: s.y });
              }
            }
          }
          if (seat) origins.set(id, { x: seat.x, y: seat.y });
          if (marker) origins.set(id, { x: marker.x, y: marker.y });
        }

        setDrag({ kind: 'move', ids: moveIds, start: pt, origins, attachedSeats });
        wrapRef.current?.setPointerCapture(e.pointerId);
      } else {
        setDrag({ kind: 'marquee', start: pt, current: pt, additive: e.shiftKey });
        wrapRef.current?.setPointerCapture(e.pointerId);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pt = getWorldPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (drag.kind === 'pen') {
      setDrag({ kind: 'pen', points: [...drag.points, pt] });
      return;
    }

    if (drag.kind === 'draw-shape') {
      setDrag({ ...drag, current: pt });
      return;
    }

    if (drag.kind === 'marquee') {
      setDrag({ ...drag, current: pt });
      return;
    }

    if (drag.kind === 'pan') {
      setPan({
        x: drag.panX + (e.clientX - drag.startX),
        y: drag.panY + (e.clientY - drag.startY),
      });
      return;
    }

    if (drag.kind === 'move') {
      const dx = pt.x - drag.start.x;
      const dy = pt.y - drag.start.y;
      for (const id of drag.ids) {
        const origin = drag.origins.get(id);
        if (!origin) continue;
        if (tables.some((t) => t.id === id)) {
          updateTable(id, { x: origin.x + dx, y: origin.y + dy });
        }
        if (seats.some((s) => s.id === id)) {
          updateSeat(id, { x: origin.x + dx, y: origin.y + dy });
        }
        if (markers.some((m) => m.id === id)) {
          updateMarker(id, { x: origin.x + dx, y: origin.y + dy });
        }
      }
      for (const [seatId, origin] of drag.attachedSeats) {
        updateSeat(seatId, { x: origin.x + dx, y: origin.y + dy });
      }
      return;
    }

    if (drag.kind === 'resize') {
      updateTable(drag.id, applyResize(drag.handle, drag.origin, drag.start, pt));
      return;
    }

    if (drag.kind === 'rotate') {
      updateTable(drag.id, {
        rotation: computeRotation(drag.origin, drag.start, pt, drag.startRotation),
      });
    }
  };

  const finishPen = (points: Point[]) => {
    if (points.length < 3) return;
    const simplified = simplifyPath(points);
    const bbox = boundingBox(simplified);
    const normalized = simplified.map((p) => ({ x: p.x - bbox.x, y: p.y - bbox.y }));
    addTable({
      type: 'custom',
      x: bbox.x,
      y: bbox.y,
      width: bbox.width || 40,
      height: bbox.height || 40,
      rotation: 0,
      points: normalized,
    });
    setTool('select');
  };

  const finishShape = (start: Point, current: Point) => {
    const x = Math.min(start.x, current.x);
    const y = Math.min(start.y, current.y);
    let width = Math.abs(current.x - start.x);
    let height = Math.abs(current.y - start.y);

    if (shapeKind === 'square' || shapeKind === 'circle') {
      const size = Math.max(width, height);
      width = size;
      height = size;
    }

    if (width < 10 || height < 10) return;

    addTable({ type: shapeKind, x, y, width, height, rotation: 0 });
    setTool('select');
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    wrapRef.current?.releasePointerCapture(e.pointerId);

    if (drag.kind === 'pen') {
      finishPen(drag.points);
    } else if (drag.kind === 'draw-shape') {
      finishShape(drag.start, drag.current);
    } else if (drag.kind === 'marquee') {
      const dx = Math.abs(drag.current.x - drag.start.x);
      const dy = Math.abs(drag.current.y - drag.start.y);

      if (dx < MARQUEE_THRESHOLD && dy < MARQUEE_THRESHOLD) {
        if (!drag.additive) clearSelection();
      } else {
        const x1 = Math.min(drag.start.x, drag.current.x);
        const x2 = Math.max(drag.start.x, drag.current.x);
        const y1 = Math.min(drag.start.y, drag.current.y);
        const y2 = Math.max(drag.start.y, drag.current.y);
        const ids: string[] = [];
        for (const t of tables) {
          if (rectIntersectsMarquee(t, x1, y1, x2, y2)) ids.push(t.id);
        }
        for (const s of seats) {
          if (s.x >= x1 && s.x <= x2 && s.y >= y1 && s.y <= y2) ids.push(s.id);
        }
        for (const m of markers) {
          if (m.x >= x1 && m.x <= x2 && m.y >= y1 && m.y <= y2) ids.push(m.id);
        }
        if (drag.additive) {
          setSelectedIds([...new Set([...selectedIds, ...ids])]);
        } else {
          setSelectedIds(ids);
        }
      }
    } else if (drag.kind === 'move' || drag.kind === 'resize' || drag.kind === 'rotate') {
      pushHistory();
    }

    setDrag({ kind: 'none' });
    setIsPanning(false);
  };

  const canvasCursor = (() => {
    if (isPanning) return 'grabbing';
    if (isPanMode) return 'grab';
    if (tool === 'select') return 'default';
    if (tool === 'delete') return 'not-allowed';
    return 'crosshair';
  })();

  const renderTable = (table: Table) => {
    const selected = selectedIds.includes(table.id);
    const isRound = table.type === 'circle';
    const isOval = table.type === 'oval';
    const isCustom = table.type === 'custom' && table.points;
    const cx = table.x + table.width / 2;
    const cy = table.y + table.height / 2;
    const color = tableColorById.get(table.id) ?? '#5a7a9a';

    return (
      <g
        key={table.id}
        transform={`rotate(${table.rotation}, ${cx}, ${cy})`}
        onDoubleClick={(e) => {
          if (tool === 'select' && !spaceHeld) {
            e.stopPropagation();
            setSelectedIds([table.id]);
            setEditingLabelId(table.id);
          }
        }}
      >
        {isCustom ? (
          <path
            d={pointsToSvgPath(table.points!.map((p) => ({ x: table.x + p.x, y: table.y + p.y })))}
            fill="var(--table)"
            stroke={selected ? 'var(--accent)' : color}
            strokeWidth={selected ? 2 : 1.5}
            opacity={0.9}
          />
        ) : (
          <rect
            x={table.x}
            y={table.y}
            width={table.width}
            height={table.height}
            rx={isRound ? table.width / 2 : isOval ? table.height / 2 : 6}
            ry={isRound ? table.height / 2 : isOval ? table.height / 2 : 6}
            fill="var(--table)"
            stroke={selected ? 'var(--accent)' : color}
            strokeWidth={selected ? 2 : 1.5}
            opacity={0.9}
          />
        )}
        {editingLabelId !== table.id && (
          <text
            className="table-label-text"
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="rgba(255,255,255,0.92)"
            fontSize={Math.min(14, table.width / 6)}
            fontWeight={600}
          >
            {table.label}
          </text>
        )}
        {editingLabelId === table.id && (
          <foreignObject x={table.x} y={cy - 14} width={table.width} height={28}>
            <input
              autoFocus
              defaultValue={table.label}
              onBlur={(ev) => {
                updateTable(table.id, { label: ev.target.value.trim() || table.label });
                pushHistory();
                setEditingLabelId(null);
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
                if (ev.key === 'Escape') setEditingLabelId(null);
              }}
              className="table-label-input"
            />
          </foreignObject>
        )}
        {selected && selectedIds.length === 1 && tool === 'select' && !spaceHeld && (
          <SelectionHandles table={table} zoom={zoom} />
        )}
      </g>
    );
  };

  const renderSeatTableLink = (seat: Seat) => {
    if (!seat.tableId) return null;
    const table = tables.find((t) => t.id === seat.tableId);
    if (!table) return null;
    const color = tableColorById.get(seat.tableId);
    if (!color) return null;
    const cx = table.x + table.width / 2;
    const cy = table.y + table.height / 2;

    return (
      <line
        key={`link-${seat.id}`}
        x1={seat.x}
        y1={seat.y}
        x2={cx}
        y2={cy}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        opacity={0.35}
        pointerEvents="none"
      />
    );
  };

  const renderMarker = (marker: Marker) => {
    const selected = selectedIds.includes(marker.id);
    const labelY = marker.y - 14;

    return (
      <g
        key={marker.id}
        onDoubleClick={(e) => {
          if (tool === 'select' && !spaceHeld) {
            e.stopPropagation();
            setSelectedIds([marker.id]);
            setEditingMarkerId(marker.id);
          }
        }}
      >
        <circle
          cx={marker.x}
          cy={marker.y}
          r={selected ? 5 : 3.5}
          fill={selected ? 'var(--accent)' : 'var(--text-muted)'}
        />
        {editingMarkerId !== marker.id ? (
          <text
            className="room-marker-text"
            x={marker.x}
            y={labelY}
            textAnchor="middle"
            dominantBaseline="auto"
          >
            {marker.label}
          </text>
        ) : (
          <foreignObject x={marker.x - 70} y={labelY - 18} width={140} height={28}>
            <input
              autoFocus
              defaultValue={marker.label}
              onBlur={(ev) => {
                updateMarker(marker.id, {
                  label: ev.target.value.trim() || marker.label,
                });
                pushHistory();
                setEditingMarkerId(null);
              }}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur();
                if (ev.key === 'Escape') setEditingMarkerId(null);
              }}
              className="room-marker-input"
            />
          </foreignObject>
        )}
      </g>
    );
  };

  const renderSeat = (seat: Seat) => {
    const selected = selectedIds.includes(seat.id);
    const tableStroke = seat.tableId ? tableColorById.get(seat.tableId) : null;
    const stroke = selected ? 'white' : tableStroke ?? 'var(--warning)';

    return (
      <g key={seat.id}>
        <circle
          cx={seat.x}
          cy={seat.y}
          r={12}
          fill="var(--seat)"
          stroke={stroke}
          strokeWidth={selected ? 2.5 : tableStroke ? 2.5 : 1.5}
          strokeDasharray={seat.tableId ? undefined : '3 2'}
        />
      </g>
    );
  };

  let previewShape = null;
  if (drag.kind === 'draw-shape') {
    const x = Math.min(drag.start.x, drag.current.x);
    const y = Math.min(drag.start.y, drag.current.y);
    let w = Math.abs(drag.current.x - drag.start.x);
    let h = Math.abs(drag.current.y - drag.start.y);
    if (shapeKind === 'square' || shapeKind === 'circle') {
      const size = Math.max(w, h);
      w = size;
      h = size;
    }
    previewShape = (
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="var(--accent)" strokeDasharray="4 2" />
    );
  }

  let penPreview = null;
  if (drag.kind === 'pen' && drag.points.length > 1) {
    penPreview = (
      <polyline
        points={drag.points.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
      />
    );
  }

  let marquee = null;
  if (drag.kind === 'marquee') {
    const x = Math.min(drag.start.x, drag.current.x);
    const y = Math.min(drag.start.y, drag.current.y);
    const w = Math.abs(drag.current.x - drag.start.x);
    const h = Math.abs(drag.current.y - drag.start.y);
    marquee = (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="rgba(79,140,255,0.08)"
        stroke="var(--accent)"
        strokeWidth={1 / zoom}
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      tabIndex={-1}
      className={`canvas-wrap ${isPanning ? 'is-panning' : ''}`}
      style={{ cursor: canvasCursor }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {pendingMarker && (
        <MarkerNameDialog
          onConfirm={(label) => {
            addMarker(pendingMarker.x, pendingMarker.y, label);
            setPendingMarker(null);
          }}
          onCancel={() => setPendingMarker(null)}
        />
      )}
      <svg ref={svgRef} className="canvas-svg">
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {tables.map(renderTable)}
          {markers.map(renderMarker)}
          {seats.map(renderSeatTableLink)}
          {seats.map(renderSeat)}
          {previewShape}
          {penPreview}
          {marquee}
        </g>
      </svg>
    </div>
  );
}

function hitTestMarker(pt: Point, marker: Marker, zoom: number): boolean {
  const labelY = marker.y - 14;
  const hitRadius = Math.max(28, marker.label.length * 4) / zoom;
  if (Math.hypot(pt.x - marker.x, pt.y - labelY) <= hitRadius) return true;
  return Math.hypot(pt.x - marker.x, pt.y - marker.y) <= 10 / zoom;
}

function pointInTable(pt: Point, table: Table): boolean {
  const cx = table.x + table.width / 2;
  const cy = table.y + table.height / 2;
  const rad = (-table.rotation * Math.PI) / 180;
  const dx = pt.x - cx;
  const dy = pt.y - cy;
  const lx = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
  const ly = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
  return lx >= table.x && lx <= table.x + table.width && ly >= table.y && ly <= table.y + table.height;
}

function rectIntersectsMarquee(
  table: Table,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  const tx2 = table.x + table.width;
  const ty2 = table.y + table.height;
  return table.x <= x2 && tx2 >= x1 && table.y <= y2 && ty2 >= y1;
}
