// Ported from #view-scanner markup in admin.html. Rebuilt with a pairing
// hero card plus a 3-step guide below it, so the view actually uses the
// available width instead of one narrow card floating on a mostly empty page.
const STEPS = [
  ['1', 'Connect', 'Put the phone on the same WiFi network as this computer.'],
  ['2', 'Open the link', 'Copy the scanner URL from the Dashboard and open it in the phone\u2019s browser.'],
  ['3', 'Start scanning', 'Point the camera at a student ID. Scans appear in Live Monitor instantly.'],
];

export function ScannerView({ onOpenDocs }) {
  return (
    <div className="view active" id="view-scanner">
      <div className="view-header">
        <div>
          <div className="view-title">Scanner Configuration</div>
          <div className="view-desc">Configure a scanner to read barcodes and QR codes into the live monitor wireless and wired.</div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <div style={{
          width: 96, height: 96, flexShrink: 0, borderRadius: 10, position: 'relative',
          background: 'var(--bg-subtle)', border: '1px solid var(--border)',
        }}>
          {[
            ['top', 'left'], ['top', 'right'], ['bottom', 'left'], ['bottom', 'right'],
          ].map(([v, h], i) => (
            <span key={i} style={{
              position: 'absolute', [v]: 8, [h]: 8, width: 16, height: 16,
              borderTop: v === 'top' ? '2px solid var(--board-amber)' : 'none',
              borderBottom: v === 'bottom' ? '2px solid var(--board-amber)' : 'none',
              borderLeft: h === 'left' ? '2px solid var(--board-amber)' : 'none',
              borderRight: h === 'right' ? '2px solid var(--board-amber)' : 'none',
            }} />
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Wireless & wired scanning</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6, fontSize: 13 }}>
            This system runs natively on your local network. Any modern smartphone camera works as a dedicated scanner,
            no app install needed.
          </p>
          <button className="btn primary" onClick={onOpenDocs}>View documentation</button>
        </div>
      </div>

      <div className="side-label" style={{ margin: '0 0 12px' }}>How it works</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {STEPS.map(([n, title, desc]) => (
          <div className="card" key={n} style={{ display: 'flex', gap: 14 }}>
            <div className="step-badge" style={{ width: 32, height: 32, flexShrink: 0, fontSize: 14 }}>{n}</div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 5 }}>{title}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
