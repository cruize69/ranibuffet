import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import PinGate from '../components/PinGate.jsx';
import {
  getConfig, listReservations, reservationAction,
  savePushSubscription, removePushSubscription, getNewReservations
} from '../lib/api.js';
import { shortDate, fullDate, timeAgo, monthGrid } from '../lib/format.js';
import { pushSupported, getExistingSubscription, subscribeToPush, unsubscribeFromPush } from '../lib/push-client.js';

export default function StaffManager() {
  return (
    <PinGate storageKey="rm_staff_pin" title="Reservations">
      {(pin, signOut) => <Manager pin={pin} signOut={signOut} />}
    </PinGate>
  );
}

function Manager({ pin, signOut }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [weeks, setWeeks] = useState([]);
  const [week, setWeek] = useState('');
  const [launchSunday, setLaunchSunday] = useState('');
  const [vapidKey, setVapidKey] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const [showCalendar, setShowCalendar] = useState(false);
  const [calYear, setCalYear] = useState(null);
  const [calMonth, setCalMonth] = useState(null);

  const [notifState, setNotifState] = useState('unsupported'); // unsupported | off | on | busy
  const [notifError, setNotifError] = useState('');

  // "New reservation" badge + modal
  const [newTotal, setNewTotal] = useState(0);
  const [newItems, setNewItems] = useState([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [highlightId, setHighlightId] = useState('');
  const highlightTimer = useRef(null);
  const deepLinkHandled = useRef(false);

  const refreshNewSummary = useCallback(() => {
    getNewReservations(pin)
      .then((r) => { setNewTotal(r.total); setNewItems(r.items); })
      .catch(() => {}); // badge is a nicety — a failed refresh just leaves the old count
  }, [pin]);

  useEffect(() => {
    getConfig().then((c) => {
      setWeeks(c.staffSundays);
      setLaunchSunday(c.launchSunday || '');
      setVapidKey(c.vapidPublicKey || null);

      // Deep link from a push notification: ?sunday=...&highlight=<id>
      const sundayParam = searchParams.get('sunday');
      const highlightParam = searchParams.get('highlight');
      if (sundayParam && highlightParam && !deepLinkHandled.current) {
        deepLinkHandled.current = true;
        setWeek(sundayParam);
        setHighlightId(highlightParam);
        reservationAction({ week: sundayParam, id: highlightParam, action: 'mark-seen' }, pin)
          .catch(() => {})
          .finally(refreshNewSummary);
        setSearchParams({}, { replace: true }); // don't re-trigger on refresh
        const [y, m] = sundayParam.split('-').map(Number);
        setCalYear(y); setCalMonth(m - 1);
      } else {
        setWeek(c.staffSundays[0]);
        const [y, m] = c.staffSundays[0].split('-').map(Number);
        setCalYear(y); setCalMonth(m - 1);
      }

      if (c.vapidPublicKey && pushSupported()) {
        getExistingSubscription()
          .then((sub) => setNotifState(sub ? 'on' : 'off'))
          .catch(() => setNotifState('off'));
      } else {
        setNotifState('unsupported');
      }
    });
    refreshNewSummary();
    const poll = setInterval(refreshNewSummary, 30000);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Once the target week's data has loaded, scroll to and briefly glow the
  // highlighted reservation, then let the highlight fade on its own.
  useEffect(() => {
    if (!highlightId || !data) return;
    const el = document.getElementById(`res-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(''), 2600);
    return () => clearTimeout(highlightTimer.current);
  }, [highlightId, data]);

  const act = async (id, action) => {
    if (action === 'delete' && !confirm('Delete this reservation? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await reservationAction({ week, id, action }, pin);
      await load(week);
      if (action === 'delete') refreshNewSummary();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId('');
    }
  };

  const openNewReservation = async (item) => {
    setShowNewModal(false);
    setWeek(item.sunday);
    setHighlightId(item.id);
    try {
      await reservationAction({ week: item.sunday, id: item.id, action: 'mark-seen' }, pin);
    } catch { /* non-fatal — worst case it stays in the badge until next refresh */ }
    refreshNewSummary();
  };

  const pickDate = (dateStr) => {
    setWeek(dateStr);
    setShowCalendar(false);
  };

  const shiftMonth = (delta) => {
    let y = calYear, m = calMonth + delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCalYear(y); setCalMonth(m);
  };

  const enableNotifications = async () => {
    setNotifError('');
    setNotifState('busy');
    try {
      const sub = await subscribeToPush(vapidKey);
      await savePushSubscription(sub, pin);
      setNotifState('on');
    } catch (e) {
      setNotifError(e.message || 'Could not enable notifications.');
      setNotifState('off');
    }
  };

  const disableNotifications = async () => {
    setNotifError('');
    setNotifState('busy');
    try {
      const sub = await unsubscribeFromPush();
      if (sub) await removePushSubscription(sub.endpoint, pin);
      setNotifState('off');
    } catch (e) {
      setNotifError(e.message || 'Could not disable notifications.');
      setNotifState('on');
    }
  };

  return (
    <div className="shell">
      <div className="mgr-top">
        <h1>RESERVATIONS</h1>
        <div className="mgr-top-actions">
          {newTotal > 0 && (
            <button
              className="bell-btn"
              aria-label={`${newTotal} new reservation${newTotal === 1 ? '' : 's'}`}
              onClick={() => { setShowNewModal(true); refreshNewSummary(); }}
            >
              🔔<span className="bell-badge">{newTotal > 99 ? '99+' : newTotal}</span>
            </button>
          )}
          <button className="sign-out" onClick={signOut}>Sign out</button>
        </div>
      </div>

      {notifState !== 'unsupported' && (
        <div className="notif-row">
          {notifState === 'on' && (
            <button className="chip-btn" onClick={disableNotifications}>🔔 Notifications on</button>
          )}
          {notifState === 'off' && (
            <button className="chip-btn solid" onClick={enableNotifications}>🔕 Enable notifications</button>
          )}
          {notifState === 'busy' && (
            <button className="chip-btn" disabled>Working…</button>
          )}
        </div>
      )}
      {notifError && <div className="error-msg">{notifError}</div>}

      <div className="week-switch">
        {weeks.map((w) => (
          <button key={w} className="week-chip" aria-pressed={week === w}
            onClick={() => setWeek(w)}>{shortDate(w)}</button>
        ))}
        <button className="week-chip jump" aria-pressed={showCalendar}
          onClick={() => setShowCalendar((s) => !s)}>Jump to date {showCalendar ? '▴' : '▾'}</button>
      </div>

      {showCalendar && calYear != null && (
        <div className="calendar">
          <div className="cal-head">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
            <div className="cal-title">
              {new Date(calYear, calMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month">›</button>
          </div>
          <div className="cal-dow">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
          </div>
          {monthGrid(calYear, calMonth).map((row, ri) => (
            <div className="cal-row" key={ri}>
              {row.map((cell) => {
                const selectable = cell.inMonth && cell.isSunday && (!launchSunday || cell.dateStr >= launchSunday);
                return selectable ? (
                  <button
                    key={cell.dateStr}
                    type="button"
                    className="cal-day cal-sunday"
                    aria-pressed={week === cell.dateStr}
                    onClick={() => pickDate(cell.dateStr)}
                  >
                    {cell.day}
                  </button>
                ) : (
                  <div key={cell.dateStr} className={`cal-day cal-muted ${cell.inMonth ? '' : 'cal-out'}`}>
                    {cell.day}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

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
            <div key={r.id} id={`res-${r.id}`} className={`res-card ${r.seated ? 'seated' : ''} ${highlightId === r.id ? 'just-viewed' : ''}`}>
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

      {showNewModal && (
        <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Reservations{newItems.length ? ` (${newItems.length})` : ''}</h2>
              <button className="modal-close" onClick={() => setShowNewModal(false)} aria-label="Close">×</button>
            </div>
            {newItems.length === 0 && <div className="empty">Nothing new right now.</div>}
            {newItems.map((item) => (
              <button key={item.id} className="new-res-row" onClick={() => openNewReservation(item)}>
                <div className="new-res-main">
                  <span className="res-name">{item.name}</span>
                  <span className="res-party">Party of {item.partySize}</span>
                </div>
                <div className="new-res-sub">{fullDate(item.sunday)} · booked {timeAgo(item.createdAt)}</div>
                <span className="chevron">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
