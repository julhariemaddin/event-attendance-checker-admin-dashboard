import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';

// Opened by clicking a student row in StandingView. Two internal steps:
//   'detail'  - the student's attendance summary + current clearance status
//   'confirm' - "are you sure", with a required reason before it submits
//
// Both directions (marking cleared AND un-clearing) go through the same
// confirm+reason step — a clearance decision going either way should
// leave a reason on record, not just a silent toggle.
export function StudentStandingModal({ show, student, onClose, onSubmit }) {
  const [step, setStep] = useState('detail');
  const [pendingCleared, setPendingCleared] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setStep('detail');
      setPendingCleared(null);
      setReason('');
      setSaving(false);
    }
  }, [show, student?.studentId]);

  if (!student) return null;

  const noDataCount = student.totalEvents - student.eligibleEvents;

  function startConfirm(nextCleared) {
    setPendingCleared(nextCleared);
    setReason('');
    setStep('confirm');
  }

  async function handleConfirm() {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      await onSubmit(student.studentId, pendingCleared, reason.trim());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  if (step === 'confirm') {
    const actionLabel = pendingCleared ? 'Mark Cleared' : 'Mark Not Cleared';
    return (
      <Modal show={show} onClose={onClose} title={actionLabel} footer={(
        <>
          <button className="btn" onClick={() => setStep('detail')}>BACK</button>
          <button className="btn primary" disabled={!reason.trim() || saving} onClick={handleConfirm}>
            {saving ? 'SAVING…' : 'CONFIRM'}
          </button>
        </>
      )}>
        <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.6 }}>
          Are you sure you want to mark <strong>{student.lastname}, {student.firstname}</strong> as{' '}
          <strong>{pendingCleared ? 'Cleared' : 'Not Cleared'}</strong>?
        </p>
        <div className="field">
          <label>Reason (required)</label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={pendingCleared
              ? 'e.g. Medical certificate on file for missed events'
              : 'e.g. No excuse letter submitted, did not respond to follow-up'}
          />
        </div>
      </Modal>
    );
  }

  return (
    <Modal show={show} onClose={onClose} title="Student standing" footer={(
      <>
        <button className="btn" onClick={onClose}>CLOSE</button>
        <button
          className="btn primary"
          onClick={() => startConfirm(!student.cleared)}
        >
          {student.cleared ? 'MARK NOT CLEARED' : 'MARK CLEARED'}
        </button>
      </>
    )}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{student.lastname}, {student.firstname}</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
          {student.studentId} · {student.program} · {student.year}
          {student.departmentCode ? ` · ${student.departmentCode}` : ''}
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="card stat-card">
          <div className="stat-label">Attended</div>
          <div className="stat-value">{student.presentCount} / {student.eligibleEvents}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Absent</div>
          <div className="stat-value">{student.absentCount}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">No info · not eligible</div>
          <div className="stat-value">{noDataCount}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Attendance rate</div>
          <div className="stat-value">{student.eligibleEvents === 0 ? '—' : `${Math.round(student.attendanceRate)}%`}</div>
        </div>
      </div>

      <div className="field">
        <label>Current status</label>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4,
          padding: '6px 12px', borderRadius: 7,
          border: '1px solid ' + (student.cleared ? 'var(--status-live)' : 'var(--border)'),
          background: student.cleared ? 'rgba(34,197,94,0.08)' : 'var(--bg-subtle)',
          color: student.cleared ? 'var(--status-live)' : 'var(--text-muted)',
          fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {student.cleared ? 'Cleared' : 'Not cleared'}
        </div>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label>Reason on file</label>
        <div style={{ fontSize: 13, color: student.reason ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.6 }}>
          {student.reason || 'No reason recorded yet.'}
        </div>
      </div>
    </Modal>
  );
}
