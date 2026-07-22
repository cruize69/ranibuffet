import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getConfig } from '../lib/api.js';

const FALLBACK = {
  name: 'Rani Mahal',
  address: '327 Mamaroneck Ave, Mamaroneck, NY 10543',
  phone: '914-835-9066'
};

export default function PrivacyPage() {
  const [r, setR] = useState(FALLBACK);
  useEffect(() => { getConfig().then((c) => setR(c.restaurant)).catch(() => {}); }, []);

  return (
    <div className="shell legal">
      <p style={{ marginTop: 20 }}><Link to="/">← Back to reservations</Link></p>
      <h1>Privacy Policy</h1>
      <p>
        This policy explains what {r.name} collects through its Sunday buffet
        reservation page and how that information is used. It applies only to
        this reservation page.
      </p>

      <h2>What we collect</h2>
      <p>
        When you reserve, we collect your name, party size, email address, and —
        if you choose to provide it — your phone number. Email is used to send
        your reservation confirmation; your phone number is kept only so we can
        reach you about your reservation if needed.
      </p>

      <h2>Marketing email</h2>
      <p>
        We add you to our marketing email list only if you check the opt-in box
        while booking. It is never checked by default, and opting in is never a
        condition of making a reservation. If you opt in, we may occasionally
        email you offers and news about {r.name}. Every marketing email includes
        a one-click unsubscribe link and our mailing address, and we honor
        unsubscribe requests promptly.
      </p>

      <h2>How to opt out</h2>
      <p>
        You can unsubscribe at any time using the link in any marketing email, or
        by calling us at {r.phone} or writing to us at the address below. Once you
        opt out, we stop sending marketing email and exclude you from future
        campaigns.
      </p>

      <h2>Sharing</h2>
      <p>
        We do not sell your information. We share it only with the service
        providers that help us operate — for example, the email service that
        delivers your confirmation. We keep reservation and contact details only
        as long as needed to run the buffet program.
      </p>

      <h2>Contact</h2>
      <p>
        {r.name}<br />
        {r.address}<br />
        {r.phone}
      </p>

      <p style={{ marginTop: 28 }}><Link to="/">← Back to reservations</Link></p>
    </div>
  );
}
