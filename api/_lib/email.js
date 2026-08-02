import { RESTAURANT, BUFFET } from './config.js';

// Sends the transactional reservation confirmation via Resend.
// If RESEND_API_KEY / FROM_EMAIL are not set, this no-ops and returns
// { sent: false } so a booking never fails just because email is unconfigured.
export async function sendConfirmationEmail(reservation, prettyDate) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn('Resend not configured — skipping confirmation email.');
    return { sent: false, reason: 'unconfigured' };
  }

  const html = confirmationHtml(reservation, prettyDate);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [reservation.email],
        subject: `Your Sunday Buffet reservation — ${prettyDate}`,
        html
      })
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('Resend error:', res.status, detail);
      return { sent: false, reason: 'send-failed' };
    }
    return { sent: true };
  } catch (err) {
    console.error('Resend threw:', err);
    return { sent: false, reason: 'exception' };
  }
}

function confirmationHtml(r, prettyDate) {
  const ink = '#1C1A15', peacock = '#0E4D45', gold = '#B98B2E', paper = '#F5EFE1';
  return `
  <div style="background:${paper};padding:32px 0;font-family:Georgia,'Times New Roman',serif;color:${ink};">
    <div style="max-width:520px;margin:0 auto;background:#FFFDF8;border:1px solid rgba(14,77,69,0.15);">
      <div style="background:${peacock};padding:28px 24px;text-align:center;">
        <div style="color:${gold};letter-spacing:3px;font-size:12px;text-transform:uppercase;">${RESTAURANT.tagline}</div>
        <div style="color:#F5EFE1;font-size:26px;letter-spacing:4px;margin-top:6px;">RANI MAHAL</div>
      </div>
      <div style="padding:32px 28px;">
        <p style="font-size:18px;margin:0 0 4px;">Thank you, ${escapeHtml(r.name)}.</p>
        <p style="margin:0 0 24px;color:#5c574a;">Your table is reserved for the Sunday Lunch Special Buffet.</p>
        <table style="width:100%;border-collapse:collapse;font-size:15px;">
          ${row('Date', prettyDate)}
          ${row('Time', BUFFET.window)}
          ${row('Party size', String(r.partySize))}
          ${row('Price', `$${BUFFET.price} per person — paid at the restaurant`)}
        </table>
        <p style="margin:24px 0 0;color:#5c574a;font-size:14px;line-height:1.5;">
          ${RESTAURANT.name} · ${RESTAURANT.address}<br/>
          ${RESTAURANT.phone}
        </p>
      </div>
    </div>
  </div>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:8px 0;color:#8a8474;text-transform:uppercase;letter-spacing:1px;font-size:11px;width:120px;vertical-align:top;">${label}</td>
    <td style="padding:8px 0;color:#1C1A15;">${escapeHtml(value)}</td>
  </tr>`;
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
