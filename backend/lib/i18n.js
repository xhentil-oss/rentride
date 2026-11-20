// Minimal i18n helper for API error messages.
// Frontend may send the user's UI locale either via:
//   - Custom header `X-Locale: en` or `X-Locale: sq`
//   - Standard `Accept-Language` header (parsed loosely)
//   - Query string `?lang=en`
// Defaults to `sq` (the primary site language) when nothing matches.

const SUPPORTED = ['sq', 'en', 'fr', 'es', 'it', 'de', 'pl', 'cs', 'he'];

function detectLocale(req) {
  // 1. Explicit override
  const xLocale = String(req.headers['x-locale'] || '').toLowerCase().trim();
  if (SUPPORTED.includes(xLocale)) return xLocale;

  // 2. Query string
  const qLang = String(req.query?.lang || '').toLowerCase().trim();
  if (SUPPORTED.includes(qLang)) return qLang;

  // 3. Accept-Language (take the first 2 letters of the highest-priority entry).
  const accept = String(req.headers['accept-language'] || '').toLowerCase();
  if (accept) {
    const first = accept.split(',')[0]?.split(';')[0]?.trim().slice(0, 2);
    if (SUPPORTED.includes(first)) return first;
  }

  return 'sq';
}

// Pre-defined message dictionary. Add new keys here.
const messages = {
  contact: {
    rateLimited: {
      sq: 'Shumë kërkesa. Provoni pas 1 ore.',
      en: 'Too many requests. Try again in an hour.',
      fr: 'Trop de requêtes. Réessayez dans une heure.',
      es: 'Demasiadas solicitudes. Inténtalo de nuevo en una hora.',
      it: 'Troppe richieste. Riprova tra un\'ora.',
      de: 'Zu viele Anfragen. Bitte versuchen Sie es in einer Stunde erneut.',
      pl: 'Zbyt wiele zapytań. Spróbuj ponownie za godzinę.',
      cs: 'Příliš mnoho požadavků. Zkuste to prosím znovu za hodinu.',
      he: 'יותר מדי בקשות. נסו שוב בעוד שעה.',
    },
    missingFields: {
      sq: 'Fusha të detyrueshme mungojnë.',
      en: 'Required fields missing.',
      fr: 'Champs obligatoires manquants.',
      es: 'Faltan campos obligatorios.',
      it: 'Campi obbligatori mancanti.',
      de: 'Bitte füllen Sie alle Pflichtfelder aus.',
      pl: 'Uzupełnij wszystkie wymagane pola.',
      cs: 'Vyplňte prosím všechna povinná pole.',
      he: 'יש למלא את כל שדות החובה.',
    },
    invalidEmail: {
      sq: 'Email i pavlefshëm.',
      en: 'Invalid email address.',
      fr: 'Adresse e-mail invalide.',
      es: 'Dirección de email no válida.',
      it: 'Indirizzo email non valido.',
      de: 'Ungültige E-Mail-Adresse.',
      pl: 'Nieprawidłowy adres e-mail.',
      cs: 'Neplatná e-mailová adresa.',
      he: 'כתובת האימייל אינה תקינה.',
    },
    messageLength: {
      sq: 'Mesazhi duhet të jetë 10–2000 karaktere.',
      en: 'Message must be 10–2000 characters.',
      fr: 'Le message doit comporter 10 à 2000 caractères.',
      es: 'El mensaje debe tener 10–2000 caracteres.',
      it: 'Il messaggio deve avere 10–2000 caratteri.',
      de: 'Die Nachricht muss 10–2000 Zeichen lang sein.',
      pl: 'Wiadomość musi mieć od 10 do 2000 znaków.',
      cs: 'Zpráva musí mít 10–2000 znaků.',
      he: 'ההודעה צריכה להכיל בין 10 ל-2000 תווים.',
    },
    sendFailed: {
      sq: 'Dërgimi dështoi. Provoni sërish.',
      en: 'Send failed. Please try again.',
      fr: 'Échec de l\'envoi. Veuillez réessayer.',
      es: 'Error al enviar. Inténtalo de nuevo.',
      it: 'Invio fallito. Riprova.',
      de: 'Senden fehlgeschlagen. Bitte versuchen Sie es erneut.',
      pl: 'Nie udało się wysłać wiadomości. Spróbuj ponownie.',
      cs: 'Odeslání se nezdařilo. Zkuste to prosím znovu.',
      he: 'השליחה נכשלה. נסו שוב.',
    },
  },
};

function t(req, path) {
  const locale = detectLocale(req);
  const parts = path.split('.');
  let node = messages;
  for (const p of parts) {
    if (node && typeof node === 'object' && p in node) node = node[p];
    else return path; // missing key — return path so dev sees what's broken
  }
  if (node && typeof node === 'object' && locale in node) return node[locale];
  if (node && typeof node === 'object' && 'sq' in node) return node.sq;
  return path;
}

module.exports = { detectLocale, t };
