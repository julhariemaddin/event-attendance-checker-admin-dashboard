import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { API_BASE } from '../api/client.js';

// POST /api/licence/{licenceToken}
// Returns LicenceDto: { subject, username, expiration }
//
// Persistence (localStorage — survives app restarts):
//   aseado_licence_key   — raw licence key
//   aseado_licence_info  — JSON payload

export default function LicenceVerify({ onApproved }) {
  const { theme, toggleTheme } = useTheme();
  const [mode,   setMode]   = useState('loading'); // loading | saved | enter
  const [key,    setKey]    = useState('');
  const [status, setStatus] = useState('idle');    // idle | checking | ok | err
  const [info,   setInfo]   = useState(null);
  const [errMsg, setErrMsg] = useState('');

  // On mount — check if we already have a saved, valid licence
  useEffect(() => {
    const savedKey  = localStorage.getItem('aseado_licence_key_v1');
    const savedInfo = (() => {
      try { return JSON.parse(localStorage.getItem('aseado_licence_info')); }
      catch (_) { return null; }
    })();

    if (savedKey && savedInfo) {
      setInfo(savedInfo);
      setMode('saved');
    } else {
      setMode('enter');
    }
  }, []);

  // ── Verify a new key ──────────────────────────────────────────────────────
  async function verify() {
    const trimmed = key.trim();
    if (!trimmed) { setErrMsg('Paste your licence key.'); return; }
    setStatus('checking'); setErrMsg(''); setInfo(null);

    try {
      const r = await fetch(`${API_BASE}/api/licence/${encodeURIComponent(trimmed)}`, { method: 'POST' });

      if (!r.ok) {
        let detail = '';
        try { const d = await r.json(); detail = d.message || d.error || ''; } catch (_) {}
        setStatus('err');
        setErrMsg(detail || 'Invalid licence key.');
        return;
      }

      const d = await r.json();
      localStorage.setItem('aseado_licence_key_v1',  trimmed);
      localStorage.setItem('aseado_licence_info', JSON.stringify(d));
      setInfo(d);
      setStatus('ok');
    } catch {
      setStatus('err');
      setErrMsg('Cannot reach server. Make sure ASEADO is running.');
    }
  }

  // ── Delete saved licence ──────────────────────────────────────────────────
  function deleteLicence() {
    localStorage.removeItem('aseado_licence_key_v1');
    localStorage.removeItem('aseado_licence_info');
    setInfo(null);
    setKey('');
    setStatus('idle');
    setErrMsg('');
    setMode('enter');
  }

  const isChecking = status === 'checking';

  // ── Still loading saved state ─────────────────────────────────────────────
  if (mode === 'loading') return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-base)', flexDirection: 'column', padding: 20,
    }}>
      <div style={{ position: 'fixed', top: 18, right: 18 }}>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          fontSize: 36, fontWeight: 900, letterSpacing: '.26em',
          color: 'var(--text-primary)', fontFamily: 'var(--mono)',
        }}>ASEADO</div>
        <div style={{
          fontSize: 9, letterSpacing: '.22em',
          color: 'var(--text-muted)', marginTop: 6, fontWeight: 700,
        }}>LICENCE ACTIVATION</div>
      </motion.div>

 {/* ── SAVED MODE - shows info, option to continue or replace ── */}
      {mode === 'saved' && info && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
          width: '100%', maxWidth: 440, background: 'var(--bg-card)', borderRadius: 14, boxShadow: '0 24px 60px var(--shadow-color)',
          border: '1px solid var(--border)', padding: '36px 36px 32px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Valid badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px',
            background: 'rgba(34,197,94,.08)',
            border: '1px solid rgba(34,197,94,.25)',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0,
            }} />
            <span style={{
              fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: '#22c55e',
            }}>LICENCE ACTIVE</span>
          </div>

          {/* Licence info rows */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
             {[
                  ['LICENSED TO', info.subject],
                  ['SIGNED BY',    info.signBy],
                  ['ISSUED AT',     formatExpiry(info.issuedAt)],
                  ['EXPIRES',     formatExpiry(info.expiration)],
                ].map(([label, val]) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '11px 0',
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                  color: 'var(--text-muted)',
                }}>{label}</span>
                <span style={{
                  fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
                  color: 'var(--text-primary)',
                }}>{val}</span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            Your licence key is saved locally and will be re-verified automatically on every launch.
          </div>

          {/* Primary action */}
          <button onClick={onApproved} style={{
            padding: 14, background: 'var(--text-primary)', color: 'var(--bg-base)',
            border: 'none', fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            CONTINUE TO LOGIN
          </button>

          {/* Secondary actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setMode('enter'); setKey(''); setStatus('idle'); setErrMsg(''); }}
              style={{
                flex: 1, padding: '10px 0',
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              REPLACE KEY
            </button>
            <button onClick={deleteLicence} style={{
              flex: 1, padding: '10px 0',
              background: 'transparent',
              border: '1px solid rgba(231,76,60,.3)',
              color: '#e74c3c',
              fontSize: 10, fontWeight: 800, letterSpacing: '.1em',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              DELETE KEY
            </button>
          </div>
        </motion.div>
      )}

 {/* ── ENTER MODE - paste + verify ── */}
      {mode === 'enter' && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
          width: '100%', maxWidth: 440, background: 'var(--bg-card)', borderRadius: 14, boxShadow: '0 24px 60px var(--shadow-color)',
          border: '1px solid var(--border)', padding: '36px 36px 32px',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {status !== 'ok' ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.18em',
                  color: 'var(--text-muted)',
                }}>LICENCE KEY</label>
                <textarea
                  rows={4}
                  value={key}
                  onChange={e => { setKey(e.target.value); setErrMsg(''); setStatus('idle'); }}
                  placeholder="Paste your licence key here…"
                  autoFocus
                  style={{
                    padding: '11px 13px', background: 'var(--bg-base)',
                    border: `1px solid ${status === 'err' ? '#e74c3c' : 'var(--border)'}`,
                    color: 'var(--text-primary)', fontSize: 11,
                    fontFamily: 'var(--mono)', resize: 'none', outline: 'none', lineHeight: 1.65,
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) verify(); }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.04em' }}>
                  Ctrl+Enter to verify
                </div>
              </div>

              {errMsg && (
                <div style={{
                  fontSize: 11, color: '#e74c3c', padding: '10px 14px',
                  background: 'rgba(231,76,60,.08)', border: '1px solid rgba(231,76,60,.25)',
                  fontFamily: 'var(--mono)',
                }}>
                  ✕ &nbsp;{errMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={verify} disabled={isChecking} style={{
                  flex: 1, padding: 14,
                  background: 'var(--text-primary)', color: 'var(--bg-base)',
                  border: 'none', fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
                  cursor: isChecking ? 'default' : 'pointer',
                  opacity: isChecking ? .5 : 1, fontFamily: 'inherit',
                }}>
                  {isChecking ? 'VERIFYING…' : 'ACTIVATE LICENCE'}
                </button>
 {/* Back button - only when replacing an existing key */}
                {localStorage.getItem('aseado_licence_key_v1') && (
                  <button onClick={() => setMode('saved')} style={{
                    padding: '14px 18px', background: 'transparent',
                    border: '1px solid var(--border)', color: 'var(--text-secondary)',
                    fontSize: 10, fontWeight: 800, letterSpacing: '.08em',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    CANCEL
                  </button>
                )}
              </div>
            </>
          ) : (
            /* After successful verification */
            <>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', background: 'rgba(34,197,94,.08)',
                border: '1px solid rgba(34,197,94,.25)',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: '#22c55e',
 }}>LICENCE VALID - KEY SAVED</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {[
                  ['LICENSED TO', info.subject],
                  ['SIGNED BY',    info.signBy],
                  ['ISSUED AT',     formatExpiry(info.issuedAt)],
                  ['EXPIRES',     formatExpiry(info.expiration)],
                ].map(([label, val]) => (
                  <div key={label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '11px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                      color: 'var(--text-muted)',
                    }}>{label}</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
                      color: 'var(--text-primary)',
                    }}>{val}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                Key saved. You won't need to enter it again on next launch.
              </div>

              <button onClick={onApproved} style={{
                padding: 14, background: 'var(--text-primary)', color: 'var(--bg-base)',
                border: 'none', fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                CONTINUE TO LOGIN
              </button>
            </>
          )}
        </motion.div>
      )}

      <div style={{
        marginTop: 24, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.08em',
      }}>
        Julharie Maddin · ASEADO v1.0
      </div>
    </div>
  );
}

function formatExpiry(raw) {
 if (!raw) return '-';
  try {
    return new Date(raw).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return String(raw); }
}
