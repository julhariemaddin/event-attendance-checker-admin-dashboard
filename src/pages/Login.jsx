import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { API_BASE } from '../api/client.js';

export default function Login({ onLogin }) {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [err,  setErr]  = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user || !pass) { setErr('Enter credentials.'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass }),
      });
      if (!r.ok) { setErr('Invalid credentials.'); setBusy(false); return; }
      const d = await r.json();
      sessionStorage.setItem('aseado_jwt', d.token);
      onLogin(d.token);
    } catch {
      setErr('Cannot reach server.');
      setBusy(false);
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20, position: 'relative',
      background: 'radial-gradient(circle at 50% 0%, var(--bg-subtle), var(--bg-base) 62%)',
    }}>
      <div style={{ position: 'fixed', top: 18, right: 18 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-3)',
          padding: '38px 34px 30px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <img
            src="/logo.png" alt="ASEADO"
            style={{ width: 56, height: 56, marginBottom: 14, objectFit: 'contain' }}
          />
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.01em' }}>ASEADO</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Sign in to manage your events
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Username</label>
            <input
              placeholder="e.g. Login Username"
              value={user} onChange={e => setUser(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()} autoFocus
            />
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="e.g. Login Password"
              value={pass} onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>

          {err && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              style={{
                fontSize: 12, color: '#ef4444', padding: '9px 12px',
                background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
                borderRadius: 8,
              }}
            >{err}</motion.div>
          )}

          <motion.button
            className="btn primary"
            onClick={submit} disabled={busy}
            whileTap={{ scale: 0.98 }}
            style={{ padding: 13, marginTop: 4, opacity: busy ? .6 : 1 }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </motion.button>
        </div>

        <div style={{
          fontSize: 11, color: 'var(--text-muted)',
          textAlign: 'center', marginTop: 24,
        }}>
          <a href="https://julhariemaddin.is-a.dev" target="_blank" rel="noopener noreferrer" style={{
            color: 'var(--text-muted)', textDecoration: 'underline',
          }}>
            Powered by Null-Pointer
          </a>
        </div>
      </motion.div>
    </div>
  );
}
