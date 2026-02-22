export type Locale = 'zh-TW' | 'en'

const messages: Record<Locale, Record<string, string>> = {
  'zh-TW': {
    settings: '設定',
    general: '一般',
    capture: '擷取',
    calibration: '校準',
    advanced: '進階',
    about: '說明'
  },
  en: {
    settings: 'Settings',
    general: 'General',
    capture: 'Capture',
    calibration: 'Calibration',
    advanced: 'Advanced',
    about: 'About'
  }
}

export function t(locale: Locale, key: string): string {
  return messages[locale][key] ?? key
}
