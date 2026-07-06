import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { motion } from 'framer-motion';
import './index.css';
import { initTheme } from './hooks/useTheme.js';
import IntroLoading  from './components/IntroLoading.jsx';
import LicenceVerify from './pages/LicenceVerify.jsx';
import Login         from './pages/Login.jsx';
import Bootstrap     from './pages/Bootstrap.jsx';
import Menu          from './pages/Menu.jsx';
import AdminApp      from './App.jsx';
import { API_BASE }  from './api/client.js';

// Toggle real OS-level fullscreen via Tauri's window API (available globally
// because tauri.conf.json has "withGlobalTauri": true). This removes the
// title bar and taskbar entirely — plain maximize() does not.
async function toggleFullscreen() {
  const appWindow = window.__TAURI__?.window?.appWindow;
  if (!appWindow) return;
  try {
    const isFull = await appWindow.isFullscreen();
    await appWindow.setFullscreen(!isFull);
  } catch (_) {
    // Not running inside Tauri (e.g. plain browser during dev) — ignore.
  }
}

// Apply the system (or previously chosen) theme before first paint.
initTheme();

// ─── Resolving Screen ─────────────────────────────────────────────────────────
// Shown during async resolve() instead of a blank flash.
// In the EXE, the backend may still be starting — we poll and show status.
function ResolvingScreen({ statusText }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg-base)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 20, zIndex: 9999,
      }}>
      <div style={{
        fontSize: 28, fontWeight: 900, letterSpacing: '.26em',
        color: 'var(--text-primary)', fontFamily: 'var(--mono)',
      }}>ASEADO</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)',
      }}>
        <Spinner />
        {statusText || 'Connecting to backend…'}
      </div>
    </motion.div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 14, height: 14,
      border: '2px solid var(--border)',
      borderTopColor: 'var(--text-secondary)',
      borderRadius: '50%',
      animation: 'aseado-spin .7s linear infinite',
      flexShrink: 0,
    }}>
      <style>{`@keyframes aseado-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
// Phases: loading → resolving → licence | login | bootstrap | menu | admin
//
// The key fix for EXE: in Tauri the backend takes ~8s to start.
// We poll /api/bootstrap/status with retries before transitioning,
// and show ResolvingScreen instead of a blank flash.
//
// localStorage keys (survive app restarts):
//   aseado_licence_key   — raw licence JWT
//   aseado_licence_info  — JSON { subject, username, expiration }
//
// sessionStorage keys (cleared on window close):
//   aseado_jwt    — admin session token

const BACKEND_POLL_INTERVAL = 800;  // ms between polls
const BACKEND_MAX_WAIT      = 90_000; // ms total wait (90s for slow machines)

async function waitForBackend(onStatus) {
  const deadline = Date.now() + BACKEND_MAX_WAIT;
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${API_BASE}/api/bootstrap/status`, { cache: 'no-store' });
      if (r.ok) return true;
    } catch (_) {
      attempt++;
      onStatus(`Waiting for backend… (${attempt})`);
    }
    await new Promise(res => setTimeout(res, BACKEND_POLL_INTERVAL));
  }
  return false;
}

function Root() {
  const [phase,      setPhase]      = useState('loading');
  const [resolveMsg, setResolveMsg] = useState('Connecting to backend…');


  async function resolve() {
    setPhase('resolving');
    setResolveMsg('Connecting to backend…');

    // Wait for backend to be reachable (critical for EXE cold-start)
    const up = await waitForBackend(msg => setResolveMsg(msg));
    if (!up) {
      setResolveMsg('Backend unreachable — retrying…');
      // Keep showing resolving; user will see the backend-down state in the app
    }

    const licenceKey = localStorage.getItem('aseado_licence_key_v1');
    if (licenceKey) {
      setResolveMsg('Re-hydrating licence…');
      // Silently re-apply the saved key to the backend's Spring Security
      // LicenceBean after JVM restart, so the session works if the user
      // chooses "continue" on the licence screen. This does NOT skip the
      // screen — the user still explicitly picks continue/replace/delete.
      try {
        const r = await fetch(`${API_BASE}/api/licence/${encodeURIComponent(licenceKey)}`, { method: 'POST' });
        if (r.ok) {
          const d = await r.json();
          localStorage.setItem('aseado_licence_info', JSON.stringify(d));
        } else {
          // Backend rejected the saved key — clear it so the licence screen
          // falls back to "enter a new key" mode instead of a stale "saved" card.
          localStorage.removeItem('aseado_licence_key_v1');
          localStorage.removeItem('aseado_licence_info');
        }
      } catch (_) {
        // Server unreachable during re-hydrate — leave the saved key in place;
        // the licence screen's own verify() call will surface the real error.
      }
    }

    // Always land on the licence screen. It reads localStorage itself and
    // shows either the "saved key" card (continue / replace / delete) or
    // the "enter a new key" form — the user always makes the choice.
    setPhase('licence');
  }

  function continueAfterLicence() {
    const token = sessionStorage.getItem('aseado_jwt');
    if (!token) { setPhase('login'); return; }

    fetch(`${API_BASE}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); })
      .then(() => checkBootstrap(token))
      .catch(() => setPhase('login'));
  }

  function checkBootstrap(token) {
    fetch(`${API_BASE}/api/bootstrap/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setPhase(d.firstLaunch ? 'bootstrap' : 'menu'))
      .catch(() => setPhase('menu'));
  }

  function onLicenceApproved() { continueAfterLicence(); }

  function onLogin() {
    const token = sessionStorage.getItem('aseado_jwt');
    checkBootstrap(token);
  }

  function logout() {
    sessionStorage.removeItem('aseado_jwt');
    setPhase('login');
  }

  useEffect(() => {
    window.addEventListener('aseado:logout', logout);
    function onKeyDown(e) {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('aseado:logout', logout);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  if (phase === 'loading')    return <IntroLoading onDone={resolve} />;
  if (phase === 'resolving')  return <ResolvingScreen statusText={resolveMsg} />;
  if (phase === 'licence')    return <LicenceVerify onApproved={onLicenceApproved} />;
  if (phase === 'login')      return <Login onLogin={onLogin} />;
  if (phase === 'bootstrap')  return <Bootstrap onDone={() => setPhase('menu')} />;
  if (phase === 'admin')      return <AdminApp onBack={() => setPhase('menu')} />;
  return <Menu onOpenAdmin={() => setPhase('admin')} onLogout={logout} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
