import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type Side = 'left' | 'right';

interface SidePanelProps {
  side: Side;
  label: string;
  storageKey: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  children: ReactNode;
}

const COLLAPSED_WIDTH = 40;

function readStoredWidth(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function readStoredCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function SidePanel({
  side,
  label,
  storageKey,
  defaultWidth,
  minWidth = 180,
  maxWidth = 480,
  children,
}: SidePanelProps) {
  const [width, setWidth] = useState(() => readStoredWidth(`${storageKey}:width`, defaultWidth));
  const [collapsed, setCollapsed] = useState(() => readStoredCollapsed(`${storageKey}:collapsed`));
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:width`, String(width));
    } catch {
      /* ignore */
    }
  }, [storageKey, width]);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}:collapsed`, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [storageKey, collapsed]);

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      const startX = e.clientX;
      const startW = widthRef.current;

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: PointerEvent) => {
        const delta = side === 'left' ? ev.clientX - startX : startX - ev.clientX;
        const next = Math.min(maxWidth, Math.max(minWidth, startW + delta));
        setWidth(next);
      };

      const onUp = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [collapsed, maxWidth, minWidth, side]
  );

  const toggleCollapsed = () => setCollapsed((value) => !value);

  const collapseIcon = side === 'left' ? '‹' : '›';
  const expandIcon = side === 'left' ? '›' : '‹';

  return (
    <aside
      className={`side-panel side-panel--${side}${collapsed ? ' is-collapsed' : ''}`}
      style={{ width: collapsed ? COLLAPSED_WIDTH : width }}
      aria-label={label}
      aria-expanded={!collapsed}
    >
      <div className="side-panel-chrome">
        {!collapsed && <span className="side-panel-label">{label}</span>}
        <button
          type="button"
          className="side-panel-toggle"
          onClick={toggleCollapsed}
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
          title={collapsed ? `Expand ${label}` : `Collapse ${label}`}
        >
          {collapsed ? expandIcon : collapseIcon}
        </button>
      </div>

      <div className="side-panel-body">{children}</div>

      {!collapsed && (
        <div
          className="side-panel-resizer"
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label}`}
        />
      )}
    </aside>
  );
}
