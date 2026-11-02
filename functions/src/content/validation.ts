import fullCatalog from './catalog.json';
const catalog = fullCatalog.filter(entry => entry.editable);
export type ImageValue = { url: string; contentType: string };
export const entries = new Map(catalog.map(entry => [entry.id, entry]));
export const defaultTexts = Object.fromEntries(catalog.filter(e => e.kind !== 'image').map(e => [e.id, e.defaultValue]));
export function validateText(id: string, value: unknown): string {
  const entry = entries.get(id);
  if (!entry || entry.kind === 'image') throw new Error('Unknown text field');
  if (typeof value !== 'string' || !value.trim() || value.length > 12000) throw new Error('Text must contain 1–12,000 characters');
  const placeholders = [...new Set(value.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g) ?? [])].sort();
  if (JSON.stringify(placeholders) !== JSON.stringify(entry.placeholders.map(p => `{${p}}`).sort())) throw new Error('Keep the listed placeholders exactly as shown');
  if (entry.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Enter a valid email address');
  if (entry.kind === 'phone' && !/^\+?[0-9 ()-]{7,30}$/.test(value)) throw new Error('Enter a valid phone number');
  if (entry.kind === 'email_message' && (value.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []).length !== 1) throw new Error('Include one email address in this contact line; the app uses it for the email link');
  if (entry.kind === 'phone_message') {
    const phones = value.match(/\+?[0-9][0-9 ()-]{5,}[0-9]/g) ?? [];
    if (phones.length !== 1 || phones[0].replace(/\D/g, '').length < 7 || phones[0].replace(/\D/g, '').length > 15) throw new Error('Include one phone number in this contact line; the app uses it for the call link');
  }
  return value;
}
export function imageType(bytes: Buffer): string {
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Images must be at most 5 MB');
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') return 'image/webp';
  throw new Error('Choose a PNG, JPEG, or WebP image');
}
export function expectedVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('A valid content version is required');
  return value;
}
