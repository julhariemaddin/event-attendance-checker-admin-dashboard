export function Topbar({ profileName, serverUp, wsConnected, onMobileMenuClick, onBack }) {
  return (
    <div id="topbar">
      <div className="brand-area">
        <button className="mobile-menu-btn" onClick={onMobileMenuClick} aria-label="Open menu">
          <span className="mobile-menu-icon" />
          MENU
        </button>
        <div className="brand">
          <span className="mark">ASEADO</span>
          <span className="sub">{profileName || 'NO PROFILE SELECTED'}</span>
        </div>
      </div>
      <div className="conn-status">
        <div className="pill">
          <span className={'dot ' + (serverUp ? 'live' : 'down')} />
          <span>{serverUp ? 'SERVER ONLINE' : (serverUp === false ? 'SERVER UNREACHABLE' : 'CHECKING SERVER...')}</span>
        </div>
        <div className="pill">
          <span className={'dot ' + (wsConnected ? 'live' : 'down')} />
          <span>{'SCANNER LINK: ' + (wsConnected ? 'LIVE' : 'DISCONNECTED')}</span>
        </div>
      </div>
      {/* Desktop-only — on mobile this same action lives inside the sidebar
          so there is never more than one menu-related button visible. */}
      {onBack && (
        <button className="topbar-back-btn" onClick={onBack}>
          MENU
        </button>
      )}
    </div>
  );
}
