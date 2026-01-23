export function getBackendURL() {
  return import.meta.env.MODE === 'development'
    ? import.meta.env.VITE_API_BASE_URL_LOCAL
    : import.meta.env.VITE_API_BASE_URL_DEPLOYMENT;
}
