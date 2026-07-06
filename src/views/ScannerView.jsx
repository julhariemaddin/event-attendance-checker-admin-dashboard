// Ported from #view-scanner markup in admin.html.
export function ScannerView({ onOpenDocs }) {
  return (
    <div className="view active" id="view-scanner">
      <div className="view-header">
        <div>
          <div className="view-title">Scanner Configuration</div>
          <div className="view-desc">Configure your smartphone to scan barcodes and QR codes wirelessly into the live monitor.</div>
        </div>
      </div>
      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Wireless Mobile Scanning</div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
          This system functions natively via your local network. You can use any modern smartphone camera as a dedicated scanner. Read the setup documentation to ensure both devices are correctly synced before your event starts.
        </p>
        <button className="btn primary" onClick={onOpenDocs}>VIEW DOCUMENTATION</button>
      </div>
    </div>
  );
}
