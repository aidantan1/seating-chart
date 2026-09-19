import { useAppStore } from '@/state/appStore';
import { GuestSeatingPanel } from '@/components/GuestSeatingPanel';

export function PropertiesPanel() {
  const tables = useAppStore((s) => s.tables);
  const seats = useAppStore((s) => s.seats);
  const markers = useAppStore((s) => s.markers);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const updateTable = useAppStore((s) => s.updateTable);
  const updateSeat = useAppStore((s) => s.updateSeat);
  const updateMarker = useAppStore((s) => s.updateMarker);
  const pushHistory = useAppStore((s) => s.pushHistory);

  const selectedTable =
    selectedIds.length === 1 ? tables.find((t) => t.id === selectedIds[0]) : null;
  const selectedSeat =
    selectedIds.length === 1 ? seats.find((s) => s.id === selectedIds[0]) : null;
  const selectedMarker =
    selectedIds.length === 1 ? markers.find((m) => m.id === selectedIds[0]) : null;

  return (
    <div className="properties">
      {!selectedTable && !selectedSeat && !selectedMarker && (
        <p className="properties-empty">Select a table, seat, or marker to edit its properties.</p>
      )}

      {selectedTable && (
        <div className="property-group">
          <label htmlFor="table-label">Table label</label>
          <input
            id="table-label"
            value={selectedTable.label}
            onChange={(e) => updateTable(selectedTable.id, { label: e.target.value })}
            onBlur={pushHistory}
          />
        </div>
      )}

      {selectedMarker && (
        <div className="property-group">
          <label htmlFor="marker-label">Marker label</label>
          <input
            id="marker-label"
            value={selectedMarker.label}
            onChange={(e) => updateMarker(selectedMarker.id, { label: e.target.value })}
            onBlur={pushHistory}
          />
          <p className="property-hint">
            Room anchors such as teacher, whiteboard, or projector.
          </p>
        </div>
      )}

      {selectedSeat && (
        <div className="property-group">
          <label htmlFor="seat-table">Linked table</label>
          <select
            id="seat-table"
            value={selectedSeat.tableId ?? ''}
            onChange={(e) => {
              const tableId = e.target.value || null;
              updateSeat(selectedSeat.id, { tableId });
              pushHistory();
            }}
          >
            <option value="">Unassigned</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="property-hint">
            Choose which table this seat belongs to. Unassigned seats show an orange dashed ring.
          </p>
        </div>
      )}

      <GuestSeatingPanel />
    </div>
  );
}
