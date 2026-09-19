import { useEffect, useRef, useState } from 'react';

interface MarkerNameDialogProps {
  onConfirm: (label: string) => void;
  onCancel: () => void;
}

export function MarkerNameDialog({ onConfirm, onCancel }: MarkerNameDialogProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    onConfirm(value.trim());
  };

  return (
    <div className="marker-dialog-backdrop" onClick={onCancel}>
      <div
        className="marker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="marker-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="marker-dialog-title">Name marker</h2>
        <p className="marker-dialog-hint">e.g. teacher, whiteboard, projector</p>
        <input
          ref={inputRef}
          className="marker-dialog-input"
          placeholder="Marker name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onCancel();
          }}
        />
        <div className="marker-dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Place marker
          </button>
        </div>
      </div>
    </div>
  );
}
