const COMPANY = {
  name: 'Rent Ride',
  phone: '+355 69 81 45 803',
  email: 'rentcaralbania23@gmail.com',
  website: 'https://rentride.al',
};

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function row(label, value) {
  if (!value && value !== 0) return '';
  return `<tr>
    <td style="padding:7px 0;color:#666;font-size:14px;width:42%;vertical-align:top">${label}</td>
    <td style="padding:7px 0;color:#111;font-size:14px;font-weight:600">${esc(value)}</td>
  </tr>`;
}

function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="sq">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:#111827;padding:22px 32px">
            <span style="color:#ffffff;font-size:18px;font-weight:bold">🚗 ${COMPANY.name}</span>
          </td>
        </tr>
        <!-- Content -->
        <tr><td style="padding:32px">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:18px 32px;text-align:center">
            <p style="margin:0;color:#6b7280;font-size:12px">${COMPANY.name} &bull; <a href="tel:${COMPANY.phone}" style="color:#6b7280;text-decoration:none">${COMPANY.phone}</a> &bull; <a href="mailto:${COMPANY.email}" style="color:#6b7280;text-decoration:none">${COMPANY.email}</a></p>
            <p style="margin:6px 0 0;color:#9ca3af;font-size:11px"><a href="${COMPANY.website}" style="color:#9ca3af;text-decoration:none">${COMPANY.website}</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function bookingConfirmation({ customerName, carName, pickupLocation, dropoffLocation, startDate, endDate, startTime, endTime, totalPrice, insurance, reservationId }) {
  const body = `
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">Rezervimi u pranua ✅</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px">Faleminderit, <strong>${esc(customerName)}</strong>! Rezervimi juaj është regjistruar me sukses.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
      ${row('Makina', carName)}
      ${row('Vendi i tërhiqjes', pickupLocation)}
      ${row('Vendi i kthimit', dropoffLocation)}
      ${row('Nisja', `${startDate} ${startTime || ''}`)}
      ${row('Kthimi', `${endDate} ${endTime || ''}`)}
      ${insurance ? row('Siguracion', insurance) : ''}
      ${row('Çmimi total', `€${totalPrice}`)}
      ${row('Nr. Rezervimit', String(reservationId).slice(0,8).toUpperCase())}
    </table>
    <p style="margin:0;color:#4b5563;font-size:13px">Për çdo pyetje na kontaktoni: <a href="tel:${COMPANY.phone}" style="color:#2563eb">${COMPANY.phone}</a></p>`;
  return layout('Konfirmim Rezervimi', body);
}

function reservationConfirmed({ customerName, carName, startDate, endDate, pickupLocation, totalPrice, reservationId }) {
  const body = `
    <h2 style="margin:0 0 6px;color:#15803d;font-size:20px">Rezervimi u konfirmua nga ekipi ✅</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px">Përshëndetje <strong>${esc(customerName)}</strong>! Ekipi ynë konfirmoi rezervimin tuaj.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
      ${row('Makina', carName)}
      ${row('Tërhiqja', pickupLocation)}
      ${row('Nisja', startDate)}
      ${row('Kthimi', endDate)}
      ${row('Çmimi total', `€${totalPrice}`)}
      ${row('Nr. Rezervimit', String(reservationId).slice(0,8).toUpperCase())}
    </table>
    <p style="margin:0;color:#4b5563;font-size:13px">Kontakt: <a href="tel:${COMPANY.phone}" style="color:#2563eb">${COMPANY.phone}</a></p>`;
  return layout('Rezervimi Konfirmuar', body);
}

function reservationCancelled({ customerName, carName, startDate, endDate, pickupLocation, totalPrice, reservationId }) {
  const body = `
    <h2 style="margin:0 0 6px;color:#dc2626;font-size:20px">Rezervimi u anulua ❌</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px">Përshëndetje <strong>${esc(customerName)}</strong>. Rezervimi juaj është anuluar.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
      ${row('Makina', carName)}
      ${row('Tërhiqja', pickupLocation)}
      ${row('Nisja', startDate)}
      ${row('Kthimi', endDate)}
      ${row('Çmimi total', `€${totalPrice}`)}
      ${row('Nr. Rezervimit', String(reservationId).slice(0,8).toUpperCase())}
    </table>
    <p style="margin:0;color:#4b5563;font-size:13px">Për pyetje: <a href="tel:${COMPANY.phone}" style="color:#2563eb">${COMPANY.phone}</a></p>`;
  return layout('Rezervimi Anuluar', body);
}

function invoiceEmail({ customerName, carName, startDate, endDate, totalPrice, reservationId, invoiceNo }) {
  const body = `
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">Fatura juaj 🧾</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px">Faleminderit <strong>${esc(customerName)}</strong>! Ju dërgojmë faturën e rezervimit të përfunduar.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
      ${row('Nr. Faturës', invoiceNo)}
      ${row('Makina', carName)}
      ${row('Periudha', `${startDate} → ${endDate}`)}
      ${row('Shuma totale', `€${totalPrice}`)}
      ${row('Nr. Rezervimit', String(reservationId).slice(0,8).toUpperCase())}
    </table>
    <p style="margin:0;color:#4b5563;font-size:13px">Shpresojmë t'ju shërbejmë sërish! <a href="${COMPANY.website}" style="color:#2563eb">${COMPANY.website}</a></p>`;
  return layout('Faturë — ' + COMPANY.name, body);
}

