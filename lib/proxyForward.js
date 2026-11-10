function getProxyBaseUrl() {
  const raw = (process.env.VI_MANGA_PROXY || '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return '';
  return raw.replace(/\/+$/, '');
}

function buildProxyHeaders() {
  const headers = { Accept: 'application/json' };
  const secret = (process.env.MANGA_PROXY_SECRET || '').trim();
  if (secret) headers['x-proxy-secret'] = secret;
  return headers;
}

export async function forwardJsonViaVnProxy(pathname, searchParams) {
  const baseUrl = getProxyBaseUrl();
  if (!baseUrl) return null;

  try {
    const qs = new URLSearchParams(searchParams).toString();
    const target = `${baseUrl}${pathname}${qs ? `?${qs}` : ''}`;
    const res = await fetch(target, {
      headers: buildProxyHeaders(),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function forwardImageViaVnProxy(searchParams) {
  const baseUrl = getProxyBaseUrl();
  if (!baseUrl) return null;

  try {
    const qs = new URLSearchParams(searchParams).toString();
    const target = `${baseUrl}/api/manga-image${qs ? `?${qs}` : ''}`;
    const headers = buildProxyHeaders();
    headers.Accept = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8';
    const res = await fetch(target, {
      headers,
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      status: 200,
      buffer,
      contentType: res.headers.get('content-type') || 'image/jpeg'
    };
  } catch {
    return null;
  }
}

