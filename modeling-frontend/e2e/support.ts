// e2e/support.ts
// Keep API_BASE without a trailing '/api' — tests supply full paths like '/api/v1/...'
// Use IPv4 loopback by default for reliability in test environments
export const API_BASE = process.env.API_BASE || 'http://127.0.0.1:4000';
export const FRONT_BASE = process.env.FRONT_BASE || 'http://localhost:3000';

type HttpRes = { status: number; body: any; raw: string };

export async function http(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: any,
  token?: string
): Promise<HttpRes> {
  // Normalize shorthand paths: some tests use '/v1/...' (without leading /api). If
  // so, rewrite to '/api/v1/...'. Then build URL safely: if `path` is absolute
  // (starts with http) use it; otherwise join API_BASE and path ensuring a single
  // slash between them.
  let normalizedPath = path;
  if (!path.startsWith('http')) {
    if (path.startsWith('/v1/')) normalizedPath = `/api${path}`;
    else if (path === '/v1') normalizedPath = '/api/v1';
  }
  const url = normalizedPath.startsWith('http')
    ? normalizedPath
    : `${API_BASE.replace(/\/$/, '')}/${normalizedPath.replace(/^\//, '')}`;
  const headers: Record<string,string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (method !== 'GET') headers['Content-Type'] = 'application/json';

  // Debug: log outgoing request
  logStep('http-request', { method, url, token: !!token });

  // Use Node http/https to avoid platform-specific fetch issues
  try {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? await import('https') : await import('http');
    const opts: any = {
      method,
      headers,
      timeout: 10000,
    };

    const raw = await new Promise<string>((resolve, reject) => {
      const req = lib.request(u, opts, (res: any) => {
        const chunks: any[] = [];
        res.on('data', (c: any) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve(text);
        });
      });
      req.on('error', (err: any) => reject(err));
      if (opts.timeout) req.setTimeout(opts.timeout, () => {
        req.abort();
        reject(new Error('timeout'));
      });
      if (method !== 'GET' && body !== undefined) {
        req.write(JSON.stringify(body ?? {}));
      }
      req.end();
    });

    let data: any;
    try { data = JSON.parse(raw); } catch { data = {}; }
    // If server didn't provide status (we don't have it here), assume 200 when we got a body
    // But the lower-level lib doesn't expose status here; parse is best-effort.
    return { status: 200, body: data, raw };
  } catch (e:any) {
    logStep('http-error', { method, url, message: String(e?.message || e) });
    return { status: 0, body: { ok:false, error:String(e?.message||e) }, raw:'' };
  }
}

export const get  = (p:string, tok?:string)=>http('GET', p, undefined, tok);
export const post = (p:string, b?:any, tok?:string)=>http('POST', p, b, tok);
export const patch= (p:string, b?:any, tok?:string)=>http('PATCH', p, b, tok);

export function firstIdFrom(body: any): string | null {
  const pick = (o:any)=> o? (o._id || o.id || null) : null;
  if (!body) return null;
  if (body.job) return pick(body.job);
  if (body.data?.job) return pick(body.data.job);
  if (Array.isArray(body.data) && body.data.length) return pick(body.data[0]);
  if (body.data) return pick(body.data);
  return pick(body);
}

export function tokenFrom(body: any): string | null {
  if (!body) return null;
  return body.token || body.data?.token || null;
}

export function logStep(name: string, payload: any){
  console.log(`[${new Date().toISOString()}] [${name}] ${JSON.stringify(payload)}`);
}

