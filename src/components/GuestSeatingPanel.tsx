import { useMemo, useState } from 'react';
import { useAppStore } from '@/state/appStore';
import { parseGuestNames, randomAssign } from '@/engine/randomAssign';
import { openSeatingWindowWithGuests } from '@/utils/openSeatingWindow';
import { RestrictionsPanel } from '@/components/RestrictionsPanel';
import type { SeatingRestriction } from '@/models/types';

export function GuestSeatingPanel() {
  const tables = useAppStore((s) => s.tables);
  const seats = useAppStore((s) => s.seats);
  const [guestText, setGuestText] = useState('');
  const [restrictions, setRestrictions] = useState<SeatingRestriction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const guestNames = useMemo(() => parseGuestNames(guestText), [guestText]);

  const handleAssign = () => {
    setError(null);

    const guests = parseGuestNames(guestText);
    if (guests.length === 0) {
      setError('Enter at least one guest name.');
      return;
    }

    if (seats.length === 0) {
      setError('Place seats on the canvas first.');
      return;
    }

    const assignment = randomAssign(guests, seats, tables, restrictions);
    if (!assignment) {
      setError('Could not satisfy all seating restrictions. Adjust rules or try again.');
      return;
    }

    const popup = openSeatingWindowWithGuests(tables, seats, assignment, guests);

    if (!popup) {
      setError('Pop-up blocked. Allow pop-ups for this site and try again.');
    }
  };

  const guestCount = guestNames.length;

  return (
    <section className="guest-panel">
      <h2>Guests</h2>
      <div className="property-group">
        <label htmlFor="guest-names">Guest names</label>
        <textarea
          id="guest-names"
          className="guest-textarea"
          rows={6}
          placeholder={'One name per line\nAlice\nBob\nCarol'}
          value={guestText}
          onChange={(e) => {
            setGuestText(e.target.value);
            setError(null);
          }}
        />
        <p className="property-hint">
          {guestCount} name{guestCount === 1 ? '' : 's'} · {seats.length} seat
          {seats.length === 1 ? '' : 's'} available
        </p>
      </div>

      <RestrictionsPanel
        guestNames={guestNames}
        restrictions={restrictions}
        onChange={setRestrictions}
      />

      {error && <p className="guest-error">{error}</p>}

      <button type="button" className="btn btn-primary btn-full" onClick={handleAssign}>
        Randomly assign &amp; view
      </button>
    </section>
  );
}
