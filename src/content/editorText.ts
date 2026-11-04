import aliases from './placeholderNames.json'

const names: Record<string, Record<string, string>> = aliases
export const editorPlaceholder = (id: string, token: string) => names[id]?.[token] ?? token

// The editor uses meaningful names while published templates retain the wire
// tokens understood by existing mobile versions. Never rewrite surrounding copy.
export function toEditorText(id: string, value: string): string {
  return value.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, token: string) =>
    `{${editorPlaceholder(id, token)}}`)
}
export function toStoredText(id: string, value: string): string {
  const reverse = Object.fromEntries(Object.entries(names[id] ?? {}).map(([old, name]) => [name, old]))
  return value.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, token: string) =>
    `{${reverse[token] ?? token}}`)
}
export function mapEditorTexts(texts: Record<string, string>) {
  return Object.fromEntries(Object.entries(texts).map(([id, text]) => [id, toEditorText(id, text)]))
}
