import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConfig, createReservation } from '../lib/api.js';
import { monthShort, dayNum, relLabel, fullDate } from '../lib/format.js';

export default function ReservePage() {
  const [config, setConfig] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [sunday, setSunday] = useState('');
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
      <div className="shell">
        <Masthead />
        <div className="error-msg" style={{ marginTop: 40 }}>{loadError}</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="shell">
        <Masthead />
        <div className="loading">Setting the table…</div>
      </div>
    );
  }

  if (done) return <Confirmation done={done} buffet={config.buffet} restaurant={config.restaurant} />;

  const { buffet, restaurant } = config;

  return (
    <div className="shell">
      <Masthead />

      <div className="arch-card hero">
        <div className="kicker">Sunday Lunch Special</div>
        <h1>Buffet</h1>
        <div className="price"><sup>$</sup>{buffet.price}</div>
        <div className="price-note">per person · by reservation only</div>
        <div className="window">Sundays, {buffet.window}</div>
      </div>

      <div className="section-label"><span>Choose a Sunday</span></div>
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

      <div className="section-label"><span>Your details</span></div>

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
  );
}

function Confirmation({ done, buffet, restaurant }) {
  return (
    <div className="shell">
      <Masthead />
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
  );
}

function Masthead() {
  return (
    <header className="masthead">
      <div className="eyebrow">Fine Indian Cuisine</div>
      <h1 className="wordmark">RANI MAHAL</h1>
      <div className="rule-gold" />
    </header>
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
