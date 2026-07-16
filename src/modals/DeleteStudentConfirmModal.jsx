import { Modal } from '../components/Modal.jsx';

// Mirrors DeleteEventConfirmModal / DeleteDeptConfirmModal's shape exactly.
export function DeleteStudentConfirmModal({ show, onClose, studentName, onConfirm }) {
  return (
    <Modal show={show} onClose={onClose} title="Delete person" footer={(
      <>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn danger" onClick={onConfirm}>Delete</button>
      </>
    )}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        Are you sure you want to permanently remove <strong style={{ color: 'var(--text-primary)' }}>{studentName}</strong> from
        the roster? This cannot be undone.
      </p>
    </Modal>
  );
}