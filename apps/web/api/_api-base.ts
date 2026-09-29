export function apiBaseUrl(): string {
  return (
    process.env.LASHKOI_API_BASE_URL ??
    process.env.VITE_API_BASE_URL ??
    'http://localhost:3000/api/v1'
  ).replace(/\/$/, '');
}
