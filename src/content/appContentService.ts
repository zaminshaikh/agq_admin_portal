import { getPortalFunctions } from '../db/firebaseEnvironment'
import { httpsCallable } from 'firebase/functions'
import { app } from '../App'

export type ContentSnapshot = {
  version: number
  texts: Record<string, string>
  images: Record<string, { url: string; contentType: string }>
}
const functions = getPortalFunctions(app)
export async function loadAppContent(): Promise<ContentSnapshot> {
  return (await httpsCallable<void, ContentSnapshot>(functions, 'getAppContentForAdmin')()).data
}
export async function saveAppContent(baseVersion: number, texts: Record<string, string>): Promise<ContentSnapshot> {
  return (await httpsCallable<{ baseVersion: number; texts: Record<string, string> }, ContentSnapshot>(functions, 'saveAppContent', { timeout: 120000 })({ baseVersion, texts })).data
}
export async function updateAppImage(baseVersion: number, id: string, file?: File): Promise<ContentSnapshot> {
  let base64: string | undefined
  if (file) {
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result).split(',')[1])
      reader.onerror = () => reject(new Error('Could not read the image'))
      reader.readAsDataURL(file)
    })
  }
  return (await httpsCallable<{ baseVersion: number; id: string; base64?: string; reset: boolean }, ContentSnapshot>(functions, 'updateAppImage', { timeout: 120000 })({ baseVersion, id, ...(base64 ? { base64 } : {}), reset: !file })).data
}
