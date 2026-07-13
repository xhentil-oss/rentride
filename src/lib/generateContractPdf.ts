/**
 * Generates a printable/downloadable HTML contract as a new window → Print to PDF.
 * No external libraries needed — pure browser API.
 *
 * All visible text comes from the `i18n` bundle passed by the caller (resolved
 * from react-i18next), so the contract prints in the visitor's language. If no
 * bundle is passed it falls back to Albanian.
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ContractClause { label: string; text: string; }

export interface ContractI18n {
  contractTitle: string; serviceSubtitle: string; signedBadge: string; dateLabel: string;
  clientSection: string; fullName: string; email: string; phone: string;
  carSection: string; rentalSection: string;
  pickupLoc: string; dropoffLoc: string; startDateTime: string; endDateTime: string;
  daysLabel: string; daysUnit: string; extrasLabel: string; noneLabel: string; insuranceLabel: string;
  priceSection: string; baseRent: string; extrasRow: string; insuranceRow: string; discountRow: string; totalRow: string;
  termsSection: string; signaturesSection: string; clientSignature: string; companySignature: string; authorizedBy: string;
  footer1: string; footer2: string; popupBlocked: string;
  clauses: ContractClause[]; clausesFooter: string;
}

// Albanian fallback (used when no i18n bundle is supplied).
const SQ: ContractI18n = {
  contractTitle: "KONTRATË QIRAJE", serviceSubtitle: "Shërbim qiraje automjetesh", signedBadge: "E NËNSHKRUAR", dateLabel: "Datë",
  clientSection: "Të dhënat e klientit", fullName: "Emri i plotë", email: "Email", phone: "Telefon",
  carSection: "Automjeti", rentalSection: "Detaje rezervimi",
  pickupLoc: "Vendi i tërheqjes", dropoffLoc: "Vendi i kthimit", startDateTime: "Data & Ora e nisjes", endDateTime: "Data & Ora e kthimit",
  daysLabel: "Numri i ditëve", daysUnit: "ditë", extrasLabel: "Shtesa", noneLabel: "Asnjë", insuranceLabel: "Sigurimi",
  priceSection: "Çmimi", baseRent: "Qiraja bazë", extrasRow: "Shtesa", insuranceRow: "Sigurimi", discountRow: "Zbritje", totalRow: "TOTALI",
  termsSection: "Kushtet kryesore të qirasë", signaturesSection: "Nënshkrimet", clientSignature: "Nënshkrimi i klientit", companySignature: "Nënshkrimi i kompanisë", authorizedBy: "Autorizuar nga",
  footer1: "Ky dokument është gjeneruar automatikisht nga sistemi i rezervimeve të {company}.",
  footer2: "Kontratë e vlefshme ligjërisht sipas legjislacionit të Republikës së Shqipërisë · Gjykata kompetente: Tiranë",
  popupBlocked: "Lejo dritaret pop-up për të shkarkuar PDF-in.",
  clausesFooter: "Duke nënshkruar, klienti pranon të gjitha kushtet e mësipërme dhe konfirmon se i ka lexuar dhe kuptuar ato.",
  clauses: [],
};

export interface ContractData {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  carName: string;
  carCategory: string;
  carTransmission: string;
  carImage: string;
  pickupLocation: string;
  dropoffLocation: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  days: number;
  insurance: string;
  extras: string[];
  basePrice: number;
  extrasTotal: number;
  insuranceTotal: number;
  discount: number;
  total: number;
  signatureDataUrl: string;
  contractDate: string;
  /** Company info — pulled from /api/settings/public to avoid hardcoded values. */
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyAddress?: string;
  /** Visitor language + translated strings (from react-i18next). */
  lang?: string;
  i18n?: Partial<ContractI18n>;
}

