import { useState } from 'react';
import { Modal } from '../components/Modal.jsx';

// Ported from #modalDeleteEventConfirm + deleteEventConfirmBtn handler in admin.js.
export function DeleteEventConfirmModal({ show, onClose, eventName, onConfirm }) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  }

  return (
    <Modal show={show} onClose={onClose} title="Delete this event?" footer={(
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn danger" disabled={busy} onClick={handleConfirm}>
          {busy ? 'DELETING...' : 'DELETE EVENT'}
        </button>
      </>
    )}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
        Removes <strong>{eventName}</strong> attendance history from the database. Cannot be undone.
      </p>
    </Modal>
  );
}
