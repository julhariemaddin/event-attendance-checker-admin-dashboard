import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '../api/client.js';

// Tauri's process.relaunch — available globally because tauri.conf.json has
// "withGlobalTauri": true. We reach it this way instead of importing the npm
// package, since the project doesn't currently depend on @tauri-apps/api.
function relaunchApp() {
  const relaunch = window.__TAURI__?.process?.relaunch;
  if (typeof relaunch === 'function') {
    relaunch();
  } else {
    // Fallback for dev-in-browser (no Tauri bridge) — just reload.
    window.location.reload();
  }
}

const RESTART_COUNTDOWN_SECS = 3;

// Shown only when /api/bootstrap/status returns { firstLaunch: true }.
// The user must pick a workspace root folder path.
// After success the backend requires a restart — we show a restart notice.
// onDone is intentionally unused in the "done" branch below — after saving
// the workspace path the whole app relaunches (see relaunchApp()), so control
// never returns to this component; the fresh launch re-checks bootstrap
// status itself and goes straight to menu.
export default function Bootstrap({ onDone }) {
  const [path,    setPath]    = useState('');
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState('');
  const [done,    setDone]    = useState(false);
  const [root,    setRoot]    = useState('');
  const [countdown, setCountdown] = useState(RESTART_COUNTDOWN_SECS);
  const relaunchedRef = useRef(false);

  // Once the workspace is saved, the app MUST restart for the backend to
  // pick up the new root path — there is no "continue without restarting"
  // option. Count down automatically, then relaunch the whole app.
  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) {
      if (!relaunchedRef.current) {
        relaunchedRef.current = true;
        relaunchApp();
      }
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown]);

  // Native folder picker via Tauri's dialog plugin. Unlike the browser's
  // showDirectoryPicker (which only exposes a folder *name*, no path),
  // Tauri's dialog.open returns the full absolute OS path directly.
  // Falls back to the old browser picker (name-only) if Tauri isn't present,
  // so dev-in-browser still shows *something* rather than nothing.
  const tauriOpenDialog = window.__TAURI__?.dialog?.open;
  const canBrowse =
    typeof tauriOpenDialog === 'function' ||
    (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function');

  async function browse() {
    setErr('');
    try {
      if (typeof tauriOpenDialog === 'function') {
        // Tauri: returns a full absolute path (or null if cancelled).
        const selected = await tauriOpenDialog({ directory: true, multiple: false });
        if (selected) {
          setPath(selected);
          submit(selected); // auto-submit — full path already known
        }
        return;
      }
      if (typeof window.showDirectoryPicker === 'function') {
        // Dev-in-browser fallback — name only, still needs manual confirm.
        const handle = await window.showDirectoryPicker();
        setPath(handle.name);
      }
    } catch (e) {
      // User cancelled the picker — not an error worth surfacing.
      if (e && e.name !== 'AbortError') {
        setErr('Could not open folder picker.');
      }
    }
  }

  async function submit(overridePath) {
    const trimmed = (typeof overridePath === 'string' ? overridePath : path).trim();
    if (!trimmed) { setErr('Enter a folder path.'); return; }
    setBusy(true); setErr('');

    try {
      const token = sessionStorage.getItem('aseado_jwt') || '';
      const r = await fetch(`${API_BASE}/api/bootstrap/root-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ rootPath: trimmed }),
      });
      if (!r.ok) {
        let detail = '';
        try { const d = await r.json(); detail = d.message || ''; } catch (_) {}
        setErr(detail || 'Failed to set workspace folder.');
        setBusy(false);
        return;
      }
      const d = await r.json();
      setRoot(d.rootPath || trimmed);
      setDone(true);
      setBusy(false);
    } catch {
      setErr('Cannot reach server.');
      setBusy(false);
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg-base)',
      flexDirection: 'column',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          fontSize: 36, fontWeight: 900, letterSpacing: '.26em',
          color: 'var(--text-primary)', fontFamily: 'var(--mono)',
        }}>ASEADO</div>
        <div style={{
          fontSize: 9, letterSpacing: '.22em',
          color: 'var(--text-muted)', marginTop: 6, fontWeight: 700,
        }}>FIRST LAUNCH · WORKSPACE SETUP</div>
      </div>

      {/* Card */}
      <div style={{
        width: 480,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        padding: '36px 36px 32px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {!done ? (
          <>
            <div style={{
              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8,
            }}>
              First launch detected. Choose a <strong style={{ color: 'var(--text-primary)' }}>workspace root folder</strong> where
              ASEADO will store <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>registry.db</code>,
              profile databases, imports, and exports.
            </div>

            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              fontSize: 11, color: 'var(--text-muted)',
              fontFamily: 'var(--mono)', lineHeight: 1.8,
            }}>
              Example:&nbsp;
              <span style={{ color: 'var(--text-secondary)' }}>C:\ASEADO\workspace</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '.18em',
                color: 'var(--text-muted)',
              }}>WORKSPACE ROOT PATH</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={path}
                  onChange={e => { setPath(e.target.value); setErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder="C:\ASEADO\workspace"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '11px 13px',
                    background: 'var(--bg-base)',
                    border: `1px solid ${err ? '#e74c3c' : 'var(--border)'}`,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                    fontFamily: 'var(--mono)',
                    outline: 'none',
                  }}
                />
                {canBrowse && (
                  <button
                    type="button"
                    onClick={browse}
                    style={{
                      padding: '0 16px',
                      background: 'var(--bg-base)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: 11, fontWeight: 800, letterSpacing: '.08em',
                      cursor: 'pointer', fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    BROWSE…
                  </button>
                )}
              </div>
              {canBrowse && (
                <div style={{
                  fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6,
                }}>
                  {typeof tauriOpenDialog === 'function'
                    ? 'Pick a folder — the full path is filled in and saved automatically.'
                    : "Browsers only expose the selected folder's name, not its full path — after picking, confirm or complete the full path above."}
                </div>
              )}
            </div>

            {err && (
              <div style={{
                fontSize: 11, color: '#e74c3c',
                padding: '10px 14px',
                background: 'rgba(231,76,60,.08)',
                border: '1px solid rgba(231,76,60,.25)',
                fontFamily: 'var(--mono)',
              }}>✕ &nbsp;{err}</div>
            )}

            <button
              onClick={() => submit()}
              disabled={busy}
              style={{
                padding: 14,
                background: 'var(--text-primary)', color: 'var(--bg-base)',
                border: 'none',
                fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
                cursor: busy ? 'default' : 'pointer',
                opacity: busy ? .5 : 1,
                fontFamily: 'inherit',
              }}
            >
              {busy ? 'SAVING…' : 'SET WORKSPACE FOLDER'}
            </button>
          </>
        ) : (
          // ── Done — restart notice ─────────────────────────────
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px',
              background: 'rgba(34,197,94,.08)',
              border: '1px solid rgba(34,197,94,.25)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#22c55e', boxShadow: '0 0 8px #22c55e',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: 800,
                letterSpacing: '.1em', color: '#22c55e',
              }}>WORKSPACE CONFIGURED</span>
            </div>

            <div style={{
              padding: '12px 16px',
              border: '1px solid var(--border)',
              fontSize: 11, fontFamily: 'var(--mono)',
              color: 'var(--text-secondary)', lineHeight: 1.8,
            }}>
              <div style={{ marginBottom: 4, color: 'var(--text-muted)', fontSize: 9, letterSpacing: '.14em', fontWeight: 800 }}>PATH</div>
              {root}
            </div>

            <div style={{
              fontSize: 12, color: 'var(--text-secondary)',
              lineHeight: 1.8,
              padding: '12px 16px',
              background: 'rgba(234,179,8,.06)',
              border: '1px solid rgba(234,179,8,.2)',
            }}>
              ⚠ The ASEADO backend must restart to apply the new workspace.
              This can't be skipped — the app will restart automatically.
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, padding: 14,
              background: 'var(--bg-base)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--text-secondary)',
                animation: 'aseado-pulse 1s ease-in-out infinite',
              }} />
              <style>{`@keyframes aseado-pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
              <span style={{
                fontSize: 11, fontWeight: 800, letterSpacing: '.1em',
                color: 'var(--text-primary)', fontFamily: 'var(--mono)',
              }}>
                {countdown > 0
                  ? `RESTARTING IN ${countdown}…`
                  : 'RESTARTING…'}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}