function pickupReminder({ customerName, carName, pickupLocation, startDate, startTime, reservationId }) {
  const body = `
    <h2 style="margin:0 0 6px;color:#d97706;font-size:20px">Kujtesë: Makina juaj nesër 🗓</h2>
    <p style="margin:0 0 24px;color:#4b5563;font-size:14px">Përshëndetje <strong>${esc(customerName)}</strong>! Ju kujtojmë se nesër është dita e tërhiqjes.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:24px">
      ${row('Makina', carName)}
      ${row('Vendi i tërhiqjes', pickupLocation)}
      ${row('Data dhe ora', `${startDate} ${startTime || ''}`)}
      ${row('Nr. Rezervimit', String(reservationId).slice(0,8).toUpperCase())}
    </table>
    <p style="margin:0;color:#4b5563;font-size:13px">Kontakt: <a href="tel:${COMPANY.phone}" style="color:#2563eb">${COMPANY.phone}</a></p>`;
  return layout('Kujtesë Rezervimi', body);
}

function adminBookingNotification({
  reservationId, customerName, customerEmail, customerPhone,
  carName, carCategory, pickupLocation, dropoffLocation,
  startDate, startTime, endDate, endTime, days,
  totalPrice, locationFee, insurance, extrasList, source,
  flightNumber, customerCountry, metaIp, metaCountry, metaDevice, adminPanelUrl,
}) {
  // Auto-captured connection/device metadata (like Elementor Forms), shown only
  // when at least one value is present.
  const metaHtml = (metaIp || metaCountry || metaDevice)
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
        <tr><td colspan="2" style="padding:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Pajisja & lidhja (auto)</td></tr>
        ${metaCountry ? row('Shteti (IP)', esc(metaCountry)) : ''}
        ${metaIp ? row('IP', esc(metaIp)) : ''}
        ${metaDevice ? row('Pajisja', esc(metaDevice)) : ''}
      </table>`
    : '';
  const extrasHtml = Array.isArray(extrasList) && extrasList.length > 0
    ? `<tr>
        <td style="padding:7px 0;color:#666;font-size:14px;width:42%;vertical-align:top">Extras</td>
        <td style="padding:7px 0;color:#111;font-size:14px;font-weight:600">
          <ul style="margin:0;padding-left:18px">
            ${extrasList.map(e => `<li>${esc(e.name)}${e.quantity > 1 ? ` × ${e.quantity}` : ''} <span style="color:#6b7280;font-weight:400">€${e.totalPrice}</span></li>`).join('')}
          </ul>
        </td>
      </tr>`
    : '';

  const body = `
    <h2 style="margin:0 0 6px;color:#1d4ed8;font-size:20px">🔔 Rezervim i ri</h2>
    <p style="margin:0 0 18px;color:#4b5563;font-size:14px">Një klient sapo ka bërë një rezervim të ri në sistem.</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin-bottom:20px">
      <p style="margin:0 0 6px;color:#1e40af;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Klienti</p>
      <p style="margin:0;color:#111827;font-size:15px;font-weight:600">${esc(customerName)}</p>
      <p style="margin:4px 0 0;color:#374151;font-size:13px">
        ${customerEmail ? `<a href="mailto:${esc(customerEmail)}" style="color:#2563eb;text-decoration:none">${esc(customerEmail)}</a>` : ''}
        ${customerPhone ? ` &bull; <a href="tel:${esc(customerPhone)}" style="color:#2563eb;text-decoration:none">${esc(customerPhone)}</a>` : ''}
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
      ${row('Makina', `${carName}${carCategory ? ` (${carCategory})` : ''}`)}
      ${row('Tërhiqja', pickupLocation)}
      ${row('Kthimi', dropoffLocation)}
      ${row('Nisja', `${startDate} ${startTime || ''}`)}
      ${row('Kthimi', `${endDate} ${endTime || ''}`)}
      ${flightNumber ? row('Numri i fluturimit', flightNumber) : ''}
      ${customerCountry ? row('Shteti (klienti)', esc(customerCountry)) : ''}
      ${days ? row('Numri i ditëve', `${days} ditë`) : ''}
      ${insurance ? row('Sigurim', insurance) : ''}
      ${extrasHtml}
      ${locationFee > 0 ? row('Tarifë lokacioni', `€${locationFee}`) : ''}
      ${row('Çmimi total', `<span style="color:#15803d">€${totalPrice}</span>`)}
      ${source ? row('Burimi', source) : ''}
      ${row('Nr. Rezervimit', String(reservationId).slice(0,8).toUpperCase())}
    </table>

    ${metaHtml}

    ${adminPanelUrl ? `
    <p style="margin:0 0 16px">
      <a href="${esc(adminPanelUrl)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Hap në Admin Panel →</a>
    </p>` : ''}

    <p style="margin:0;color:#6b7280;font-size:12px">Ky email u dërgua automatikisht nga sistemi.</p>`;
  return layout('Rezervim i ri — ' + COMPANY.name, body);
}

function contactForm({ fromName, fromEmail, fromPhone, subject, message }) {
  const body = `
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">Mesazh i ri nga formulari 📬</h2>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
      ${row('Emri', fromName)}
      ${row('Email', fromEmail)}
      ${row('Telefon', fromPhone || 'N/A')}
      ${row('Tema', subject)}
    </table>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Mesazhi</p>
      <p style="margin:0;color:#111827;font-size:14px;line-height:1.6;white-space:pre-line">${esc(message)}</p>
    </div>`;
  return layout('Kontakt — ' + COMPANY.name, body);
}

module.exports = { bookingConfirmation, reservationConfirmed, reservationCancelled, invoiceEmail, pickupReminder, contactForm, adminBookingNotification };
