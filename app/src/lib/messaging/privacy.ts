// Addresses and numbers on screens and in records: screens show them masked,
// and failure texts (which providers often fill with the recipient, "550
// <someone@example.org> unknown user") are scrubbed before they are kept,
// shown or written to the audit chain. Pure.

/** "amina@example.org" → "a***@example.org"; "+254 700 000 002" → "•••• 02". */
export function maskAddress(to: string): string {
  const v = to.trim();
  const at = v.lastIndexOf('@');
  if (at > 0) return `${v[0]}***@${v.slice(at + 1)}`;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 4 ? `•••• ${digits.slice(-2)}` : '••••';
}

const EMAILS = /[^\s<>()[\]\\,;:"'@]+@[^\s<>()[\]\\,;:"']+/g;
const NUMBERS = /\+?\d[\d ()-]{6,}\d/g;

/** A failure text without email addresses or phone numbers, at most 300 characters. */
export function scrub(text: string): string {
  return text.replace(EMAILS, '[address]').replace(NUMBERS, '[number]').replace(/\s+/g, ' ').trim().slice(0, 300);
}