export function downloadContractPdf(data: ContractData): void {
  const T: ContractI18n = { ...SQ, ...(data.i18n || {}) };
  const clauses = (data.i18n?.clauses && data.i18n.clauses.length) ? data.i18n.clauses : T.clauses;
  const lang = data.lang || "sq";

  const companyName    = (data.companyName    || "Rent Ride").trim();
  const companyPhone   = (data.companyPhone   || "").trim();
  const companyEmail   = (data.companyEmail   || "rentcaralbania23@gmail.com").trim();
  const companyAddress = (data.companyAddress || "Tiranë, Shqipëri").trim();
  const contactLine = [
    companyPhone ? `Tel: ${companyPhone}` : null,
    companyEmail,
  ].filter(Boolean).join(" · ");
  const extrasList = data.extras.length > 0 ? data.extras.join(", ") : T.noneLabel;

  const clausesHtml = clauses.length
    ? clauses.map((c, i) => `<p><strong>${i + 1}. ${escapeHtml(c.label)}:</strong> ${escapeHtml(c.text)}</p>`).join("")
    : "";

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(T.contractTitle)} - ${escapeHtml(data.clientName)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; line-height: 1.6; }
    .page { max-width: 794px; margin: 0 auto; padding: 48px 48px 60px; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #1a1a2e; padding-bottom: 20px; margin-bottom: 28px; }
    .logo-block .company-name { font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.5px; }
    .logo-block .company-subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .contract-meta { text-align: right; }
    .contract-meta .contract-title { font-size: 16px; font-weight: 600; color: #1a1a2e; }
    .contract-meta .contract-no { font-size: 11px; color: #6b7280; margin-top: 3px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 14px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
    .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 24px; }
    .field label { font-size: 10px; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
    .field span { font-size: 13px; color: #1a1a2e; font-weight: 500; }
    .car-block { display: flex; gap: 16px; align-items: center; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
    .car-block img { width: 110px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
    .car-block .car-info .car-name { font-size: 16px; font-weight: 600; }
    .car-block .car-info .car-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .price-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    .price-table tr td { padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .price-table tr td:last-child { text-align: right; font-weight: 500; }
    .price-table .total-row td { border-top: 2px solid #1a1a2e; border-bottom: none; font-weight: 700; font-size: 15px; padding-top: 10px; }
    .discount-row td { color: #16a34a; }
    .terms-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; font-size: 11px; color: #4b5563; line-height: 1.7; }
    .terms-box p { margin-bottom: 6px; }
    .terms-box p:last-child { margin-bottom: 0; }
    .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 8px; }
    .sig-box { border-top: 1.5px solid #1a1a2e; padding-top: 8px; }
    .sig-box .sig-label { font-size: 10px; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .sig-box .sig-name { font-size: 12px; color: #1a1a2e; font-weight: 600; }
    .sig-img { max-width: 220px; max-height: 72px; margin: 8px 0; }
    .doc-footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 10px; color: #9ca3af; }
    .badge { display: inline-block; font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 99px; border: 1px solid; }
    .badge-active { background: #dcfce7; color: #15803d; border-color: #86efac; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 32px 40px 48px; }
      @page { margin: 0; size: A4; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="logo-block">
      <div class="company-name">\u{1F697} ${escapeHtml(companyName)}</div>
      <div class="company-subtitle">${escapeHtml(T.serviceSubtitle)} · ${escapeHtml(companyAddress)}</div>
      <div class="company-subtitle" style="margin-top:4px;">${escapeHtml(contactLine)}</div>
    </div>
    <div class="contract-meta">
      <div class="contract-title">${escapeHtml(T.contractTitle)}</div>
      <div class="contract-no">${escapeHtml(T.dateLabel)}: ${escapeHtml(data.contractDate)}</div>
      <div class="contract-no" style="margin-top:6px;"><span class="badge badge-active">${escapeHtml(T.signedBadge)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(T.clientSection)}</div>
    <div class="grid-3">
      <div class="field"><label>${escapeHtml(T.fullName)}</label><span>${escapeHtml(data.clientName)}</span></div>
      <div class="field"><label>${escapeHtml(T.email)}</label><span>${escapeHtml(data.clientEmail)}</span></div>
      <div class="field"><label>${escapeHtml(T.phone)}</label><span>${escapeHtml(data.clientPhone)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(T.carSection)}</div>
    <div class="car-block">
      <img src="${escapeHtml(data.carImage)}" alt="${escapeHtml(data.carName)}" />
      <div class="car-info">
        <div class="car-name">${escapeHtml(data.carName)}</div>
        <div class="car-meta">${escapeHtml(data.carCategory)} · ${escapeHtml(data.carTransmission)}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(T.rentalSection)}</div>
    <div class="grid-2">
      <div class="field"><label>${escapeHtml(T.pickupLoc)}</label><span>${escapeHtml(data.pickupLocation)}</span></div>
      <div class="field"><label>${escapeHtml(T.dropoffLoc)}</label><span>${escapeHtml(data.dropoffLocation)}</span></div>
      <div class="field"><label>${escapeHtml(T.startDateTime)}</label><span>${escapeHtml(data.startDate)} · ${escapeHtml(data.startTime)}</span></div>
      <div class="field"><label>${escapeHtml(T.endDateTime)}</label><span>${escapeHtml(data.endDate)} · ${escapeHtml(data.endTime)}</span></div>
      <div class="field"><label>${escapeHtml(T.daysLabel)}</label><span>${data.days} ${escapeHtml(T.daysUnit)}</span></div>
      <div class="field"><label>${escapeHtml(T.extrasLabel)}</label><span>${escapeHtml(extrasList)}</span></div>
      <div class="field"><label>${escapeHtml(T.insuranceLabel)}</label><span>${escapeHtml(data.insurance || T.noneLabel)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(T.priceSection)}</div>
    <table class="price-table">
      <tr><td>${escapeHtml(T.baseRent)} (${data.days} ${escapeHtml(T.daysUnit)})</td><td>€${data.basePrice}</td></tr>
      ${data.extrasTotal > 0 ? `<tr><td>${escapeHtml(T.extrasRow)}</td><td>€${data.extrasTotal}</td></tr>` : ""}
      ${data.insuranceTotal > 0 ? `<tr><td>${escapeHtml(T.insuranceRow)}</td><td>€${data.insuranceTotal}</td></tr>` : ""}
      ${data.discount > 0 ? `<tr class="discount-row"><td>${escapeHtml(T.discountRow)}</td><td>-€${data.discount}</td></tr>` : ""}
      <tr class="total-row"><td>${escapeHtml(T.totalRow)}</td><td>€${data.total}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(T.termsSection)}</div>
    <div class="terms-box">
      ${clausesHtml}
      <p><em>${escapeHtml(T.clausesFooter)}</em></p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${escapeHtml(T.signaturesSection)}</div>
    <div class="signature-section">
      <div class="sig-box">
        <div class="sig-label">${escapeHtml(T.clientSignature)}</div>
        <img class="sig-img" src="${data.signatureDataUrl}" alt="${escapeHtml(T.clientSignature)}" />
        <div class="sig-name">${escapeHtml(data.clientName)}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${escapeHtml(T.dateLabel)}: ${escapeHtml(data.contractDate)}</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">${escapeHtml(T.companySignature)}</div>
        <div style="height:72px;display:flex;align-items:flex-end;">
          <div style="font-size:11px;color:#9ca3af;">${escapeHtml(T.authorizedBy)} ${escapeHtml(companyName)}</div>
        </div>
        <div class="sig-name">${escapeHtml(companyName)}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:2px;">${escapeHtml(T.dateLabel)}: ${escapeHtml(data.contractDate)}</div>
      </div>
    </div>
  </div>

  <div class="doc-footer">
    ${escapeHtml(T.footer1.replace('{company}', companyName))}<br/>
    ${escapeHtml(T.footer2)}
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert(T.popupBlocked);
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Slight delay to let images load before print dialog opens
  setTimeout(() => {
    win.print();
  }, 800);
}
