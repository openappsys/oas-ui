export const REQUEST_LOCALES = ['zh-CN', 'en-US', 'ar'] as const
export type RequestLocale = (typeof REQUEST_LOCALES)[number]

export function isRequestLocale(value: string): value is RequestLocale {
  return (REQUEST_LOCALES as readonly string[]).includes(value)
}
