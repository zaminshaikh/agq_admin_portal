let revision = 0
const listeners = new Set<() => void>()
export const getAumRevision = () => revision
export function notifyAumChanged() {
  revision++
  listeners.forEach((listener) => listener())
}
export function subscribeAumChanges(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
