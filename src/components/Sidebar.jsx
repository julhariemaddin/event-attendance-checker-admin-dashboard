import { motion } from 'framer-motion';

// Sidebar — nav items that require an active profile are disabled + grayed
// when none is selected, with a clear prompt to pick/create one first.

const NAV_ITEMS = [
  { view: 'monitor',     label: 'Live Monitor',  requiresProfile: true  },
  { view: 'events',      label: 'Events',         requiresProfile: true  },
  { view: 'history',     label: 'History',        requiresProfile: true  },
  { view: 'roster',      label: 'Roster',         requiresProfile: true  },
  { view: 'import',      label: 'Import',         requiresProfile: true  },
  { view: 'departments', label: 'Departments',    requiresProfile: false },
  { view: 'scanner',     label: 'Scanner',        requiresProfile: false },
];

export function Sidebar({
  open,
  profiles,
  activeProfileId,
  activeProfile,
  view,
  onSwitchView,
  onNewProfile,
  onSelectProfile,
  onDeleteProfileClick,
  onResetProfileClick,
  onBack,
  onClose,
}) {
  const hasProfile = !!activeProfileId;

  return (
    <>
      <div id="sidebar" className={open ? 'open' : ''}>

        {/* Back-to-menu — only rendered (and only visible via CSS) on mobile,
            right at the top of the drawer, so there's a single obvious
            menu control instead of two competing ones. */}
        {onBack && (
          <button
            className="sidebar-back-btn"
            onClick={() => { onClose && onClose(); onBack(); }}
          >
            <span className="sidebar-back-icon">←</span>
            BACK TO MENU
          </button>
        )}

        {/* ── Profiles section ─────────────────────────────────── */}
        <div className="side-section">
          <div className="side-label">
            <span>PROFILES</span>
            <button className="btn-ghost-small" onClick={onNewProfile}>NEW</button>
          </div>

          <div id="profileList">
            {profiles.length === 0 ? (
              <div className="hint" style={{ padding: '10px 0', lineHeight: 1.6 }}>
                No profiles yet.{' '}
                <button
                  onClick={onNewProfile}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    color: 'var(--text-primary)', fontSize: 'inherit',
                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                    textDecoration: 'underline',
                  }}
                >
                  Create one
                </button>{' '}
                to get started.
              </div>
            ) : (
              profiles.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className={'profile-card' + (p.id === activeProfileId ? ' active' : '')}
                  onClick={() => onSelectProfile(p.id)}
                >
                  <div className="pinfo">
                    <div className="pname">{p.name}</div>
                    <div className="pmode">
                      <span className="mode-tag">{p.mode}</span>
                      {p.id === activeProfileId ? 'ACTIVE' : 'SWITCH'}
                    </div>
                  </div>
                  <button
                    className="pdel"
                    title="Delete profile"
                    onClick={(e) => { e.stopPropagation(); onDeleteProfileClick(p.id); }}
                  >
                    DELETE
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* ── Navigation section ───────────────────────────────── */}
        <div className="side-section" style={{ paddingTop: 10 }}>
          <div className="side-label">WORKSPACE</div>

          {/* No-profile banner — shown when profile is required */}
          {!hasProfile && (
            <div style={{
              margin: '4px 0 8px',
              padding: '8px 12px',
              background: 'rgba(234,179,8,.06)',
              border: '1px solid rgba(234,179,8,.15)',
              fontSize: 10, color: '#ca8a04', lineHeight: 1.6,
            }}>
              Select or create a profile to unlock workspace views.
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const disabled = item.requiresProfile && !hasProfile;
            const isActive = view === item.view;
            return (
              <button
                key={item.view}
                className={'nav-btn' + (isActive ? ' active' : '')}
                disabled={disabled}
                title={disabled ? 'Select a profile first' : undefined}
                onClick={() => !disabled && onSwitchView(item.view)}
                style={{
                  opacity: disabled ? 0.35 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {item.label}
                {disabled && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    letterSpacing: '.06em',
                  }}>—</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div id="sidebar-footer">
          <div className="sf-row">
            {activeProfile
              ? `${activeProfile.name} · ${activeProfile.mode} MODE`
              : 'NO ACTIVE PROFILE'}
          </div>
          <div className="sf-row mono">LOCAL SERVER ACTIVE</div>
          <div className="footer-actions">
            {activeProfile && (
              <button className="btn-ghost-small" onClick={onResetProfileClick}>
                RESET PROFILE
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop — tapping it closes the mobile drawer */}
      <div
        className={'sidebar-backdrop' + (open ? ' show' : '')}
        onClick={onClose}
      />
    </>
  );
}
