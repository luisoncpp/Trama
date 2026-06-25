// @Architecture(descriptionShort="Shared TypeScript types for adjacent module")
export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>