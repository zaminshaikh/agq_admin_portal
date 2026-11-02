import { defaultTexts } from './validation';
import mappings from './inlineContacts.json';

/** Preserve published message and contact edits while consolidating old fields. */
export function withInlineContact(texts: Record<string, string> = {}): Record<string, string> {
  const result = { ...texts };
  for (const entry of mappings) {
    if (Object.prototype.hasOwnProperty.call(result, entry.id)) continue;
    const fallback = defaultTexts[entry.id];
    const contact = texts[entry.contactId];
    const old = texts[entry.templateId];
    if (typeof old === 'string') {
      const fallbackContact = entry.placeholder === 'supportEmail' ? 'carter@agqconsulting.com'
        : entry.placeholder === 'email' ? fallback.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)![0]
        : fallback.replace(/^Phone: /, '');
      result[entry.id] = old.split(`{${entry.placeholder}}`).join(contact || fallbackContact);
    } else if (contact) {
      const pattern = entry.placeholder === 'phone' ? /\+?[0-9][0-9 ()-]{5,}[0-9]/ : /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
      result[entry.id] = fallback.replace(pattern, () => contact);
    } else result[entry.id] = fallback;
  }
  return result;
}
