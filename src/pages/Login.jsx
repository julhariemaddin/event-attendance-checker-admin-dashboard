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
      minHeight: '100vh', background: 'var(--bg-base)', padding: 20, position: 'relative',
    }}>
      <div style={{ position: 'fixed', top: 18, right: 18 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%', maxWidth: 360, background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 14,
          boxShadow: '0 24px 60px var(--shadow-color)',
          padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 28, fontWeight: 800, letterSpacing: '.22em',
            color: 'var(--text-primary)', fontFamily: 'var(--mono)',
          }}>ASEADO</div>
          <div style={{
            fontSize: 11, color: 'var(--text-muted)',
            letterSpacing: '.14em', marginTop: 6, fontWeight: 600, textTransform: 'uppercase',
          }}>Fast, Simple &amp; Secure</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10 }}>Admin Console</div>
        </div>

        <Field label="USERNAME">
          <input
            style={inputStyle}
            value={user} onChange={e => setUser(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} autoFocus
          />
        </Field>

        <Field label="PASSWORD">
          <input
            type="password"
            style={inputStyle}
            value={pass} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
          />
        </Field>

        {err && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            style={{
              fontSize: 11, color: '#ef4444', padding: '9px 12px',
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
              borderRadius: 8,
            }}
          >{err}</motion.div>
        )}

        <motion.button
          onClick={submit} disabled={busy}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: 13, background: 'var(--text-primary)',
            color: 'var(--bg-base)', border: 'none', borderRadius: 8,
            fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
            cursor: busy ? 'default' : 'pointer', opacity: busy ? .6 : 1, fontFamily: 'inherit',
          }}
        >
          {busy ? 'SIGNING IN…' : 'SIGN IN'}
        </motion.button>

        <div style={{
          fontSize: 10, color: 'var(--text-muted)',
          textAlign: 'center', letterSpacing: '.06em',
        }}>
          Julharie Maddin · ASEADO v1.0
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
        color: 'var(--text-muted)',
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  padding: '11px 13px', background: 'var(--bg-surface)',
  border: '1px solid var(--border)', borderRadius: 8,
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
  width: '100%', fontFamily: 'inherit',
};
