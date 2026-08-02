import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConfig, createReservation } from '../lib/api.js';
import { monthShort, dayNum, relLabel, fullDate, monthGrid, addDaysStr } from '../lib/format.js';

// Photography lives in /public/images/dishes. Names match the ordering menu.
const DISHES = [
  { src: 'pakora', name: 'Pakora' },
  { src: 'tandoori-chicken', name: 'Tandoori Chicken' },
  { src: 'palak-paneer', name: 'Palak Paneer' }
];

export default function ReservePage() {
  const [config, setConfig] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [sunday, setSunday] = useState('');
  const [showCal, setShowCal] = useState(false);
  const [calYear, setCalYear] = useState(null);
  const [calMonth, setCalMonth] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [optIn, setOptIn] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    getConfig()
      .then((c) => {
        setConfig(c);
        setSunday(c.bookableSundays[0]);
        const [y, m] = c.bookableSundays[0].split('-').map(Number);
        setCalYear(y);
        setCalMonth(m - 1);
      })
      .catch(() => setLoadError('We could not load buffet dates. Please try again shortly.'));
  }, []);

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError('Please enter a valid email address.');
    setSubmitting(true);
    try {
      const result = await createReservation({
        name, email, phone, partySize, sunday, marketingOptIn: optIn
      });
      setDone({ ...result.reservation, emailSent: result.emailSent });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <>
        <Hero compact />
        <div className="shell">
          <div className="error-msg" style={{ marginTop: 28 }}>{loadError}</div>
        </div>
      </>
    );
  }

  if (!config) {
    return (
      <>
        <Hero compact />
        <div className="shell">
          <div className="loading">Setting the table…</div>
        </div>
      </>
    );
  }

  if (done) return <Confirmation done={done} buffet={config.buffet} restaurant={config.restaurant} />;

  const { buffet, restaurant } = config;
  const [priceDollars, priceCents] = buffet.price.split('.');
  const minSunday = config.bookableSundays[0];
  const maxSunday = addDaysStr(minSunday, 365);
  const isQuickPick = config.bookableSundays.includes(sunday);

  const shiftMonth = (delta) => {
    let y = calYear, m = calMonth + delta;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setCalYear(y); setCalMonth(m);
  };

  return (
    <>
      <Hero />

      <div className="shell">
        <div className="hero-ticket">
          <div className="ticket-main">
            <div className="kicker">Sunday Lunch Special</div>
            <h1>Buffet</h1>
            <div className="ticket-window">{buffet.window}</div>
            <div className="ticket-footnote">Sundays · by reservation only</div>
          </div>
          <div className="ticket-stub">
            <div className="stub-price">
              <span className="stub-currency">$</span>
              <span className="stub-amount">{priceDollars}</span>
              {priceCents && <span className="stub-cents">.{priceCents}</span>}
            </div>
            <div className="stub-note">per person</div>
          </div>
        </div>

        <p className="lede">
          Tandoor, curries, biryani and fresh-baked naan — laid out every Sunday
          afternoon, and served at the table you reserve.
        </p>

        <DishRail />

        <SectionLabel>Choose a Sunday</SectionLabel>
        <div className="sundays">
          {config.bookableSundays.map((s, i) => (
            <button
              key={s}
              className="sunday-btn"
              aria-pressed={sunday === s}
              onClick={() => setSunday(s)}
            >
              <div className="rel">{relLabel(i)}</div>
              <div className="mon">{monthShort(s)}</div>
              <div className="day">{dayNum(s)}</div>
            </button>
          ))}
        </div>

        <button type="button" className="date-more-link" onClick={() => setShowCal((s) => !s)}>
          {showCal ? 'Hide calendar ▴' : 'Choose another date ▾'}
        </button>

        {showCal && calYear != null && (
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
                  const selectable = cell.inMonth && cell.isSunday && cell.dateStr >= minSunday && cell.dateStr <= maxSunday;
                  return selectable ? (
                    <button
                      key={cell.dateStr}
                      type="button"
                      className="cal-day cal-sunday"
                      aria-pressed={sunday === cell.dateStr}
                      onClick={() => { setSunday(cell.dateStr); setShowCal(false); }}
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

        {!isQuickPick && sunday && (
          <div className="selected-date-note">Reserving for {fullDate(sunday)}</div>
        )}

        <SectionLabel>Your details</SectionLabel>

        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" className="input" value={name}
            onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>

        <div className="field">
          <label>Party size</label>
          <div className="party-grid">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button
                key={n}
                type="button"
                className="party-btn"
                aria-pressed={partySize === n}
                onClick={() => setPartySize(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="party-btn party-more"
              aria-pressed={partySize > 7}
              onClick={() => setPartySize((n) => (n > 7 ? n : 8))}
            >
              8+
            </button>
          </div>
          {partySize > 7 && (
            <div className="party-custom">
              <label htmlFor="partyCustom">Exact party size</label>
              <input
                id="partyCustom"
                className="input"
                type="number"
                inputMode="numeric"
                min="8"
                max="30"
                value={partySize}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setPartySize(Number.isNaN(v) ? 8 : Math.max(8, Math.min(30, v)));
                }}
              />
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email"
            inputMode="email" placeholder="you@example.com" />
        </div>

        <div className="field">
          <label htmlFor="phone">Phone <span className="optional">— optional</span></label>
          <input id="phone" className="input" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
        </div>

        <div className="consent">
          <input id="optin" type="checkbox" checked={optIn}
            onChange={(e) => setOptIn(e.target.checked)} />
          <label htmlFor="optin">
            Email me occasional offers and news from {restaurant.name}. Not required to
            reserve — unsubscribe anytime. See our <Link to="/privacy">Privacy Policy</Link>.
          </label>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn" onClick={submit} disabled={submitting}>
          {submitting ? 'Reserving…' : 'Reserve my table'}
        </button>

        <Footer restaurant={restaurant} />
      </div>
    </>
  );
}

function Confirmation({ done, buffet, restaurant }) {
  return (
    <>
      <Hero compact />
      <div className="shell">
        <div className="arch-card confirm">
          <div className="seal">✦</div>
          <h2>You're booked</h2>
          <p>Thank you, {done.name}.</p>
          <div className="detail">
            {fullDate(done.sunday)}<br />
            {buffet.window} · party of {done.partySize}
          </div>
          <p>
            ${buffet.price} per person, paid at the restaurant.<br />
            {done.emailSent
              ? 'A confirmation is on its way to your inbox.'
              : 'Please keep this screen for your records.'}
          </p>
        </div>
        <Footer restaurant={restaurant} />
      </div>
    </>
  );
}

function Hero({ compact = false }) {
  return (
    <header className={`hero${compact ? ' hero-compact' : ''}`}>
      <img
        className="hero-img"
        src="/images/hero-buffet.jpg"
        alt=""
        decoding="async"
      />
      <div className="hero-scrim" />
      <div className="hero-copy">
        <img className="hero-crest" src="/logo/apsara.png" alt="Rani Mahal" />
        <div className="eyebrow">Fine Indian Cuisine</div>
        <h1 className="wordmark">Rani Mahal</h1>
        <div className="rule-gold" />
        {!compact && <div className="hero-place">Mamaroneck, New York</div>}
      </div>
    </header>
  );
}

function DishRail() {
  return (
    <section className="taste">
      <SectionLabel>A taste of the table</SectionLabel>
      <div className="dish-rail">
        {DISHES.map((d) => (
          <figure className="dish" key={d.src}>
            <div className="dish-arch">
              <img
                src={`/images/dishes/${d.src}.jpg`}
                alt={d.name}
                width="420"
                height="420"
                loading="lazy"
                decoding="async"
              />
            </div>
            <figcaption>{d.name}</figcaption>
          </figure>
        ))}
      </div>
      <p className="taste-note">
        A glimpse of our kitchen — the Sunday spread changes week to week.
      </p>
    </section>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="section-label">
      <span>{children}</span>
    </div>
  );
}

function Footer({ restaurant }) {
  return (
    <footer className="foot">
      {restaurant.name} · {restaurant.address}<br />
      <a href={`tel:${restaurant.phone.replace(/[^\d]/g, '')}`}>{restaurant.phone}</a>
      {' · '}
      <Link to="/privacy">Privacy</Link>
    </footer>
  );
}
