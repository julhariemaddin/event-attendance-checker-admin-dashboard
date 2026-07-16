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
  const pct = student.eligibleEvents === 0 ? null : Math.round(student.attendanceRate);
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const dash = pct === null ? 0 : (circumference * pct) / 100;

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
          <button className="btn" onClick={() => setStep('detail')}>Back</button>
          <button className="btn primary" disabled={!reason.trim() || saving} onClick={handleConfirm}>
            {saving ? 'Saving…' : 'Confirm'}
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
    <Modal show={show} onClose={onClose} title="Student standing" maxWidth={620} footer={(
      <>
        <button className="btn" onClick={onClose}>Close</button>
        <button
          className="btn primary"
          onClick={() => startConfirm(!student.cleared)}
        >
          {student.cleared ? 'Mark not cleared' : 'Mark cleared'}
        </button>
      </>
    )}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{student.lastname}, {student.firstname}</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
            {student.studentId} · {student.program} · {student.year}
            {student.departmentCode ? ` · ${student.departmentCode}` : ''}
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0,
          padding: '5px 12px', borderRadius: 999,
          background: student.cleared ? 'rgba(34,197,94,0.10)' : 'var(--bg-subtle)',
          color: student.cleared ? 'var(--status-live)' : 'var(--text-secondary)',
          fontSize: 12.5, fontWeight: 600,
        }}>
          {student.cleared ? 'Cleared' : 'Not cleared'}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <svg width="104" height="104" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-subtle)" strokeWidth="10" />
            {pct !== null && (
              <circle
                cx="50" cy="50" r={r} fill="none"
                stroke="var(--board-amber)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
              />
            )}
          </svg>
          <div style={{ marginTop: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {pct === null ? '—' : `${pct}%`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Attendance rate</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Attended</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{student.presentCount} / {student.eligibleEvents}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Absent</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{student.absentCount}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Not eligible</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{noDataCount}</span>
          </div>
        </div>
      </div>

      <div className="field">
        <label>Reason on file</label>
        <div style={{ fontSize: 13, color: student.reason ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.6 }}>
          {student.reason || 'No reason recorded yet.'}
        </div>
      </div>
    </Modal>
  );
}
