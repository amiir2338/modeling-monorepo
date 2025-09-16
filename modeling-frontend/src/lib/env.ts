export function getApiBase(): string {
  // Read raw value from any available source. Prefer runtime-injected values
  const rawClient =
    (typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_API_BASE) ||
    (typeof globalThis !== 'undefined' && (globalThis as any).NEXT_PUBLIC_API_BASE) ||
    (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_API_BASE) ||
    '';

  const raw = String(rawClient || '').trim();
  const noTrailing = raw.replace(/\/+$|\s+$/g, '');
  // If configured value ends with '/api', strip it to avoid '/api/api' duplication.
  const stripped = noTrailing.replace(/\/api$/i, '');

  if (stripped) {
    // Return host-only base (no trailing /api). Callers should use '/api/...' paths.
    // If user provided e.g. 'http://localhost:4000/api', we stripped '/api' above and
    // return 'http://localhost:4000'. If they provided 'http://api.example.com', we keep it.
    return stripped.replace(/\/+$/g, '');
  }

  // If we're running on the Node server (SSR or build) and no runtime override
  // was provided, return the local backend host so server-side fetches can
  // build absolute '/api' urls. Do NOT return this value for browser runtime
  // because that would make the client call a different origin which breaks
  // cookie handling (SameSite/Lax) during E2E tests.
  const isServer = typeof window === 'undefined' && typeof process !== 'undefined' && !!(process as any).env;
  if (isServer) {
    return 'http://localhost:4000';
  }

  // Default for browser runtime: same-origin (empty) so callers using '/api/..' remain correct
  return '';
}
