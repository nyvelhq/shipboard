// Local dev defaults cover both frontend dev-server ports used in this
// repo's history (3000 and 3001) so nothing breaks with zero config.
// Set CORS_ORIGINS (comma-separated) to the real deployed frontend
// origin(s) in any non-local environment.
const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://localhost:3001'];

export function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return DEFAULT_ORIGINS;
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
