export interface OemGuide { id: string; match: string[]; name: string; steps: string[] }
export const OEM_GUIDES: OemGuide[] = [
  { id: 'xiaomi', match: ['xiaomi', 'redmi', 'poco'], name: 'Xiaomi / Redmi / POCO', steps: [
    'Settings → Apps → Manage apps → StudyForge → turn on Autostart.', 'Same screen → Battery saver → choose "No restrictions".',
    'Recents screen: long-press the StudyForge card and tap the lock icon.', 'Settings → Notifications → StudyForge → allow Lock screen and Floating.'] },
  { id: 'realme', match: ['realme', 'oppo'], name: 'Realme / Oppo (ColorOS)', steps: [
    'Settings → Apps → App management → StudyForge → Battery usage → Allow background activity.', 'Same screen → turn on Auto launch (Startup manager).',
    'Settings → Battery → turn off "Optimise battery use" for StudyForge.', 'Recents: pull the StudyForge card down to lock it.'] },
  { id: 'vivo', match: ['vivo', 'iqoo'], name: 'Vivo / iQOO', steps: [
    'Settings → Battery → Background power consumption → StudyForge → Allow.', 'Settings → Apps → Autostart → enable StudyForge.',
    'Settings → Apps → StudyForge → Notifications → allow Lock screen.', 'i Manager → App manager → Autostart manager → enable.'] },
  { id: 'samsung', match: ['samsung'], name: 'Samsung (One UI)', steps: [
    'Settings → Battery → Background usage limits → Never sleeping apps → add StudyForge.', 'Settings → Apps → StudyForge → Battery → Unrestricted.',
    'Remove StudyForge from "Sleeping apps" and "Deep sleeping apps".', 'Settings → Notifications → Lock screen → show content.'] },
  { id: 'oneplus', match: ['oneplus'], name: 'OnePlus (OxygenOS)', steps: [
    'Settings → Apps → StudyForge → Battery usage → Allow background activity.', 'Settings → Battery → Battery optimisation → StudyForge → Don\'t optimise.',
    'Settings → Apps → StudyForge → turn on Auto launch.', 'Recents: tap the StudyForge card menu and lock it.'] },
];
