import { Modal } from '../components/Modal.jsx';

// Ported from #modalStopConfirm + stopConfirmBtn handler in admin.js.
// `loading`: true while the stop+report-generation request is in flight.
// Report generation can take a moment (writes .xlsx/.docx to disk), so we
// disable both buttons and block dismissal to avoid a double-submit or the
// user closing the modal mid-generation and losing track of what happened.
export function StopConfirmModal({ show, onClose, onConfirm, loading }) {
  function handleClose() {
    if (loading) return; // don't allow dismissal while generating
    onClose();
  }

  return (
    <Modal show={show} onClose={handleClose} title="Stop event?" footer={(
      <>
        <button className="btn" onClick={handleClose} disabled={loading}>
          CANCEL
        </button>
        <button className="btn danger" onClick={onConfirm} disabled={loading}>
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 12, height: 12, borderRadius: '50%',
                border: '2px solid currentColor',
                borderTopColor: 'transparent',
                animation: 'stopconfirm-spin 0.7s linear infinite',
                display: 'inline-block',
              }} />
              GENERATING…
            </span>
          ) : (
            'STOP & GENERATE'
          )}
        </button>
        <style>{`@keyframes stopconfirm-spin { to { transform: rotate(360deg); } }`}</style>
      </>
    )}>
      <p style={{ margin: '0 0 10px', fontSize: 13, lineHeight: 1.6 }}>
        This locks the event permanently and generates attendance reports exactly once. Anyone with zero scans will be marked absent. Cannot be undone.
      </p>
      {loading && (
        <p style={{
          margin: 0, fontSize: 12, color: 'var(--text-muted)',
          fontStyle: 'italic',
        }}>
 Generating reports - this may take a few seconds, please don't close the app.
        </p>
      )}
    </Modal>
  );
}