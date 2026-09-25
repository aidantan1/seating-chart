import type { Marker, Seat, Table } from '@/models/types';
import { orderSeatsAroundTable } from '@/utils/seatOrdering';
import { tableColor } from '@/utils/tableColors';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderTableShape(table: Table, color: string): string {
  const isRound = table.type === 'circle';
  const isOval = table.type === 'oval';
  const isCustom = table.type === 'custom' && table.points;
  const cx = table.x + table.width / 2;
  const cy = table.y + table.height / 2;

  let shape = '';
  if (isCustom) {
    const d = table.points!
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${table.x + p.x} ${table.y + p.y}`)
      .join(' ');
    shape = `<path d="${d} Z" fill="#3d5a80" stroke="${color}" stroke-width="1.5" opacity="0.9"/>`;
  } else {
    const rx = isRound ? table.width / 2 : isOval ? table.height / 2 : 6;
    const ry = isRound ? table.height / 2 : isOval ? table.height / 2 : 6;
    shape = `<rect x="${table.x}" y="${table.y}" width="${table.width}" height="${table.height}" rx="${rx}" ry="${ry}" fill="#3d5a80" stroke="${color}" stroke-width="1.5" opacity="0.9"/>`;
  }

  return `
    <g transform="rotate(${table.rotation}, ${cx}, ${cy})">
      ${shape}
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.92)" font-size="${Math.min(14, table.width / 6)}" font-weight="600">${escapeHtml(table.label)}</text>
    </g>
  `;
}

function renderMarkerShape(marker: Marker): string {
  const labelY = marker.y - 14;
  return `
    <g>
      <circle cx="${marker.x}" cy="${marker.y}" r="3.5" fill="#8b9cb3"/>
      <text x="${marker.x}" y="${labelY}" text-anchor="middle" fill="#e8edf4" font-size="13" font-weight="600" stroke="#0f1419" stroke-width="4" paint-order="stroke fill">${escapeHtml(marker.label)}</text>
    </g>
  `;
}

export function openSeatingWindow(
  tables: Table[],
  seats: Seat[],
  markers: Marker[],
  assignment: Map<string, string>
): Window | null {
  const popup = window.open('', '_blank', 'width=1100,height=800');
  if (!popup) return null;

  const bounds = computeBounds(tables, seats, markers);
  const padding = 60;
  const viewW = Math.max(bounds.width + padding * 2, 400);
  const viewH = Math.max(bounds.height + padding * 2, 300);
  const offsetX = bounds.minX - padding;
  const offsetY = bounds.minY - padding;

  const tableColorById = new Map(tables.map((t, i) => [t.id, tableColor(i)]));

  const seatLinks = seats
    .filter((s) => s.tableId)
    .map((seat) => {
      const table = tables.find((t) => t.id === seat.tableId);
      if (!table) return '';
      const color = tableColorById.get(seat.tableId!) ?? '#5a7a9a';
      const cx = table.x + table.width / 2;
      const cy = table.y + table.height / 2;
      return `<line x1="${seat.x}" y1="${seat.y}" x2="${cx}" y2="${cy}" stroke="${color}" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.35"/>`;
    })
    .join('');

  const seatDots = seats
    .map((seat) => {
      const color = seat.tableId ? tableColorById.get(seat.tableId) ?? '#5a7a9a' : '#ffb020';
      const name = assignment.get(seat.id);
      const label = name ? escapeHtml(name.split(' ')[0]) : '';
      return `
        <g>
          <circle cx="${seat.x}" cy="${seat.y}" r="12" fill="${name ? '#4f8cff' : '#6b8cae'}" stroke="${color}" stroke-width="2.5"/>
          ${label ? `<text x="${seat.x}" y="${seat.y - 18}" text-anchor="middle" fill="#e8edf4" font-size="11" font-weight="500">${label}</text>` : ''}
        </g>
      `;
    })
    .join('');

  const tableShapes = tables
    .map((table, i) => renderTableShape(table, tableColor(i)))
    .join('');

  const markerShapes = markers.map(renderMarkerShape).join('');

  const tableSections = tables
    .map((table, i) => {
      const tableSeats = orderSeatsAroundTable(
        seats.filter((s) => s.tableId === table.id),
        table
      );
      const rows = tableSeats
        .map((seat, idx) => {
          const guest = assignment.get(seat.id);
          return `<li><span class="seat-num">Seat ${idx + 1}</span> ${guest ? escapeHtml(guest) : '<em class="empty">Empty</em>'}</li>`;
        })
        .join('');

      const emptySeats = tableSeats.filter((s) => !assignment.has(s.id)).length;

      return `
        <section class="table-card" style="border-color: ${tableColor(i)}">
          <h3>${escapeHtml(table.label)}</h3>
          <ul>${rows || '<li><em class="empty">No seats linked</em></li>'}</ul>
          ${emptySeats > 0 ? `<p class="meta">${emptySeats} empty seat${emptySeats === 1 ? '' : 's'}</p>` : ''}
        </section>
      `;
    })
    .join('');

  const unassignedSeats = seats.filter((s) => !s.tableId);
  const unassignedSeatSection =
    unassignedSeats.length > 0
      ? `
    <section class="table-card warn">
      <h3>Unlinked seats</h3>
      <ul>${unassignedSeats
        .map((seat, idx) => {
          const guest = assignment.get(seat.id);
          return `<li><span class="seat-num">Seat ${idx + 1}</span> ${guest ? escapeHtml(guest) : '<em class="empty">Empty</em>'}</li>`;
        })
        .join('')}</ul>
    </section>`
      : '';

  const assignedCount = assignment.size;
  const totalSeats = seats.length;

  popup.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Seating Arrangement</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #0f1419;
      color: #e8edf4;
    }
    header {
      padding: 16px 24px;
      background: #1a2332;
      border-bottom: 1px solid #2d3a4f;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    header h1 { margin: 0; font-size: 1.2rem; }
    header p { margin: 4px 0 0; font-size: 0.85rem; color: #8b9cb3; }
    .layout { display: flex; min-height: calc(100vh - 65px); }
    .map-wrap {
      flex: 1;
      padding: 16px;
      overflow: auto;
      background: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0) 0 0 / 24px 24px, #0f1419;
    }
    .map-wrap svg { display: block; max-width: 100%; height: auto; }
    .sidebar {
      width: 320px;
      flex-shrink: 0;
      padding: 16px;
      background: #1a2332;
      border-left: 1px solid #2d3a4f;
      overflow-y: auto;
    }
    .sidebar h2 {
      margin: 0 0 12px;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #8b9cb3;
    }
    .table-card {
      background: #243044;
      border: 1px solid #2d3a4f;
      border-left-width: 3px;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .table-card.warn { border-left-color: #ffb020; }
    .table-card h3 { margin: 0 0 8px; font-size: 0.95rem; }
    .table-card ul { margin: 0; padding-left: 0; list-style: none; }
    .table-card li { font-size: 0.85rem; padding: 3px 0; }
    .seat-num { color: #8b9cb3; margin-right: 6px; font-size: 0.78rem; }
    .empty { color: #8b9cb3; font-style: italic; }
    .meta { margin: 8px 0 0; font-size: 0.75rem; color: #8b9cb3; }
    .notice {
      margin-top: 12px;
      padding: 10px 12px;
      background: #243044;
      border-radius: 8px;
      font-size: 0.82rem;
      color: #ffb020;
      border: 1px solid #2d3a4f;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>Seating Arrangement</h1>
      <p>${assignedCount} guest${assignedCount === 1 ? '' : 's'} assigned · ${totalSeats} seat${totalSeats === 1 ? '' : 's'} · ${tables.length} table${tables.length === 1 ? '' : 's'}</p>
    </div>
  </header>
  <div class="layout">
    <div class="map-wrap">
      <svg viewBox="${offsetX} ${offsetY} ${viewW} ${viewH}" xmlns="http://www.w3.org/2000/svg">
        ${tableShapes}
        ${markerShapes}
        ${seatLinks}
        ${seatDots}
      </svg>
    </div>
    <aside class="sidebar">
      <h2>By table</h2>
      ${tableSections || '<p class="empty">No tables drawn yet.</p>'}
      ${unassignedSeatSection}
      <div id="extra-notice"></div>
    </aside>
  </div>
</body>
</html>`);

  popup.document.close();
  return popup;
}

export function openSeatingWindowWithGuests(
  tables: Table[],
  seats: Seat[],
  markers: Marker[],
  assignment: Map<string, string>,
  allGuestNames: string[]
): Window | null {
  const popup = openSeatingWindow(tables, seats, markers, assignment);
  if (!popup) return null;

  const assigned = new Set(assignment.values());
  const unassigned = allGuestNames.filter((name) => !assigned.has(name));

  if (unassigned.length > 0) {
    const notice = popup.document.getElementById('extra-notice');
    if (notice) {
      notice.className = 'notice';
      notice.innerHTML = `<strong>${unassigned.length} guest${unassigned.length === 1 ? '' : 's'} without a seat:</strong><br>${unassigned.map(escapeHtml).join(', ')}`;
    }
  }

  return popup;
}

function computeBounds(tables: Table[], seats: Seat[], markers: Marker[]) {
  const points: { x: number; y: number }[] = [];
  for (const t of tables) {
    points.push({ x: t.x, y: t.y }, { x: t.x + t.width, y: t.y + t.height });
  }
  for (const s of seats) {
    points.push({ x: s.x, y: s.y });
  }
  for (const m of markers) {
    points.push({ x: m.x, y: m.y }, { x: m.x, y: m.y - 14 });
  }

  if (points.length === 0) {
    return { minX: 0, minY: 0, width: 400, height: 300 };
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return { minX, minY, width: maxX - minX, height: maxY - minY };
}
