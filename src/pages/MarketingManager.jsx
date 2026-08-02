import { useEffect, useState, useMemo } from 'react';
import PinGate from '../components/PinGate.jsx';
import { listMarketing, setOptOut, downloadMarketingCsv } from '../lib/api.js';

export default function MarketingManager() {
  return (
    <PinGate storageKey="rm_staff_pin" title="Marketing List">
      {(pin, signOut) => <Manager pin={pin} signOut={signOut} />}
    </PinGate>
  );
}

function Manager({ pin, signOut }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showOptedOut, setShowOptedOut] = useState(false);
  const [busy, setBusy] = useState('');

  const load = async () => {
    setError('');
    try { setData(await listMarketing(pin)); }
    catch (e) { setError(e.message); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggle = async (c) => {
    setBusy(c.email);
    try {
      await setOptOut(c.email, !c.optedOut, pin);
      await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  };

  const exportCsv = async () => {
    try { await downloadMarketingCsv(pin); }
    catch (e) { setError(e.message); }
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.contacts.filter((c) => {
      if (!showOptedOut && c.optedOut) return false;
      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q) || c.email.includes(q);
    });
  }, [data, query, showOptedOut]);

  return (
    <div className="shell">
      <div className="mgr-top">
        <h1>MARKETING</h1>
        <button className="sign-out" onClick={signOut}>Sign out</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {data && (
        <>
          <div className="tally">
            <div className="stat"><div className="num">{data.totals.active}</div><div className="lbl">Subscribed</div></div>
            <div className="stat"><div className="num">{data.totals.optedOut}</div><div className="lbl">Opted out</div></div>
            <div className="stat"><div className="num">{data.totals.total}</div><div className="lbl">Total</div></div>
          </div>

          <div className="toolbar">
            <input className="input search" placeholder="Search name or email"
              value={query} onChange={(e) => setQuery(e.target.value)} />
            <button className="btn-ghost chip-btn" style={{ flex: '0 0 auto', padding: '0 14px' }}
              onClick={exportCsv}>Export CSV</button>
          </div>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            <input type="checkbox" checked={showOptedOut}
              onChange={(e) => setShowOptedOut(e.target.checked)}
              style={{ accentColor: 'var(--peacock)' }} />
            Show opted-out contacts
          </label>

          {filtered.length === 0 && (
            <div className="empty">
              {data.totals.total === 0
                ? 'No subscribers yet. Contacts appear here when customers opt in while booking.'
                : 'No contacts match your search.'}
            </div>
          )}

          {filtered.map((c) => (
            <div key={c.email} className="res-card">
              <div className="res-head">
                <span className="res-name">{c.name || '—'}</span>
                <span className={`tag ${c.optedOut ? 'opted-out' : 'active'}`}>
                  {c.optedOut ? 'Opted out' : 'Subscribed'}
                </span>
              </div>
              <div className="res-meta">
                <a href={`mailto:${c.email}`}>{c.email}</a>
                {c.phone && <span>{c.phone}</span>}
                <span>{c.reservationCount} {c.reservationCount === 1 ? 'visit' : 'visits'}</span>
              </div>
              <div className="res-actions">
                <button className={`chip-btn ${c.optedOut ? 'solid' : ''}`} disabled={busy === c.email}
                  onClick={() => toggle(c)}>
                  {c.optedOut ? 'Resubscribe' : 'Mark opted out'}
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {!data && !error && <div className="loading">Loading…</div>}
    </div>
  );
}
