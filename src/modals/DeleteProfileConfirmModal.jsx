import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';

// Ported from #modalDeleteProfileConfirm + deleteProfileBtn/deleteProfileConfirmBtn handlers in admin.js.
export function DeleteProfileConfirmModal({ show, onClose, profileName, onConfirm }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (show) setInput(''); }, [show]);

  async function handleConfirm() {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  }

  return (
    <Modal show={show} onClose={onClose} title="Delete profile?" footer={(
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn danger" disabled={input.trim() !== 'DELETE' || busy} onClick={handleConfirm}>
          {busy ? 'DELETING...' : 'DELETE PROFILE'}
        </button>
      </>
    )}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
        Permanently deletes <strong>{profileName}</strong> and its database files. No undo. Type <strong>DELETE</strong> to confirm.
      </p>
      <input
        type="text" placeholder="Type DELETE"
        style={{ width: '100%', marginTop: 16, padding: 10, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontWeight: 800 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
    </Modal>
  );
}
