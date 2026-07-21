import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme.js';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { API_BASE } from '../api/client.js';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '◱' }, // home/dashboard
  { id: 'about',     label: 'About',     icon: 'ℹ︎' }, // info
  { id: 'creator',   label: 'Creator',   icon: '✎' }, // creator/edit
  { id: 'settings',  label: 'Settings',  icon: '⚙︎' },
];

export default function Menu({ onOpenAdmin, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const [navOpen,     setNavOpen]     = useState(false);
  const [panel,       setPanel]       = useState('dashboard');
  const [server,      setServer]      = useState(null);
  const [workspace,   setWorkspace]   = useState('-');
  const [copied,      setCopied]      = useState(false);
  const [licenceInfo, setLicenceInfo] = useState(null);

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

  function parseSubject(subject) {
    if (!subject) return { name: null, tag: null };
    const parts = subject.split(' — '); 
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
      {/* id="topbar" makes admin.css's `:root[data-theme="light"] #topbar` navy
          override apply here automatically — no manual color duplication needed. */}
      <div id="topbar" style={{
        height: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 12, flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s',
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
          <img
            src="/logo.png" alt="ASEADO"
            style={{ width: 26, height: 26, flexShrink: 0, objectFit: 'contain' }}
          />
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: '.16em',
            fontFamily: 'var(--mono)', color: 'var(--text-primary)'
          }}>ASEADO</span>
        </div>

        <div style={{ flex: 1 }} />

        <div className="menu-status-pill" style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 12px', borderRadius: 20,
          background: 'var(--bg-subtle)', 
          border: '1px solid var(--border)',
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

        <ThemeToggle theme={theme} onToggle={toggleTheme} />

        <button onClick={onLogout} style={{
          padding: '7px 14px', fontSize: 10, fontWeight: 800,
          letterSpacing: '.1em',
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontFamily: 'inherit',
          transition: 'color .15s, border-color .15s',
        }}>Logout</button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>

        <div
          className={'menu-nav-backdrop' + (navOpen ? ' show' : '')}
          onClick={() => setNavOpen(false)}
        />

        {/* ── Left nav ───────────────────────────────────────── */}
        {/* id="sidebar" gets the same admin.css navy override treatment as #topbar. */}
        <div id="sidebar" className={'menu-sidenav' + (navOpen ? ' open' : '')} style={{
          width: 220, flexShrink: 0,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
          transition: 'background 0.2s, border-color 0.2s',
        }}>
          {/* Welcome block */}
          {licenceName && (
            <div style={{
              padding: '20px 18px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--mono)', fontWeight: 800, fontSize: 15,
                color: 'var(--text-primary)',
              }}>{initial}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                  color: 'var(--text-muted)', marginBottom: 3,
                }}>Welcome</div>
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
                    background: 'var(--bg-subtle)', 
                    color: 'var(--text-muted)',
                  }}>{licenceTag}</div>
                )}
              </div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ padding: '14px 12px', flex: 1 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
              color: 'var(--text-muted)', padding: '0 6px 8px',
            }}>Navigation</div>
            {NAV.map(n => {
              const active = panel === n.id;
              return (
                <button key={n.id} onClick={() => { setPanel(n.id); setNavOpen(false); }} style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '10px 12px', marginBottom: 3,
                  background: active ? 'var(--bg-subtle)' : 'transparent',
                  border: 'none', borderRadius: 8,
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: 700, letterSpacing: '.02em',
                  textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
                  overflow: 'hidden',
                }}>
                  {active && (
                    <span style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, background: 'var(--board-amber)', borderRadius: 2 }} />
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
              fontSize: 11, fontWeight: 600, letterSpacing: 0,
              color: 'var(--text-muted)', marginBottom: 4,
            }}>Workspace</div>
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
                        fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                        color: 'var(--text-muted)', marginBottom: 6,
                      }}>Welcome back</div>
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
                  fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                  color: 'var(--text-muted)', marginBottom: 12,
                }}>Quick actions</div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
                  gap: 14, marginBottom: 32,
                }}>
                  <ActionCard
                    icon="▶"
                    title="ADMIN CONSOLE"
                    desc="Events, students, departments, and live scanning."
                    onClick={onOpenAdmin}
                  />
                  <ActionCard
                    icon={copied ? '✓' : '⧉'}
                    title={copied ? 'COPIED!' : 'COPY SCANNER URL'}
                    desc="Copy the link and send it to phone operators."
                    onClick={copyScannerUrl}
                    accent={copied}
                  />
                  <ActionCard
                    icon="◱"
                    title="OPEN SCANNER"
                    desc="Preview the scan page on this computer, to test it."
                    onClick={() => window.open(scannerUrl, '_blank')}
                  />
                </div>

                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '.08em',
                  color: 'var(--text-muted)', marginBottom: 12,
                }}>System status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  {[
                    {
                      group: 'SERVER',
                      rows: [
                        ['Status', serverLabel, serverColor],
                        ['Port', '8080 (HTTP / WebSocket)', 'var(--text-secondary)'],
                        ['Admin UI', 'This window (Tauri)', 'var(--text-secondary)'],
                      ],
                    },
                    {
                      group: 'NETWORK & FILES',
                      rows: [
                        ['Scanner URL', scannerUrl, 'var(--text-secondary)'],
                        ['Workspace', workspace, 'var(--text-secondary)'],
                      ],
                    },
                  ].map(({ group, rows }) => (
                    <div key={group} className="card" style={{ padding: '16px 20px' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 4 }}>{group}</div>
                      {rows.map(([k, v, c], i) => (
                        <div key={k} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 0', borderBottom: i === rows.length - 1 ? 'none' : '1px solid var(--border)',
                          fontSize: 12,
                        }}>
                          <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginRight: 16 }}>{k}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 11, color: c, textAlign: 'right', wordBreak: 'break-all' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── ABOUT ──────────────────────────────────────── */}
            {panel === 'about' && (
              <motion.div key="about" {...panelMotion} style={{ maxWidth: 760, margin: '0 auto' }}>
                <PanelHeader title="About" desc="Version information and system details." />

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
                  padding: '22px 0 26px',
                }}>
                  <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: '.22em', fontFamily: 'var(--mono)' }}>ASEADO</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.1em', marginTop: 4 }}>
                      EVENT ATTENDANCE CHECKER · DESKTOP EDITION
                    </div>
                  </div>
                  <span style={{ height: 1, flex: 1, background: 'var(--border)' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                  {[
                    ['VERSION', '1.0.0'],
                    ['LICENCE', licenceInfo ? licenceInfo.subject : '—'],
                    ['EXPIRES', licenceInfo ? formatExpiry(licenceInfo.expiration) : '—'],
                  ].map(([label, val]) => (
                    <div key={label} className="card stat-card" style={{ textAlign: 'center' }}>
                      <div className="stat-label">{label}</div>
                      <div className="stat-value" style={{ fontSize: 15, padding: '12px 8px' }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {[
                    ['WHAT IT IS', 'A check-in system for campus events, scan a student ID with your phone, and attendance is recorded instantly. No paper sign-in sheet needed.'],
                    ['HOW IT RUNS', 'Everything runs locally on this computer. No internet connection is required once installed, phones connect over the same WiFi network to scan, and all data stays on this machine.'],
                  ].map(([l, v]) => (
                    <div key={l} className="card">
                      <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: 'var(--text-muted)', marginBottom: 8 }}>{l}</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── CREATOR ────────────────────────────────────── */}
            {panel === 'creator' && (
              <motion.div key="creator" {...panelMotion} style={{ maxWidth: 700, margin: '0 auto' }}>
                <PanelHeader title="Creator" desc="The developer behind ASEADO." />

                <div className="card" style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--board-amber)', color: '#241505',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, fontWeight: 900, fontFamily: 'var(--mono)',
                  }}>JM</div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>Julharie Maddin</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
                      CCS Governor &amp; Backend Developer
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                  {[
                    ['⌂', 'INSTITUTION', 'Jose Rizal Memorial State University — Siocon Campus'],
                    ['◈', 'PROGRAMME', 'BS Computer Science'],
                    ['◎', 'ORCID RESEARCHER ID', '0009-0009-3366-1271'],
                  ].map(([icon, l, v]) => (
                    <div key={l} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span className="settings-group-icon">{icon}</span>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: 'var(--text-muted)' }}>{l}</div>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.5 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a
                    href="https://julhariemaddin.is-a.dev"
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{ flex: 1, minWidth: 220, textDecoration: 'none', justifyContent: 'space-between' }}
                  >
                    <span>PORTFOLIO : julhariemaddin.is-a.dev</span>
                    <span>↗</span>
                  </a>
                  <a
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{ flex: 1, minWidth: 220, textDecoration: 'none', justifyContent: 'space-between' }}
                  >
                    <span>ORGANIZATION : Null-Pointer</span>
                    <span>↗</span>
                  </a>
                </div>
              </motion.div>
            )}

            {/* ── SETTINGS ───────────────────────────────────── */}
            {panel === 'settings' && (
              <motion.div key="settings" {...panelMotion} style={{ maxWidth: 760, margin: '0 auto' }}>
                <PanelHeader title="Settings" desc="How this app is set up on this computer." />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, alignItems: 'start' }}>
                  {[
                    {
                      group: 'Storage & Access',
                      icon: '⌂',
                      rows: [
                        ['Data folder', workspace, 'Your event and student records live here.', true],
                        ['Server port', '8080', 'No need to change this.', false],
                        ['Login required', 'Yes', 'Needed every time you open the admin console.', false],
                      ],
                    },
                    {
                      group: 'Scanner & Licence',
                      icon: '◱',
                      rows: [
                        ['Scanner address', scannerUrl, 'Open on any phone, same WiFi.', true],
                        ['Scanner login', 'Not required', 'Phones just need to be on the same WiFi.', false],
                        ['Licensed to', licenceInfo?.subject || '—', 'The name on file for this licence.', false],
                        ['Admin username', licenceInfo?.username || '—', 'Tied to your current licence.', false],
                      ],
                    },
                  ].map(({ group, icon, rows }) => (
                    <div key={group} className="card" style={{ padding: '18px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span className="settings-group-icon">{icon}</span>
                        <div style={{ fontSize: 12, fontWeight: 800 }}>{group}</div>
                      </div>
                      {rows.map(([k, v, hint, long]) => (
                        <div key={k} className="settings-row">
                          <div style={{ minWidth: 0 }}>
                            <div className="settings-row-label">{k}</div>
                            <div className="settings-row-hint">{hint}</div>
                          </div>
                          <span className={'settings-row-value' + (long ? ' full-width' : '')}>{v}</span>
                        </div>
                      ))}
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
        padding: '20px 20px 22px',
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 14,
        boxShadow: 'var(--shadow-elevated, 0 1px 2px var(--shadow-color))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: accent ? 'rgba(34,197,94,.12)' : 'var(--board-amber-wash)',
          color: accent ? 'var(--status-live)' : 'var(--board-amber)',
          fontSize: 15,
        }}>{icon}</div>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>↗</span>
      </div>
      <div>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '.08em', marginBottom: 6,
          color: accent ? 'var(--status-live)' : 'var(--text-primary)',
        }}>{title}</div>
        <div style={{
          fontSize: 11, color: 'var(--text-muted)',
          lineHeight: 1.6,
        }}>{desc}</div>
      </div>
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