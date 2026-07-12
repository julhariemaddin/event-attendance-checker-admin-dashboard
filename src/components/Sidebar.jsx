import { motion } from 'framer-motion';
import {
  Radio, CalendarClock, History as HistoryIcon, Users, Upload,
  Building2, QrCode, Plus, Trash2, RotateCcw,
} from 'lucide-react';

// Sidebar — nav items that require an active profile are disabled + grayed
// when none is selected, with a clear prompt to pick/create one first.
//
// EDIT: added an icon per nav item — a plain uppercase text list gave every
// item identical visual weight and nothing to scan by at a glance. Icons
// plus a filled active state make the current section obvious immediately
// instead of relying on a 2px border to communicate selection.

const NAV_ITEMS = [
  { view: 'monitor',     label: 'Live Monitor',  icon: Radio,         requiresProfile: true  },
  { view: 'events',      label: 'Events',         icon: CalendarClock, requiresProfile: true  },
  { view: 'history',     label: 'History',        icon: HistoryIcon,  requiresProfile: true  },
  { view: 'roster',      label: 'Roster',         icon: Users,        requiresProfile: true  },
  { view: 'import',      label: 'Import',         icon: Upload,       requiresProfile: true  },
  { view: 'departments', label: 'Departments',    icon: Building2,    requiresProfile: false },
  { view: 'scanner',     label: 'Scanner',        icon: QrCode,       requiresProfile: false },
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

 {/* Back-to-menu - only rendered (and only visible via CSS) on mobile,
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
            <button className="btn-ghost-small" onClick={onNewProfile}>
              <Plus size={12} strokeWidth={3} /> NEW
            </button>
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
              profiles.map((p, i) => {
                const isActive = p.id === activeProfileId;
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className={'profile-card' + (isActive ? ' active' : '')}
                    onClick={() => onSelectProfile(p.id)}
                  >
                    <span className={'profile-dot' + (isActive ? ' active' : '')} />
                    <div className="pinfo">
                      <div className="pname">{p.name}</div>
                      <div className="pmode">
                        <span className="mode-tag">{p.mode}</span>
                        {isActive ? 'ACTIVE' : 'SWITCH'}
                      </div>
                    </div>
                    <button
                      className="pdel"
                      title="Delete profile"
                      onClick={(e) => { e.stopPropagation(); onDeleteProfileClick(p.id); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Navigation section ───────────────────────────────── */}
        <div className="side-section" style={{ paddingTop: 10 }}>
          <div className="side-label">WORKSPACE</div>

 {/* No-profile banner - shown when profile is required */}
          {!hasProfile && (
            <div style={{
              margin: '4px 0 10px',
              padding: '8px 12px',
              background: 'rgba(234,179,8,.06)',
              border: '1px solid rgba(234,179,8,.15)',
              borderRadius: 8,
              fontSize: 10, color: '#ca8a04', lineHeight: 1.6,
            }}>
              Select or create a profile to unlock workspace views.
            </div>
          )}

          {NAV_ITEMS.map((item) => {
            const disabled = item.requiresProfile && !hasProfile;
            const isActive = view === item.view;
            const Icon = item.icon;
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
                <Icon size={15} strokeWidth={isActive ? 2.4 : 2} className="nav-btn-icon" />
                <span>{item.label}</span>
 {disabled && <span className="nav-btn-locked"> - </span>}
              </button>
            );
          })}
        </div>

        {/* ── Footer ───────────────────────────────────────────── */}
        <div id="sidebar-footer">
          <div className="sf-row sf-profile">
            {activeProfile
              ? `${activeProfile.name} · ${activeProfile.mode} MODE`
              : 'NO ACTIVE PROFILE'}
          </div>
          <div className="sf-row mono sf-status">
            <span className="sf-status-dot" />
            LOCAL SERVER ACTIVE
          </div>
          <div className="footer-actions">
            {activeProfile && (
              <button className="btn-ghost-small" onClick={onResetProfileClick}>
                <RotateCcw size={11} strokeWidth={3} /> RESET PROFILE
              </button>
            )}
          </div>
        </div>
      </div>

 {/* Backdrop - tapping it closes the mobile drawer */}
      <div
        className={'sidebar-backdrop' + (open ? ' show' : '')}
        onClick={onClose}
      />
    </>
  );
}
