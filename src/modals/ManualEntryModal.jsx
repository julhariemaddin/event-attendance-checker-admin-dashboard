import { useEffect, useState } from 'react';
import { Modal } from '../components/Modal.jsx';
import { api } from '../api/client.js';

// Ported from #modalManualEntry + openManualEntry()/meCreateBtn handler in admin.js.
// EDIT: Department/Year/Program dropdowns are scoped to THIS EVENT's own
// filterJson via /api/events/{eventId}/manual-entry-options — cascading as
// staff pick a department or program, per improvement #1.
// EDIT: queue-aware — App.jsx now holds a queue of pending unknown scans
// instead of a single value, so a second unknown scan arriving while one
// is already being resolved no longer silently overwrites the first.
// queuePosition/queueTotal show "X of Y pending" so admins know more are
// waiting; scannedId changing (next item in queue) resets the form even
// though `show` itself stays true across the transition.
// EDIT: added an optional Suffix field (Jr., Sr., III, etc.) as a preset
// dropdown, matching the same treatment used in the roster's Add/Edit
// person modal, so it stays consistent instead of free-text variants.
const SUFFIX_OPTIONS = ['Jr.', 'Sr.', 'II', 'III', 'IV', 'V'];

export function ManualEntryModal({ show, onClose, eventId, scannedId, isV2, queuePosition, queueTotal, onComplete, toast }) {
  const [lastname, setLastname] = useState('');
  const [firstname, setFirstname] = useState('');
  const [middlename, setMiddlename] = useState('');
  const [suffix, setSuffix] = useState('');
  const [year, setYear] = useState('');
  const [program, setProgram] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [years, setYears] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Keyed on scannedId (not just show) — advancing to the next queued
  // student keeps `show` true the whole time, so scannedId changing is
  // what actually signals "this is a different student now, clear the form."
  useEffect(() => {
    if (show) {
      setLastname(''); setFirstname(''); setMiddlename(''); setSuffix('');
      setYear(''); setProgram(''); setDepartmentId('');
    }
  }, [show, scannedId]);

  // Re-fetch options whenever the modal opens, the queue advances to a new
  // student, or the department/program selection changes — this is the
  // cascade: pick a department, the program list narrows; pick a program,
  // the year list narrows.
  useEffect(() => {
    if (!show || !eventId) return;
    setLoadingOptions(true);
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (program) params.set('program', program);
    const qs = params.toString() ? '?' + params.toString() : '';
    api('GET', `/api/events/${eventId}/manual-entry-options${qs}`)
      .then((opts) => {
        setDepartments(opts.departments || []);
        setPrograms(opts.programs || []);
        setYears(opts.years || []);
      })
      .catch(() => {
        setDepartments([]); setPrograms([]); setYears([]);
        toast('Could not load filter options for this event.', 'err');
      })
      .finally(() => setLoadingOptions(false));
  }, [show, eventId, scannedId, departmentId, program]);

  function handleDepartmentChange(id) {
    setDepartmentId(id);
    // Changing department invalidates any program/year picked under the old one.
    setProgram('');
    setYear('');
  }

  function handleProgramChange(code) {
    setProgram(code);
    setYear('');
  }

  async function handleComplete() {
    const body = {
      studentId: scannedId,
      lastname: lastname.trim(),
      firstname: firstname.trim(),
      middlename: middlename.trim() || null,
      suffix: suffix || null,
      year, program,
      departmentId: isV2 ? (Number(departmentId) || null) : null,
    };
    if (!body.lastname || !body.firstname || !body.year || !body.program) {
      return toast('Last name, first name, year, and program are required.', 'err');
    }
    if (isV2 && !body.departmentId) {
      return toast('Department is required for V2 profiles.', 'err');
    }
    await onComplete(body);
  }

  const hasMorePending = queueTotal > 1;

  return (
    <Modal show={show} onClose={onClose} title="Complete unknown entry" footer={(
      <>
        <button className="btn" onClick={onClose}>{hasMorePending ? 'SKIP' : 'DISMISS'}</button>
        <button className="btn primary" onClick={handleComplete}>Complete login</button>
      </>
    )}>
      {hasMorePending && (
        <div style={{
          display: 'inline-block', marginBottom: 12, padding: '4px 10px', borderRadius: 999,
          background: 'var(--board-amber-wash)', color: 'var(--board-amber)',
          fontSize: 12, fontWeight: 600,
        }}>
          {queuePosition} of {queueTotal} pending
        </div>
      )}
      <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.6 }}>
        ID <strong className="mono">{scannedId}</strong> isn't registered. Fill in details to complete login.
      </p>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)' }}>
        Only programs/years/departments allowed by this event's filter are shown below.
 {hasMorePending && ' Skipping moves to the next pending entry - nothing is lost.'}
      </p>
      <div className="field-row">
        <div className="field"><label>Last name</label><input type="text" value={lastname} onChange={(e) => setLastname(e.target.value)} /></div>
        <div className="field"><label>First name</label><input type="text" value={firstname} onChange={(e) => setFirstname(e.target.value)} /></div>
      </div>
      <div className="field-row">
        <div className="field"><label>Middle name (optional)</label><input type="text" value={middlename} onChange={(e) => setMiddlename(e.target.value)} /></div>
        <div className="field">
          <label>Suffix (optional)</label>
          <select value={suffix} onChange={(e) => setSuffix(e.target.value)}>
            <option value="">None</option>
            {SUFFIX_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {isV2 && (
          <div className="field">
            <label>Department</label>
            <select value={departmentId} onChange={(e) => handleDepartmentChange(e.target.value)} disabled={loadingOptions}>
              <option value="">{departments.length === 0 ? 'No departments in this event\'s filter' : 'Select...'}</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="field-row">
        <div className="field">
          <label>Program</label>
          <select value={program} onChange={(e) => handleProgramChange(e.target.value)} disabled={loadingOptions}>
            <option value="">{programs.length === 0 ? 'No programs available' : 'Select...'}</option>
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} disabled={loadingOptions}>
            <option value="">{years.length === 0 ? 'No years available' : 'Select...'}</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
