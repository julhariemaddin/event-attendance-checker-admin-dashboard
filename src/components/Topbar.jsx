import { Menu, Server, Radio } from 'lucide-react';

// EDIT: added a small logomark next to the wordmark (plain text only felt
// unfinished for a "brand"), and the connection pills got icons — two bare
// text pills with only a color dot read more like a debug console than a
// finished product.
function LogoMark() {
  return (
    <img
      className="logo-mark" aria-hidden="true"
      src="/logo.png" alt=""
      style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}

export function Topbar({ profileName, serverUp, wsConnected, onMobileMenuClick, onBack }) {
  return (
    <div id="topbar">
      <div className="brand-area">
        <button className="mobile-menu-btn" onClick={onMobileMenuClick} aria-label="Open menu">
          <Menu size={15} strokeWidth={2.5} />
          Menu
        </button>
        <div className="brand" style={{ cursor: 'default' }}>
          <LogoMark />
          <span className="mark">ASEADO</span>
          <span className="sub">{profileName || 'No profile selected'}</span>
        </div>
      </div>
      <div className="conn-status">
        <div className="pill">
          <Server size={12} />
          <span className={'dot ' + (serverUp ? 'live' : 'down')} />
          <span>{serverUp ? 'Server online' : (serverUp === false ? 'Server unreachable' : 'Checking server…')}</span>
        </div>
        <div className="pill">
          <Radio size={12} />
          <span className={'dot ' + (wsConnected ? 'live' : 'down')} />
          <span>{'Scanner link: ' + (wsConnected ? 'live' : 'disconnected')}</span>
        </div>
      </div>
 {/* Desktop-only - on mobile this same action lives inside the sidebar
          so there is never more than one menu-related button visible. */}
      {onBack && (
        <button className="topbar-back-btn" onClick={onBack}>
          Menu
        </button>
      )}
    </div>
  );
}
