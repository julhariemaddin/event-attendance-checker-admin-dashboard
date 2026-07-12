import { Menu, Server, Radio } from 'lucide-react';

// EDIT: added a small logomark next to the wordmark (plain text only felt
// unfinished for a "brand"), and the connection pills got icons — two bare
// text pills with only a color dot read more like a debug console than a
// finished product.
function LogoMark() {
  return (
    <div className="logo-mark" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="2" width="20" height="20" rx="6" fill="var(--status-live)" />
        <path d="M7 16l3.2-9h1.6l3.2 9h-1.7l-.75-2.2H9.45L8.7 16H7zm2.9-3.6h2.2L11 9.4l-1.1 3z" fill="var(--bg-base)" />
      </svg>
    </div>
  );
}

export function Topbar({ profileName, serverUp, wsConnected, onMobileMenuClick, onBack }) {
  return (
    <div id="topbar">
      <div className="brand-area">
        <button className="mobile-menu-btn" onClick={onMobileMenuClick} aria-label="Open menu">
          <Menu size={15} strokeWidth={2.5} />
          MENU
        </button>
        <div className="brand">
          <LogoMark />
          <span className="mark">ASEADO</span>
          <span className="sub">{profileName || 'NO PROFILE SELECTED'}</span>
        </div>
      </div>
      <div className="conn-status">
        <div className="pill">
          <Server size={12} />
          <span className={'dot ' + (serverUp ? 'live' : 'down')} />
          <span>{serverUp ? 'SERVER ONLINE' : (serverUp === false ? 'SERVER UNREACHABLE' : 'CHECKING SERVER...')}</span>
        </div>
        <div className="pill">
          <Radio size={12} />
          <span className={'dot ' + (wsConnected ? 'live' : 'down')} />
          <span>{'SCANNER LINK: ' + (wsConnected ? 'LIVE' : 'DISCONNECTED')}</span>
        </div>
      </div>
 {/* Desktop-only - on mobile this same action lives inside the sidebar
          so there is never more than one menu-related button visible. */}
      {onBack && (
        <button className="topbar-back-btn" onClick={onBack}>
          MENU
        </button>
      )}
    </div>
  );
}
