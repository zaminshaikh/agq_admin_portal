import { defaultTexts } from './validation';

/** Compatibility for the earlier split CID message/contact fields. */
export function withInlineContact(texts: Record<string, string> = {}): Record<string, string> {
  if (Object.prototype.hasOwnProperty.call(texts, 'signup.cid_help')) return texts;
  const template = texts['text.screens.authenticate.create_account.create_account.your_client_id_number_cid_is_an_8_digi_1450b8']
    ?? defaultTexts['signup.cid_help'].replace('carter@agqconsulting.com', '{supportEmail}');
  return { ...texts, 'signup.cid_help': template.replace(/\{supportEmail\}/g, () => texts['contact.support_email'] ?? 'carter@agqconsulting.com') };
}
