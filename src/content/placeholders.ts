export function preservesPlaceholders(value: string, required: string[]): boolean {
  const actual = [...new Set(value.match(/\{[A-Za-z][A-Za-z0-9_]*\}/g) ?? [])].sort()
  return JSON.stringify(actual) === JSON.stringify(required.map(token => `{${token}}`).sort())
}
