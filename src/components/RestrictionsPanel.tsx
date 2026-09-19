import { useMemo } from 'react';
import type { RestrictionKind, SeatingRestriction } from '@/models/types';
import { ADJACENT_SEAT_DISTANCE } from '@/utils/seatOrdering';

interface RestrictionsPanelProps {
  guestNames: string[];
  restrictions: SeatingRestriction[];
  onChange: (restrictions: SeatingRestriction[]) => void;
}

function newRestriction(guestNames: string[], kind: RestrictionKind = 'within'): SeatingRestriction {
  return {
    id: crypto.randomUUID(),
    kind,
    guestA: guestNames[0] ?? '',
    guestB: guestNames[1] ?? guestNames[0] ?? '',
    chairDistance: 2,
  };
}

function RestrictionItem({
  restriction,
  guestOptions,
  onChange,
  onRemove,
}: {
  restriction: SeatingRestriction;
  guestOptions: string[];
  onChange: (patch: Partial<SeatingRestriction>) => void;
  onRemove: () => void;
}) {
  return (
    <li className="restriction-item">
      <select
        className="restriction-guest-select"
        value={restriction.guestA}
        onChange={(e) => onChange({ guestA: e.target.value })}
        aria-label="First guest"
      >
        <option value="">Guest</option>
        {guestOptions.map((name) => (
          <option key={`a-${name}`} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        className="restriction-kind-select"
        value={restriction.kind}
        onChange={(e) => onChange({ kind: e.target.value as RestrictionKind })}
        aria-label="Restriction type"
      >
        <option value="within">within</option>
        <option value="not_within">not within</option>
      </select>

      <input
        type="number"
        className="restriction-number"
        min={1}
        max={99}
        value={restriction.chairDistance}
        aria-label="Chair distance"
        onChange={(e) =>
          onChange({ chairDistance: Math.max(1, Number(e.target.value) || 1) })
        }
      />

      <span className="restriction-text">of</span>

      <select
        className="restriction-guest-select"
        value={restriction.guestB}
        onChange={(e) => onChange({ guestB: e.target.value })}
        aria-label="Second guest"
      >
        <option value="">Guest</option>
        {guestOptions.map((name) => (
          <option key={`b-${name}`} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="restriction-remove"
        aria-label="Remove restriction"
        onClick={onRemove}
      >
        ×
      </button>
    </li>
  );
}

export function RestrictionsPanel({ guestNames, restrictions, onChange }: RestrictionsPanelProps) {
  const guestOptions = useMemo(() => {
    const names = new Set(guestNames);
    for (const r of restrictions) {
      if (r.guestA) names.add(r.guestA);
      if (r.guestB) names.add(r.guestB);
    }
    return [...names];
  }, [guestNames, restrictions]);

  const addRestriction = () => {
    onChange([...restrictions, newRestriction(guestOptions)]);
  };

  return (
    <div className="restrictions-box">
      <div className="restrictions-header">
        <h3>Restrictions</h3>
        <p className="restrictions-subtitle">
          Next to each other = {ADJACENT_SEAT_DISTANCE} seat apart around a table.
        </p>
        <button
          type="button"
          className="restrictions-add-btn"
          aria-label="Add restriction"
          title="Add restriction"
          disabled={guestOptions.length < 2}
          onClick={addRestriction}
        >
          +
        </button>
      </div>

      {guestOptions.length < 2 && (
        <p className="property-hint">Add at least two guest names to create restrictions.</p>
      )}

      {restrictions.length === 0 ? (
        <p className="restrictions-empty">No restrictions yet.</p>
      ) : (
        <ul className="restrictions-list">
          {restrictions.map((restriction) => (
            <RestrictionItem
              key={restriction.id}
              restriction={restriction}
              guestOptions={guestOptions}
              onChange={(patch) =>
                onChange(
                  restrictions.map((r) => (r.id === restriction.id ? { ...r, ...patch } : r))
                )
              }
              onRemove={() => onChange(restrictions.filter((r) => r.id !== restriction.id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
