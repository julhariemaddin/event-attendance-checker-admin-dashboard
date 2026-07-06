// In dev (npm run dev / tauri dev), Vite's proxy handles '/api' -> localhost:8080,
// so a relative base works. In the built .exe there is no dev server or proxy —
// the app is loaded as static files by the Tauri webview at a secure origin
// (https://tauri.localhost) — so requests must be absolute AND https, or the
// webview blocks them as mixed content (a secure page can't load plain http://
// resources). The backend now serves HTTPS on 8443 (see application.yml).
//
// Use 127.0.0.1 rather than 'localhost': Windows/WebView2 can resolve
// 'localhost' to the IPv6 loopback (::1) first, and if that doesn't route
// to the JVM the same way IPv4 does, fetch() fails with a generic network
// error that looks exactly like "the backend isn't running" even though
// it's up and healthy on 127.0.0.1. The bundled cert's SAN already covers
// both 'localhost' and '127.0.0.1', so this is safe.
const API_BASE = import.meta.env.DEV ? '' : 'https://127.0.0.1:8443';

export class ApiError extends Error {}

let serverStatusListener = null;
export function onServerStatusChange(fn) { serverStatusListener = fn; }

function getToken() {
  return sessionStorage.getItem('aseado_jwt') || '';
}

export async function api(method, path, body) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  };

  if (body !== undefined) {
    if (body instanceof FormData) {
      // For file imports, let the browser dynamically generate the multipart/form-data boundary
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(API_BASE + path, opts);
  } catch (err) {
    if (serverStatusListener) serverStatusListener(false);
    throw new ApiError('Could not reach server. If this persists, the local HTTPS certificate may not be trusted yet — see README-BUILD.md.');
  }

  if (serverStatusListener) serverStatusListener(true);

  if (res.status === 401) {
    // Token expired or invalid — redirect to login
    sessionStorage.removeItem('aseado_jwt');
    window.dispatchEvent(new Event('aseado:logout'));
    throw new ApiError('Session expired. Please log in again.');
  }

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch (_) {}
    throw new ApiError((detail || (method + ' ' + path + ' failed (' + res.status + ')')).slice(0, 300));
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return null;
}

export { API_BASE };