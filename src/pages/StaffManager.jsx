import { useEffect, useState, useCallback } from 'react';
import PinGate from '../components/PinGate.jsx';
import { getConfig, listReservations, reservationAction } from '../lib/api.js';
import { shortDate, fullDate, timeAgo } from '../lib/format.js';

export default function StaffManager() {
  return (
    <PinGate storageKey="rm_staff_pin" title="Reservations">
      {(pin, signOut) => <Manager pin={pin} signOut={signOut} />}
    </PinGate>
  );
}

function Manager({ pin, signOut }) {
  const [weeks, setWeeks] = useState([]);
  const [week, setWeek] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    getConfig().then((c) => {
      setWeeks(c.staffSundays);
      setWeek(c.staffSundays[0]);
    });
  }, []);

  const load = useCallback(async (w) => {
    if (!w) return;
    setError('');
    try {
      setData(await listReservations(w, pin));
    } catch (e) {
      setError(e.message);
      setData(null);
    }
  }, [pin]);

  useEffect(() => { load(week); }, [week, load]);

  const act = async (id, action) => {
    if (action === 'delete' && !confirm('Delete this reservation? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await reservationAction({ week, id, action }, pin);
      await load(week);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="shell">
      <div className="mgr-top">
        <h1>RESERVATIONS</h1>
        <button className="sign-out" onClick={signOut}>Sign out</button>
      </div>

      <div className="week-switch">
        {weeks.map((w) => (
          <button key={w} className="week-chip" aria-pressed={week === w}
            onClick={() => setWeek(w)}>{shortDate(w)}</button>
        ))}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {data && (
        <>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--peacock-deep)', margin: '4px 0 14px' }}>
            {fullDate(week)}
          </div>
          <div className="tally">
            <div className="stat"><div className="num">{data.totals.reservations}</div><div className="lbl">Bookings</div></div>
            <div className="stat"><div className="num">{data.totals.covers}</div><div className="lbl">Covers</div></div>
            <div className="stat"><div className="num">{data.totals.seatedCovers}</div><div className="lbl">Seated</div></div>
          </div>

          {data.reservations.length === 0 && <div className="empty">No reservations yet for this Sunday.</div>}

          {data.reservations.map((r) => (
            <div key={r.id} className={`res-card ${r.seated ? 'seated' : ''}`}>
              <div className="res-head">
                <span className="res-name">{r.name}</span>
                <span className="res-party">Party of {r.partySize}</span>
              </div>
              <div className="res-meta">
                <a href={`mailto:${r.email}`}>{r.email}</a>
                {r.phone && <a href={`tel:${r.phone.replace(/[^\d]/g, '')}`}>{r.phone}</a>}
                <span>Booked {timeAgo(r.createdAt)}</span>
              </div>
              <div className="res-actions">
                <button className={`chip-btn ${r.seated ? '' : 'solid'}`} disabled={busyId === r.id}
                  onClick={() => act(r.id, r.seated ? 'unseat' : 'seat')}>
                  {r.seated ? 'Seated ✓' : 'Mark seated'}
                </button>
                <button className="chip-btn danger" disabled={busyId === r.id}
                  onClick={() => act(r.id, 'delete')}>Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      {!data && !error && <div className="loading">Loading…</div>}
    </div>
  );
}
