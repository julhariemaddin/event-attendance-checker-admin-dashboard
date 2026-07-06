import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';

// Ported from #modalResetConfirm + resetProfileBtn/resetConfirmBtn handlers in admin.js.
export function ResetProfileConfirmModal({ show, onClose, profileName, onConfirm }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (show) setInput(''); }, [show]);

  async function handleConfirm() {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  }

  return (
    <Modal show={show} onClose={onClose} title="Reset active profile?" footer={(
      <>
        <button className="btn" onClick={onClose}>CANCEL</button>
        <button className="btn danger" disabled={input.trim() !== 'RESET' || busy} onClick={handleConfirm}>
          {busy ? 'RESETTING...' : 'RESET PROFILE'}
        </button>
      </>
    )}>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
        Deletes every student, event, and record in <strong>{profileName}</strong>. Type <strong>RESET</strong> to confirm.
      </p>
      <input
        type="text" placeholder="Type RESET"
        style={{ width: '100%', marginTop: 16, padding: 10, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontWeight: 800 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
    </Modal>
  );
}
