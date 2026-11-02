import catalog from './catalog.json'
export type ContentEntry = (typeof catalog)[number]
export const sections = [
  {
    id: 'signup',
    label: 'Sign up & onboarding',
    description: 'Welcome screens, account creation, and Client ID help.',
  },
  {
    id: 'signin',
    label: 'Sign in & security',
    description: 'Login, passwords, email verification, and Face ID.',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Balances, fund summaries, and recent activity.',
  },
  {
    id: 'activity',
    label: 'Activity',
    description: 'Transactions, filters, sorting, and activity details.',
  },
  {
    id: 'analytics',
    label: 'Charts & analytics',
    description: 'Chart controls, dates, and empty states.',
  },
  {
    id: 'help',
    label: 'Help & team',
    description: 'Team photos, contact cards, and frequently asked questions.',
  },
  {
    id: 'profile',
    label: 'Profile & settings',
    description: 'Profile navigation, settings, linked profiles, and account actions.',
  },
  {
    id: 'documents',
    label: 'Statements & legal',
    description: 'Documents, downloads, and legal notices.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Notification labels and read controls.',
  },
  {
    id: 'shared',
    label: 'Shared messages',
    description: 'Connection issues, progress messages, and common dialogs.',
  },
  {
    id: 'design',
    label: 'Logos & icons',
    description: 'Shared branding, navigation icons, and app artwork.',
  },
]

export function location(entry: ContentEntry): { section: string; group: string } {
  const name = entry.group
  if (entry.id.includes('sonny_headshot') || entry.id.includes('kash_headshot'))
    return {
      section: 'help',
      group: entry.id.includes('sonny') ? 'Sonny · contact card' : 'Kash · contact card',
    }
  if (entry.kind === 'image')
    return {
      section: 'design',
      group: entry.id.includes('logo')
        ? 'Fund logos'
        : entry.id.includes('filled') || entry.id.includes('hollowed')
          ? 'Navigation icons'
          : 'Artwork & other icons',
    }
  if (entry.id === 'contact.email_subject') return { section: 'help', group: 'Email actions' }
  if (name === 'Profile / Pages / Help') {
    const line = Number(entry.sources[0]?.split(':').pop())
    if (entry.id.includes('sonny') || (line >= 110 && line < 270))
      return { section: 'help', group: 'Sonny · contact card' }
    if (entry.id.includes('kash') || (line >= 270 && line < 410))
      return { section: 'help', group: 'Kash · contact card' }
    return {
      section: 'help',
      group: line >= 410 ? 'Frequently asked questions' : 'Help center headings',
    }
  }
  const leaf = name.split(' / ').at(-1) || name
  const groupNames: Record<string, string> = {
    'Create Account': 'Account creation',
    'Email Verification Dialog': 'Verification prompt',
    'Password Validation': 'Password requirements',
    Onboarding: 'Welcome screens',
    'Initial Face Id': 'Face ID setup',
    Faceid: 'Face ID',
    Login: 'Sign in',
    'Auth Service': 'Sign-in feedback',
    'Auth Helper': 'Account & Client ID messages',
    Database: 'Account access messages',
    'Google Auth Service': 'Sign in with Google',
    'Apple Auth Service': 'Sign in with Apple',
    'Email Verification Screen': 'Verify your email',
    'Forgot Password': 'Reset password',
    'Activity Styles': 'Transaction types & descriptions',
    'Activity App Bar': 'Page heading & controls',
    'Activity Details Modal': 'Transaction details',
    'Filter Modal': 'Filters',
    'Sort Modal': 'Sorting',
    'No Activities Body': 'Empty activity list',
    'Total Assets Section': 'Asset totals',
    'Dashboard App Bar': 'Page heading & controls',
    'Three Recent Activities': 'Recent activity',
    'Assets Structure Section': 'Fund breakdown',
    Profile: 'Profile menu',
    Settings: 'Edit profile & password',
    Profiles: 'Linked profiles',
    'Logout Button': 'Sign out',
    'Delete Account Button': 'Delete account',
    Authentication: 'Security settings',
    Documents: 'Statements & downloads',
    Pdfpreview: 'Document preview',
    Disclaimer: 'Legal notice',
    'Notification Card': 'Notification cards',
    'Mark All Read Button': 'Read controls',
    'Notifications App Bar': 'Page heading',
    'Line Chart': 'Chart labels & controls',
    'Analytics Utilities': 'Date ranges',
    'Analytics App Bar': 'Page heading',
    'No Connection': 'Connection issues',
    'Progress Indicator': 'Loading & progress',
    'Alert Dialog': 'Dialogs',
    Main: 'Navigation',
  }
  let section = 'shared'
  if (name.startsWith('Authenticate / Create Account') || name.includes('Onboarding'))
    section = 'signup'
  else if (name.startsWith('Authenticate') || name.startsWith('Database')) section = 'signin'
  else if (name.startsWith('Dashboard') || name.includes('Assets Structure')) section = 'dashboard'
  else if (name.startsWith('Activity')) section = 'activity'
  else if (name.startsWith('Analytics')) section = 'analytics'
  else if (name.includes('Documents') || name.includes('Disclaimer') || name.includes('Pdfpreview'))
    section = 'documents'
  else if (name.startsWith('Profile')) section = 'profile'
  else if (name.startsWith('Notifications')) section = 'notifications'
  return { section, group: groupNames[leaf] || leaf }
}

export function fieldLabel(entry: ContentEntry): string {
  if (entry.id === 'signup.cid_help') return 'Client ID help message'
  if (entry.id === 'contact.email_subject') return 'Email subject'
  if (entry.kind === 'email') return 'Email address & email link'
  if (entry.kind === 'phone') return 'Phone number & call link'
  if (entry.kind === 'image')
    return entry.label
      .replace(/ \((svg|png|jpg|webp)\)$/i, '')
      .replace('Headshot', 'profile photo')
      .replace(/^Agq/, 'AGQ')
      .replace(/^Ak1/, 'AK1')
      .replace(/^Ytd/, 'YTD')
  if (entry.group.includes('Disclaimer') && entry.defaultValue.length > 200)
    return 'Full legal notice'
  if (entry.group.endsWith('/ Help') && entry.defaultValue.length > 100) return 'Answer'
  if (entry.defaultValue.length > 100)
    return /error|failed|unable|invalid|not |cannot|already/i.test(entry.defaultValue)
      ? 'Error / guidance message'
      : 'Full message'
  return entry.label
}
