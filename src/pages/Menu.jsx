import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { API_BASE } from '../api/client.js';

// Scanner URL is always port 8080 (Spring Boot), not 5173 (Vite dev).
// Subject format from licence: "JULHARIE MADDIN - GOV" — shown as welcome.
// Author info moved to the Creator nav tab (not the sidebar).

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◧' },
  { id: 'about',     label: 'About',     icon: '◇' },
  { id: 'creator',   label: 'Creator',   icon: '◈' },
  { id: 'settings',  label: 'Settings',  icon: '◎' },
];

export default function Menu({ onOpenAdmin, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const [navOpen,     setNavOpen]     = useState(false);
  const [panel,       setPanel]       = useState('dashboard');
  const [server,      setServer]      = useState(null);
 const [workspace, setWorkspace] = useState('-');
  const [copied,      setCopied]      = useState(false);
  const [licenceInfo, setLicenceInfo] = useState(null); // { subject, username, expiration }

  const scannerUrl = `http://${window.location.hostname}:8080/scanner.html`;

  useEffect(() => {
    const token = sessionStorage.getItem('aseado_jwt') || '';

    fetch(`${API_BASE}/api/bootstrap/status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
 .then(d => { setServer(true); setWorkspace(d.rootPath || '-'); })
      .catch(() => setServer(false));

    try {
      const raw = localStorage.getItem('aseado_licence_info');
      if (raw) setLicenceInfo(JSON.parse(raw));
    } catch (_) {}

    const id = setInterval(() => {
      fetch(`${API_BASE}/api/bootstrap/status`)
        .then(r => setServer(r.ok))
        .catch(() => setServer(false));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  function copyScannerUrl() {
    navigator.clipboard.writeText(scannerUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // Parse "JULHARIE MADDIN — GOV" → { name: "Julharie Maddin", tag: "GOV" }
  function parseSubject(subject) {
    if (!subject) return { name: null, tag: null };
    const parts = subject.split(' — '); // NOTE: em dash is the real delimiter used by the licence-issuing tool — do not change to a plain hyphen
    const name = parts[0]
      ? parts[0].trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
      : null;
    const tag = parts[1] ? parts[1].trim() : null;
    return { name, tag };
  }

  const { name: licenceName, tag: licenceTag } = parseSubject(licenceInfo?.subject);

  const serverColor = server === null ? 'var(--text-muted)' : server ? 'var(--status-live)' : '#ef4444';
  const serverLabel = server === null ? 'CHECKING…' : server ? 'RUNNING' : 'ERROR';
 const workspaceShort = workspace !== '-'
    ? (workspace.split(/[\\/]/).pop() || workspace)
 : '-';

  const initial = (licenceName || 'A').trim().charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }}>

      {/* ── Topbar ─────────────────────────────────────────── */}
      <div style={{
        height: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 12, flexShrink: 0,
        backdropFilter: 'blur(8px)',
      }}>
        <button
          className="menu-hamburger-btn"
          onClick={() => setNavOpen(o => !o)}
          aria-label="Toggle navigation"
          style={{
            display: 'none', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'var(--text-primary)', flexShrink: 0,
          }}
        >
          <span className="mobile-menu-icon" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontWeight: 900, fontSize: 12,
            color: 'var(--bg-base)', flexShrink: 0,
          }}>A</div>
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: '.16em',
            fontFamily: 'var(--mono)',
          }}>ASEADO</span>
        </div>

        <div style={{ flex: 1 }} />

        <div className="menu-status-pill" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 12px', borderRadius: 20,
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: serverColor,
            boxShadow: server ? `0 0 6px ${serverColor}` : 'none',
          }} />
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '.1em',
            color: 'var(--text-muted)',
          }}>{serverLabel}</span>
        </div>
        <span className="menu-version-tag" style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
          color: 'var(--text-muted)',
        }}>v1.0</span>
        <ThemeToggle theme={theme} onToggle={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8 }} />
        <button onClick={onLogout} style={{
          padding: '7px 14px', fontSize: 10, fontWeight: 800,
          letterSpacing: '.1em',
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontFamily: 'inherit',
          transition: 'color .15s, border-color .15s',
        }}>LOGOUT</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        {/* Backdrop for the mobile nav drawer */}
        <div
          className={'menu-nav-backdrop' + (navOpen ? ' show' : '')}
          onClick={() => setNavOpen(false)}
        />

        {/* ── Left nav ───────────────────────────────────────── */}
        <div className={'menu-sidenav' + (navOpen ? ' open' : '')} style={{
          width: 220, flexShrink: 0,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}>
 {/* Welcome block - compact, just avatar + name + tag */}
          {licenceName && (
            <div style={{
              padding: '20px 18px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--bg-subtle), var(--border))',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 15,
                color: 'var(--text-primary)',
              }}>{initial}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.14em',
                  color: 'var(--text-muted)', marginBottom: 3,
                }}>WELCOME</div>
                <div style={{
                  fontSize: 13, fontWeight: 800,
                  color: 'var(--text-primary)', lineHeight: 1.25,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{licenceName}</div>
                {licenceTag && (
                  <div style={{
                    display: 'inline-block', marginTop: 4,
                    padding: '2px 7px', borderRadius: 5,
                    fontSize: 9, fontWeight: 800, letterSpacing: '.1em',
                    background: 'var(--bg-subtle)', color: 'var(--text-muted)',
                  }}>{licenceTag}</div>
                )}
              </div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ padding: '14px 12px', flex: 1 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '.18em',
              color: 'var(--text-muted)', padding: '0 6px 8px',
            }}>NAVIGATION</div>
            {NAV.map(n => {
              const active = panel === n.id;
              return (
                <button key={n.id} onClick={() => { setPanel(n.id); setNavOpen(false); }} style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px', marginBottom: 3,
                  background: 'transparent', border: 'none', borderRadius: 8,
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 700, letterSpacing: '.02em',
                  textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                  overflow: 'hidden',
                }}>
                  {active && (
                    <motion.span
                      layoutId="menu-nav-active"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      style={{ position: 'absolute', inset: 0, background: 'var(--bg-subtle)', borderRadius: 8 }}
                    />
                  )}
                  <span style={{ position: 'relative', fontSize: 13, width: 16, textAlign: 'center', color: active ? 'var(--text-primary)' : 'var(--text-muted)' }}>{n.icon}</span>
                  <span style={{ position: 'relative' }}>{n.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Workspace footer */}
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '.14em',
              color: 'var(--text-muted)', marginBottom: 4,
            }}>WORKSPACE</div>
            <div style={{
              fontSize: 10, color: 'var(--text-secondary)',
              fontFamily: 'var(--mono)', wordBreak: 'break-all',
            }}>{workspaceShort}</div>
          </div>
        </div>

        {/* ── Right content ────────────────────────────────── */}
        <div className="menu-content" style={{ flex: 1, overflowY: 'auto', padding: '36px 40px', minWidth: 0 }}>
          <AnimatePresence mode="wait">

            {/* ── DASHBOARD ──────────────────────────────────── */}
            {panel === 'dashboard' && (
              <motion.div key="dashboard" {...panelMotion}>
                {/* Welcome banner */}
                {licenceName && (
                  <div style={{
                    marginBottom: 28, position: 'relative', overflow: 'hidden',
                    padding: '22px 26px', borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--bg-surface), var(--bg-subtle))',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 16,
                  }}>
                    <div>
                      <div style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '.18em',
                        color: 'var(--text-muted)', marginBottom: 6,
                      }}>WELCOME BACK</div>
                      <div style={{
                        fontSize: 22, fontWeight: 800,
                        color: 'var(--text-primary)', letterSpacing: '.02em',
                      }}>
                        {licenceName}
                        {licenceTag && (
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: 'var(--text-muted)',
                            marginLeft: 12, letterSpacing: '.1em',
 }}> - {licenceTag}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>
 Fast, Simple &amp; Secure - your event is ready when you are.
                      </div>
                    </div>
                    <span style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: serverColor,
                      boxShadow: server ? `0 0 12px ${serverColor}` : 'none',
                      flexShrink: 0,
                    }} />
                  </div>
                )}

                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                  color: 'var(--text-muted)', marginBottom: 12,
                }}>QUICK ACTIONS</div>

                {/* Action cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))',
                  gap: 14, marginBottom: 32,
                }}>
                  <ActionCard
                    icon="▶"
                    title="ADMIN CONSOLE"
                    desc="Manage profiles, events, roster and live scanning."
                    onClick={onOpenAdmin}
                  />
                  <ActionCard
                    icon={copied ? '✓' : '⧉'}
                    title={copied ? 'COPIED!' : 'COPY SCANNER URL'}
                    desc="Share with phone operators on the same network."
                    onClick={copyScannerUrl}
                    accent={copied}
                  />
                  <ActionCard
                    icon="◱"
                    title="OPEN SCANNER"
                    desc="Open the phone scanner page in your browser."
                    onClick={() => window.open(scannerUrl, '_blank')}
                  />
                </div>

                {/* System Status */}
                <div style={{
                  maxWidth: 560, background: 'var(--bg-surface)',
                  border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px',
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                    color: 'var(--text-muted)', marginBottom: 10,
                  }}>SYSTEM STATUS</div>
                  {[
                    ['Server',       serverLabel,  serverColor],
                    ['Server Port',  '8080 (HTTP / WebSocket)', 'var(--text-secondary)'],
                    ['Admin UI',     'This window (Tauri)',     'var(--text-secondary)'],
                    ['Scanner URL',  scannerUrl,               'var(--text-secondary)'],
                    ['Workspace',    workspace,                'var(--text-secondary)'],
                  ].map(([k, v, c], i, arr) => (
                    <div key={k} style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 0',
                      borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)',
                      fontSize: 12,
                    }}>
                      <span style={{
                        color: 'var(--text-secondary)',
                        flexShrink: 0, marginRight: 16,
                      }}>{k}</span>
                      <span style={{
                        fontWeight: 700, fontFamily: 'var(--mono)',
                        fontSize: 11, color: c,
                        textAlign: 'right', wordBreak: 'break-all',
                      }}>{v}</span>
                    </div>
                  ))}
                </div>

                <motion.button
                  onClick={onOpenAdmin}
                  whileTap={{ scale: 0.98 }}
                  whileHover={{ y: -1 }}
                  style={{
                    marginTop: 24,
                    padding: '13px 26px', borderRadius: 10,
                    background: 'var(--text-primary)', color: 'var(--bg-base)',
                    border: 'none',
                    fontSize: 11, fontWeight: 800, letterSpacing: '.14em',
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 8px 24px var(--shadow-color)',
                  }}>
                  ▶ &nbsp;OPEN ADMIN CONSOLE
                </motion.button>
              </motion.div>
            )}

            {/* ── ABOUT ──────────────────────────────────────── */}
            {panel === 'about' && (
              <motion.div key="about" {...panelMotion}>
                <PanelHeader title="About" desc="Version information and system details." />

                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)', borderRadius: 14,
                  padding: 28, maxWidth: 480,
                }}>
                  <div style={{
                    fontSize: 30, fontWeight: 900,
                    letterSpacing: '.2em', marginBottom: 2,
                    fontFamily: 'var(--mono)',
                  }}>ASEADO</div>
                  <div style={{
                    fontSize: 10, color: 'var(--text-muted)',
                    letterSpacing: '.08em', marginBottom: 22,
                  }}>
 EVENT ATTENDANCE CHECKER - DESKTOP EDITION
                  </div>
                  <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 0 20px' }} />
                  {[
  ['VERSION',      '1.0.0'],
  ['WHAT IT IS',   'A check-in system for campus events scan a student ID with your phone, and attendance is recorded instantly, no paper sign-in sheet needed.'],
  ['HOW IT RUNS',  'Everything runs locally on this computer. No internet connection is required once installed phones connect over the same WiFi network to scan or wired connections, and all data stays on this machine.'],
  ['LICENCE', licenceInfo ? `${licenceInfo.subject}` : '-'],
  ['EXPIRES', licenceInfo ? formatExpiry(licenceInfo.expiration) : '-'],
].map(([l, v]) => (
                    <div key={l} style={{ marginBottom: 16 }}>
                      <div style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                        color: 'var(--text-muted)', marginBottom: 4,
                      }}>{l}</div>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        lineHeight: 1.6, color: 'var(--text-primary)',
                      }}>{v}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── CREATOR ────────────────────────────────────── */}
            {panel === 'creator' && (
              <motion.div key="creator" {...panelMotion}>
                <PanelHeader title="Creator" desc="The developer behind ASEADO." />

                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)', borderRadius: 14,
                  padding: 28, maxWidth: 420,
                }}>
                  {[
                    ['FOUNDER',         'Julharie Maddin'],
                    ['ROLE',         'CCS GOVERNOR & Backend Developer'],
 ['INSTITUTION', 'Jose Rizal Memorial State University - Siocon Campus'],
                    ['PROGRAMME',    'BS Computer Science'],
                    ['ORCID RESEARCHER ID',        '0009-0009-3366-1271'],
                  ].map(([l, v]) => (
                    <div key={l} style={{
                      padding: '12px 0',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{
                        fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                        color: 'var(--text-muted)', marginBottom: 4,
                      }}>{l}</div>
                      <div style={{
                        fontSize: 12, fontWeight: 600,
                        color: 'var(--text-primary)', lineHeight: 1.5,
                      }}>{v}</div>
                    </div>
                  ))}
                  <div style={{ padding: '12px 0 0' }}>
                    <div style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                      color: 'var(--text-muted)', marginBottom: 6,
                    }}>PORTFOLIO</div>
                    <a
                      href="https://julhariemaddin.is-a.dev"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 700,
                        color: 'var(--text-primary)', lineHeight: 1.5,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                        wordBreak: 'break-all', textDecoration: 'none',
                      }}
                    >
                      julhariemaddin.is-a.dev ↗
                    </a>
                  </div>
                  <div style={{ padding: '12px 0 0' }}>
                    <div style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '.16em',
                      color: 'var(--text-muted)', marginBottom: 6,
                    }}>ORGANIZATION</div>
                    <a
                      //href=""
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 700,
                        color: 'var(--text-primary)', lineHeight: 1.5,
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                        wordBreak: 'break-all', textDecoration: 'none',
                      }}
                    >
                      Null-Pointer↗
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── SETTINGS ───────────────────────────────────── */}
            {panel === 'settings' && (
              <motion.div key="settings" {...panelMotion}>
<PanelHeader title="Settings" desc="How this app is set up on this computer." />

<div style={{
  maxWidth: 540, background: 'var(--bg-surface)',
  border: '1px solid var(--border)', borderRadius: 14, padding: '6px 20px',
}}>
  {[
    ['Data folder',      workspace,        'Where your event and student records are saved on this computer.'],
    ['Connection port',  '8080',           'Used internally by the app to communicate with itself — nothing you need to change.'],
    ['Login required',   'Yes',            'You must log in each time to open the admin console.'],
    ['Scanner address',  scannerUrl,       'Open this on any phone connected to the same WiFi to start scanning.'],
    ['Scanner login',    'Not required',   'Phones don\u2019t need to log in — just be on the same WiFi network as this computer.'],
    ['Licensed to',      licenceInfo?.subject || '-', 'The name on file for your current licence.'],
    ['Admin username',   licenceInfo?.username || '-', 'The login username tied to your licence.'],
  ].map(([k, v, hint], i, arr) => (
    <div key={k} style={{ padding: '14px 0', borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--border)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 4, gap: 16,
      }}>
        <span style={{
          fontSize: 12, fontWeight: 700,
          letterSpacing: '.04em', flexShrink: 0,
        }}>{k}</span>
        <span style={{
          fontSize: 11, fontFamily: 'var(--mono)',
          color: 'var(--text-secondary)',
          textAlign: 'right', wordBreak: 'break-all',
        }}>{v}</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {hint}
      </div>
    </div>
  ))}
</div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
};

function PanelHeader({ title, desc }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: '.02em', marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{desc}</div>
    </div>
  );
}

function ActionCard({ title, desc, onClick, accent, icon }) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.15 }}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${accent ? 'var(--status-live)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: 18,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 10,
        boxShadow: '0 1px 2px var(--shadow-color)',
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: accent ? 'rgba(34,197,94,.12)' : 'var(--bg-subtle)',
        color: accent ? 'var(--status-live)' : 'var(--text-primary)',
        fontSize: 14,
      }}>{icon}</div>
      <div style={{
        fontSize: 11, fontWeight: 800, letterSpacing: '.08em',
        color: accent ? 'var(--status-live)' : 'var(--text-primary)',
      }}>{title}</div>
      <div style={{
        fontSize: 11, color: 'var(--text-muted)',
        lineHeight: 1.6, wordBreak: 'break-all',
      }}>{desc}</div>
    </motion.div>
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
