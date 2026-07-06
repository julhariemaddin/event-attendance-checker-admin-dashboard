import { useState } from 'react';
import { Modal } from '../components/Modal.jsx';

// Ported from #modalDeleteDeptConfirm + openDeleteDeptConfirm()/deleteDeptConfirmBtn handler in admin.js.
export function DeleteDeptConfirmModal({ show, onClose, deptCode, affectedCount, onConfirm }) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  }

  return (
    <Modal show={show} onClose={onClose} title="Delete template?" footer={(
      <>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button className="btn danger" disabled={busy} onClick={handleConfirm}>
          {busy ? 'DELETING...' : 'DELETE TEMPLATE'}
        </button>
      </>
    )}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
        Removes <strong>{deptCode}</strong> from the registry-wide V1 picker. Existing profiles are unaffected.
      </p>
      {affectedCount > 0 && (
        <p style={{ marginTop: 12, fontWeight: 700 }}>
          {affectedCount} existing profile(s) were created with this department.
        </p>
      )}
    </Modal>
  );
}
