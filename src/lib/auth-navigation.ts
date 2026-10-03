export function safeReturnPath(value: string | null, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /^\/(login|register)(\?|$)/.test(value)) return fallback;
  return value;
}
