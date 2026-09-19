import type { Table } from '@/models/types';

interface Props {
  table: Table;
  zoom: number;
}

export function SelectionHandles({ table, zoom }: Props) {
  const { x, y, width, height } = table;
  const size = 8 / zoom;
  const half = size / 2;
  const handles = [
    { kind: 'nw', hx: x, hy: y },
    { kind: 'n', hx: x + width / 2, hy: y },
    { kind: 'ne', hx: x + width, hy: y },
    { kind: 'e', hx: x + width, hy: y + height / 2 },
    { kind: 'se', hx: x + width, hy: y + height },
    { kind: 's', hx: x + width / 2, hy: y + height },
    { kind: 'sw', hx: x, hy: y + height },
    { kind: 'w', hx: x, hy: y + height / 2 },
  ];

  return (
    <g>
      {handles.map((h) => (
        <rect
          key={h.kind}
          data-handle={h.kind}
          x={h.hx - half}
          y={h.hy - half}
          width={size}
          height={size}
          fill="white"
          stroke="var(--accent)"
          strokeWidth={1 / zoom}
        />
      ))}
      <circle
        data-handle="rotate"
        cx={x + width / 2}
        cy={y - 24 / zoom}
        r={5 / zoom}
        fill="white"
        stroke="var(--accent)"
        strokeWidth={1 / zoom}
      />
    </g>
  );
}
