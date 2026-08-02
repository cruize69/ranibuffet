import { useState } from 'react';

// Wraps a staff-only page. Holds the PIN in sessionStorage (per storageKey) so
// a refresh doesn't force re-entry, but it clears when the tab closes. The PIN
// itself is only ever validated server-side; a wrong PIN just fails the calls.
export default function PinGate({ storageKey, title, children }) {
  const [pin, setPin] = useState(() => sessionStorage.getItem(storageKey) || '');
  const [entry, setEntry] = useState('');

  if (pin) {
    return children(pin, () => {
      sessionStorage.removeItem(storageKey);
      setPin('');
    });
  }

  const submit = () => {
    const val = entry.trim();
    if (!val) return;
    sessionStorage.setItem(storageKey, val);
    setPin(val);
  };

  return (
    <div className="shell">
      <div className="gate">
        <h1>{title}</h1>
        <p>Enter the staff PIN to continue.</p>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          autoFocus
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="PIN"
        />
        <button className="btn" onClick={submit}>Unlock</button>
      </div>
    </div>
  );
}
