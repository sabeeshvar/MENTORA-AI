/**
 * Resolves the API Base URL for frontend-to-backend communication.
 * In browser production and local dev with proxy, default is '/api'.
 * Can be configured via import.meta.env.VITE_API_BASE_URL.
 * In server-side / Node testing environments, falls back to process.env.API_BASE_URL or local server.
 */
export const getApiEndpoint = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  if (typeof window !== 'undefined') {
    // Running in the browser
    const customBase =
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
        ? String(import.meta.env.VITE_API_BASE_URL).trim()
        : ''

    if (customBase && customBase !== '/api') {
      return `${customBase.replace(/\/$/, '')}${cleanPath}`
    }
    return cleanPath
  }

  // Running in Node.js / Serverless / Test environment
  const serverBase =
    typeof process !== 'undefined' &&
    (process.env?.API_BASE_URL || process.env?.VITE_API_BASE_URL)
      ? String(process.env.API_BASE_URL || process.env.VITE_API_BASE_URL)
          .trim()
          .replace(/\/$/, '')
      : 'http://localhost:5000'

  return `${serverBase}${cleanPath}`
}
